// One-off setup script: creates the first ADMIN and SCANNER accounts using
// the credentials in .env, with a properly computed bcrypt hash.
//
// Usage:  cd backend-serverless && npm run seed
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../db/pool');

async function upsertStaff(name, email, password, role) {
  const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.length > 0) {
    console.log(`- ${role} account for ${email} already exists, skipping.`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, email_verified) VALUES ($1, $2, $3, $4, TRUE)`,
    [name, email, passwordHash, role]
  );
  console.log(`- Created ${role} account: ${email}`);
}

(async () => {
  try {
    await upsertStaff(
      'Event Admin',
      process.env.SEED_ADMIN_EMAIL || 'admin@college.edu',
      process.env.SEED_ADMIN_PASSWORD || 'Password123!',
      'ADMIN'
    );
    await upsertStaff(
      'Gate Volunteer',
      process.env.SEED_SCANNER_EMAIL || 'scanner@college.edu',
      process.env.SEED_SCANNER_PASSWORD || 'Password123!',
      'SCANNER'
    );
    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    await pool.end();
  }
})();
