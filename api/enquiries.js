// Production API Handler: /api/enquiries
// Persistent Enquiry and Lead Management for Hostinger Node.js
import {
  getAuthenticatedUser,
  requireAdmin,
  getAllEnquiriesFromDb,
  createEnquiryInDb,
  readLocalJson,
  writeLocalJson,
  getMysqlPool
} from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET /api/enquiries
  if (req.method === 'GET') {
    try {
      const user = getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required to view enquiries.' });
      }

      const enquiries = await getAllEnquiriesFromDb({
        userId: user.userId,
        role: user.role
      });

      return res.status(200).json({
        success: true,
        count: enquiries.length,
        enquiries
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 2. POST /api/enquiries (Public or Authenticated Lead Submission)
  if (req.method === 'POST') {
    try {
      const {
        name,
        email,
        phone,
        message,
        propertyId,
        propertyTitle,
        propertyLocation,
        propertyPrice,
        propertyImg,
        visitDate
      } = req.body || {};

      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          error: 'Name, email address, and mobile number are required to submit an enquiry.'
        });
      }

      const user = getAuthenticatedUser(req);
      const newEnquiry = await createEnquiryInDb({
        userId: user ? user.userId : 'guest',
        propertyId,
        propertyTitle,
        propertyLocation,
        propertyPrice,
        propertyImg,
        name,
        email,
        phone,
        message,
        visitDate
      });

      return res.status(201).json({
        success: true,
        message: 'Enquiry received successfully. Our property consultant will contact you shortly.',
        enquiry: newEnquiry
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // 3. PUT /api/enquiries (ADMIN ONLY - Status & Sales Notes Update)
  if (req.method === 'PUT') {
    try {
      await requireAdmin(req);
      const { id, status, salesNotes } = req.body || {};

      if (!id) {
        return res.status(400).json({ success: false, error: 'Enquiry ID is required.' });
      }

      // Update in MySQL if active
      const pool = await getMysqlPool();
      if (pool) {
        try {
          await pool.query(
            'UPDATE enquiries SET status = COALESCE(?, status), sales_notes = COALESCE(?, sales_notes) WHERE id = ?',
            [status || null, salesNotes || null, id]
          );
        } catch (e) {
          console.warn('MySQL enquiry update warning:', e.message);
        }
      }

      // Update in local JSON
      const list = readLocalJson('enquiries_database.json', []);
      const idx = list.findIndex((e) => e.id === id);
      if (idx !== -1) {
        if (status) list[idx].status = status;
        if (salesNotes !== undefined) list[idx].salesNotes = salesNotes;
        writeLocalJson('enquiries_database.json', list);
      }

      return res.status(200).json({
        success: true,
        message: 'Enquiry updated successfully.',
        id
      });
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return res.status(statusCode).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
