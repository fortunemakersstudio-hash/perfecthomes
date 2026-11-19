// Utility: Generate hostinger_seed.sql from local JSON database files
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const usersPath = path.join(rootDir, 'data', 'users_database.json');
const propertiesPath = path.join(rootDir, 'data', 'properties_database.json');
const enquiriesPath = path.join(rootDir, 'data', 'enquiries_database.json');
const mediaPath = path.join(rootDir, 'data', 'media_database.json');
const outPath = path.join(rootDir, 'database', 'hostinger_seed.sql');

function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  const escaped = str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  return `'${escaped}'`;
}

function run() {
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
  const properties = JSON.parse(fs.readFileSync(propertiesPath, 'utf8'));
  const enquiries = JSON.parse(fs.readFileSync(enquiriesPath, 'utf8'));
  const media = JSON.parse(fs.readFileSync(mediaPath, 'utf8'));

  let sql = `-- ==============================================================================
-- PERFECT HOMES & DEVELOPERS — HOSTINGER INITIAL SEED DATA
-- Pre-populated with verified properties, users, enquiries, and media catalog
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. USERS SEED (${users.length} Records)
-- ------------------------------------------------------------------------------
`;

  for (const u of users) {
    const regAt = u.registeredAt ? u.registeredAt.replace('T', ' ').replace('Z', '').split('.')[0] : null;
    sql += `INSERT INTO \`users\` (\`id\`, \`name\`, \`first_name\`, \`last_name\`, \`email\`, \`phone\`, \`password_hash\`, \`avatar\`, \`role\`, \`joined_date\`, \`city\`, \`address\`, \`notification_prefs\`, \`profile_completed\`, \`must_change_password\`, \`status\`, \`registered_at\`, \`enquiries_count\`) VALUES (${esc(u.id)}, ${esc(u.name)}, ${esc(u.firstName)}, ${esc(u.lastName)}, ${esc(u.email.toLowerCase())}, ${esc(u.phone)}, ${esc(u.passwordHash)}, ${esc(u.avatar)}, ${esc(u.role || 'buyer')}, ${esc(u.joinedDate)}, ${esc(u.city || 'Chennai')}, ${esc(u.address || '')}, ${esc(u.notificationPrefs)}, ${esc(u.profileCompleted || 75)}, ${esc(u.mustChangePassword ? 1 : 0)}, ${esc(u.status || 'Active')}, ${esc(regAt)}, ${esc(u.enquiriesCount || 0)}) ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`phone\`=VALUES(\`phone\`);\n`;
  }

  sql += `\n-- ------------------------------------------------------------------------------
-- 2. PROPERTIES SEED (${properties.length} Verified Properties)
-- ------------------------------------------------------------------------------
`;

  for (const p of properties) {
    sql += `INSERT INTO \`properties\` (\`id\`, \`slug\`, \`title\`, \`category\`, \`location\`, \`price_display\`, \`price\`, \`bhk\`, \`built_up_area\`, \`plot_area\`, \`facing\`, \`possession\`, \`rera_approved\`, \`cmda_approved\`, \`description\`, \`features\`, \`amenities\`, \`nearby\`, \`images\`, \`videos\`, \`is_published\`, \`brochure_published\`, \`google_maps_url\`) VALUES (${esc(p.id)}, ${esc(p.slug)}, ${esc(p.title)}, ${esc(p.category)}, ${esc(p.location)}, ${esc(p.priceDisplay)}, ${esc(p.price || 0)}, ${esc(p.bhk)}, ${esc(p.builtUpArea)}, ${esc(p.plotArea)}, ${esc(p.facing)}, ${esc(p.possession)}, ${esc(p.reraApproved !== false ? 1 : 0)}, ${esc(p.cmdaApproved !== false ? 1 : 0)}, ${esc(p.description)}, ${esc(p.features)}, ${esc(p.amenities)}, ${esc(p.nearby)}, ${esc(p.images)}, ${esc(p.videos)}, ${esc(p.isPublished !== false ? 1 : 0)}, ${esc(p.brochurePublished !== false ? 1 : 0)}, ${esc(p.googleMapsUrl || '')}) ON DUPLICATE KEY UPDATE \`title\`=VALUES(\`title\`), \`price_display\`=VALUES(\`price_display\`);\n`;
  }

  sql += `\n-- ------------------------------------------------------------------------------
-- 3. ENQUIRIES SEED (${enquiries.length} Sample Enquiries)
-- ------------------------------------------------------------------------------
`;

  for (const e of enquiries) {
    sql += `INSERT INTO \`enquiries\` (\`id\`, \`user_id\`, \`property_id\`, \`property_title\`, \`property_location\`, \`property_price\`, \`property_img\`, \`name\`, \`email\`, \`phone\`, \`message\`, \`visit_date\`, \`status\`, \`sales_notes\`) VALUES (${esc(e.id)}, ${esc(e.userId)}, ${esc(e.propertyId)}, ${esc(e.propertyTitle)}, ${esc(e.propertyLocation)}, ${esc(e.propertyPrice)}, ${esc(e.propertyImg)}, ${esc(e.name)}, ${esc(e.email)}, ${esc(e.phone)}, ${esc(e.message)}, ${esc(e.visitDate)}, ${esc(e.status || 'New')}, ${esc(e.salesNotes || '')}) ON DUPLICATE KEY UPDATE \`status\`=VALUES(\`status\`);\n`;
  }

  sql += `\n-- ------------------------------------------------------------------------------
-- 4. MEDIA SEED (${media.length} Property Photo & Video Assets)
-- ------------------------------------------------------------------------------
`;

  for (const m of media) {
    sql += `INSERT INTO \`media\` (\`id\`, \`part_number\`, \`part_name\`, \`project_id\`, \`original_filename\`, \`filename\`, \`media_type\`, \`storage_path\`, \`size_kb\`, \`upload_date\`, \`is_featured\`, \`caption\`, \`is_archived\`) VALUES (${esc(m.id)}, ${esc(m.partNumber)}, ${esc(m.partName)}, ${esc(m.projectId)}, ${esc(m.originalFilename)}, ${esc(m.filename)}, ${esc(m.mediaType)}, ${esc(m.storagePath)}, ${esc(m.sizeKB || 0)}, ${esc(m.uploadDate)}, ${esc(m.isFeatured ? 1 : 0)}, ${esc(m.caption)}, ${esc(m.isArchived ? 1 : 0)}) ON DUPLICATE KEY UPDATE \`caption\`=VALUES(\`caption\`), \`is_featured\`=VALUES(\`is_featured\`);\n`;
  }

  sql += `\nSET FOREIGN_KEY_CHECKS = 1;\n`;
  fs.writeFileSync(outPath, sql, 'utf8');
  console.log(`Generated hostinger_seed.sql successfully at: ${outPath}`);
  console.log(`Total SQL size: ${(sql.length / 1024).toFixed(1)} KB`);
}

run();
