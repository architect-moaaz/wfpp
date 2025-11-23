# Database Setup - PostgreSQL k1 Schema

This document explains how to set up the PostgreSQL database for Workflow++.

## Overview

Workflow++ uses PostgreSQL with a dedicated schema called `k1` for storing platform metadata:
- Applications
- Workflows
- Forms
- Data Models
- Pages
- Mobile UI
- Rules
- APIs

This is the **platform database** - it stores information about the applications created in Workflow++, not the data for the generated applications themselves.

## Prerequisites

1. PostgreSQL installed (version 12 or higher recommended)
2. PostgreSQL server running
3. Access to create databases and schemas

## Database Configuration

Database connection settings are stored in `.env`:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workflowpp
DB_USER=postgres
DB_PASSWORD=postgres
```

Update these values according to your PostgreSQL installation.

## Setup Steps

### 1. Create Database

Connect to PostgreSQL and create the database:

```bash
psql -U postgres
```

```sql
CREATE DATABASE workflowpp;
\c workflowpp
```

### 2. Run Migration

From the backend directory, run the migration script:

```bash
cd /Users/m/Work/code/workflowpp/backend
node src/database/migrate.js
```

This will:
- Create the `k1` schema
- Create all required tables
- Set up indexes and constraints
- Add triggers for automatic timestamp updates

### 3. Verify Installation

Check that the schema and tables were created:

```sql
-- Connect to the database
\c workflowpp

-- List all schemas
\dn

-- Set search path
SET search_path TO k1;

-- List all tables
\dt

-- Check table structure
\d applications
\d workflows
\d forms
\d data_models
\d pages
```

## Schema Structure

### k1.applications
Main applications table with metadata, theme, deployment info, etc.

### k1.workflows
Workflow definitions with nodes, edges, and connections stored as JSONB.

### k1.data_models
Data model schemas with fields, relationships, and constraints.

### k1.forms
Form definitions with fields, layouts, and validation rules.

### k1.pages
Page definitions with components, layouts, and linked resources.

### k1.mobile_ui
Mobile UI configurations (one per application).

### k1.rules
Business rules with conditions and actions.

### k1.apis
API endpoint definitions with request/response schemas.

### k1.application_versions
Version history snapshots for applications.

## Migration from File-Based Storage

If you have existing applications in `backend/data/applications.json`, you can migrate them:

```bash
# Create a backup first
cp backend/data/applications.json backend/data/applications.json.backup

# Run the migration script (to be created)
node src/database/migrate-data.js
```

Note: The data migration script needs to be created if you want to preserve existing applications.

## Troubleshooting

### Connection Errors

If you get connection errors:

1. Check that PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Verify credentials in `.env`

3. Check PostgreSQL is listening on the correct port:
   ```bash
   psql -U postgres -h localhost -p 5432
   ```

### Permission Errors

Ensure your database user has sufficient privileges:

```sql
GRANT ALL PRIVILEGES ON DATABASE workflowpp TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA k1 TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA k1 TO postgres;
```

### Schema Not Found

If queries fail with "schema not found":

```sql
-- Check if schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'k1';

-- If not, re-run migration
node src/database/migrate.js
```

## Development vs Production

For development, you can use the default PostgreSQL user. For production:

1. Create a dedicated user:
   ```sql
   CREATE USER workflowpp_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE workflowpp TO workflowpp_user;
   ```

2. Update `.env` with production credentials

3. Consider using connection pooling and SSL

## Backup and Restore

### Backup

```bash
# Backup entire database
pg_dump -U postgres workflowpp > workflowpp_backup.sql

# Backup only k1 schema
pg_dump -U postgres -n k1 workflowpp > k1_schema_backup.sql
```

### Restore

```bash
# Restore entire database
psql -U postgres workflowpp < workflowpp_backup.sql

# Restore only k1 schema
psql -U postgres workflowpp < k1_schema_backup.sql
```

## Performance Optimization

For large datasets, consider:

1. **Indexes**: Already created on frequently queried columns
2. **Vacuuming**: Run `VACUUM ANALYZE` periodically
3. **Connection Pooling**: Configured in `database.js` (max 20 connections)
4. **Query Optimization**: Use `EXPLAIN ANALYZE` to check query performance

## Notes

- All JSONB fields support advanced querying with PostgreSQL's JSONB operators
- Timestamps are automatically updated via triggers
- Foreign keys ensure referential integrity
- Cascading deletes remove all related resources when an application is deleted
