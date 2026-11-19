// PERFECT HOMES & DEVELOPERS — HOSTINGER E2E VERIFICATION TEST SUITE
// Run: node scripts/test_hostinger_e2e.js
// Completely independent test verifying all Hostinger Business delivery components

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Database & Auth imports
import {
  registerUser,
  authenticateUser,
  getAllUsers,
  requireAdmin,
  createSessionToken,
  verifySessionToken,
  sanitizeUser,
  normalizeEmail,
  normalizeIndianPhone,
  validateIndianPhone,
  formatIndianPhone,
  getDatabaseStatus
} from '../api/_db.js';

// API Handlers
import registerHandler from '../api/register.js';
import loginHandler from '../api/login.js';
import sessionHandler from '../api/session.js';
import usersHandler from '../api/users.js';
import propertyHandler from '../api/property.js';
import mediaHandler from '../api/media.js';
import enquiriesHandler from '../api/enquiries.js';
import changePasswordHandler from '../api/change-password.js';
import resetPasswordHandler from '../api/reset-password.js';
import updateProfileHandler from '../api/update-profile.js';

// PDF Brochure Generator
import {
  generatePropertyBrochure,
  getBrochureFilename,
  generateCompanyContactPdf
} from '../src/services/brochureGenerator.js';
import { PROPERTIES_DATA } from '../src/data/propertiesData.js';

// Mock HTTP Request/Response Helper
function createMockReqRes({ method = 'GET', body = {}, headers = {}, query = {} } = {}) {
  const req = {
    method,
    body,
    headers: { ...headers },
    query
  };

  let statusCode = 200;
  let responseData = null;
  let headersSent = {};

  const res = {
    setHeader(key, val) {
      headersSent[key.toLowerCase()] = val;
    },
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    },
    end() {
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
    getHeaders: () => headersSent
  };

  return { req, res };
}

async function runAllTests() {
  console.log('================================================================');
  console.log('PERFECT HOMES & DEVELOPERS — HOSTINGER E2E VERIFICATION SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // ----------------------------------------------------------------------------
  // SECTION 1: VALIDATION & DATA NORMALIZATION HELPERS
  // ----------------------------------------------------------------------------
  console.log('--- SECTION 1: Data Validation & Normalization ---');
  assert(normalizeEmail('  Test.Buyer@GMAIL.Com  ') === 'test.buyer@gmail.com', 'Email normalized to lowercase and trimmed');
  assert(normalizeIndianPhone('+91 98403 12345') === '9840312345', 'Normalized +91 mobile to 10 digits');
  assert(normalizeIndianPhone('09840312345') === '9840312345', 'Normalized leading zero mobile to 10 digits');
  assert(validateIndianPhone('9840312345') === true, 'Valid 10-digit Indian mobile starting with 9');
  assert(validateIndianPhone('1234567890') === false, 'Invalid Indian mobile starting with 1 rejected');
  assert(formatIndianPhone('9840312345') === '+91 98403 12345', 'Formatted Indian mobile with spacing');

  // ----------------------------------------------------------------------------
  // SECTION 2: TOKEN GENERATION & VERIFICATION
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Stateless Token Security ---');
  const sampleUser = { id: 'usr_test_1', email: 'test@example.com', role: 'buyer', name: 'Test User' };
  const token = createSessionToken(sampleUser);
  assert(typeof token === 'string' && token.includes('.'), 'Token generated with payload.signature format');
  const payload = verifySessionToken(token);
  assert(payload && payload.userId === 'usr_test_1', 'Valid token verified and decoded payload');
  const tamperedToken = token.slice(0, -4) + 'abcd';
  assert(verifySessionToken(tamperedToken) === null, 'Tampered token signature safely rejected');

  // ----------------------------------------------------------------------------
  // SECTION 3: USER REGISTRATION & PERSISTENCE
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 3: User Registration & Persistence ---');
  const uniqueId = Date.now().toString().slice(-6);
  const testBuyer = {
    fullName: `Karthik Narayanan ${uniqueId}`,
    email: `karthik.${uniqueId}@gmail.com`,
    phone: `+91 98401 ${uniqueId.slice(-5)}`,
    password: `KarthikSecure@${uniqueId}`
  };

  const { req: regReq, res: regRes } = createMockReqRes({
    method: 'POST',
    body: testBuyer
  });
  await registerHandler(regReq, regRes);
  assert(regRes.getStatusCode() === 201, 'POST /api/register returned 201 Created');
  const regData = regRes.getData();
  assert(regData.success === true, 'Registration marked success');
  assert(regData.user.email === testBuyer.email.toLowerCase(), 'User email stored normalized');
  assert(regData.user.role === 'buyer', 'Public registration forced to role=buyer');
  assert(!regData.user.passwordHash && !regData.user.password, 'STRICT PRIVACY: Password and hash are NEVER returned');
  const buyerToken = regData.token;

  // Duplicate Registration Handling
  console.log('\n--- SECTION 4: Duplicate Account Protection ---');
  const { req: dupReq, res: dupRes } = createMockReqRes({
    method: 'POST',
    body: testBuyer
  });
  await registerHandler(dupReq, dupRes);
  assert(dupRes.getStatusCode() === 409, 'Duplicate registration returns 409 Conflict');
  assert(dupRes.getData().error.includes('already exists'), 'Duplicate account error message returned');

  // ----------------------------------------------------------------------------
  // SECTION 5: LOGIN MODES & CREDENTIAL VERIFICATION
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Multi-Mode Login Verification ---');
  // 1. Login with Email
  const { req: loginEmailReq, res: loginEmailRes } = createMockReqRes({
    method: 'POST',
    body: { identifier: testBuyer.email, password: testBuyer.password }
  });
  await loginHandler(loginEmailReq, loginEmailRes);
  assert(loginEmailRes.getStatusCode() === 200, 'Login with email returns 200 OK');
  assert(loginEmailRes.getData().user.email === testBuyer.email.toLowerCase(), 'Login user email matches');

  // 2. Login with 10-digit Mobile
  const { req: loginPhoneReq, res: loginPhoneRes } = createMockReqRes({
    method: 'POST',
    body: { identifier: testBuyer.phone.replace(/\D/g, '').slice(-10), password: testBuyer.password }
  });
  await loginHandler(loginPhoneReq, loginPhoneRes);
  assert(loginPhoneRes.getStatusCode() === 200, 'Login with 10-digit mobile returns 200 OK');

  // 3. Login with Wrong Password
  const { req: badPassReq, res: badPassRes } = createMockReqRes({
    method: 'POST',
    body: { identifier: testBuyer.email, password: 'WrongPassword!123' }
  });
  await loginHandler(badPassReq, badPassRes);
  assert(badPassRes.getStatusCode() === 401, 'Incorrect password returns 401 Unauthorized');

  // 4. Login with Non-Existent User
  const { req: noUserReq, res: noUserRes } = createMockReqRes({
    method: 'POST',
    body: { identifier: 'nobody9999@example.com', password: 'SomePassword123' }
  });
  await loginHandler(noUserReq, noUserRes);
  assert(noUserRes.getStatusCode() === 404, 'Unknown user returns 404 Not Found');

  // ----------------------------------------------------------------------------
  // SECTION 6: SESSION VERIFICATION & PROFILE UPDATES
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 6: Session & Profile Management ---');
  const { req: sessReq, res: sessRes } = createMockReqRes({
    method: 'GET',
    headers: { Authorization: `Bearer ${buyerToken}` }
  });
  await sessionHandler(sessReq, sessRes);
  assert(sessRes.getStatusCode() === 200, 'GET /api/session returned 200 OK');
  assert(sessRes.getData().user.email === testBuyer.email.toLowerCase(), 'Session matches authenticated buyer');

  // Update Profile
  const { req: profReq, res: profRes } = createMockReqRes({
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
    body: { city: 'Thiruninravur', address: 'No 15 Gandhi Street' }
  });
  await updateProfileHandler(profReq, profRes);
  assert(profRes.getStatusCode() === 200, 'POST /api/update-profile returned 200 OK');
  assert(profRes.getData().user.city === 'Thiruninravur', 'Profile city updated successfully');

  // ----------------------------------------------------------------------------
  // SECTION 7: ADMINISTRATOR AUTHENTICATION & PRIVACY GUARD
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 7: Administrator Access & Strict Privacy ---');
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'PerfectAdmin#2026!Secure';
  const { req: adminLoginReq, res: adminLoginRes } = createMockReqRes({
    method: 'POST',
    body: { identifier: 'srilakshman73@gmail.com', password: adminPassword }
  });
  await loginHandler(adminLoginReq, adminLoginRes);
  assert(adminLoginRes.getStatusCode() === 200, 'Admin login succeeded');
  const adminToken = adminLoginRes.getData().token;
  assert(adminLoginRes.getData().user.role === 'admin', 'Admin account has role=admin');

  // Admin access to all registered users
  const { req: adminUsersReq, res: adminUsersRes } = createMockReqRes({
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  await usersHandler(adminUsersReq, adminUsersRes);
  assert(adminUsersRes.getStatusCode() === 200, 'Admin can access /api/users');
  const usersList = adminUsersRes.getData().users;
  assert(Array.isArray(usersList) && usersList.length >= 2, 'Admin received full registered users list');
  const leakedHash = usersList.some((u) => u.passwordHash || u.password);
  assert(!leakedHash, 'STRICT SECURITY: Registered users list NEVER exposes password hashes');

  // Regular buyer BLOCKED from accessing /api/users
  const { req: buyerUsersReq, res: buyerUsersRes } = createMockReqRes({
    method: 'GET',
    headers: { Authorization: `Bearer ${buyerToken}` }
  });
  await usersHandler(buyerUsersReq, buyerUsersRes);
  assert(buyerUsersRes.getStatusCode() === 403, 'Regular buyer BLOCKED from /api/users with 403 Forbidden');

  // Unauthenticated caller BLOCKED
  const { req: anonUsersReq, res: anonUsersRes } = createMockReqRes({ method: 'GET' });
  await usersHandler(anonUsersReq, anonUsersRes);
  assert(anonUsersRes.getStatusCode() === 401, 'Unauthenticated caller BLOCKED with 401 Unauthorized');

  // ----------------------------------------------------------------------------
  // SECTION 8: PROPERTY CATALOG & BROCHURE STATUS API
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 8: Property Catalog & Configuration API ---');
  // Public catalog summary
  const { req: propListReq, res: propListRes } = createMockReqRes({ method: 'GET' });
  await propertyHandler(propListReq, propListRes);
  assert(propListRes.getStatusCode() === 200, 'GET /api/property returns 200 OK');
  assert(propListRes.getData().properties.length >= 10, 'Catalog returns all verified properties');

  // Specific property query
  const { req: propReq, res: propRes } = createMockReqRes({ method: 'GET', query: { id: 'ph-109' } });
  await propertyHandler(propReq, propRes);
  assert(propRes.getStatusCode() === 200, 'GET /api/property?id=ph-109 returns 200 OK');
  assert(propRes.getData().property.id === 'ph-109', 'Returned correct property details');

  // Admin configuration update
  const { req: propPutReq, res: propPutRes } = createMockReqRes({
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { id: 'ph-109', brochurePublished: true }
  });
  await propertyHandler(propPutReq, propPutRes);
  assert(propPutRes.getStatusCode() === 200, 'Admin can update property brochure status');

  // ----------------------------------------------------------------------------
  // SECTION 9: MEDIA CATALOG (PARTS 1 TO 8) API
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 9: Media Catalog (Parts 1-8) API ---');
  const { req: mediaListReq, res: mediaListRes } = createMockReqRes({ method: 'GET' });
  await mediaHandler(mediaListReq, mediaListRes);
  assert(mediaListRes.getStatusCode() === 200, 'GET /api/media returns 200 OK');
  assert(mediaListRes.getData().media.length >= 100, 'Media catalog loaded successfully');

  // Filter media by Part 1
  const { req: mediaPart1Req, res: mediaPart1Res } = createMockReqRes({ method: 'GET', query: { part: '1' } });
  await mediaHandler(mediaPart1Req, mediaPart1Res);
  assert(mediaPart1Res.getStatusCode() === 200, 'GET /api/media?part=1 returns 200 OK');
  const part1Items = mediaPart1Res.getData().media;
  assert(part1Items.every((m) => m.partNumber === 1), 'All items belong to Part 1');

  // ----------------------------------------------------------------------------
  // SECTION 10: CUSTOMER ENQUIRIES API
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 10: Customer Enquiries API ---');
  const { req: enqPostReq, res: enqPostRes } = createMockReqRes({
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerToken}` },
    body: {
      name: testBuyer.fullName,
      email: testBuyer.email,
      phone: testBuyer.phone,
      propertyId: 'ph-109',
      propertyTitle: 'Model Villa Aster',
      message: 'Requesting weekend site visit and floor plan copy.'
    }
  });
  await enquiriesHandler(enqPostReq, enqPostRes);
  assert(enqPostRes.getStatusCode() === 201, 'POST /api/enquiries returns 201 Created');
  const newEnq = enqPostRes.getData().enquiry;
  assert(newEnq && newEnq.propertyId === 'ph-109', 'Enquiry recorded in database');

  // Buyer fetch their enquiries
  const { req: enqGetReq, res: enqGetRes } = createMockReqRes({
    method: 'GET',
    headers: { Authorization: `Bearer ${buyerToken}` }
  });
  await enquiriesHandler(enqGetReq, enqGetRes);
  assert(enqGetRes.getStatusCode() === 200, 'GET /api/enquiries returns 200 OK');

  // Admin update enquiry status
  const { req: enqPutReq, res: enqPutRes } = createMockReqRes({
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { id: newEnq.id, status: 'In Progress', salesNotes: 'Contacted buyer on WhatsApp.' }
  });
  await enquiriesHandler(enqPutReq, enqPutRes);
  assert(enqPutRes.getStatusCode() === 200, 'Admin can update enquiry status and sales notes');

  // ----------------------------------------------------------------------------
  // SECTION 11: VERIFIED 8-PAGE PDF BROCHURE GENERATION
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 11: Verified 8-Page PDF Brochure Engine ---');
  const testProp = PROPERTIES_DATA.find((p) => p.id === 'ph-109');
  const startTime = Date.now();
  const doc = await generatePropertyBrochure(testProp);
  const duration = Date.now() - startTime;
  const pageCount = doc.getNumberOfPages();
  assert(pageCount === 8, `PDF has exactly 8 pages (generated in ${duration}ms)`);
  const filename = getBrochureFilename(testProp);
  assert(filename.endsWith('-Property-Brochure.pdf'), 'Brochure filename formatted properly');
  const pdfBytes = doc.output('arraybuffer');
  assert(pdfBytes.byteLength > 20000, `PDF size is valid (${(pdfBytes.byteLength / 1024).toFixed(1)} KB)`);

  // Company Profile PDF
  const companyDoc = await generateCompanyContactPdf();
  assert(companyDoc.getNumberOfPages() === 1, 'Company Profile PDF has 1 page');

  // ----------------------------------------------------------------------------
  // SECTION 12: DATABASE ENGINE HEALTH STATUS
  // ----------------------------------------------------------------------------
  console.log('\n--- SECTION 12: Database Engine Health Status ---');
  const dbStatus = await getDatabaseStatus();
  assert(dbStatus.connected === true, `Database status is connected (${dbStatus.engine} Engine)`);

  console.log('\n================================================================');
  console.log(`🎉 ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED (100% SUCCESS)`);
  console.log('================================================================\n');
}

runAllTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
