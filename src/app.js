const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const companyRoutes = require('./routes/companyRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const savedJobRoutes = require('./routes/savedJobRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());

// Serve static assets first — styles, scripts, and uploaded docs must NEVER be blocked by rate limiters
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads'), { dotfiles: 'deny', index: false }));
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Rate limit only API endpoints with a generous limit per IP (1500 per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down and try again shortly.' }
});
app.use('/api', apiLimiter);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.get('/api', (req, res) => res.json({ success: true, message: 'Job Application Portal API', version: '1.0.0' }));
app.get('/api/docs', (req, res) => res.json({ success: true, message: 'See README.md and postman collection', endpoints: ['POST /api/auth/register', 'POST /api/auth/login', 'GET /api/users/me', 'GET /api/users/skills (candidate)', 'POST /api/users/resume', 'GET /api/jobs', 'GET /api/jobs/recommended (candidate)', 'GET /api/jobs/matched (candidate, alias)', 'GET /api/jobs/:id', 'POST /api/applications (candidate)', 'GET /api/applications (candidate)', 'GET /api/applications/:id (candidate)', 'POST /api/company/auth/register', 'POST /api/company/auth/login', 'GET /api/company/me', 'GET /api/company/jobs', 'POST /api/company/jobs', 'GET /api/company/jobs/:id', 'PUT /api/company/jobs/:id', 'DELETE /api/company/jobs/:id', 'GET /api/company/applications', 'PUT /api/company/applications/:id/status', 'GET /api/notifications', 'PUT /api/notifications/read-all', 'GET /api/messages/conversations', 'GET /api/messages/thread/:otherId', 'POST /api/messages', 'GET /api/saved-jobs', 'POST /api/saved-jobs/:jobId'] }));
app.get('/api/health', (req, res) => res.json({ success: true, message: 'API is running' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/saved-jobs', savedJobRoutes);
// Frontend deep routes serve the SPA (hash router renders the right view).
const frontendEntry = path.resolve(process.cwd(), 'public', 'index.html');
app.get(['/login', '/register', '/jobs', '/my-applications', '/profile', '/chat', '/saved-jobs', '/notifications'], (req, res) => res.sendFile(frontendEntry));
app.get('/company/*', (req, res) => res.sendFile(frontendEntry));
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorMiddleware);
module.exports = app;
