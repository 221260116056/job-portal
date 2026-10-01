require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/models');

const port = process.env.PORT || 5000;
async function start() {
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    app.listen(port, () => console.log(`Job Application Portal API listening on port ${port}`));
  } catch (error) {
    console.error('Unable to start API:', error.message);
    process.exit(1);
  }
}
start();
