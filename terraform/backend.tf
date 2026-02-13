terraform {
  backend "gcs" {
    bucket = "job-tracker-tf-state"
    prefix = "terraform/state"
  }
}
