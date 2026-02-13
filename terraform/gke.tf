# ═══════════════════════════════════════════════════════
# GKE Cluster
# ═══════════════════════════════════════════════════════

resource "google_container_cluster" "this" {
  name     = var.cluster_name
  location = var.region

  # We manage our own node pool
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.this.id
  subnetwork = google_compute_subnetwork.this.id

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Enable Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Network policy
  network_policy {
    enabled = true
  }

  # Release channel for auto-upgrades
  release_channel {
    channel = "REGULAR"
  }

  # Logging & monitoring
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]
    managed_prometheus {
      enabled = true
    }
  }

  # Private cluster
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Maintenance window (Sun 2am-6am)
  maintenance_policy {
    daily_maintenance_window {
      start_time = "02:00"
    }
  }

  deletion_protection = false

  resource_labels = {
    environment = var.environment
    app         = "job-tracker"
    managed-by  = "terraform"
  }
}

# ─── Node Pool ────────────────────────────────────
resource "google_container_node_pool" "primary" {
  name     = "${var.cluster_name}-primary-pool"
  location = var.region
  cluster  = google_container_cluster.this.name

  initial_node_count = var.node_count

  autoscaling {
    min_node_count = var.min_node_count
    max_node_count = var.max_node_count
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    machine_type = var.node_machine_type
    disk_size_gb = var.node_disk_size_gb
    disk_type    = "pd-standard"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    service_account = google_service_account.gke_node.email

    # Workload Identity
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = {
      environment = var.environment
      app         = "job-tracker"
    }

    tags = ["gke-node", var.cluster_name]

    shielded_instance_config {
      enable_secure_boot = true
    }
  }
}
