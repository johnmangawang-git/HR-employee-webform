# Cloudinary Setup Guide for HR Webform v2.0

## 🚀 Step 1: Create Cloudinary Account

1. Go to [https://cloudinary.com/](https://cloudinary.com/)
2. Sign up for a **free account**
3. Verify your email address

## 🔑 Step 2: Get Your Cloudinary Credentials

1. After logging in, go to your **Dashboard**
2. You'll see your account details:
   - **Cloud Name**: (e.g., `your-cloud-name`)
   - **API Key**: (e.g., `123456789012345`)
   - **API Secret**: (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

## ⚙️ Step 3: Add Environment Variables to Netlify

1. Go to your **Netlify Dashboard**
2. Navigate to your site → **Site settings** → **Environment variables**
3. Add these **3 new variables**:

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

**Replace the values with your actual Cloudinary credentials!**

## 📊 Step 4: Update Database Schema

Run this SQL in your PostgreSQL/Supabase database:

```sql
-- Add new columns if they don't exist
ALTER TABLE applications ADD COLUMN IF NOT EXISTS nick_name VARCHAR(100);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS civil_status VARCHAR(20);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS birth_place VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS religion VARCHAR(100);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS sss_no VARCHAR(20);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS philhealth_no VARCHAR(20);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS hdmf_no VARCHAR(20);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS national_id_no VARCHAR(50);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS drivers_license VARCHAR(50);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS tin_no VARCHAR(20);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS provincial_address TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS father_name VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS father_occupation VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS father_age INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS father_contact_no VARCHAR(20);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS mother_occupation VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS mother_age INTEGER;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS mother_contact_no VARCHAR(20);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS prev_company_1 VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS position_1 VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS dates_employed_1 VARCHAR(100);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS reason_for_leaving_1 TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS prev_company_2 VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS position_2 VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS dates_employed_2 VARCHAR(100);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS reason_for_leaving_2 TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS key_skills TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS certifications TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS languages VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ref_1_name VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ref_1_relationship VARCHAR(100);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ref_1_contact_no VARCHAR(20);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ref_2_name VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ref_2_relationship VARCHAR(100);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ref_2_contact_no VARCHAR(20);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS past_employment_issues VARCHAR(10);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS past_employment_issues_specify TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS legal_issues VARCHAR(10);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS legal_issues_specify TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS medical_history VARCHAR(10);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS medical_history_specify TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS referred_by VARCHAR(255);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS profile_picture_url VARCHAR(500);
```

## ✅ Step 5: Test the Setup

1. Deploy your updated code
2. Fill out the form with a profile picture
3. Submit the form
4. Check if:
   - Form submits successfully
   - Image appears in your Cloudinary dashboard
   - Database contains the image URL
   - Admin download includes all fields

## 🎯 Free Tier Limits

**Cloudinary Free Tier:**
- ✅ **25GB** storage
- ✅ **25GB** bandwidth per month
- ✅ **1,000** transformations per month
- ✅ **Unlimited** uploads

This is more than enough for most HR applications!

## 🔧 Troubleshooting

**If upload fails:**
1. Check Netlify function logs
2. Verify environment variables are set correctly
3. Ensure image is under 5MB
4. Check Cloudinary dashboard for error messages

**Need help?** Check the console logs in both browser and Netlify functions for detailed error messages.