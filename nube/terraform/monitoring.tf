# --- Notification Channel ---
resource "google_monitoring_notification_channel" "email" {
  count        = var.alert_email != "" ? 1 : 0
  display_name = "MAL MCP Hub Alerts"
  type         = "email"
  labels = {
    email_address = var.alert_email
  }
}

locals {
  notification_channels = var.alert_email != "" ? [google_monitoring_notification_channel.email[0].name] : []
}

# --- Uptime Check on /health ---
resource "google_monitoring_uptime_check_config" "health" {
  display_name = "mal-mcp-hub /health"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = "/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = trimprefix(trimsuffix(google_cloud_run_v2_service.mcp_hub.uri, "/"), "https://")
    }
  }
}

# --- Alert: Error Rate > 5% for 5 min ---
resource "google_monitoring_alert_policy" "error_rate" {
  display_name = "mal-mcp-hub: High Error Rate (>5%)"
  combiner     = "OR"

  conditions {
    display_name = "Error rate > 5%"
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"mal-mcp-hub\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class!=\"2xx\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = local.notification_channels
}

# --- Alert: Latency p95 > 5s for 5 min ---
resource "google_monitoring_alert_policy" "latency" {
  display_name = "mal-mcp-hub: High Latency (p95 > 5s)"
  combiner     = "OR"

  conditions {
    display_name = "p95 latency > 5s"
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"mal-mcp-hub\" AND metric.type=\"run.googleapis.com/request_latencies\""
      comparison      = "COMPARISON_GT"
      threshold_value = 5000
      duration        = "300s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_PERCENTILE_95"
      }
    }
  }

  notification_channels = local.notification_channels
}

# --- Alert: Max instances sustained for > 10 min ---
resource "google_monitoring_alert_policy" "max_instances" {
  display_name = "mal-mcp-hub: At Max Instances (>10 min)"
  combiner     = "OR"

  conditions {
    display_name = "Instance count at max"
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"mal-mcp-hub\" AND metric.type=\"run.googleapis.com/container/instance_count\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.max_instances - 1
      duration        = "600s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MAX"
      }
    }
  }

  notification_channels = local.notification_channels
}
