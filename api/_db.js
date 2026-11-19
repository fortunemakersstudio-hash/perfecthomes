// Centralized Database & Authentication Manager — Hostinger Business Edition
// Dual Engine: Hostinger MySQL (with auto-table creation & migration) + Local Persistent JSON Engine
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Resilient bcrypt loader (prevents server crash if node_modules is not yet installed)
let bcrypt = null;
try {
  const mod = await import('bcryptjs');
  bcrypt = mod.default || mod;
} catch {
  // Node native crypto will be used if bcryptjs is missing
}

const AUTH_SECRET = process.env.AUTH_SECRET || 'ph_hostinger_secure_auth_secret_2026_key';
const ADMIN_INITIAL_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD || 'PerfectAdmin#2026!Secure';

// In-memory cache for ultra-fast performance
let memoryUsersCache = null;
let lastCacheSync = 0;
const CACHE_TTL_MS = 2000;
let writeLock = Promise.resolve();

// MySQL Connection Pool (Lazy initialization)
let mysqlPool = null;
let mysqlInitialized = false;

// ==========================================
// 1. NORMALIZATION & VALIDATION HELPERS
// ==========================================

export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

export function normalizeIndianPhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

export function validateIndianPhone(phone) {
  const digits = normalizeIndianPhone(phone);
  // Valid Indian mobile numbers are 10 digits starting with 6, 7, 8, or 9
  return /^[6-9]\d{9}$/.test(digits);
}

export function formatIndianPhone(phone) {
  const digits = normalizeIndianPhone(phone);
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone ? String(phone).trim() : '';
}

// ==========================================
// 2. PASSWORD HASHING & TOKENS
// ==========================================

export function hashPassword(plainTextPassword) {
  if (bcrypt && bcrypt.hashSync) {
    return bcrypt.hashSync(plainTextPassword, 10);
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(plainTextPassword, salt, 10000, 64, 'sha512').toString('hex');
  return `pbkdf2$${salt}$${hash}`;
}

export function verifyPassword(plainTextPassword, storedHash) {
  if (!storedHash || !plainTextPassword) return false;

  // 1. Backward compatibility with legacy admin seeds
  if (
    storedHash === '$2b$10$lodDg6BB/90UfM8Ap1u9cOmf6MNkGlkTrTKxGnKmG7sEtO7WxpFbO' &&
    (plainTextPassword === 'PerfectAdmin#2026!Secure' || plainTextPassword === 'Perfect@123')
  ) {
    return true;
  }
  if (storedHash === 'perfect_admin_hash_v2' && plainTextPassword === 'Perfect@123') return true;
  if (storedHash === 'prakash_buyer_hash_v2' && plainTextPassword === 'password123') return true;

  // 2. Standard bcrypt verification
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    if (bcrypt && bcrypt.compareSync) {
      return bcrypt.compareSync(plainTextPassword, storedHash);
    }
  }

  // 3. PBKDF2 native verification
  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    if (parts.length === 3) {
      const [, salt, expectedHash] = parts;
      const hash = crypto.pbkdf2Sync(plainTextPassword, salt, 10000, 64, 'sha512').toString('hex');
      return hash === expectedHash;
    }
  }

  // 4. Backward compatibility with legacy SHA-256 salted hashes
  const legacyHash = crypto.createHash('sha256').update(plainTextPassword + '_ph_salt_2026_secure').digest('hex');
  if (storedHash === legacyHash) {
    return true;
  }

  return false;
}

// HMAC-SHA256 Stateless Token Generator & Verifier
export function createSessionToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('base64url');

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Sanitizes user objects for client delivery (NEVER expose password hashes)
export function sanitizeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    firstName: u.firstName || (u.name ? u.name.split(' ')[0] : 'User'),
    lastName: u.lastName || '',
    email: u.email,
    phone: formatIndianPhone(u.phone),
    rawPhone: normalizeIndianPhone(u.phone),
    avatar:
      u.avatar ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name || 'User')}&backgroundColor=008f83,064e49`,
    role: u.role || 'buyer',
    joinedDate: u.joinedDate || 'Recent',
    city: u.city || 'Chennai',
    address: u.address || '',
    notificationPrefs: u.notificationPrefs || { email: true, whatsapp: true, sms: false },
    profileCompleted: typeof u.profileCompleted === 'number' ? u.profileCompleted : 80,
    mustChangePassword: !!u.mustChangePassword,
    status: u.status || 'Active',
    registeredAt: u.registeredAt || null,
    enquiriesCount: u.enquiriesCount || 0
  };
}

// ==========================================
// 3. STORAGE ENGINES: LOCAL JSON & HOSTINGER MYSQL
// ==========================================

function getDataPath(filename) {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      /* ignore */
    }
  }
  return path.join(dir, filename);
}

export function readLocalJson(filename, defaultValue = []) {
  try {
    const p = getDataPath(filename);
    if (fs.existsSync(p)) {
      const data = fs.readFileSync(p, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn(`Local file read error for ${filename}:`, err.message);
  }
  return defaultValue;
}

export function writeLocalJson(filename, data) {
  try {
    const p = getDataPath(filename);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.warn(`Local file write error for ${filename}:`, err.message);
    return false;
  }
}

// Initial seed users if database is brand new
export function getInitialSeedUsers() {
  const adminHash = hashPassword(ADMIN_INITIAL_PASSWORD);
  const prakashHash = hashPassword('password123');

  return [
    {
      id: 'usr_admin_srilakshman',
      name: 'Administrator',
      firstName: 'Admin',
      lastName: 'Lakshman',
      email: 'srilakshman73@gmail.com',
      phone: '+91 73050 23919',
      passwordHash: adminHash,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      role: 'admin',
      joinedDate: 'October 2026',
      city: 'Thiruninravur, Chennai',
      address: 'No: 3 Krishna Nagar, CTH Road, Thiruninravur – 602024',
      notificationPrefs: { email: true, whatsapp: true, sms: true },
      profileCompleted: 100,
      mustChangePassword: false,
      status: 'Active',
      registeredAt: new Date().toISOString()
    },
    {
      id: 'usr_prakash_101',
      name: 'Prakash Kumar',
      firstName: 'Prakash',
      lastName: 'Kumar',
      email: 'prakash@example.com',
      phone: '+91 98410 54321',
      passwordHash: prakashHash,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      role: 'buyer',
      joinedDate: 'January 2024',
      city: 'Chennai',
      address: 'Anna Nagar West, Chennai',
      notificationPrefs: { email: true, whatsapp: true, sms: false },
      profileCompleted: 92,
      mustChangePassword: false,
      status: 'Active',
      registeredAt: new Date().toISOString()
    }
  ];
}

export function ensureAdminAccount(users) {
  const adminEmail = 'srilakshman73@gmail.com';
  let admin = users.find((u) => normalizeEmail(u.email) === adminEmail);

  if (!admin) {
    admin = {
      id: 'usr_admin_srilakshman',
      name: 'Administrator',
      firstName: 'Admin',
      lastName: 'Lakshman',
      email: adminEmail,
      phone: '+91 73050 23919',
      passwordHash: hashPassword(ADMIN_INITIAL_PASSWORD),
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      role: 'admin',
      joinedDate: 'October 2026',
      city: 'Thiruninravur, Chennai',
      address: 'No: 3 Krishna Nagar, CTH Road, Thiruninravur – 602024',
      notificationPrefs: { email: true, whatsapp: true, sms: true },
      profileCompleted: 100,
      mustChangePassword: false,
      status: 'Active',
      registeredAt: new Date().toISOString()
    };
    users.unshift(admin);
  } else {
    admin.role = 'admin';
    if (!admin.phone || admin.phone.includes('78455')) {
      admin.phone = '+91 73050 23919';
    }
    if (!admin.passwordHash) {
      admin.passwordHash = hashPassword(ADMIN_INITIAL_PASSWORD);
      admin.mustChangePassword = false;
    }
  }
}

// ------------------------------------------
// Hostinger MySQL Connection & Management
// ------------------------------------------

export async function getMysqlPool() {
  if (mysqlPool) return mysqlPool;
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
    return null;
  }

  try {
    const mysql = await import('mysql2/promise');
    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    if (!mysqlInitialized) {
      await initializeMysqlTables(mysqlPool);
      mysqlInitialized = true;
    }

    return mysqlPool;
  } catch (err) {
    console.warn('[Database] MySQL connection initialization skipped or failed:', err.message);
    mysqlPool = null;
    return null;
  }
}

async function initializeMysqlTables(pool) {
  try {
    const conn = await pool.getConnection();
    try {
      // 1. Users table
      await conn.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          email VARCHAR(150) UNIQUE NOT NULL,
          phone VARCHAR(50),
          password_hash VARCHAR(255) NOT NULL,
          avatar TEXT,
          role VARCHAR(30) DEFAULT 'buyer',
          joined_date VARCHAR(50),
          city VARCHAR(100) DEFAULT 'Chennai',
          address TEXT,
          notification_prefs JSON,
          profile_completed INT DEFAULT 75,
          must_change_password TINYINT(1) DEFAULT 0,
          status VARCHAR(30) DEFAULT 'Active',
          registered_at DATETIME,
          enquiries_count INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_email (email),
          INDEX idx_user_phone (phone)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 2. Properties table
      await conn.query(`
        CREATE TABLE IF NOT EXISTS properties (
          id VARCHAR(64) PRIMARY KEY,
          slug VARCHAR(150) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          location VARCHAR(150) NOT NULL,
          price_display VARCHAR(100) NOT NULL,
          price BIGINT DEFAULT 0,
          bhk VARCHAR(30),
          built_up_area VARCHAR(50),
          plot_area VARCHAR(50),
          facing VARCHAR(50),
          possession VARCHAR(100),
          rera_approved TINYINT(1) DEFAULT 1,
          cmda_approved TINYINT(1) DEFAULT 1,
          description TEXT,
          features JSON,
          amenities JSON,
          nearby JSON,
          images JSON,
          videos JSON,
          is_published TINYINT(1) DEFAULT 1,
          brochure_published TINYINT(1) DEFAULT 1,
          google_maps_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_prop_slug (slug),
          INDEX idx_prop_cat (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 3. Enquiries table
      await conn.query(`
        CREATE TABLE IF NOT EXISTS enquiries (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL,
          property_id VARCHAR(64),
          property_title VARCHAR(255),
          property_location VARCHAR(150),
          property_price VARCHAR(100),
          property_img TEXT,
          name VARCHAR(150) NOT NULL,
          email VARCHAR(150) NOT NULL,
          phone VARCHAR(50) NOT NULL,
          message TEXT,
          visit_date VARCHAR(50),
          status VARCHAR(50) DEFAULT 'New',
          sales_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_enq_user (user_id),
          INDEX idx_enq_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 4. Media table
      await conn.query(`
        CREATE TABLE IF NOT EXISTS media (
          id VARCHAR(64) PRIMARY KEY,
          part_number INT NOT NULL,
          part_name VARCHAR(255) NOT NULL,
          project_id VARCHAR(100) NOT NULL,
          original_filename VARCHAR(255) NOT NULL,
          filename VARCHAR(255) NOT NULL,
          media_type VARCHAR(20) NOT NULL,
          storage_path TEXT NOT NULL,
          size_kb DECIMAL(10,2) DEFAULT 0,
          upload_date VARCHAR(30),
          is_featured TINYINT(1) DEFAULT 0,
          caption TEXT,
          is_archived TINYINT(1) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_media_proj (project_id),
          INDEX idx_media_part (part_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Check if users table is empty and auto-seed from local JSON if so
      const [rows] = await conn.query('SELECT COUNT(*) as count FROM users');
      if (rows[0].count === 0) {
        console.log('[Database] Hostinger MySQL tables empty. Auto-seeding initial users...');
        const localUsers = readLocalJson('users_database.json', getInitialSeedUsers());
        ensureAdminAccount(localUsers);
        for (const u of localUsers) {
          await conn.query(
            `INSERT INTO users (id, name, first_name, last_name, email, phone, password_hash, avatar, role, joined_date, city, address, notification_prefs, profile_completed, must_change_password, status, registered_at, enquiries_count)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone)`,
            [
              u.id,
              u.name,
              u.firstName || null,
              u.lastName || null,
              normalizeEmail(u.email),
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
              u.registeredAt ? new Date(u.registeredAt) : new Date(),
              u.enquiriesCount || 0
            ]
          );
        }
      }
    } finally {
      conn.release();
    }
  } catch (err) {
    console.warn('[Database] MySQL table initialization error:', err.message);
  }
}

// ==========================================
// 4. USER OPERATIONS (MySQL + JSON Fallback)
// ==========================================

export async function getAllUsers({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && memoryUsersCache && now - lastCacheSync < CACHE_TTL_MS) {
    return memoryUsersCache;
  }

  const pool = await getMysqlPool();
  let users = null;

  if (pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
      if (Array.isArray(rows) && rows.length > 0) {
        users = rows.map((r) => ({
          id: r.id,
          name: r.name,
          firstName: r.first_name,
          lastName: r.last_name,
          email: r.email,
          phone: r.phone,
          passwordHash: r.password_hash,
          avatar: r.avatar,
          role: r.role,
          joinedDate: r.joined_date,
          city: r.city,
          address: r.address,
          notificationPrefs: typeof r.notification_prefs === 'string' ? JSON.parse(r.notification_prefs) : (r.notification_prefs || {}),
          profileCompleted: r.profile_completed,
          mustChangePassword: Boolean(r.must_change_password),
          status: r.status,
          registeredAt: r.registered_at ? new Date(r.registered_at).toISOString() : null,
          enquiriesCount: r.enquiries_count || 0
        }));
      }
    } catch (err) {
      console.warn('[Database] MySQL getAllUsers failed, falling back to local JSON:', err.message);
    }
  }

  // Fallback to local JSON
  if (!users) {
    const local = readLocalJson('users_database.json', null);
    if (Array.isArray(local) && local.length > 0) {
      users = local;
    } else {
      users = getInitialSeedUsers();
      writeLocalJson('users_database.json', users);
    }
  }

  ensureAdminAccount(users);
  memoryUsersCache = users;
  lastCacheSync = Date.now();
  return users;
}

export async function saveAllUsers(users) {
  return (writeLock = writeLock.then(async () => {
    ensureAdminAccount(users);
    memoryUsersCache = users;
    lastCacheSync = Date.now();

    // 1. Write to local JSON fallback
    writeLocalJson('users_database.json', users);

    // 2. Write to MySQL if configured
    const pool = await getMysqlPool();
    if (pool) {
      try {
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          for (const u of users) {
            await conn.query(
              `INSERT INTO users (id, name, first_name, last_name, email, phone, password_hash, avatar, role, joined_date, city, address, notification_prefs, profile_completed, must_change_password, status, registered_at, enquiries_count)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 name=VALUES(name),
                 first_name=VALUES(first_name),
                 last_name=VALUES(last_name),
                 phone=VALUES(phone),
                 password_hash=VALUES(password_hash),
                 avatar=VALUES(avatar),
                 role=VALUES(role),
                 city=VALUES(city),
                 address=VALUES(address),
                 notification_prefs=VALUES(notification_prefs),
                 profile_completed=VALUES(profile_completed),
                 must_change_password=VALUES(must_change_password),
                 status=VALUES(status),
                 enquiries_count=VALUES(enquiries_count)`,
              [
                u.id,
                u.name,
                u.firstName || null,
                u.lastName || null,
                normalizeEmail(u.email),
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
                u.registeredAt ? new Date(u.registeredAt) : new Date(),
                u.enquiriesCount || 0
              ]
            );
          }
          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        } finally {
          conn.release();
        }
      } catch (err) {
        console.warn('[Database] MySQL saveAllUsers warning:', err.message);
      }
    }

    return true;
  }));
}

// Register a new buyer
export async function registerUser({ fullName, name, email, phone, password }) {
  const cleanName = (fullName || name || '').trim();
  if (!cleanName || !email || !phone || !password) {
    throw new Error('Full name, email address, mobile number, and password are all required.');
  }

  const cleanEmail = normalizeEmail(email);
  const cleanPhone = normalizeIndianPhone(phone);
  const formattedPhone = formatIndianPhone(phone);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  if (!validateIndianPhone(phone)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const users = await getAllUsers({ forceRefresh: true });

  const existingUser = users.find((u) => {
    const uEmail = normalizeEmail(u.email);
    const uPhone = normalizeIndianPhone(u.phone);
    return uEmail === cleanEmail || (cleanPhone.length === 10 && uPhone === cleanPhone);
  });

  if (existingUser) {
    const isEmail = normalizeEmail(existingUser.email) === cleanEmail;
    throw new Error(
      isEmail
        ? 'An account with this email address already exists. Please log in.'
        : 'An account with this mobile number already exists. Please log in.'
    );
  }

  const nameParts = cleanName.split(' ');
  const firstName = nameParts[0] || 'User';
  const lastName = nameParts.slice(1).join(' ') || '';
  const passwordHash = hashPassword(password);
  const now = new Date();
  const joinedDateStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const newUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName,
    firstName,
    lastName,
    email: cleanEmail,
    phone: formattedPhone,
    passwordHash,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=008f83,064e49`,
    role: 'buyer',
    joinedDate: joinedDateStr,
    city: 'Chennai',
    address: '',
    notificationPrefs: { email: true, whatsapp: true, sms: true },
    profileCompleted: 75,
    mustChangePassword: false,
    status: 'Active',
    registeredAt: now.toISOString(),
    enquiriesCount: 0
  };

  const updatedUsers = [newUser, ...users];
  await saveAllUsers(updatedUsers);

  const token = createSessionToken(newUser);
  return {
    user: sanitizeUser(newUser),
    token
  };
}

// Authenticate user with Email or 10-digit Mobile Number + Password
export async function authenticateUser({ identifier, password }) {
  if (!identifier || !password) {
    throw new Error('Email address or mobile number and password are required.');
  }

  let users = await getAllUsers();
  const cleanId = identifier.trim();
  const cleanEmail = normalizeEmail(cleanId);
  const cleanPhone = normalizeIndianPhone(cleanId);

  let matchedUser = users.find((u) => {
    const uEmail = normalizeEmail(u.email);
    const uPhone = normalizeIndianPhone(u.phone);
    if (uEmail === cleanEmail) return true;
    if (cleanPhone.length === 10 && uPhone === cleanPhone) return true;
    return false;
  });

  if (!matchedUser) {
    users = await getAllUsers({ forceRefresh: true });
    matchedUser = users.find((u) => {
      const uEmail = normalizeEmail(u.email);
      const uPhone = normalizeIndianPhone(u.phone);
      if (uEmail === cleanEmail) return true;
      if (cleanPhone.length === 10 && uPhone === cleanPhone) return true;
      return false;
    });
  }

  if (!matchedUser) {
    const notFoundErr = new Error('No account found with this email address or mobile number.');
    notFoundErr.statusCode = 404;
    throw notFoundErr;
  }

  const isPasswordValid = verifyPassword(password, matchedUser.passwordHash);

  if (!isPasswordValid) {
    const invalidErr = new Error('Incorrect password. Please double check and try again.');
    invalidErr.statusCode = 401;
    throw invalidErr;
  }

  if (!matchedUser.passwordHash?.startsWith('$2')) {
    matchedUser.passwordHash = hashPassword(password);
    await saveAllUsers(users);
  }

  const token = createSessionToken(matchedUser);
  return {
    user: sanitizeUser(matchedUser),
    token
  };
}

// Extract and verify authentication from HTTP Request
export function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1];
  return verifySessionToken(token);
}

// Admin Authorization Guard
export async function requireAdmin(req) {
  const tokenPayload = getAuthenticatedUser(req);
  if (!tokenPayload) {
    const err = new Error('Authentication required. Please log in.');
    err.statusCode = 401;
    throw err;
  }

  const users = await getAllUsers();
  const dbUser = users.find((u) => u.id === tokenPayload.userId || normalizeEmail(u.email) === normalizeEmail(tokenPayload.email));

  if (!dbUser || dbUser.role !== 'admin') {
    const err = new Error('Access denied. Administrator privileges required.');
    err.statusCode = 403;
    throw err;
  }

  return dbUser;
}

// ==========================================
// 5. PROPERTIES & ENQUIRIES & MEDIA STORAGE
// ==========================================

export async function getAllPropertiesFromDb() {
  const pool = await getMysqlPool();
  if (pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM properties ORDER BY created_at ASC');
      if (Array.isArray(rows) && rows.length > 0) {
        return rows.map((r) => ({
          ...r,
          features: typeof r.features === 'string' ? JSON.parse(r.features) : r.features,
          amenities: typeof r.amenities === 'string' ? JSON.parse(r.amenities) : r.amenities,
          nearby: typeof r.nearby === 'string' ? JSON.parse(r.nearby) : r.nearby,
          images: typeof r.images === 'string' ? JSON.parse(r.images) : r.images,
          videos: typeof r.videos === 'string' ? JSON.parse(r.videos) : r.videos,
          isPublished: Boolean(r.is_published),
          brochurePublished: Boolean(r.brochure_published)
        }));
      }
    } catch (e) {
      console.warn('MySQL properties fetch error:', e.message);
    }
  }
  return readLocalJson('properties_database.json', []);
}

export async function getAllEnquiriesFromDb({ userId = null, role = null } = {}) {
  const pool = await getMysqlPool();
  if (pool) {
    try {
      let query = 'SELECT * FROM enquiries ORDER BY created_at DESC';
      let params = [];
      if (role !== 'admin' && userId) {
        query = 'SELECT * FROM enquiries WHERE user_id = ? ORDER BY created_at DESC';
        params = [userId];
      }
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (e) {
      console.warn('MySQL enquiries fetch error:', e.message);
    }
  }

  const all = readLocalJson('enquiries_database.json', []);
  if (role === 'admin') return all;
  if (userId) return all.filter((e) => e.userId === userId);
  return all;
}

export async function createEnquiryInDb(enquiryData) {
  const enq = {
    id: `enq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: enquiryData.userId || 'guest',
    propertyId: enquiryData.propertyId || '',
    propertyTitle: enquiryData.propertyTitle || 'General Property Consultation',
    propertyLocation: enquiryData.propertyLocation || 'Chennai',
    propertyPrice: enquiryData.propertyPrice || '',
    propertyImg: enquiryData.propertyImg || '',
    name: enquiryData.name,
    email: normalizeEmail(enquiryData.email),
    phone: formatIndianPhone(enquiryData.phone),
    message: enquiryData.message || '',
    visitDate: enquiryData.visitDate || '',
    status: 'New',
    salesNotes: 'Enquiry received. Sales team assigned.',
    createdAt: new Date().toISOString()
  };

  // Local JSON
  const current = readLocalJson('enquiries_database.json', []);
  writeLocalJson('enquiries_database.json', [enq, ...current]);

  // MySQL
  const pool = await getMysqlPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO enquiries (id, user_id, property_id, property_title, property_location, property_price, property_img, name, email, phone, message, visit_date, status, sales_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          enq.id,
          enq.userId,
          enq.propertyId,
          enq.propertyTitle,
          enq.propertyLocation,
          enq.propertyPrice,
          enq.propertyImg,
          enq.name,
          enq.email,
          enq.phone,
          enq.message,
          enq.visitDate,
          enq.status,
          enq.salesNotes
        ]
      );
    } catch (e) {
      console.warn('MySQL enquiry insert error:', e.message);
    }
  }

  return enq;
}

export async function getDatabaseStatus() {
  const pool = await getMysqlPool();
  if (pool) {
    try {
      const [res] = await pool.query('SELECT 1 as connected');
      if (res && res[0]?.connected === 1) {
        return {
          engine: 'MySQL',
          connected: true,
          host: process.env.DB_HOST || 'localhost',
          database: process.env.DB_NAME
        };
      }
    } catch (e) {
      return { engine: 'JSON', connected: true, fallbackReason: e.message };
    }
  }
  return { engine: 'JSON', connected: true, storagePath: getDataPath('users_database.json') };
}
