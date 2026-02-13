# ═══════════════════════════════════════════════════════
# Service Accounts & IAM
# ═══════════════════════════════════════════════════════

# ─── GKE Node Service Account ─────────────────────
resource "google_service_account" "gke_node" {
  account_id   = "${var.cluster_name}-node-sa"
  display_name = "GKE Node Service Account for ${var.cluster_name}"
}

resource "google_project_iam_member" "gke_node_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gke_node.email}"
}

resource "google_project_iam_member" "gke_node_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.gke_node.email}"
}

resource "google_project_iam_member" "gke_node_gar_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.gke_node.email}"
}

# ─── Application Workload Identity SA ──────────────
resource "google_service_account" "app_workload" {
  account_id   = "job-tracker-app-sa"
  display_name = "Job Tracker App Workload Identity SA"
}

# Bind K8s SA  to GCP SA via Workload Identity
resource "google_service_account_iam_member" "workload_identity_binding" {
  service_account_id = google_service_account.app_workload.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/job-tracker]"
}

# ─── CI/CD Service Account (Jenkins) ───────────────
resource "google_service_account" "cicd" {
  account_id   = "job-tracker-cicd-sa"
  display_name = "Job Tracker CI/CD Service Account (Jenkins)"
}

resource "google_project_iam_member" "cicd_gar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.cicd.email}"
}

resource "google_project_iam_member" "cicd_gke_developer" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.cicd.email}"
}
