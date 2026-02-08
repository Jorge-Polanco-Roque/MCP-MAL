output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.mcp_hub.uri
}

output "cloud_run_service_name" {
  description = "Cloud Run service name"
  value       = google_cloud_run_v2_service.mcp_hub.name
}

output "service_account_email" {
  description = "Service account email"
  value       = google_service_account.mcp_hub.email
}

output "gcs_bucket_name" {
  description = "GCS assets bucket name"
  value       = google_storage_bucket.assets.name
}

output "firestore_database_name" {
  description = "Firestore database name"
  value       = google_firestore_database.catalog.name
}

output "vpc_connector_name" {
  description = "VPC access connector name"
  value       = google_vpc_access_connector.connector.name
}

output "artifact_registry_url" {
  description = "Docker image registry URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.registry.repository_id}"
}
