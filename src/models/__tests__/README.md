# Entity Property-Based Tests

This directory contains property-based tests for TypeORM entities using Jest and fast-check.

## Setup

### 1. Install Dependencies

Dependencies are already installed via `npm install`.

### 2. Configure Test Database

Add the following to your `.env` file:

```env
DB_TEST_NAME=recruit_test
```

Make sure your PostgreSQL credentials (DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT) are correctly set in `.env`.

### 3. Create Test Database

Create a separate test database in PostgreSQL:

```sql
CREATE DATABASE recruit_test;
```

**Important:** The test database schema will be automatically created and dropped by TypeORM's `synchronize: true` and `dropSchema: true` options. Do not use your production database for tests!

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

- **entities.properties.test.ts**: Property-based tests for entity behavior
    - Audit column tests (createdAt, updatedAt)
    - Cascade delete tests
    - Relationship integrity tests

## Property-Based Testing

Property-based tests use `fast-check` to generate random test data and verify that properties hold across all inputs. Each test runs a minimum of 100 iterations.

### Properties Tested

1. **Audit Column Creation Timestamp**: Verifies createdAt is automatically populated
2. **Audit Column Update Timestamp**: Verifies updatedAt is automatically updated
3. **Candidate Cascade Delete**: Verifies deleting a Candidate cascades to Applications
4. **JobPosting Cascade Delete**: Verifies deleting a JobPosting cascades to Applications
5. **Application Cascade Delete**: Verifies deleting an Application cascades to related entities

## Troubleshooting

### Database Connection Errors

If you see authentication errors:

1. Verify PostgreSQL is running
2. Check database credentials in `.env`
3. Ensure test database exists
4. Verify user has permissions on test database

### Entity Not Found Errors

If entities are not being loaded:

1. Ensure all entity files end with `.entity.ts`
2. Check that entities are in `src/models/` directory
3. Verify TypeScript decorators are enabled in `tsconfig.json`
