# Job Application Portal (API + Frontend)

REST API + single-deploy web UI for candidate accounts, job listings, resume uploads, and job applications. Backend: Express, PostgreSQL, Sequelize, JWT, Multer. Frontend: vanilla HTML/CSS/JS in `public/`, served by the same Express app (no build step).

## Project Overview

Candidates can register and log in, maintain a resume, browse jobs, apply once per job, and view only their own applications. The API uses UUID identifiers and a unique `(user_id, job_id)` database constraint.

## Frontend

Open `http://localhost:5000/` after `npm run dev` — same origin, no CORS setup needed.

- Login / Register (JWT stored in `localStorage`)
- Jobs tab: "Recommended for you" skill-matched ranking after resume upload, search, pagination, details modal, 1-click Apply, post-a-job demo form
- My Applications tab: your applications only
- Profile tab: view profile, detected resume skill tags, upload/replace resume (PDF/DOCX best, DOC best-effort, 5 MB)
- Same Render deployment serves both UI and API.

## Features

- Password hashing with bcryptjs and JWT protected endpoints
- Job listing and details with pagination
- Resume upload and replacement (PDF, DOC, DOCX; 5 MB maximum) with automatic skill extraction
- Skill-based job recommendations (`GET /api/jobs/matched`: match_score / match_percent per job)
- Candidate scoped application views and duplicate application protection
- Validation, centralized errors, Helmet, CORS, rate limiting, and request logging
- Sequelize creates/updates database tables at server startup

## Technology Stack

Node.js (CommonJS), Express, PostgreSQL, Sequelize, JWT, bcryptjs, Multer, dotenv, express-validator, Helmet, CORS, express-rate-limit, morgan, pdf-parse, mammoth, and Postman.

## Project Structure

```text
job-application-portal/
├── public/{index.html,styles.css,app.js}
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

Base URL (local): `http://localhost:5000`

### Health and root

| Method | URL | Auth | Result |
|---|---|---|---|
| GET | `/` | No | API name and version |
| GET | `/api/health` | No | `{ "success": true, "message": "API is running" }` |

```json
// GET /api/health -> 200
{ "success": true, "message": "API is running" }
```

### 1. Register — `POST /api/auth/register` (public)

Request:

```json
{
  "name": "Vraj Vekariya",
  "email": "vraj@example.com",
  "password": "Password@123"
}
```

Response `201`:

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "name": "Vraj Vekariya",
    "email": "vraj@example.com"
  }
}
```

Errors: `422` invalid fields, `409` email already registered.

### 2. Login — `POST /api/auth/login` (public)

Request:

```json
{
  "email": "vraj@example.com",
  "password": "Password@123"
}
```

Response `200`:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "<JWT_TOKEN>",
    "user": {
      "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "name": "Vraj Vekariya",
      "email": "vraj@example.com"
    }
  }
}
```

Errors: `422` invalid input, `401` invalid credentials.

### 3. Current profile — `GET /api/users/me` (Bearer token)

Response `200`:

```json
{
  "success": true,
  "message": "Current user retrieved successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "name": "Vraj Vekariya",
    "email": "vraj@example.com",
    "resume_url": "/uploads/resumes/resume-uuid.pdf"
  }
}
```

Errors: `401` missing, invalid, or expired token.

### 4. Upload / replace resume — `POST /api/users/resume` (Bearer token, `multipart/form-data`)

Form field: `resume` = file (PDF, DOC, DOCX; max 5 MB).

Response `200`:

```json
{
  "success": true,
  "message": "Resume uploaded successfully",
  "data": {
    "resume_url": "/uploads/resumes/resume-uuid.pdf",
    "resume_skills": ["Node.js", "Express.js", "PostgreSQL", "React"],
    "message_hint": "Detected 4 skill(s). See GET /api/jobs/matched for jobs matching your profile."
  }
}
```

The server extracts text (PDF via `pdf-parse`, DOCX via `mammoth`) and matches it against a known-skill vocabulary (~50 skills: languages, frameworks, DBs, DevOps, cloud). Detected skills are stored on the user and returned by `GET /api/users/me` as `resume_skills`. Scanned `.doc` (legacy binary) falls back to best-effort text; text-based PDF/DOCX gives best results.

Errors: `400` missing/unsupported file, `413` over limit, `401` auth failure.

### 5. Matched jobs (skill-based) — `GET /api/jobs/matched` (Bearer token)

Ranks all jobs by overlap between your resume skills and each job's `skills` list. Each job gets `match_score` (0–1), `match_percent`, and `matched_skills`. Sorted best match first.

Response `200`:

```json
{
  "success": true,
  "message": "Skill-matched jobs retrieved successfully",
  "data": {
    "resume_skills": ["Node.js", "Express.js", "PostgreSQL"],
    "total": 5,
    "jobs": [
      {
        "id": "job-uuid-1",
        "title": "Node.js Developer Intern",
        "company": "Potenz Technology",
        "skills": "Node.js, Express.js, PostgreSQL",
        "match_score": 1,
        "match_percent": 100,
        "matched_skills": ["node.js", "express.js", "postgresql"]
      }
    ]
  }
}
```

With no detected skills it returns all jobs unranked (`match_score: 0`). Errors: `401` unauthenticated.

### 6. List jobs — `GET /api/jobs?page=1&limit=10` (public)

Response `200`:

```json
{
  "success": true,
  "data": [
    {
      "id": "job-uuid-1",
      "title": "Node.js Developer Intern",
      "company": "Potenz Technology",
      "description": "Build and maintain backend APIs...",
      "location": "Ahmedabad",
      "employment_type": "Internship",
      "skills": "Node.js, Express.js, PostgreSQL"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 }
}
```

### 7. Get job — `GET /api/jobs/:id` (public, UUID)

Response `200`:

```json
{
  "success": true,
  "message": "Job retrieved successfully",
  "data": {
    "id": "job-uuid-1",
    "title": "Node.js Developer Intern",
    "company": "Potenz Technology",
    "description": "Build and maintain backend APIs...",
    "location": "Ahmedabad",
    "employment_type": "Internship",
    "skills": "Node.js, Express.js, PostgreSQL"
  }
}
```

Errors: `400` malformed ID, `404` job not found.

### 8. Create job — `POST /api/jobs` (public for this assignment, JSON)

Request:

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

Response `201`:

```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "id": "new-job-uuid",
    "title": "Backend Developer Intern",
    "company": "ABC Technologies",
    "description": "Work with Node.js APIs",
    "location": "Ahmedabad",
    "employment_type": "Internship",
    "skills": "Node.js, Express.js, PostgreSQL"
  }
}
```

Required: title, company, description, location, employment_type. Errors: `422` validation failure.

### 9. Apply for a job — `POST /api/applications` (Bearer token, JSON)

Request:

```json
{ "job_id": "<job UUID>" }
```

Response `201`:

```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "id": "<application UUID>",
    "job_id": "<job UUID>",
    "status": "Applied"
  }
}
```

Errors: `401` unauthenticated, `404` job missing, `409` already applied, `422` invalid UUID.

### 10. List my applications — `GET /api/applications` (Bearer token)

Response `200`:

```json
{
  "success": true,
  "message": "Applications retrieved successfully",
  "data": [
    {
      "id": "<application UUID>",
      "status": "Applied",
      "Job": { "id": "<job UUID>", "title": "Node.js Developer Intern", "company": "Potenz Technology" }
    }
  ]
}
```

Errors: `401` unauthenticated.

### 11. Get my application — `GET /api/applications/:id` (Bearer token, UUID)

Response `200`:

```json
{
  "success": true,
  "message": "Application retrieved successfully",
  "data": {
    "id": "<application UUID>",
    "status": "Applied",
    "Job": {
      "id": "<job UUID>",
      "title": "Node.js Developer Intern",
      "company": "Potenz Technology",
      "description": "Build and maintain backend APIs...",
      "location": "Ahmedabad",
      "employment_type": "Internship",
      "skills": "Node.js, Express.js, PostgreSQL"
    }
  }
}
```

A missing or other user's application returns `404`. Invalid UUID returns `422`.

Unknown paths return 404. Unexpected server errors return a generic 500 response; stack traces are logged only outside production.

## Postman

Import `postman/Job-Application-Portal.postman_collection.json`. The collection sets `baseUrl` to `http://localhost:5000`, stores the login token automatically, and captures job/application IDs from responses. Suggested order: Health Check, Register, Login, Get Current User, Upload Resume (select a file), Get Matched Jobs (skill-based), Get All Jobs, Get Job By ID, Apply For Job, Get My Applications, Get Application By ID. Create Job is optional; seeding provides five jobs.

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

Sample `.env` (see also `.env.example` — never commit real secrets):

```text
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/job_portal
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
UPLOAD_DIR=uploads/resumes
```

## Security Notes

Passwords are bcrypt hashed and excluded from default user queries. JWT secrets and database credentials belong in environment variables. ORM queries are parameterized. Rate limiting, Helmet, validation, ownership checks, and upload restrictions are enabled. Job creation is intentionally public per the assignment; add an admin role before exposing it in a real hiring system.

## Author

Node.js Developer Intern Technical Assignment.
