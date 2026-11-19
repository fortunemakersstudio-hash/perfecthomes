-- ==============================================================================
-- PERFECT HOMES & DEVELOPERS — HOSTINGER MYSQL DATABASE SCHEMA
-- Version: 1.0.0 (Production)
-- Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. Table: users (Buyers & Administrators)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `first_name` VARCHAR(100) DEFAULT NULL,
  `last_name` VARCHAR(100) DEFAULT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `avatar` TEXT DEFAULT NULL,
  `role` VARCHAR(30) NOT NULL DEFAULT 'buyer',
  `joined_date` VARCHAR(50) DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT 'Chennai',
  `address` TEXT DEFAULT NULL,
  `notification_prefs` JSON DEFAULT NULL,
  `profile_completed` INT NOT NULL DEFAULT 75,
  `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
  `status` VARCHAR(30) NOT NULL DEFAULT 'Active',
  `registered_at` DATETIME DEFAULT NULL,
  `enquiries_count` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_email` (`email`),
  KEY `idx_user_phone` (`phone`),
  KEY `idx_user_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User profiles and authentication credentials';

-- ------------------------------------------------------------------------------
-- 2. Table: properties (Residential Plots, Villas, Houses, Land + Construction)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `properties` (
  `id` VARCHAR(64) NOT NULL,
  `slug` VARCHAR(150) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `location` VARCHAR(150) NOT NULL,
  `price_display` VARCHAR(100) NOT NULL,
  `price` BIGINT NOT NULL DEFAULT 0,
  `bhk` VARCHAR(30) DEFAULT NULL,
  `built_up_area` VARCHAR(50) DEFAULT NULL,
  `plot_area` VARCHAR(50) DEFAULT NULL,
  `facing` VARCHAR(50) DEFAULT NULL,
  `possession` VARCHAR(100) DEFAULT NULL,
  `rera_approved` TINYINT(1) NOT NULL DEFAULT 1,
  `cmda_approved` TINYINT(1) NOT NULL DEFAULT 1,
  `description` TEXT DEFAULT NULL,
  `features` JSON DEFAULT NULL,
  `amenities` JSON DEFAULT NULL,
  `nearby` JSON DEFAULT NULL,
  `images` JSON DEFAULT NULL,
  `videos` JSON DEFAULT NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `brochure_published` TINYINT(1) NOT NULL DEFAULT 1,
  `google_maps_url` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_prop_slug` (`slug`),
  KEY `idx_prop_category` (`category`),
  KEY `idx_prop_location` (`location`),
  KEY `idx_prop_is_published` (`is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Property listings and brochure configurations';

-- ------------------------------------------------------------------------------
-- 3. Table: enquiries (Customer Leads & Site Visit Bookings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `enquiries` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `property_id` VARCHAR(64) DEFAULT NULL,
  `property_title` VARCHAR(255) DEFAULT NULL,
  `property_location` VARCHAR(150) DEFAULT NULL,
  `property_price` VARCHAR(100) DEFAULT NULL,
  `property_img` TEXT DEFAULT NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `message` TEXT DEFAULT NULL,
  `visit_date` VARCHAR(50) DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'New',
  `sales_notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_enq_user_id` (`user_id`),
  KEY `idx_enq_property_id` (`property_id`),
  KEY `idx_enq_status` (`status`),
  KEY `idx_enq_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Customer enquiries, site visits, and sales lead notes';

-- ------------------------------------------------------------------------------
-- 4. Table: media (Parts 1 to 8 Media Library & Construction Galleries)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `media` (
  `id` VARCHAR(64) NOT NULL,
  `part_number` INT NOT NULL,
  `part_name` VARCHAR(255) NOT NULL,
  `project_id` VARCHAR(100) NOT NULL,
  `original_filename` VARCHAR(255) NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `media_type` VARCHAR(20) NOT NULL,
  `storage_path` TEXT NOT NULL,
  `size_kb` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `upload_date` VARCHAR(30) DEFAULT NULL,
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `caption` TEXT DEFAULT NULL,
  `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_media_part` (`part_number`),
  KEY `idx_media_project` (`project_id`),
  KEY `idx_media_type` (`media_type`),
  KEY `idx_media_featured` (`is_featured`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Organized property photo and video asset catalog';

SET FOREIGN_KEY_CHECKS = 1;
