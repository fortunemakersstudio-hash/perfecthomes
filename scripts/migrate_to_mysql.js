// PERFECT HOMES & DEVELOPERS — HOSTINGER MYSQL MIGRATION SCRIPT
// Run: node scripts/migrate_to_mysql.js
// Migrates local JSON database into Hostinger MySQL tables

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Load .env
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME;

console.log('================================================================');
console.log('PERFECT HOMES & DEVELOPERS — HOSTINGER MYSQL MIGRATION UTILITY');
console.log('================================================================\n');

if (!DB_USER || !DB_NAME) {
  console.error('❌ ERROR: Missing MySQL configuration in .env!');
  console.log('\nPlease set the following variables in your .env file:');
  console.log('  DB_HOST=localhost');
  console.log('  DB_PORT=3306');
  console.log('  DB_USER=your_hostinger_db_username');
  console.log('  DB_PASSWORD=your_hostinger_db_password');
  console.log('  DB_NAME=your_hostinger_db_name\n');
  console.log('Tip: You can create these in Hostinger hPanel -> Databases -> MySQL Databases.');
  process.exit(1);
}

console.log(`Connecting to Hostinger MySQL:`);
console.log(`- Host:     ${DB_HOST}:${DB_PORT}`);
console.log(`- Database: ${DB_NAME}`);
console.log(`- User:     ${DB_USER}\n`);

async function migrate() {
  let mysql;
  try {
    mysql = await import('mysql2/promise');
  } catch {
    console.error('❌ ERROR: mysql2 package is not installed.');
    console.log('Please run: npm install mysql2');
    process.exit(1);
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      multipleStatements: true
    });
    console.log('✅ Connected to MySQL database successfully!\n');
  } catch (err) {
    console.error('❌ Connection Failed:', err.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Verify your database name, user, and password in Hostinger hPanel.');
    console.log('2. Ensure user has full permissions granted on this database.');
    console.log('3. If connecting remotely (from outside Hostinger), enable Remote MySQL in hPanel.');
    process.exit(1);
  }

  try {
    // 1. Run Schema DDL
    console.log('[1/3] Applying Table Schemas from database/hostinger_schema.sql...');
    const schemaSql = fs.readFileSync(path.join(rootDir, 'database', 'hostinger_schema.sql'), 'utf8');
    await connection.query(schemaSql);
    console.log('      ✅ Tables created or verified (users, properties, enquiries, media).\n');

    // 2. Read JSON Data
    console.log('[2/3] Reading Local Data from data/ directory...');
    const users = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'users_database.json'), 'utf8'));
    const properties = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'properties_database.json'), 'utf8'));
    const enquiries = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'enquiries_database.json'), 'utf8'));
    const media = JSON.parse(fs.readFileSync(path.join(rootDir, 'data', 'media_database.json'), 'utf8'));
    console.log(`      Found: ${users.length} users, ${properties.length} properties, ${enquiries.length} enquiries, ${media.length} media.\n`);

    // 3. Migrate Users
    console.log('[3/3] Migrating Records to MySQL Tables...');
    let userCount = 0;
    for (const u of users) {
      const regAt = u.registeredAt ? new Date(u.registeredAt) : new Date();
      await connection.query(
        `INSERT INTO users (id, name, first_name, last_name, email, phone, password_hash, avatar, role, joined_date, city, address, notification_prefs, profile_completed, must_change_password, status, registered_at, enquiries_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), password_hash=VALUES(password_hash)`,
        [
          u.id,
          u.name,
          u.firstName || null,
          u.lastName || null,
          u.email.toLowerCase().trim(),
          u.phone || null,
          u.passwordHash,
          u.avatar || null,
          u.role || 'buyer',
          u.joinedDate || null,
          u.city || 'Chennai',
          u.address || '',
          JSON.stringify(u.notificationPrefs || {}),
          u.profileCompleted || 75,
          u.mustChangePassword ? 1 : 0,
          u.status || 'Active',
          regAt,
          u.enquiriesCount || 0
        ]
      );
      userCount++;
    }
    console.log(`      ✅ Migrated ${userCount} Users.`);

    // Migrate Properties
    let propCount = 0;
    for (const p of properties) {
      await connection.query(
        `INSERT INTO properties (id, slug, title, category, location, price_display, price, bhk, built_up_area, plot_area, facing, possession, rera_approved, cmda_approved, description, features, amenities, nearby, images, videos, is_published, brochure_published, google_maps_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title=VALUES(title), price_display=VALUES(price_display)`,
        [
          p.id,
          p.slug,
          p.title,
          p.category,
          p.location,
          p.priceDisplay,
          p.price || 0,
          p.bhk || null,
          p.builtUpArea || null,
          p.plotArea || null,
          p.facing || null,
          p.possession || null,
          p.reraApproved !== false ? 1 : 0,
          p.cmdaApproved !== false ? 1 : 0,
          p.description || '',
          JSON.stringify(p.features || []),
          JSON.stringify(p.amenities || []),
          JSON.stringify(p.nearby || []),
          JSON.stringify(p.images || []),
          JSON.stringify(p.videos || []),
          p.isPublished !== false ? 1 : 0,
          p.brochurePublished !== false ? 1 : 0,
          p.googleMapsUrl || ''
        ]
      );
      propCount++;
    }
    console.log(`      ✅ Migrated ${propCount} Properties.`);

    // Migrate Enquiries
    let enqCount = 0;
    for (const e of enquiries) {
      await connection.query(
        `INSERT INTO enquiries (id, user_id, property_id, property_title, property_location, property_price, property_img, name, email, phone, message, visit_date, status, sales_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status=VALUES(status)`,
        [
          e.id,
          e.userId,
          e.propertyId || '',
          e.propertyTitle || 'Property Enquiry',
          e.propertyLocation || 'Chennai',
          e.propertyPrice || '',
          e.propertyImg || '',
          e.name,
          e.email,
          e.phone,
          e.message || '',
          e.visitDate || '',
          e.status || 'New',
          e.salesNotes || ''
        ]
      );
      enqCount++;
    }
    console.log(`      ✅ Migrated ${enqCount} Enquiries.`);

    // Migrate Media
    let mediaCount = 0;
    for (const m of media) {
      await connection.query(
        `INSERT INTO media (id, part_number, part_name, project_id, original_filename, filename, media_type, storage_path, size_kb, upload_date, is_featured, caption, is_archived)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE caption=VALUES(caption), is_featured=VALUES(is_featured)`,
        [
          m.id,
          m.partNumber,
          m.partName,
          m.projectId,
          m.originalFilename,
          m.filename,
          m.mediaType,
          m.storagePath,
          m.sizeKB || 0,
          m.uploadDate || null,
          m.isFeatured ? 1 : 0,
          m.caption || '',
          m.isArchived ? 1 : 0
        ]
      );
      mediaCount++;
    }
    console.log(`      ✅ Migrated ${mediaCount} Media Assets.\n`);

    console.log('================================================================');
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('Your website is now fully backed by Hostinger MySQL database.');
    console.log('================================================================\n');
  } catch (err) {
    console.error('❌ Migration Error:', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
