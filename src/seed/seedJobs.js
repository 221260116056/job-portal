require('dotenv').config();
const { sequelize, Job } = require('../models');

const jobs = [
  { title: 'Node.js Developer Intern', company: 'Potenz Technology', description: 'Build and maintain backend APIs with mentorship from senior engineers. Contribute to code reviews, testing, and production features.', location: 'Ahmedabad', employment_type: 'Internship', skills: 'Node.js, Express.js, PostgreSQL' },
  { title: 'Backend Developer Intern', company: 'ABC Technologies', description: 'Help design REST services, integrate databases, and improve reliability across a growing SaaS platform.', location: 'Ahmedabad', employment_type: 'Internship', skills: 'JavaScript, REST APIs, SQL, Git' },
  { title: 'Python Developer Intern', company: 'DataSpring Labs', description: 'Work with the engineering team to create Python services and data integrations for customer analytics.', location: 'Remote', employment_type: 'Internship', skills: 'Python, Django, PostgreSQL, Git' },
  { title: 'Full Stack Developer Intern', company: 'BrightPath Software', description: 'Deliver user facing features across a React frontend and Node.js backend while learning modern development practices.', location: 'Surat', employment_type: 'Internship', skills: 'React, Node.js, Express, PostgreSQL' },
  { title: 'React.js Developer Intern', company: 'PixelCraft Studio', description: 'Build accessible, responsive interfaces and collaborate with designers and backend developers on customer projects.', location: 'Vadodara', employment_type: 'Internship', skills: 'React.js, JavaScript, CSS, REST APIs' }
];

(async () => {
  try { await sequelize.authenticate(); await sequelize.sync(); for (const job of jobs) await Job.findOrCreate({ where: { title: job.title, company: job.company }, defaults: job }); console.log('Sample jobs are ready.'); }
  catch (error) { console.error('Unable to seed jobs:', error.message); process.exitCode = 1; }
  finally { await sequelize.close(); }
})();
