const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads/resumes');
fs.mkdirSync(uploadDir, { recursive: true });
const mimeByExt = { '.pdf': ['application/pdf'], '.doc': ['application/msword', 'application/octet-stream'], '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'] };
module.exports = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `resume-${uuidv4()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!mimeByExt[ext] || !mimeByExt[ext].includes(file.mimetype)) return cb(Object.assign(new Error('Only PDF, DOC, and DOCX resumes are allowed'), { status: 400 }));
    cb(null, true);
  }
}).single('resume');
