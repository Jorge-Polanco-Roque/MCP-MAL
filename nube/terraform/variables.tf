variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "min_instances" {
  description = "Minimum Cloud Run instances (0 for scale-to-zero)"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum Cloud Run instances"
  type        = number
  default     = 10
}

variable "alert_email" {
  description = "Email address for monitoring alerts (empty = no alerts)"
  type        = string
  default     = ""
}

variable "enable_cloud_armor" {
  description = "Enable Cloud Armor WAF with rate limiting"
  type        = bool
  default     = false
}

variable "session_timeout_ms" {
  description = "MCP session idle timeout in milliseconds"
  type        = number
  default     = 1800000 # 30 minutes
}

variable "max_sessions" {
  description = "Maximum concurrent MCP sessions"
  type        = number
  default     = 100
}

variable "cors_origins" {
  description = "Comma-separated allowed CORS origins (empty = same-origin only)"
  type        = string
  default     = ""
}

variable "firestore_database_id" {
  description = "Firestore database ID"
  type        = string
  default     = "mal-catalog"
}
