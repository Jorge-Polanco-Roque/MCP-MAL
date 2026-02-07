variable "project_id" {
  type        = string
  description = "GCP Project ID"
}

variable "region" {
  type        = string
  default     = "us-central1"
  description = "GCP region for deployment"
}

variable "min_instances" {
  type        = number
  default     = 0
  description = "Minimum Cloud Run instances (0 for scale-to-zero)"
}

variable "max_instances" {
  type        = number
  default     = 10
  description = "Maximum Cloud Run instances"
}
