# 💼 HireFlow — Smart Job Portal & Resume Matcher

> A modern, full-stack job application platform with automated resume parsing, interactive resume building, real-time candidate-company chat, and smart skill-matched job recommendations.

---

## 🌟 Overview

**HireFlow** makes job hunting and hiring straightforward. Instead of sending resumes into a black box:
- **Candidates** upload a PDF/Word resume (or build one directly using the interactive **HireFlow Resume Builder**), automatically extract key skills, see personalized match percentages for every open role, track their application stages, and chat directly with hiring teams.
- **Companies** post jobs, manage applicant pipelines, review extracted skills, update candidate stages (Applied ➔ Under Review ➔ Shortlisted ➔ Interview ➔ Hired/Rejected), and message applicants instantly.

---

## ✨ Features

### 👤 For Candidates
- **📄 Smart Resume Parser**: Upload PDF or DOCX resumes; the system extracts skills automatically using keyword analysis.
- **✨ Interactive HireFlow Resume Builder**: Build a comprehensive online resume (Summary, Experience, Education, Projects, Certifications, Languages) with instant edit & save capabilities.
- **🎯 Skill-Matched Recommendations**: See your compatibility score (% match) for each job based on your skills.
- **🎙️ Voice Search**: Search jobs hands-free using the built-in microphone feature.
- **📁 Application Tracking**: Organize your applications across tabs: *All, Saved, In Review, Interview, and Archived*.
- **💬 Direct Chat**: Have discussions directly with company recruiters with real-time timestamps.
- **🔔 Live Notifications**: Get instant alerts when a company reviews your resume or sends a message.

### 🏢 For Companies
- **📊 Recruiter Dashboard**: Overview of posted jobs, applicant counts, and hiring pipelines.
- **📝 Job Posting & Management**: Create, edit, and close job listings with required skills, employment type, and location.
- **📥 Applicant Review**: View candidate profiles, compare ATS-extracted skills, and inspect either their uploaded resume file or their interactive HireFlow resume.
- **🔄 Status Workflow**: Update candidates through `Applied`, `Under Review`, `Shortlisted`, `Interview`, and `Rejected`.
- **💬 In-App Messaging**: Initiate or reply to candidate messages straight from the applicant card.

### 🛡️ Platform & UX Polish
- **🔑 Google & LinkedIn OAuth 2.0**: 1-click Single Sign-On with Google and LinkedIn for candidates and company recruiters.
- **Modern Glassmorphic UI**: Sleek dark theme with micro-animations and responsive mobile navigation.
- **Security & Privacy**: Role-guarded JWT authentication, bcrypt password hashing, and rate limiting.
- **Account Control**: Update your profile, change passwords (with eye show/hide toggle), or temporarily suspend/delete your account.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Vanilla JavaScript (SPA), Semantic HTML5, CSS3 Glassmorphism |
| **Backend** | Node.js, Express.js (REST API) |
| **Database** | PostgreSQL, Sequelize ORM |
| **Resume Extraction** | `pdf-parse`, `mammoth` (DOCX), Custom Skill Extractor |
| **Authentication** | Google OAuth 2.0, LinkedIn OAuth 2.0 (OpenID Connect), JWT, `bcryptjs` |
| **File Storage** | Multer |

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/221260116056/job-portal.git
cd job-portal
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root directory (or copy from `.env.example`):

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/job_portal
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
UPLOAD_DIR=uploads/resumes
MIN_JOB_MATCH_PERCENTAGE=30
APP_URL=http://localhost:5000

# Optional Google & LinkedIn OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

### 4. Seed sample data *(optional)*
```bash
npm run seed
```

### 5. Run the application
```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

Visit **`http://localhost:5000`** in your browser!

---

## 🧪 Demo Credentials

If you ran `npm run seed`, you can quickly log in with these pre-configured accounts:

| Role | Email | Password |
|---|---|---|
| **Company Recruiter** | `company@example.com` | `Password@123` |
| **Candidate** | Register a new account or use `candidate.demo@hireflow.test` | `Password123!` |

---

## 📂 Project Structure

```text
├── public/                  # Single Page Application (UI)
│   ├── index.html           # Main markup & modals
│   ├── styles.css           # Glassmorphic dark styling & responsive layouts
│   └── app.js               # Frontend router, state, chat, and event logic
├── src/
│   ├── config/              # PostgreSQL & Sequelize connection
│   ├── controllers/         # Business logic (Jobs, Apps, Messages, Users, etc.)
│   ├── middleware/          # JWT auth guards, Multer uploads, Rate limiters
│   ├── models/              # Sequelize models (User, Company, Job, Message, etc.)
│   ├── routes/              # Express API endpoints
│   ├── seed/                # Sample database seed script
│   └── utils/               # Skill extractor, resume text parser, response helpers
├── uploads/resumes/         # Storage for candidate resume attachments
├── server.js                # App entrypoint & HTTP server
└── package.json
```

---

## 👨‍💻 Author

Built with ❤️ by **Vraj Vekariya**
