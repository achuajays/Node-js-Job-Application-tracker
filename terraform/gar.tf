# ═══════════════════════════════════════════════════════
# Artifact Registry (Docker images)
# ═══════════════════════════════════════════════════════

resource "google_artifact_registry_repository" "this" {
  location      = var.region
  repository_id = var.registry_name
  description   = "Docker images for Job Tracker application"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-recent-versions"
    action = "KEEP"

    most_recent_versions {
      keep_count = 10
    }
  }

  labels = {
    environment = var.environment
    app         = "job-tracker"
    managed-by  = "terraform"
  }
}
