const { getDb, saveDatabase } = require('../config/db');
const APIError = require('../utils/APIError');

// @desc    Get all jobs for the authenticated user
// @route   GET /api/jobs
const getJobs = (req, res, next) => {
    try {
        const db = getDb();
        const {
            page = 1,
            limit = 20,
            status,
            job_type,
            search,
            sort_by = 'created_at',
            sort_order = 'DESC',
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const params = [req.user.id];
        let whereClause = 'WHERE user_id = ?';

        // Filter by status
        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        // Filter by job_type
        if (job_type) {
            whereClause += ' AND job_type = ?';
            params.push(job_type);
        }

        // Search by company or position
        if (search) {
            whereClause += ' AND (company LIKE ? OR position LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        // Validate sort column
        const allowedSortColumns = ['created_at', 'updated_at', 'company', 'position', 'status', 'applied_date'];
        const sortCol = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
        const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countStmt = db.prepare(`SELECT COUNT(*) as total FROM jobs ${whereClause}`);
        countStmt.bind(params);
        countStmt.step();
        const { total } = countStmt.getAsObject();
        countStmt.free();

        // Get paginated results
        const dataParams = [...params, parseInt(limit), offset];
        const dataStmt = db.prepare(
            `SELECT * FROM jobs ${whereClause} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`
        );
        dataStmt.bind(dataParams);

        const jobs = [];
        while (dataStmt.step()) {
            jobs.push(dataStmt.getAsObject());
        }
        dataStmt.free();

        res.json({
            success: true,
            data: jobs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get a single job by ID
// @route   GET /api/jobs/:id
const getJob = (req, res, next) => {
    try {
        const db = getDb();
        const stmt = db.prepare('SELECT * FROM jobs WHERE id = ? AND user_id = ?');
        stmt.bind([parseInt(req.params.id), req.user.id]);

        if (!stmt.step()) {
            stmt.free();
            throw new APIError('Job application not found', 404);
        }

        const job = stmt.getAsObject();
        stmt.free();

        res.json({
            success: true,
            data: job,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new job application
// @route   POST /api/jobs
const createJob = (req, res, next) => {
    try {
        const db = getDb();
        const {
            company,
            position,
            status = 'applied',
            location,
            salary_min,
            salary_max,
            job_type = 'full-time',
            url,
            notes,
            applied_date,
            deadline,
        } = req.body;

        db.run(
            `INSERT INTO jobs (user_id, company, position, status, location, salary_min, salary_max, job_type, url, notes, applied_date, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                company,
                position,
                status,
                location || null,
                salary_min || null,
                salary_max || null,
                job_type,
                url || null,
                notes || null,
                applied_date || null,
                deadline || null,
            ]
        );
        saveDatabase();

        // Get the created job
        const stmt = db.prepare('SELECT * FROM jobs WHERE id = last_insert_rowid()');
        stmt.step();
        const job = stmt.getAsObject();
        stmt.free();

        res.status(201).json({
            success: true,
            data: job,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update a job application
// @route   PUT /api/jobs/:id
const updateJob = (req, res, next) => {
    try {
        const db = getDb();
        const jobId = parseInt(req.params.id);

        // Verify ownership
        const checkStmt = db.prepare('SELECT * FROM jobs WHERE id = ? AND user_id = ?');
        checkStmt.bind([jobId, req.user.id]);
        if (!checkStmt.step()) {
            checkStmt.free();
            throw new APIError('Job application not found', 404);
        }
        checkStmt.free();

        const {
            company,
            position,
            status,
            location,
            salary_min,
            salary_max,
            job_type,
            url,
            notes,
            applied_date,
            deadline,
        } = req.body;

        db.run(
            `UPDATE jobs SET 
        company = COALESCE(?, company),
        position = COALESCE(?, position),
        status = COALESCE(?, status),
        location = COALESCE(?, location),
        salary_min = COALESCE(?, salary_min),
        salary_max = COALESCE(?, salary_max),
        job_type = COALESCE(?, job_type),
        url = COALESCE(?, url),
        notes = COALESCE(?, notes),
        applied_date = COALESCE(?, applied_date),
        deadline = COALESCE(?, deadline),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?`,
            [
                company || null,
                position || null,
                status || null,
                location || null,
                salary_min || null,
                salary_max || null,
                job_type || null,
                url || null,
                notes || null,
                applied_date || null,
                deadline || null,
                jobId,
                req.user.id,
            ]
        );
        saveDatabase();

        // Get updated job
        const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
        stmt.bind([jobId]);
        stmt.step();
        const job = stmt.getAsObject();
        stmt.free();

        res.json({
            success: true,
            data: job,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update job status only
// @route   PATCH /api/jobs/:id/status
const updateJobStatus = (req, res, next) => {
    try {
        const db = getDb();
        const jobId = parseInt(req.params.id);
        const { status } = req.body;

        const validStatuses = ['wishlist', 'applied', 'phone_screen', 'interview', 'offer', 'rejected', 'withdrawn', 'accepted'];
        if (!validStatuses.includes(status)) {
            throw new APIError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
        }

        // Verify ownership
        const checkStmt = db.prepare('SELECT * FROM jobs WHERE id = ? AND user_id = ?');
        checkStmt.bind([jobId, req.user.id]);
        if (!checkStmt.step()) {
            checkStmt.free();
            throw new APIError('Job application not found', 404);
        }
        const currentJob = checkStmt.getAsObject();
        checkStmt.free();

        db.run(
            'UPDATE jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
            [status, jobId, req.user.id]
        );
        saveDatabase();

        // Get updated job
        const stmt = db.prepare('SELECT * FROM jobs WHERE id = ?');
        stmt.bind([jobId]);
        stmt.step();
        const job = stmt.getAsObject();
        stmt.free();

        res.json({
            success: true,
            data: job,
            message: `Status changed from '${currentJob.status}' to '${status}'`,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a job application
// @route   DELETE /api/jobs/:id
const deleteJob = (req, res, next) => {
    try {
        const db = getDb();
        const jobId = parseInt(req.params.id);

        // Verify ownership
        const checkStmt = db.prepare('SELECT * FROM jobs WHERE id = ? AND user_id = ?');
        checkStmt.bind([jobId, req.user.id]);
        if (!checkStmt.step()) {
            checkStmt.free();
            throw new APIError('Job application not found', 404);
        }
        const job = checkStmt.getAsObject();
        checkStmt.free();

        db.run('DELETE FROM jobs WHERE id = ? AND user_id = ?', [jobId, req.user.id]);
        saveDatabase();

        res.json({
            success: true,
            message: `Job application at '${job.company}' for '${job.position}' deleted successfully`,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getJobs, getJob, createJob, updateJob, updateJobStatus, deleteJob };
