# Council Ticket System - Production Deployment Guide

**Status:** Production-Ready ✅
**Last Updated:** March 25, 2026

---

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Backend Deployment (Render)](#backend-deployment-render)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### ✅ Code & Configuration
- [ ] `.env` file is added to `.gitignore` (check `.gitignore`)
- [ ] `.env.example` exists with all required template variables
- [ ] All secrets rotated (especially `SESSION_SECRET_KEY`, database credentials)
- [ ] GOOGLE_CLIENT_ID/SECRET are production values from Google Console
- [ ] Cloudinary credentials are valid and tested

### ✅ Database
- [ ] For **testing**: SQLite in local dev is fine
- [ ] For **production**: PostgreSQL instance created on Render (strongly recommended)
  - Do NOT use SQLite in production with concurrent users
  - Concurrency issues will cause data locks and crashes

### ✅ Security
- [ ] `SESSION_SECRET_KEY` is unique and strong (min 32 chars)
  - Generate: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- [ ] HTTPS/SSL enabled on both Render and Vercel (automatic)
- [ ] CORS_ALLOW_ORIGINS only includes actual frontend domain(s)
- [ ] Database URL uses strong password (20+ chars with symbols)

### ✅ Testing
- [ ] Local test: `python -m pytest` or manual smoke test
- [ ] Email notifications tested (check Council email receives test ticket)
- [ ] Image upload to Cloudinary tested
- [ ] Google OAuth login tested
- [ ] Vote/unvote functionality tested

---

## Backend Deployment (Render)

### Step 1: Create PostgreSQL Database on Render

1. Go to [render.com](https://render.com)
2. Dashboard → **New +** → **PostgreSQL**
3. Fill in:
   - **Name:** `council-ticket-db`
   - **Database:** `council_db`
   - **User:** `council_user`
   - **Region:** Same as backend service (e.g., `us-east-1`)
4. Click **Create** and wait ~2-3 minutes
5. Copy the **Internal Database URL** (starts with `postgres://`)
   - Keep this safe; you'll need it in Step 3

### Step 2: Create Web Service on Render

1. **New +** → **Web Service**
2. Connect your **GitHub repository**
3. Select your repository and authorize
4. Fill in:
   - **Name:** `council-ticket-system-backend`
   - **Environment:** `Python 3`
   - **Region:** Same as database
   - **Branch:** `master` (or your default branch)
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Step 3: Set Environment Variables on Render

In the **Environment** section, add these variables (all required):

```
APP_ENV = production

DATABASE_URL = (paste the PostgreSQL URL from Step 1)
SESSION_SECRET_KEY = (strong random key, min 32 chars)
GOOGLE_CLIENT_ID = (your production Google Client ID)
GOOGLE_CLIENT_SECRET = (your production Google Client Secret)
GOOGLE_REDIRECT_URI = https://your-render-backend-url.onrender.com/auth/google/callback

FRONTEND_AUTH_SUCCESS_URL = https://your-vercel-frontend-url.vercel.app/oauth-success
FRONTEND_AUTH_ERROR_URL = https://your-vercel-frontend-url.vercel.app/login?oauth=failed

CORS_ALLOW_ORIGINS = https://your-vercel-frontend-url.vercel.app

SMTP_SENDER_EMAIL = (your Gmail)
SMTP_APP_PASSWORD = (your 16-char Gmail app password)
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 465
COUNCIL_EMAIL = (main council email)

CLOUDINARY_CLOUD_NAME = (your cloud name)
CLOUDINARY_API_KEY = (your API key)
CLOUDINARY_API_SECRET = (your API secret)
```

### Step 4: Deploy & Verify Backend

1. Click **Create Web Service**
2. Render will start the build automatically
3. Monitor the **Logs** tab for build progress
4. Once deployed, click the service URL and verify:
   - `https://your-service.onrender.com/` returns `{"status": "ok", ...}`
   - `https://your-service.onrender.com/health` returns `{"status": "healthy", ...}`
   - `https://your-service.onrender.com/docs` shows Swagger UI

**If build fails:**
- Check logs for specific error
- Verify Python version and requirements.txt
- Ensure PostgreSQL URL is correct
- See [Troubleshooting](#troubleshooting)

---

## Frontend Deployment (Vercel)

### Step 1: Push Latest Code to GitHub

```powershell
cd C:\Users\nasri\OneDrive\Desktop\council-ticket-system
git add .
git commit -m "Production hardening: secure cookies, error handling, .env.example"
git push origin master
```

### Step 2: Link Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. **Add New** → **Project**
3. Import your GitHub repository
4. Choose the repository and click **Import**

### Step 3: Configure Build Settings

In the **Project Settings** page:

1. **Build & Development Settings:**
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

2. **Root Directory:** Change to `frontend` (critical!)
   - Vercel must know to build only the frontend

### Step 4: Set Environment Variables

Under **Environment Variables**, add:

```
VITE_API_BASE_URL = https://your-render-backend-url.onrender.com
```

This tells the frontend where to send API requests.

### Step 5: Deploy Frontend

1. Click **Deploy**
2. Vercel will build and deploy automatically (~2-3 minutes)
3. Once done, you'll get a URL like `https://council-ticket-system.vercel.app`
4. Visit the URL and verify it loads

### Step 6: Update Backend CORS & OAuth URLs

⚠️ **Important:** Your backend now knows the actual Vercel URL.

1. Go back to **Render Dashboard**
2. Select `council-ticket-system-backend` service
3. Go to **Environment**
4. Update these variables with your actual Vercel URL:
   ```
   FRONTEND_AUTH_SUCCESS_URL = https://your-vercel-url.vercel.app/oauth-success
   FRONTEND_AUTH_ERROR_URL = https://your-vercel-url.vercel.app/login?oauth=failed
   CORS_ALLOW_ORIGINS = https://your-vercel-url.vercel.app
   ```
5. Click **Save Changes** (redeploy will happen automatically)

---

## Google OAuth Configuration Update

### Step 1: Update OAuth Redirect URIs in Google Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client (Web application)
5. Click **Edit** (pencil icon)
6. Under **Authorized redirect URIs**, add:
   ```
   https://your-render-url.onrender.com/auth/google/callback
   ```
7. Under **Authorized JavaScript origins**, add:
   ```
   https://your-vercel-url.vercel.app
   ```
8. Click **Save**

### Step 2: Verify OAuth Login Works

1. Go to your Vercel frontend: `https://your-vercel-url.vercel.app`
2. Click **Login** → **Sign in with Google**
3. Complete the OAuth flow
4. Verify you land on the dashboard after login

---

## Post-Deployment Verification

### 1. Smoke Test: All Core Features

```
✅ Auth:
  - Email/Password signup works
  - Email/Password login works
  - Google OAuth login works → redirects to dashboard
  - Logout clears session

✅ Tickets:
  - Create new ticket with title, description, location
  - Upload image → uploaded to Cloudinary
  - Ticket appears on dashboard
  - Ticket shows assigned status

✅ Voting:
  - Click vote button → vote count increases
  - Click again → vote count decreases
  - Vote persists on refresh
  - Vote count correct across different browser sessions

✅ Email:
  - Create ticket → Council receives email notification
  - Check Council email inbox
```

### 2. Monitor Health Endpoints

```bash
# Backend health
curl https://your-render-backend-url.onrender.com/health
# Expected: {"status": "healthy", "database": "connected"}

# Backend readiness
curl https://your-render-backend-url.onrender.com/ready
# Expected: {"ready": true, "config": "valid"}
```

### 3. Check Render Logs

1. Go to Render **Dashboard**
2. Click your backend service
3. View **Logs** tab for any warnings/errors
4. No database errors should appear

### 4. Performance Check

1. Open Vercel frontend in browser
2. Open **DevTools** (F12) → **Network**
3. Navigate to dashboard and create a ticket
4. Check:
   - API calls complete in <500ms (ideal)
   - No failed requests
   - Cloudinary image loads from CDN

---

## Troubleshooting

### Backend Won't Deploy

**Error: `pip install failed`**
- Ensure `Python 3.11.9` is set in Render environment
- Check `requirements.txt` has no syntax errors

**Error: `DATABASE_URL not set`**
- Verify PostgreSQL URL in Render **Environment** variables
- URL should start with `postgresql://` not `sqlite://`

**Error: `SECRET_KEY too short`**
- Generate new SECRET_KEY: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
- Paste into Render environment, save, redeploy

### Frontend Won't Load

**Error: `API calls timing out`**
- Check VITE_API_BASE_URL is correct in Vercel
- Verify backend is running: visit `/health` endpoint
- Check CORS_ALLOW_ORIGINS includes Vercel URL

**Error: `Google OAuth fails with 401`**
- Verify GOOGLE_CLIENT_ID/SECRET are correct
- Check Google Console has your Vercel URL in **Authorized JavaScript origins**
- Check Render backend has GOOGLE_REDIRECT_URI pointing to itself

### Database Connection Issues

**Error: `could not connect to server`**
- Verify PostgreSQL instance is running on Render
- Check DATABASE_URL format is correct
- Use **Internal** Database URL (not the external one)

**Error: `permission denied`**
- Use correct database user/password from Render PostgreSQL setup
- Rebuild database schema: SQLAlchemy will auto-create on first connection

### Session/Cookie Issues

**Error: `Login doesn't persist across pages`**
- Check **same site cookies policy**: should be `lax` in production
- Verify `withCredentials: true` in frontend axios config
- Check both frontend and backend are using HTTPS in production

### Email Not Sending

**Error: `SMTP authentication failed`**
- Verify Gmail **App Password** (not regular password)
- Enable 2FA on Gmail account first
- Generate new app password from https://myaccount.google.com/apppasswords
- Paste exact 16-char password (no spaces)

**Error: `Email times out`**
- Check SMTP_PORT is 465 (TLS) not 587
- Gmail may block in-app passwords from unknown locations
- Contact Gmail support or use SendGrid/Mailgun instead

---

## Post-Deployment Security

### 1. Rotate Secrets Periodically

Every 90 days:
1. Generate new `SESSION_SECRET_KEY`
2. Update in Render → redeploy
3. All existing sessions will invalidate (users must re-login)

### 2. Monitor Logs

Set up Render log alerts:
1. Render **Settings** → **Integrations**
2. Add Slack/Email for error alerts

### 3. Database Backups

1. Render automatically backs up PostgreSQL daily
2. Go to **Render PostgreSQL** → **Settings** → **Backups**
3. Download backups periodically to local storage

---

## Local Development After Deploy

To keep developing locally while production is running:

```powershell
cd backend
# Use local SQLite
set APP_ENV=development
python -m uvicorn main:app --reload

# In another terminal, frontend
cd frontend
npm run dev
```

Frontend will point to `http://localhost:8060` in dev mode automatically.

---

## Rollback Procedure

If production breaks:

1. **Verify** in local dev first
2. **Render:** Go to **Deployments** tab → Click previous working version → **Redeploy**
3. **Vercel:** Same: **Deployments** → Click previous version → **Redeploy**
4. Service should be back online in <1 minute

---

## Support & Resources

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **React Docs:** https://react.dev/

---

**✅ Deployment Complete!**

Your Council Ticket System is now live and production-ready.

Questions? Check logs or reach out to the development team.
