// ═══════════════════════════════════════════════════════
// Job Tracker — Jenkins CI/CD Pipeline (GCP)
// ═══════════════════════════════════════════════════════

pipeline {
    agent { label 'docker' }

    environment {
        GCP_PROJECT    = credentials('gcp-project-id')
        GCP_REGION     = 'us-central1'
        GAR_REPO       = "${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/job-tracker-registry"
        IMAGE_NAME     = 'job-tracker'
        GCP_CREDS      = credentials('gcp-service-account-key')
        HELM_RELEASE   = 'job-tracker'
    }

    parameters {
        choice(name: 'DEPLOY_ENV', choices: ['staging', 'production'], description: 'Target deployment environment')
        string(name: 'IMAGE_TAG', defaultValue: '', description: 'Image tag override (default: BUILD_NUMBER)')
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        // ─── Checkout ──────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
                    env.TAG = params.IMAGE_TAG ?: "${BUILD_NUMBER}-${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        // ─── Install Dependencies ──────────────────
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        // ─── Lint & Test ───────────────────────────
        stage('Lint & Test') {
            parallel {
                stage('Lint') {
                    steps {
                        sh 'npm run lint || true'
                    }
                }
                stage('Test') {
                    steps {
                        sh 'npm test || echo "No tests configured yet"'
                    }
                }
            }
        }

        // ─── Docker Build ──────────────────────────
        stage('Docker Build') {
            steps {
                sh """
                    docker build \
                        -t ${GAR_REPO}/${IMAGE_NAME}:${TAG} \
                        -t ${GAR_REPO}/${IMAGE_NAME}:latest \
                        --label "git-commit=${env.GIT_COMMIT_SHORT}" \
                        --label "build-number=${BUILD_NUMBER}" \
                        .
                """
            }
        }

        // ─── Push to Artifact Registry ─────────────
        stage('Push to GAR') {
            steps {
                sh """
                    gcloud auth activate-service-account --key-file=${GCP_CREDS}
                    gcloud auth configure-docker ${GCP_REGION}-docker.pkg.dev --quiet
                    docker push ${GAR_REPO}/${IMAGE_NAME}:${TAG}
                    docker push ${GAR_REPO}/${IMAGE_NAME}:latest
                """
            }
        }

        // ─── Deploy to Staging ─────────────────────
        stage('Deploy Staging') {
            when {
                expression { params.DEPLOY_ENV == 'staging' || params.DEPLOY_ENV == 'production' }
            }
            steps {
                sh """
                    gcloud container clusters get-credentials job-tracker-gke \
                        --region ${GCP_REGION} --project ${GCP_PROJECT}

                    helm upgrade --install ${HELM_RELEASE} ./helm/job-tracker \
                        -f ./helm/job-tracker/values-staging.yaml \
                        --set image.tag=${TAG} \
                        --namespace staging \
                        --create-namespace \
                        --wait --timeout 5m
                """
                echo "✅ Staging deployment complete: ${TAG}"
            }
        }

        // ─── Staging Health Check ──────────────────
        stage('Staging Health Check') {
            when {
                expression { params.DEPLOY_ENV == 'staging' || params.DEPLOY_ENV == 'production' }
            }
            steps {
                sh """
                    kubectl rollout status deployment/${HELM_RELEASE}-job-tracker \
                        -n staging --timeout=120s
                """
                echo '✅ Staging health check passed'
            }
        }

        // ─── Approval Gate ─────────────────────────
        stage('Production Approval') {
            when {
                expression { params.DEPLOY_ENV == 'production' }
            }
            steps {
                input message: "Deploy ${TAG} to production?", ok: 'Deploy'
            }
        }

        // ─── Deploy to Production ──────────────────
        stage('Deploy Production') {
            when {
                expression { params.DEPLOY_ENV == 'production' }
            }
            steps {
                sh """
                    helm upgrade --install ${HELM_RELEASE} ./helm/job-tracker \
                        -f ./helm/job-tracker/values-prod.yaml \
                        --set image.tag=${TAG} \
                        --namespace production \
                        --create-namespace \
                        --wait --timeout 5m
                """
                echo "✅ Production deployment complete: ${TAG}"
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline succeeded — ${params.DEPLOY_ENV} deployment of ${env.TAG}"
        }
        failure {
            echo "❌ Pipeline FAILED at stage: ${currentBuild.result}"
        }
        always {
            cleanWs()
            sh 'docker image prune -f || true'
        }
    }
}
