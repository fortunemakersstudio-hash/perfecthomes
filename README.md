# PERFECT HOMES & DEVELOPERS — HOSTINGER BUSINESS PRODUCTION DELIVERY

Welcome to the production-ready **Hostinger Business** deployment package for **Perfect Homes & Developers**.

This package is prepared specifically for deployment on Hostinger Business managed Node.js Web App hosting, connecting with custom domains and Hostinger MySQL databases.

---

## 1. Project Overview

- **Company**: Perfect Homes & Developers
- **Head Office**: No: 3 Krishna Nagar, CTH Road, Thiruninravur – 602024
- **Phone / WhatsApp**: +91 73050 23919
- **Email**: srilakshman73@gmail.com
- **Target Hosting**: Hostinger Business (Managed Node.js Web App)
- **Target Domain**: `[YOUR-DOMAIN.COM]` (To be configured by client)
- **Source of Truth Reference Deployment**: `https://perfect-homes-developers.vercel.app`

---

## 2. Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** + **Vite 8** | Single Page Application (SPA) with responsive CSS & Lucide Icons |
| **Backend Runtime** | **Node.js (18.x / 20.x / 22.x LTS)** | Universal HTTP Web Server in `server.js` |
| **Primary Database** | **Hostinger MySQL / MariaDB** | Native relational database with tables: `users`, `properties`, `enquiries`, `media` |
| **Fallback Database** | **Local Persistent JSON Storage** | Self-contained persistent database in `data/` for zero-configuration startup |
| **Authentication** | **Bcrypt.js + HMAC-SHA256** | Salted password hashing, stateless 30-day session tokens |
| **Brochure Generation** | **jsPDF Universal Vector Engine** | 8-Page A4 high-res PDF brochure generator with native vector icons & selectable text |
| **Media Delivery** | **HTTP Range Streaming** | Built-in support for video seeking (`206 Partial Content`) and cached static assets |

---

## 3. Directory Structure

```text
Perfect-Homes-Developers-Hostinger-Delivery/
├── api/                             # Backend API handlers (Node.js & Hostinger compatible)
│   ├── _db.js                       # Centralized Dual-Engine Database & Auth Manager
│   ├── login.js                     # Multi-mode login (Email or 10-digit Indian Mobile)
│   ├── register.js                  # User registration with duplicate account protection
│   ├── session.js                   # Stateless session token verification
│   ├── users.js                     # Admin-only registered users directory
│   ├── property.js                  # Property catalog & brochure status API
│   ├── media.js                     # Parts 1 to 8 media management API
│   ├── enquiries.js                 # Customer leads & site visit booking API
│   ├── change-password.js           # Authenticated user password change
│   ├── reset-password.js            # Password recovery flow
│   └── update-profile.js            # User profile update endpoint
├── database/                        # Database schemas, seeds, and migration guides
│   ├── hostinger_schema.sql         # Clean MySQL DDL table schemas
│   ├── hostinger_seed.sql           # Initial SQL seed data (properties, users, media)
│   ├── DATABASE_MIGRATION_GUIDE.md  # Step-by-step MySQL & phpMyAdmin guide
│   └── backups/                     # Directory for automated backups
├── data/                            # Persistent JSON database (auto-fallback & seed source)
│   ├── users_database.json          # Registered users & administrator
│   ├── properties_database.json     # 12 verified property listings
│   ├── enquiries_database.json      # Customer leads and site visit bookings
│   └── media_database.json          # Parts 1 to 8 construction media catalog
├── dist/                            # Pre-compiled production React application bundle
│   ├── assets/                      # Compiled CSS & JS bundles
│   ├── images/                      # Floor plans, maps, and property photos
│   ├── media/                       # Parts 1 to 8 construction photos & videos
│   ├── videos/                      # Property walkthrough videos
│   └── index.html                   # HTML5 SPA entry point
├── public/                          # Static public web assets
│   ├── images/                      # Floor plans, maps
│   ├── media/                       # Parts 1 to 8 media library
│   ├── videos/                      # MP4 property site videos
│   └── favicons & logos
├── scripts/                         # CLI utilities and test suites
│   ├── test_hostinger_e2e.js        # Comprehensive 50-test E2E verification suite
│   ├── migrate_to_mysql.js          # Automated JSON -> MySQL database migration script
│   ├── backup_db.js                 # Database backup and export utility
│   └── generate_seed_sql.js         # Seed SQL generator
├── src/                             # Complete React 19 source code
│   ├── assets/                      # Brand logos, property imagery
│   ├── components/                  # Navbar, Footer, Modals, Brochure Generator UI
│   ├── context/                     # AuthContext, PropertyContext, ToastContext
│   ├── data/                        # PropertiesData, MediaData, LocationsData
│   ├── pages/                       # Home, Listing, Property Details, Admin, Login, Register, Profile, etc.
│   └── services/                    # ApiService, BrochureGenerator
├── .env.example                     # Production environment variable template
├── .gitignore                       # Clean Git exclusion rules
├── HOSTINGER-DEPLOYMENT-GUIDE.md    # Complete hPanel deployment manual
├── index.html                       # Source HTML template
├── package.json                     # Production package configuration
├── package-lock.json                # Verified dependency lockfile
├── server.js                        # Production Node.js server entry file
└── vite.config.js                   # Vite configuration
```

---

## 4. Quick Start (Local Testing)

To test this package locally on your machine before uploading to Hostinger:

```bash
# 1. Install dependencies
npm install

# 2. Run the automated verification test suite (50/50 tests)
npm test

# 3. Start the production server
npm start
```

Open your browser at `http://localhost:3000`.

---

## 5. Deployment Commands

| Command | Action |
| :--- | :--- |
| `npm start` | Starts the production server on port 3000 (or `process.env.PORT`) |
| `npm run build` | Builds the React frontend application into `dist/` |
| `npm test` | Runs the full 50-step end-to-end verification test suite |
| `npm run db:migrate`| Migrates JSON records into Hostinger MySQL tables |
| `npm run db:backup` | Exports database into a timestamped backup in `database/backups/` |
| `npm run dev` | Starts Vite local development server |

---

## 6. Features Retained (100% Functionality Preserved)

- **Home & Navigation**: Hero section, quick search, featured projects, location filters.
- **Property Catalog**: 12 verified projects (Villas, Plots, Independent Houses, Land + Construction).
- **Property Details**: High-resolution galleries, amenities, specifications, Google Maps links, EMI calculator.
- **Construction Media (Parts 1 to 8)**: Photos and unique videos organized by project and part.
- **Dynamic 8-Page A4 PDF Brochure**: Professional verified PDF generator with selectable text and vector icons.
- **Authentication**: Email or 10-digit Indian mobile login, bcrypt hashing, session persistence, password reset.
- **Customer Leads & Enquiries**: Site visit requests, quotations, and enquiry tracking.
- **Admin Dashboard**: Secure management of users, properties, brochures, enquiries, and media.
- **Strict Privacy Guard**: Regular users can never access administrative APIs or view other users' contact information.

---

## 7. Handover Documentation Reference

- **Hostinger hPanel Step-by-Step Manual**: See [HOSTINGER-DEPLOYMENT-GUIDE.md](file:///D:/old%20laptop%20file/New%20Volume/Perfect%20homes%20&%20developers/Perfect-Homes-Developers-Hostinger-Delivery/HOSTINGER-DEPLOYMENT-GUIDE.md)
- **Database Setup & Backup Guide**: See [database/DATABASE_MIGRATION_GUIDE.md](file:///D:/old%20laptop%20file/New%20Volume/Perfect%20homes%20&%20developers/Perfect-Homes-Developers-Hostinger-Delivery/database/DATABASE_MIGRATION_GUIDE.md)
- **Environment Template**: See [.env.example](file:///D:/old%20laptop%20file/New%20Volume/Perfect%20homes%20&%20developers/Perfect-Homes-Developers-Hostinger-Delivery/.env.example)
