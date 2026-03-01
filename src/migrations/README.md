# Database Migrations

This directory contains TypeORM migrations for the recruit-backend database schema.

## Available Migrations

### AddAiAnalysisToApplication (1735000000000)

Adds the `aiAnalysis` JSON column to the `application` table to store complete AI screening results.

**Changes:**
- Adds `aiAnalysis` column (type: json, nullable: true)
- Backward compatible with existing records

## Running Migrations

### Run pending migrations
```bash
npm run migration:run
```

### Revert last migration
```bash
npm run migration:revert
```

### Generate new migration
```bash
npm run migration:generate -- -n MigrationName
```

## Notes

- The project currently uses `synchronize: true` in development, which auto-syncs schema changes
- Migrations are recommended for production environments
- All migrations should be reversible (implement both `up` and `down` methods)
- New columns should be nullable for backward compatibility
