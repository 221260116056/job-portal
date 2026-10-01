require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, Job, Company } = require('../models');

const DEMO_COMPANY = { company_name: 'ABC Technologies', email: 'company@example.com', password: 'Password@123', location: 'Ahmedabad', website: 'https://example.com' };

const jobs = [
  { title: 'Node.js Developer Intern', company: 'Potenz Technology', description: 'Build and maintain backend APIs with mentorship from senior engineers. Contribute to code reviews, testing, and production features.', location: 'Ahmedabad', employment_type: 'Internship', skills: 'Node.js, Express.js, PostgreSQL' },
  { title: 'Backend Developer Intern', company: 'ABC Technologies', description: 'Help design REST services, integrate databases, and improve reliability across a growing SaaS platform.', location: 'Ahmedabad', employment_type: 'Internship', skills: 'JavaScript, REST APIs, SQL, Git' },
  { title: 'Python Developer Intern', company: 'DataSpring Labs', description: 'Work with the engineering team to create Python services and data integrations for customer analytics.', location: 'Remote', employment_type: 'Internship', skills: 'Python, Django, PostgreSQL, Git' },
  { title: 'Full Stack Developer Intern', company: 'BrightPath Software', description: 'Deliver user facing features across a React frontend and Node.js backend while learning modern development practices.', location: 'Surat', employment_type: 'Internship', skills: 'React, Node.js, Express, PostgreSQL' },
  { title: 'React.js Developer Intern', company: 'PixelCraft Studio', description: 'Build accessible, responsive interfaces and collaborate with designers and backend developers on customer projects.', location: 'Vadodara', employment_type: 'Internship', skills: 'React.js, JavaScript, CSS, REST APIs' }
];

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    const [demo] = await Company.findOrCreate({
      where: { email: DEMO_COMPANY.email },
      defaults: { ...DEMO_COMPANY, password: await bcrypt.hash(DEMO_COMPANY.password, 12) },
    });
    for (const job of jobs) {
      const [row, created] = await Job.findOrCreate({ where: { title: job.title, company: job.company }, defaults: job });
      // Attach legacy seeded jobs to the demo company so company flows are testable.
      if (!row.company_id) await row.update({ company_id: demo.id });
      void created;
    }
    console.log('Sample jobs are ready. Demo company: company@example.com / Password@123');
  }
  catch (error) { console.error('Unable to seed jobs:', error.message); process.exitCode = 1; }
  finally { await sequelize.close(); }
})();
