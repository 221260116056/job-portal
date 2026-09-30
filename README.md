# Job Application Portal API

REST API for candidate accounts, job listings, resume uploads, and job applications. It uses Express, PostgreSQL, Sequelize, JWT, and Multer.

## Project Overview

Candidates can register and log in, maintain a resume, browse jobs, apply once per job, and view only their own applications. The API uses UUID identifiers and a unique `(user_id, job_id)` database constraint.

## Features

- Password hashing with bcryptjs and JWT protected endpoints
- Job listing and details with pagination
- Resume upload and replacement (PDF, DOC, DOCX; 5 MB maximum)
- Candidate scoped application views and duplicate application protection
- Validation, centralized errors, Helmet, CORS, rate limiting, and request logging
- Sequelize creates/updates database tables at server startup

## Technology Stack

Node.js (CommonJS), Express, PostgreSQL, Sequelize, JWT, bcryptjs, Multer, dotenv, express-validator, Helmet, CORS, express-rate-limit, morgan, and Postman.

## Project Structure

```text
job-application-portal/
├── src/
│   ├── config/database.js
│   ├── controllers/{authController,jobController,applicationController,userController}.js
│   ├── middleware/{authMiddleware,uploadMiddleware,errorMiddleware,validationMiddleware}.js
│   ├── models/{User,Job,Application,index}.js
│   ├── routes/{authRoutes,jobRoutes,applicationRoutes,userRoutes}.js
│   ├── seed/seedJobs.js
│   ├── utils/{generateToken,response}.js
│   └── app.js
├── uploads/resumes/.gitkeep
├── postman/Job-Application-Portal.postman_collection.json
├── server.js
├── package.json
└── README.md
```

## Prerequisites

- Node.js 18 or newer
- PostgreSQL
- npm
- Postman

## Installation

```bash
git clone <repository-url>
cd "job-application-portal"
npm install
```

## Environment Setup

Copy `.env.example` to `.env` and set values for your machine. Keep `.env` private; it is ignored by Git. `JWT_SECRET` must be a long, unpredictable secret. `JWT_EXPIRES_IN` accepts jsonwebtoken duration syntax such as `7d` or `12h`. `UPLOAD_DIR` defaults to `uploads/resumes` relative to the project directory.

## PostgreSQL Setup

Create the database using `psql` or another PostgreSQL client:

```sql
CREATE DATABASE job_portal;
```

Set `DATABASE_URL` to a PostgreSQL connection URL, for example:

```text
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/job_portal
```

The server authenticates on startup and runs `sequelize.sync()` to create or update model tables. For a production system, use migrations and review schema changes instead of automatic alteration.

## Run Project

```bash
npm run dev
```

The API listens on `http://localhost:5000` by default (or `PORT`). Production:

```bash
npm start
```

## Seed Database

```bash
npm run seed
```

The seeder inserts five sample jobs and is safe to rerun without adding duplicate seeded titles/companies.

## API Documentation

JSON success responses use `{ "success": true, "message": "...", "data": ... }`; validation errors include an `errors` array. IDs are UUIDs. Protected routes use `Authorization: Bearer <token>`.

### Health and root

| Method | URL | Auth | Result |
|---|---|---|---|
| GET | `/` | No | API name and version |
| GET | `/api/health` | No | `{ "success": true, "message": "API is running" }` |

### Register

`POST /api/auth/register` (public, JSON). Body: `{"name":"Vraj Vekariya","email":"vraj@example.com","password":"Password@123"}`. Returns 201 and safe user fields. Errors: 422 invalid fields, 409 duplicate email.

### Login

`POST /api/auth/login` (public, JSON). Body: `{"email":"vraj@example.com","password":"Password@123"}`. Returns JWT and safe user profile. Errors: 422 invalid input, 401 invalid credentials.

### Current profile

`GET /api/users/me` (Bearer token). Returns the authenticated user's `id`, `name`, `email`, and `resume_url`. Errors: 401 missing, invalid, or expired token.

### Upload or replace resume

`POST /api/users/resume` (Bearer token, `multipart/form-data`). Include file field `resume`. Allowed extensions/types: PDF, DOC, DOCX; maximum 5 MB. Returns `resume_url`, served under `/uploads/resumes/`. Errors: 400 missing/unsupported file, 413 over limit, 401 authentication failure.

### List jobs

`GET /api/jobs?page=1&limit=10` (public). Returns job data and `{page, limit, total, totalPages}` pagination metadata. Page defaults to 1, limit to 10 and is capped at 100.

### Get job

`GET /api/jobs/:id` (public, UUID). Returns one job. Errors: 400 malformed ID, 404 job not found.

### Create job

`POST /api/jobs` (public for this assignment, JSON). Example body:

```json
{
  "title": "Backend Developer Intern",
  "company": "ABC Technologies",
  "description": "Work with Node.js APIs",
  "location": "Ahmedabad",
  "employment_type": "Internship",
  "skills": "Node.js, Express.js, PostgreSQL"
}
```

Returns 201 with created job. Required fields: title, company, description, location, employment_type. Errors: 422 validation failure.

### Apply for a job

`POST /api/applications` (Bearer token, JSON). Body: `{"job_id":"<job UUID>"}`. Returns 201 with application ID, job ID, and `Applied` status. Errors: 401 unauthenticated, 404 job missing, 409 already applied, 422 invalid UUID.

### List my applications

`GET /api/applications` (Bearer token). Returns only the current user's applications with job title and company. Errors: 401 unauthenticated.

### Get my application

`GET /api/applications/:id` (Bearer token, UUID). Returns one owned application and job details. A missing or other user's application returns 404. Invalid UUID returns 422.

Unknown paths return 404. Unexpected server errors return a generic 500 response; stack traces are logged only outside production.

## Postman

Import `postman/Job-Application-Portal.postman_collection.json`. The collection sets `baseUrl` to `http://localhost:5000`, stores the login token automatically, and captures job/application IDs from responses. Suggested order: Health Check, Register, Login, Get Current User, Upload Resume (select a file), Get All Jobs, Get Job By ID, Apply For Job, Get My Applications, Get Application By ID. Create Job is optional; seeding provides five jobs.

## Resume Upload

The Multer disk store places local files in `uploads/resumes/`, gives them UUID based names, checks extension and MIME type, and enforces a 5 MB cap. The previous file is removed after a successful replacement where possible.

## Deployment (Render)

1. Push this repository to GitHub and create a Render PostgreSQL database.
2. Create a Render Web Service connected to the repository.
3. Set build command to `npm install` and start command to `npm start`.
4. Add `NODE_ENV=production`, `DATABASE_URL` from the Render database's internal connection string, a strong `JWT_SECRET`, `JWT_EXPIRES_IN=7d`, and `UPLOAD_DIR=uploads/resumes` in the service environment. Render supplies `PORT`.
5. Deploy, then check `/api/health`. Run `npm run seed` with a one-off job or Render shell if sample listings are needed.

Use a Render PostgreSQL instance rather than localhost in deployment. Local disk uploads may not persist across Render restarts, redeployments, or instance changes. This assignment stores files locally; use persistent storage or object storage for durable production resumes.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP port; defaults to 5000 |
| `NODE_ENV` | No | Set `production` on Render |
| `DATABASE_URL` | Yes | PostgreSQL connection URL |
| `JWT_SECRET` | Yes | Secret used to sign and verify tokens |
| `JWT_EXPIRES_IN` | No | Token lifetime; defaults to `7d` |
| `UPLOAD_DIR` | No | Resume storage path; defaults to `uploads/resumes` |

## Security Notes

Passwords are bcrypt hashed and excluded from default user queries. JWT secrets and database credentials belong in environment variables. ORM queries are parameterized. Rate limiting, Helmet, validation, ownership checks, and upload restrictions are enabled. Job creation is intentionally public per the assignment; add an admin role before exposing it in a real hiring system.

## Author

Node.js Developer Intern Technical Assignment.
