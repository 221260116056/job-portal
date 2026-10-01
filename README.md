# Job Application Portal (API + Frontend)

REST API + single-deploy web UI for candidate accounts, job listings, resume uploads, and job applications. Backend: Express, PostgreSQL, Sequelize, JWT, Multer. Frontend: vanilla HTML/CSS/JS in `public/`, served by the same Express app (no build step).

## Project Overview

Two account types with separate JWT auth (`role: "candidate" | "company"`):

- **Candidates** register/log in, maintain a resume (skills auto-extracted), browse jobs, apply once per job, and track their own application statuses. The API uses UUID identifiers and a unique `(user_id, job_id)` database constraint.
- **Companies** register/log in, post jobs from a dashboard, see only their own jobs, view applications for those jobs (with candidate resumes), and update application statuses (`Applied → Under Review → Shortlisted → Rejected`).

Job creation is company-only (`POST /api/company/jobs`, company taken from the JWT — any `company`/`company_id` in the body is ignored). There is no public job-creation endpoint or form.

## Frontend

Open `http://localhost:5000/` after `npm run dev` — same origin, no CORS setup needed. Hash routes with role guards (backend enforces the same rules):

- Public: `#/jobs` (Available Jobs, search, pagination, details, Apply), `#/login`, `#/register` (confirm password), `#/company/login`, `#/company/register`
- Candidate (after login): Jobs (+ skill-matched recommendations), `#/my-applications` (status tracking), `#/profile` (skill tags + resume upload)
- Company (after login): `#/company/dashboard` (stats + own jobs + Edit), `#/company/jobs`, `#/company/jobs/create`, `#/company/jobs/:id/edit`, `#/company/applications` (job/status filters, resume links, status dropdown)
- Same Render deployment serves both UI and API. Deep paths (`/login`, `/company/dashboard`, …) serve the SPA directly.

## Features

- Password hashing with bcryptjs and role-based JWT auth (`authenticateToken`, `requireCandidate`, `requireCompany`)
- Public job listing and details with pagination; skill-based recommendations for candidates
- Company job CRUD scoped to the JWT company; cross-company access returns 404
- Company application inbox (candidate + resume) with ownership-checked status updates
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
│   ├── controllers/{authController,jobController,applicationController,userController,companyAuthController,companyJobController,companyApplicationController}.js
│   ├── middleware/{authMiddleware,uploadMiddleware,errorMiddleware,validationMiddleware}.js
│   ├── models/{User,Company,Job,Application,index}.js
│   ├── routes/{authRoutes,jobRoutes,applicationRoutes,userRoutes,companyRoutes}.js
│   ├── seed/seedJobs.js (also seeds demo company `company@example.com` / `Password@123`)
│   ├── utils/{generateToken (role-aware),response,extractSkills,parseResume}.js
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
    "skills": ["Node.js", "Express.js", "PostgreSQL", "React.js"],
    "message_hint": "Detected 4 skill(s). See GET /api/jobs/recommended for jobs matching your profile."
  }
}
```

The server extracts text (PDF via `pdf-parse`, DOCX via `mammoth`) and matches it against the skill dictionary in `src/utils/extractSkills.js`. Files with no extractable text are rejected with `422 "Unable to extract text from this resume"` (the upload is discarded, nothing is stored). Detected skills are stored in `users.skills` (JSONB) and returned by `GET /api/users/me` and `GET /api/users/skills`. Raw `resume_text` is stored for matching but never returned by normal user endpoints. Re-uploading replaces `resume_url`, text, and skills, so recommendations change immediately. Legacy `.doc` uploads are accepted but parsed best-effort; text-based PDF/DOCX gives best results.

Errors: `400` missing/unsupported file, `413` over limit, `401` auth failure.

### 5. Recommended jobs — `GET /api/jobs/recommended` (candidate JWT)

Ranks jobs by overlap between your stored resume skills and each job's required `skills`. Only jobs with `match_percentage >= MIN_JOB_MATCH_PERCENTAGE` (default `30`) are returned, sorted best match first. Calculation is backend-only; the frontend only displays the result.

Formula: `match_percentage = round(matching required skills / total required job skills × 100)`

Example: candidate `Node.js, React.js, PostgreSQL` vs job `Node.js, Express.js, PostgreSQL, Docker` → matches `Node.js, PostgreSQL` → `2 / 4 = 50%`.

Response `200`:

```json
{
  "success": true,
  "message": "Recommended jobs retrieved successfully",
  "data": [
    {
      "id": "job-uuid-1",
      "title": "Node.js Developer Intern",
      "company": "ABC Technologies",
      "location": "Ahmedabad",
      "employment_type": "Internship",
      "skills": ["Node.js", "Express.js", "PostgreSQL"],
      "match_percentage": 100,
      "matched_skills": ["Node.js", "Express.js", "PostgreSQL"]
    }
  ]
}
```

No stored skills → `200 "Upload your resume to get personalized job recommendations."` with `data: []` (no fake percentages). No jobs above the threshold → `200 "No matching jobs found"` with `data: []`. Errors: `401` unauthenticated, `403` company token. (`GET /api/jobs/matched` remains as a legacy alias with the older response shape.)

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

### 8. Company auth — `POST /api/company/auth/register` / `POST /api/company/auth/login` (public)

Register request:

```json
{
  "company_name": "ABC Technologies",
  "email": "hr@abc.example.com",
  "password": "Password@123",
  "location": "Ahmedabad",
  "website": "https://example.com"
}
```

Login request: `{ "email": "hr@abc.example.com", "password": "Password@123" }`. Response `200` returns `{ token, role: "company", company: { id, company_name, email, location, website } }`. Passwords are bcrypt-hashed and never returned. Errors: `422` invalid fields, `409` duplicate email, `401` bad credentials.

### 9. Company jobs — `GET/POST /api/company/jobs`, `GET/PUT/DELETE /api/company/jobs/:id` (company JWT)

Scoped to the JWT company; another company's job IDs return `404`. Create/update request (`skills` required — array or comma string; `company`/`company_id` ignored, taken from the token):

```json
{
  "title": "Backend Developer Intern",
  "description": "Work with Node.js APIs",
  "location": "Ahmedabad",
  "employment_type": "Internship",
  "skills": ["Node.js", "Express.js", "PostgreSQL"]
}
```

List response includes `applications_count` per job. Errors: `401` unauthenticated, `403` candidate token, `422` validation failure.

### 10. Company applications — `GET /api/company/applications` (company JWT)

Returns applications for the company's own jobs only:

```json
{
  "success": true,
  "message": "Company applications retrieved successfully",
  "data": [
    {
      "id": "<application UUID>",
      "status": "Applied",
      "candidate": { "name": "Vraj Vekariya", "email": "vraj@example.com", "resume_url": "/uploads/resumes/resume-uuid.pdf" },
      "job": { "id": "<job UUID>", "title": "Node.js Developer Intern" },
      "applied_at": "2026-10-01T10:00:00.000Z"
    }
  ]
}
```

### 11. Update application status — `PUT /api/company/applications/:id/status` (company JWT)

Request: `{ "status": "Shortlisted" }`. Allowed: `Applied`, `Under Review`, `Shortlisted`, `Rejected` (else `422`). Only the owning company can update (else `404`).

### 12. Apply for a job — `POST /api/applications` (candidate JWT, JSON)

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

### 13. List my applications — `GET /api/applications` (candidate JWT)

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

### 14. Get my application — `GET /api/applications/:id` (candidate JWT, UUID)

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

Import `postman/Job-Application-Portal.postman_collection.json`. Candidate login stores `candidateToken`, company login stores `companyToken`; protected requests use the correct variable automatically. and captures job/application IDs from responses. Suggested order: Register → Login → Get Profile → Upload Resume (select a file) → Get Skills → Get All Jobs → Get Recommended Jobs → Apply For Job → Get My Applications, then Company Register → Company Login → Create Job → Get Company Jobs → Update Job → Get Company Applications → Update Application Status → Delete Job. Seeding (`npm run seed`) provides five jobs plus demo company `company@example.com` / `Password@123`.

## Resume Upload

The Multer disk store places local files in `uploads/resumes/`, gives them UUID based names, checks extension and MIME type, and enforces a 5 MB cap. The previous file is removed after a successful replacement where possible.

## Resume-Based Job Recommendation

1. Candidate uploads a resume (`POST /api/users/resume`, PDF/DOCX best, DOC best-effort, 5 MB).
2. Resume text is extracted (`pdf-parse` for PDF, `mammoth` for DOCX). Unreadable files are rejected with `422` and never stored.
3. Supported skills are detected case-insensitively against the dictionary in `src/utils/extractSkills.js` (no duplicates, no invented skills).
4. Skills are stored in `users.skills` (PostgreSQL JSONB); raw text is stored but never returned by user endpoints.
5. Each job's required `skills` (mandatory on company create/update, normalized to an array) are compared with the candidate's skills.
6. Match percentage is calculated: `match_percentage = round(matching required skills / total required job skills × 100)`.
7. `GET /api/jobs/recommended` returns jobs with `match_percentage >= MIN_JOB_MATCH_PERCENTAGE` (default `30`), sorted descending, each with `matched_skills`.

Example: candidate `Node.js, Express.js, PostgreSQL, React.js` vs `Node.js Developer Intern` requiring `Node.js, Express.js, PostgreSQL` → `3/3 = 100%` with all three matched; vs a job also requiring `Docker` → `3/4 = 75%`. Re-uploading a resume replaces skills and recommendations immediately. Companies never see recommendations — only their own jobs, applications, and candidate resumes.

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
| `MIN_JOB_MATCH_PERCENTAGE` | No | Minimum skill-match % for recommendations; defaults to `30` |

Sample `.env` (see also `.env.example` — never commit real secrets):

```text
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/job_portal
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
UPLOAD_DIR=uploads/resumes
MIN_JOB_MATCH_PERCENTAGE=30
```

## Security Notes

Passwords (candidate + company) are bcrypt hashed and excluded from default queries. JWTs carry `{ sub, role }`; `requireCandidate` / `requireCompany` enforce roles and return 401/403 — company identity and candidate identity always come from the token, never from request bodies. Cross-company job/application access returns 404. ORM queries are parameterized. Rate limiting, Helmet, validation, ownership checks, and upload restrictions are enabled.

## Author

Node.js Developer Intern Technical Assignment.
