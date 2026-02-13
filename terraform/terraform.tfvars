project_id = "my-gcp-project-id"
region     = "us-central1"
environment = "dev"

# GKE
cluster_name      = "job-tracker-gke"
node_machine_type = "e2-medium"
node_count        = 1
min_node_count    = 1
max_node_count    = 3

# Networking
vpc_name     = "job-tracker-vpc"
subnet_cidr  = "10.0.0.0/20"
pods_cidr    = "10.4.0.0/14"
services_cidr = "10.8.0.0/20"

# Registry
registry_name = "job-tracker-registry"
