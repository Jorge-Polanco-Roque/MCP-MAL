output "cloud_run_url" {
  value       = google_cloud_run_v2_service.mcp_hub.uri
  description = "Cloud Run service URL"
}

output "bucket_name" {
  value       = google_storage_bucket.assets.name
  description = "GCS bucket for assets"
}

output "service_account_email" {
  value       = google_service_account.mcp_hub.email
  description = "Service account email"
}
