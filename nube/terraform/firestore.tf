# --- Firestore Composite Indexes ---

# Skills: category + updated_at
resource "google_firestore_index" "skills_category" {
  project    = var.project_id
  database   = google_firestore_database.catalog.name
  collection = "skills"

  fields {
    field_path = "category"
    order      = "ASCENDING"
  }
  fields {
    field_path = "updated_at"
    order      = "DESCENDING"
  }
}

# Skills: search_tokens (array-contains-any)
resource "google_firestore_index" "skills_search" {
  project    = var.project_id
  database   = google_firestore_database.catalog.name
  collection = "skills"

  fields {
    field_path   = "search_tokens"
    array_config = "CONTAINS"
  }
  fields {
    field_path = "updated_at"
    order      = "DESCENDING"
  }
}

# Commands: category + updated_at
resource "google_firestore_index" "commands_category" {
  project    = var.project_id
  database   = google_firestore_database.catalog.name
  collection = "commands"

  fields {
    field_path = "category"
    order      = "ASCENDING"
  }
  fields {
    field_path = "updated_at"
    order      = "DESCENDING"
  }
}

# Commands: search_tokens
resource "google_firestore_index" "commands_search" {
  project    = var.project_id
  database   = google_firestore_database.catalog.name
  collection = "commands"

  fields {
    field_path   = "search_tokens"
    array_config = "CONTAINS"
  }
  fields {
    field_path = "updated_at"
    order      = "DESCENDING"
  }
}

# Subagents: search_tokens
resource "google_firestore_index" "subagents_search" {
  project    = var.project_id
  database   = google_firestore_database.catalog.name
  collection = "subagents"

  fields {
    field_path   = "search_tokens"
    array_config = "CONTAINS"
  }
  fields {
    field_path = "updated_at"
    order      = "DESCENDING"
  }
}

# MCPs: status + updated_at
resource "google_firestore_index" "mcps_status" {
  project    = var.project_id
  database   = google_firestore_database.catalog.name
  collection = "mcps"

  fields {
    field_path = "status"
    order      = "ASCENDING"
  }
  fields {
    field_path = "updated_at"
    order      = "DESCENDING"
  }
}

# MCPs: search_tokens
resource "google_firestore_index" "mcps_search" {
  project    = var.project_id
  database   = google_firestore_database.catalog.name
  collection = "mcps"

  fields {
    field_path   = "search_tokens"
    array_config = "CONTAINS"
  }
  fields {
    field_path = "updated_at"
    order      = "DESCENDING"
  }
}

# --- Firestore Backup Schedule ---
resource "google_firestore_backup_schedule" "daily" {
  project  = var.project_id
  database = google_firestore_database.catalog.name

  retention = "604800s" # 7 days

  daily_recurrence {}
}
