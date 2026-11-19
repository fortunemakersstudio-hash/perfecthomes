// PERFECT HOMES & DEVELOPERS — DATABASE BACKUP UTILITY
// Run: node scripts/backup_db.js
// Exports all user accounts, properties, enquiries, and media to timestamped backup files

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const backupDir = path.join(rootDir, 'database', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Load .env
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  console.log('================================================================');
  console.log('PERFECT HOMES & DEVELOPERS — DATABASE BACKUP UTILITY');
  console.log('================================================================\n');

  let users = [];
  let properties = [];
  let enquiries = [];
  let media = [];
  let source = 'Local JSON Engine';

  // Try MySQL first
  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
    try {
      const mysql = await import('mysql2/promise');
      const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME
      });

      const [u] = await conn.query('SELECT * FROM users');
      const [p] = await conn.query('SELECT * FROM properties');
      const [e] = await conn.query('SELECT * FROM enquiries');
      const [m] = await conn.query('SELECT * FROM media');
      users = u;
      properties = p;
      enquiries = e;
      media = m;
      source = `Hostinger MySQL (${process.env.DB_NAME} @ ${process.env.DB_HOST})`;
      await conn.end();
    } catch (e) {
      console.warn('MySQL fetch failed, reading from local JSON storage:', e.message);
    }
  }

  // Fallback to local JSON files
  if (users.length === 0) {
    const uPath = path.join(rootDir, 'data', 'users_database.json');
    if (fs.existsSync(uPath)) users = JSON.parse(fs.readFileSync(uPath, 'utf8'));

    const pPath = path.join(rootDir, 'data', 'properties_database.json');
    if (fs.existsSync(pPath)) properties = JSON.parse(fs.readFileSync(pPath, 'utf8'));

    const ePath = path.join(rootDir, 'data', 'enquiries_database.json');
    if (fs.existsSync(ePath)) enquiries = JSON.parse(fs.readFileSync(ePath, 'utf8'));

    const mPath = path.join(rootDir, 'data', 'media_database.json');
    if (fs.existsSync(mPath)) media = JSON.parse(fs.readFileSync(mPath, 'utf8'));
  }

  const backupData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source,
      counts: {
        users: users.length,
        properties: properties.length,
        enquiries: enquiries.length,
        media: media.length
      }
    },
    users,
    properties,
    enquiries,
    media
  };

  const jsonFilename = `backup_${timestamp}.json`;
  const jsonFilePath = path.join(backupDir, jsonFilename);
  fs.writeFileSync(jsonFilePath, JSON.stringify(backupData, null, 2), 'utf8');

  console.log(`Source:      ${source}`);
  console.log(`Timestamp:   ${timestamp}`);
  console.log(`Users:       ${users.length} records`);
  console.log(`Properties:  ${properties.length} records`);
  console.log(`Enquiries:   ${enquiries.length} records`);
  console.log(`Media:       ${media.length} records\n`);
  console.log(`✅ Backup successfully saved to:`);
  console.log(`   ${jsonFilePath} (${(fs.statSync(jsonFilePath).size / 1024).toFixed(1)} KB)\n`);
  console.log('================================================================');
}

backup();
