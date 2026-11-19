# PERFECT HOMES & DEVELOPERS — HOSTINGER BUSINESS DEPLOYMENT GUIDE

This document is the official, complete step-by-step production deployment manual for **Perfect Homes & Developers** on **Hostinger Business Web Hosting**.

Follow these instructions carefully to deploy the website, configure the Node.js application, connect your MySQL database, bind your custom domain name, and enable free SSL.

---

## Pre-Deployment Summary

| Parameter | Configuration Value |
| :--- | :--- |
| **Hosting Plan** | Hostinger Business (Managed Web Hosting / Cloud Hosting) |
| **Application Type** | Node.js Web Application |
| **Node.js Version** | **Node.js 20.x LTS** (or Node.js 22.x LTS) |
| **Package Manager** | `npm` |
| **Application Entry File** | `server.js` |
| **Build Command** | `npm run build` |
| **Database** | Hostinger MySQL (with automatic local JSON fallback) |
| **SSL Certificate** | Hostinger Free Let's Encrypt Lifetime SSL |
| **Target Domain** | `[YOUR-DOMAIN.COM]` *(Client custom domain)* |

---

> [!WARNING]
> ### CRITICAL EMAIL & DNS WARNING (READ BEFORE CHANGING DNS)
> If your domain name already hosts an existing website, corporate email (e.g., Google Workspace, Microsoft 365, Zoho Mail, or cPanel Webmail), **DO NOT blindly change Nameservers without copying your DNS records first!**
> 
> 1. Log in to your existing domain registrar or DNS management portal.
> 2. Export or screenshot all existing **MX (Mail Exchange)**, **TXT (SPF / DKIM / DMARC)**, and **CNAME** records.
> 3. If you switch to Hostinger Nameservers, immediately re-create all your existing MX and TXT records in Hostinger DNS Zone so email delivery is not interrupted.
> 4. If you prefer to keep your existing DNS provider, only point the **A record** (`@`) and **CNAME** (`www`) to your Hostinger server IP address.

---

## Phase 1: Sign In & Set Up Node.js Web App in Hostinger hPanel

### Step 1: Sign in to Hostinger
1. Open your browser and navigate to [https://hpanel.hostinger.com](https://hpanel.hostinger.com).
2. Log in using your client credentials.

### Step 2: Open Websites & Create / Select Your Site
1. From the top navigation menu, click **Websites**.
2. If your domain is already added to your hosting plan, find it in the list and click **Manage**.
3. If this is a new domain, click **Add Website** (or **Create Site**):
   - Choose **Business Web Hosting**.
   - Select **Create a new website** or **Migrate my website**.
   - Choose **Node.js** Web App (or select **Empty / Upload Files**).
   - Enter your domain name placeholder: `[YOUR-DOMAIN.COM]`.

### Step 3: Access the Node.js Configuration
1. In the left-hand sidebar under your website management dashboard, look for **Advanced** → **Node.js** (or search for `Node.js` in the hPanel search bar).
2. Click **Create Application** (or **Configure Node.js**).

### Step 4: Configure the Node.js Environment Settings
Enter the following exact settings:

- **Node.js Version**: Select **20.x** (or **22.x** LTS).
- **Application Mode**: Select **Production**.
- **Application Root**: `public_html` (or your domain's default web directory).
- **Application Startup File**: `server.js`.
- **Application URL**: Select `http://[YOUR-DOMAIN.COM]` (or the temporary preview URL provided by Hostinger).
- Click **Save** (or **Create**).

---

## Phase 2: Upload & Extract the Deployment Package

### Step 5: Upload the Prepared ZIP File
1. In hPanel, go to **Files** → **File Manager** (Files File Manager for your website).
2. Navigate into your website root directory: `public_html/`.
3. *(If `public_html/` contains a default `default.php` or `index.html` placeholder from Hostinger, delete or rename it).*
4. In the top toolbar, click the **Upload** icon (arrow pointing up) and select **File**.
5. Choose `Perfect-Homes-Developers-Hostinger-Delivery.zip` from your computer.
6. Wait for the upload progress bar to reach 100%.

### Step 6: Extract the Files
1. Right-click on `Perfect-Homes-Developers-Hostinger-Delivery.zip` in File Manager.
2. Select **Extract** (or click the Extract button in the top toolbar).
3. In the destination field, specify `.` (current directory: `public_html`).
4. Click **Extract**.
5. Verify that the following files and folders now appear in `public_html/`:
   ```text
   public_html/
   ├── api/
   ├── database/
   ├── data/
   ├── public/
   ├── scripts/
   ├── src/
   ├── dist/                 (Pre-built production frontend)
   ├── .env.example
   ├── index.html
   ├── package.json
   ├── package-lock.json
   ├── server.js
   └── vite.config.js
   ```
6. You may now delete the uploaded `.zip` archive from File Manager to free up disk space.

---

## Phase 3: Set Up Production Environment Variables (.env)

### Step 7: Create the `.env` File
1. In Hostinger File Manager inside `public_html/`, find the file named `.env.example`.
2. Make a copy of `.env.example` and name it `.env` (or create a new file named `.env`).
3. Right-click `.env` and select **Edit**.
4. Configure the variables:
   ```env
   # Application Server Port & Environment
   PORT=3000
   NODE_ENV=production

   # Security Secret (Replace with a random 64-character string)
   AUTH_SECRET=ph_sec_replace_with_your_own_secure_random_production_secret_key_2026

   # Initial Administrator Password (for srilakshman73@gmail.com)
   ADMIN_INITIAL_PASSWORD=PerfectAdmin#2026!Secure

   # Hostinger MySQL Database Credentials (from Phase 4)
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=u123456789_perfecthomes
   DB_USER=u123456789_phuser
   DB_PASSWORD=YourDatabasePasswordHere
   ```
5. Click **Save** and close the editor.

*(Note: If you leave the `DB_*` fields blank during initial deployment, the website will automatically run using its built-in persistent local JSON storage engine. Once MySQL is configured, it seamlessly transitions).*

---

## Phase 4: Configure Hostinger MySQL Database

### Step 8: Create MySQL Database & User in hPanel
1. In Hostinger hPanel, go to **Databases** → **Management** (or **MySQL Databases**).
2. Under **Create a New MySQL Database and Database User**:
   - **MySQL Database Name**: Enter `perfecthomes` (Full name will be: `uXXXXXXX_perfecthomes`).
   - **MySQL Username**: Enter `phuser` (Full user will be: `uXXXXXXX_phuser`).
   - **Password**: Generate a strong password. Save this password securely!
3. Click **Create**.
4. Hostinger displays the newly created database in the list below.

### Step 9: Import Database Schema & Seed Data via phpMyAdmin
1. In the database list, click the **Enter phpMyAdmin** button next to your database.
2. In phpMyAdmin, click your database name in the left sidebar.
3. Click the **Import** tab at the top.
4. Click **Choose File** and select `database/hostinger_schema.sql`.
5. Scroll down and click **Go** (or **Import**).
   - *Confirmation: You will see success messages creating `users`, `properties`, `enquiries`, and `media` tables.*
6. Click the **Import** tab once again.
7. Click **Choose File** and select `database/hostinger_seed.sql`.
8. Click **Go** to import verified property listings, user accounts, and media catalog.

*(Alternative Method: You can also run `npm run db:migrate` via SSH or Hostinger Web Console).*

---

## Phase 5: Install Dependencies, Build & Start Application

### Step 10: Run NPM Install & Build in Hostinger Node.js Dashboard
1. Go back to hPanel → **Advanced** → **Node.js** (or Web Apps dashboard).
2. Under your Node.js application:
   - Click the **NPM Install** button. Hostinger will install production dependencies.
   - Alternatively, open the **Terminal / SSH** or **Web Console** and run:
     ```bash
     cd public_html
     npm install
     npm run build
     ```
   *(Note: The delivery package already includes a pre-compiled `dist/` directory, so the site will run immediately even before running build!)*
3. Click **Start App** (or **Restart App**).
4. Verify the status indicator turns green: **Status: Running**.

---

## Phase 6: Connect Client Domain & Configure DNS

### Step 11: Connect Your Domain
1. In hPanel, navigate to **Websites** → **Manage** → **Domain Name**.
2. If your domain is registered through Hostinger:
   - Hostinger connects DNS automatically.
3. If your domain is registered at an external registrar (GoDaddy, Namecheap, Google Domains / Squarespace, BigRock, etc.):
   - You have two choices:

#### Choice A: Point via Nameservers (Recommended by Hostinger)
Set your domain's Nameservers at your registrar to Hostinger:
- `ns1.dns-parking.com`
- `ns2.dns-parking.com`
*(Remember to restore any existing MX or email DNS records!)*

#### Choice B: Point via A Records (Preserves Existing Email & DNS Elsewhere)
In your current DNS provider's dashboard:
1. Locate the **A record** for `@` (root domain):
   - Type: `A`
   - Name / Host: `@`
   - Points to / Value: `[HOSTINGER-SERVER-IP]` *(Find this on your hPanel dashboard under Account Info / IP Address)*
   - TTL: `3600` (or `Automatic`)
2. Locate the **CNAME record** for `www`:
   - Type: `CNAME`
   - Name / Host: `www`
   - Points to: `[YOUR-DOMAIN.COM]`
   - TTL: `3600`

---

## Phase 7: Enable SSL (HTTPS Security)

### Step 12: Activate Free Lifetime SSL
1. In Hostinger hPanel, navigate to **Security** → **SSL**.
2. Select your domain `[YOUR-DOMAIN.COM]`.
3. Click **Install SSL** (Hostinger provides free automatic Let's Encrypt certificates).
4. Toggle **Force HTTPS** to **ON** to ensure all traffic is securely encrypted.
5. Wait 2–5 minutes for the SSL certificate status to change to **Active**.

---

## Phase 8: Comprehensive Production Verification Checklist

Open your browser and navigate to `https://[YOUR-DOMAIN.COM]`. Complete this verification checklist:

| # | Feature / Test | Verification Steps | Expected Result |
| :---: | :--- | :--- | :--- |
| **1** | **Backend Health Check** | Visit `https://[YOUR-DOMAIN.COM]/api/health` | Returns JSON: `status: "ok"`, `environment: "Hostinger Business Node.js"` |
| **2** | **Home Page** | Open root `https://[YOUR-DOMAIN.COM]` | Hero section, featured properties, parts 1-8 media render cleanly |
| **3** | **User Registration** | Click Register → fill full name, email, 10-digit Indian mobile, password | Account created, 201 Created, redirected with active session |
| **4** | **Duplicate Account Check** | Try registering again with same email or mobile | Rejected with clear 409 Conflict error message |
| **5** | **Login via Email** | Log out → Log in using registered email + password | Successful login, welcome toast, session persisted |
| **6** | **Login via Mobile** | Log out → Log in using 10-digit mobile number | Successful login without typing email |
| **7** | **Admin Authentication** | Log in as `srilakshman73@gmail.com` with admin password | Admin dashboard accessible at `/admin` |
| **8** | **Strict User Privacy** | While logged in as regular buyer, try opening `/api/users` | Blocked with 403 Forbidden; buyer sees only their own data |
| **9** | **Admin User Directory** | In Admin Dashboard, view Registered Users tab | Displays registered buyers; passwords and hashes are strictly hidden |
| **10** | **Property Detail Pages** | Click on any property (e.g. Model Villa Aster or Residential Plots) | Full specs, photo gallery, location, and price display correctly |
| **11** | **PDF Brochure Generation** | On any property page, click "Download Official Brochure" | Generates verified 8-page A4 PDF with selectable text, vector icons, no missing logos |
| **12** | **Customer Enquiry Submission**| Submit enquiry or visit request form | Stored in database, success toast shown, appears in Admin and My Enquiries |
| **13** | **Property Video Streaming** | Play any property site video | Video streams smoothly with instant scrubbing (HTTP 206 Partial Content) |
| **14** | **Mobile Responsiveness** | Open website on smartphone or tablet | Navbar collapses to mobile drawer, tables adapt, cards stack smoothly |
| **15** | **WhatsApp Integration** | Click WhatsApp button on property card | Opens WhatsApp chat pre-filled with property inquiry |

---

## Phase 9: Troubleshooting Common Issues

### Issue 1: "Cannot GET /properties/ph-101" or 404 on page refresh
- **Cause**: Web server is not rewriting non-API GET requests to `dist/index.html`.
- **Solution**: The included `server.js` automatically handles SPA fallback. Ensure `server.js` is set as your **Application Startup File** in hPanel Node.js settings.

### Issue 2: Website shows "Application is not running" or 503 Service Unavailable
- **Cause**: Node process crashed or has not started.
- **Solution**:
  1. In hPanel → Node.js Web App, check **Application Logs** or `stderr.log`.
  2. Verify that Node version is set to **20.x** or **22.x**.
  3. Click **Restart App**.

### Issue 3: MySQL Connection Error: "Access denied for user" or "ECONNREFUSED"
- **Cause**: Incorrect database credentials in `.env`.
- **Solution**:
  1. Open `.env` in File Manager.
  2. Ensure `DB_HOST=localhost` (do not use remote IP unless connecting externally).
  3. Double-check `DB_USER` and `DB_NAME` (make sure to include the `uXXXXXXX_` prefix).
  4. Ensure `DB_PASSWORD` matches the password created in hPanel.

### Issue 4: Email stopped working after changing Nameservers
- **Cause**: Existing MX and SPF records were replaced by default DNS.
- **Solution**:
  1. In hPanel, go to **Advanced** → **DNS Zone Editor**.
  2. Add your email provider's MX records (e.g., Google Workspace: `ASPMX.L.GOOGLE.COM`, etc.).
  3. Add your TXT SPF record (`v=spf1 include:... ~all`).

---

## Phase 10: Support & Contacts

For any technical assistance or developer inquiries regarding this handover package:
- **Developer**: Perfect Homes & Developers Engineering Team
- **Official Email**: `srilakshman73@gmail.com`
- **Official Phone / WhatsApp**: `+91 73050 23919`
- **Head Office**: No: 3 Krishna Nagar, CTH Road, Thiruninravur – 602024
