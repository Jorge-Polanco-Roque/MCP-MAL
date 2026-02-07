terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
  backend "gcs" {
    bucket = "mal-terraform-state"
    prefix = "mcp-hub"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# --- Service Account ---
resource "google_service_account" "mcp_hub" {
  account_id   = "mal-mcp-hub"
  display_name = "MAL MCP Hub"
}

resource "google_project_iam_member" "roles" {
  for_each = toset([
    "roles/datastore.user",
    "roles/storage.objectAdmin",
    "roles/secretmanager.secretAccessor",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.mcp_hub.email}"
}

# --- Firestore ---
resource "google_firestore_database" "catalog" {
  name        = "mal-catalog"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
}

# --- Cloud Storage ---
resource "google_storage_bucket" "assets" {
  name     = "mal-mcp-assets-${var.project_id}"
  location = upper(var.region)
  versioning {
    enabled = true
  }
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      num_newer_versions = 10
    }
  }
}

# --- Secret Manager ---
resource "google_secret_manager_secret" "api_keys" {
  secret_id = "mal-mcp-api-keys"
  replication {
    auto {}
  }
}

# --- Artifact Registry ---
resource "google_artifact_registry_repository" "registry" {
  location      = var.region
  repository_id = "mal-registry"
  format        = "DOCKER"
}

# --- Cloud Run ---
resource "google_cloud_run_v2_service" "mcp_hub" {
  name     = "mal-mcp-hub"
  location = var.region

  template {
    service_account = google_service_account.mcp_hub.email

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/mal-registry/mal-mcp-hub:latest"
      ports {
        container_port = 3000
      }

      env {
        name  = "INFRA_MODE"
        value = "gcp"
      }
      env {
        name  = "TRANSPORT"
        value = "http"
      }
      env {
        name  = "FIRESTORE_PROJECT"
        value = var.project_id
      }
      env {
        name  = "GCS_BUCKET"
        value = google_storage_bucket.assets.name
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }
    }

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }
  }
}
