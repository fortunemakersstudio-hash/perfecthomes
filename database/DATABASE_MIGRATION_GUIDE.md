# PERFECT HOMES & DEVELOPERS — HOSTINGER DATABASE MIGRATION & BACKUP GUIDE

This guide explains how to manage, migrate, back up, and restore the MySQL database on **Hostinger Business Web Hosting** for Perfect Homes & Developers.

---

## 1. Architectural Overview

The application features an enterprise-grade **Dual-Storage Engine Architecture**:

| Storage Mode | Engine | Activation | Ideal Use Case |
| :--- | :--- | :--- | :--- |
| **Primary (Production)** | **Hostinger MySQL** | When `DB_HOST`, `DB_USER`, `DB_NAME` are set in `.env` | High-traffic production website, multi-user concurrency |
| **Resilient Fallback** | **Local JSON Storage** | Automatically active if MySQL credentials are not set | Zero-configuration preview, local testing, offline backup |

Both engines preserve complete application functionality:
- User registration and authentication
- Bcrypt password hashing
- Session persistence
- Admin authorization guards
- Property catalog and brochure configuration
- Customer enquiries and leads
- Media library (Parts 1 to 8)

---

## 2. Setting Up MySQL on Hostinger Business

### Step 2.1: Create MySQL Database in hPanel
1. Log in to **Hostinger hPanel** ([hpanel.hostinger.com](https://hpanel.hostinger.com)).
2. In the top navigation, click **Websites** and select your website (`Manage`).
3. In the left sidebar, navigate to **Databases** → **Management** (or **MySQL Databases**).
4. Under **Create a New MySQL Database And Database User**, enter:
   - **MySQL Database Name**: e.g., `perfecthomes` (hPanel prepends your account prefix, e.g., `u123456789_perfecthomes`).
   - **MySQL Username**: e.g., `phuser` (hPanel prepends your prefix, e.g., `u123456789_phuser`).
   - **Password**: Generate a strong password (minimum 12 characters).
5. Click **Create**.
6. Note down the full **Database Name**, **Username**, and **Password**.
   *(On Hostinger managed web hosting, the database host is always `localhost`).*

---

## 3. Importing the Database

You can import the database schema and seed data using either of two methods:

### Method A: phpMyAdmin Web Interface (Easiest)
1. In Hostinger hPanel under **Databases** → **Management**, locate your newly created database.
2. Click the **Enter phpMyAdmin** button next to your database.
3. In phpMyAdmin, click on your database name in the left panel.
4. Click the **Import** tab in the top navigation.
5. Click **Choose File** and select `database/hostinger_schema.sql` from your package.
6. Click **Go** (or **Import**) at the bottom. You will see green confirmation checkmarks for all 4 tables (`users`, `properties`, `enquiries`, `media`).
7. Repeat the import step with `database/hostinger_seed.sql` to populate verified property listings, user accounts, and media assets.

### Method B: Automated Node.js Migration CLI
If you have SSH access or terminal access in hPanel:
1. Ensure your `.env` file contains your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=u123456789_perfecthomes
   DB_USER=u123456789_phuser
   DB_PASSWORD=YourPasswordHere
   ```
2. In your application root, run:
   ```bash
   npm run db:migrate
   ```
3. The migration script will automatically:
   - Connect to your Hostinger MySQL database.
   - Execute table creation schemas.
   - Insert all user accounts, properties, enquiries, and media records.
   - Output a migration summary report.

---

## 4. Database Schema Reference

### 1. `users` Table
Stores registered buyer profiles and administrators with hashed credentials:
- `id` (VARCHAR 64, PK): Unique identifier (e.g., `usr_admin_srilakshman`)
- `name`, `first_name`, `last_name`: User full name
- `email` (VARCHAR 150, UNIQUE): Normalized lowercase email
- `phone` (VARCHAR 50): Formatted Indian mobile number (`+91 XXXXX XXXXX`)
- `password_hash` (VARCHAR 255): Salted bcrypt hash (`$2b$10$...`)
- `avatar`: URL to avatar image
- `role`: Role (`buyer` or `admin`)
- `joined_date`, `city`, `address`, `notification_prefs`, `profile_completed`, `must_change_password`, `status`, `registered_at`, `enquiries_count`

### 2. `properties` Table
Stores property details, specifications, media references, and brochure publish states:
- `id` (VARCHAR 64, PK): Property ID (e.g., `ph-101`, `ph-109`)
- `slug` (VARCHAR 150, UNIQUE): SEO URL slug
- `title`, `category`, `location`, `price_display`, `price`
- `bhk`, `built_up_area`, `plot_area`, `facing`, `possession`
- `rera_approved`, `cmda_approved`: Legal approval booleans
- `description`: Detailed property overview
- `features`, `amenities`, `nearby`, `images`, `videos`: JSON structured data
- `is_published`: Website listing visibility toggle
- `brochure_published`: Official PDF brochure download toggle
- `google_maps_url`: Verified Google Maps location link

### 3. `enquiries` Table
Stores customer leads, site visit bookings, and sales CRM notes:
- `id` (VARCHAR 64, PK): Enquiry ID (e.g., `enq_1001`)
- `user_id`: Reference to `users.id` (or `guest`)
- `property_id`, `property_title`, `property_location`, `property_price`, `property_img`
- `name`, `email`, `phone`, `message`, `visit_date`
- `status`: Lead workflow status (`New`, `In Progress`, `Contacted`, `Closed`)
- `sales_notes`: Sales manager follow-up notes

### 4. `media` Table
Stores catalog metadata for Parts 1 to 8 construction photos and videos:
- `id` (VARCHAR 64, PK): Media ID (e.g., `med_p1_1_edli`)
- `part_number`, `part_name`, `project_id`
- `original_filename`, `filename`, `media_type` (`image` or `video`)
- `storage_path`: Relative URL (e.g., `/media/part1/images/...`)
- `size_kb`, `upload_date`, `is_featured`, `caption`, `is_archived`

---

## 5. Backup & Restore Procedures

### Automated CLI Backup
Run the backup script at any time:
```bash
npm run db:backup
```
- Backs up all tables from either MySQL or Local JSON.
- Creates a timestamped JSON backup in `database/backups/backup_YYYY-MM-DDTHH-mm-ss.json`.

### Hostinger hPanel Automated Backups
Hostinger Business hosting automatically creates daily backups:
1. In hPanel, go to **Files** → **Backups**.
2. Select **Database Backups**.
3. Choose your database name and the date you want to restore.
4. Click **Restore** to automatically roll back to that point in time.

### phpMyAdmin Manual Export
1. In phpMyAdmin, select your database.
2. Click the **Export** tab.
3. Select **Quick - display only the minimal options** and format **SQL**.
4. Click **Export** to download a `.sql` dump to your computer.

---

## 6. Security Best Practices
- **Never commit `.env` to Git**: `.env` contains your private MySQL password and `AUTH_SECRET`.
- **Unique Credentials**: Use a distinct, strong password for the database user.
- **Strict Role Enforcement**: Public registration is hardcoded to `role = 'buyer'`. Administrator role (`admin`) can only be set directly in the database.
- **Passwords**: Passwords are never stored or transmitted in plain text. All passwords use standard bcrypt with 10 salt rounds.
