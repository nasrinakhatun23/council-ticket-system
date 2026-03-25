# Production Deployment Checklist

Quick step-by-step checklist before deploying to production.

---

## ✅ Pre-Deploy (5 mins)

- [ ] All code committed: `git status` shows clean
- [ ] `.env` is in `.gitignore` (check!): `grep "\.env" .gitignore`
- [ ] Locally tested: `npm run dev` (frontend) + `uvicorn main:app --reload` (backend)
- [ ] All 3 test flows work:
  - [ ] Email/Password signup + login
  - [ ] Google OAuth login
  - [ ] Create ticket + upload image + vote

---

## ✅ Backend Setup on Render (10 mins)

### Database
- [ ] Create PostgreSQL: Render → **New +** → **PostgreSQL**
- [ ] Copy **Internal Database URL**

### Backend Service
- [ ] Create Web Service pointing to `backend/` root directory
- [ ] Build command: `pip install -r requirements.txt`
- [ ] Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Environment Variables (copy from below)
Replace placeholders with real values:

```
APP_ENV = production
DATABASE_URL = (from PostgreSQL setup above)
SESSION_SECRET_KEY = (run: python -c "import secrets; print(secrets.token_urlsafe(32))")
GOOGLE_CLIENT_ID = (from Google Console)
GOOGLE_CLIENT_SECRET = (from Google Console)
GOOGLE_REDIRECT_URI = https://YOUR-RENDER-URL.onrender.com/auth/google/callback

FRONTEND_AUTH_SUCCESS_URL = https://YOUR-VERCEL-URL.vercel.app/oauth-success
FRONTEND_AUTH_ERROR_URL = https://YOUR-VERCEL-URL.vercel.app/login?oauth=failed

CORS_ALLOW_ORIGINS = https://YOUR-VERCEL-URL.vercel.app

SMTP_SENDER_EMAIL = (your email@gmail.com)
SMTP_APP_PASSWORD = (16-char app password from Google)
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 465
COUNCIL_EMAIL = (council@example.com)

CLOUDINARY_CLOUD_NAME = (your Cloudinary name)
CLOUDINARY_API_KEY = (your API key)
CLOUDINARY_API_SECRET = (your API secret)
```

### Verify Backend
- [ ] Visit `https://YOUR-RENDER-URL.onrender.com/` → see `{"status": "ok"}`
- [ ] Visit `/health` → see `{"status": "healthy"}`
- [ ] Check logs for any errors

---

## ✅ Frontend Setup on Vercel (5 mins)

- [ ] Push latest code: `git push origin master`
- [ ] Go to [vercel.com](https://vercel.com) → **Add New Project**
- [ ] Import your GitHub repo
- [ ] Set **Root Directory** to `frontend`
- [ ] Build command: `npm run build`
- [ ] Add environment variable:
  ```
  VITE_API_BASE_URL = https://YOUR-RENDER-URL.onrender.com
  ```
- [ ] Click **Deploy**
- [ ] Wait for deployment to finish (~2-3 mins)

### Verify Frontend
- [ ] Visit your Vercel URL → app loads
- [ ] Open DevTools → Network → no errors
- [ ] Open Console → no red errors

---

## ✅ Update Backend with Frontend URL (2 mins)

⚠️ Your Render backend needs to know the actual Vercel URL now.

1. Go back to Render → `council-ticket-system-backend` service
2. **Environment** → Update these variables:
   ```
   FRONTEND_AUTH_SUCCESS_URL = https://YOUR-VERCEL-URL.vercel.app/oauth-success
   FRONTEND_AUTH_ERROR_URL = https://YOUR-VERCEL-URL.vercel.app/login?oauth=failed
   CORS_ALLOW_ORIGINS = https://YOUR-VERCEL-URL.vercel.app
   GOOGLE_REDIRECT_URI = https://YOUR-RENDER-URL.onrender.com/auth/google/callback
   ```
3. Save → Render will auto-redeploy

---

## ✅ Update Google OAuth Console (2 mins)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project → **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client (Web app)
4. Add to **Authorized redirect URIs:**
   ```
   https://YOUR-RENDER-URL.onrender.com/auth/google/callback
   ```
5. Add to **Authorized JavaScript origins:**
   ```
   https://YOUR-VERCEL-URL.vercel.app
   ```
6. Save

---

## ✅ Final Smoke Test (5 mins)

### 1. Email/Password Auth
- [ ] Visit frontend → **Signup** with test email
- [ ] Verify success → see dashboard
- [ ] Logout
- [ ] **Login** with same email/password
- [ ] Verify success

### 2. Google OAuth
- [ ] Logout (if logged in)
- [ ] Click **Sign in with Google**
- [ ] Complete OAuth flow
- [ ] Verify redirected to dashboard

### 3. Ticket Lifecycle
- [ ] **Create Ticket:** title + description + location
- [ ] Upload an image
- [ ] Submit
- [ ] Verify ticket appears on dashboard
- [ ] Check Council email received notification

### 4. Voting
- [ ] Click vote button on any ticket
- [ ] Count increases
- [ ] Click again (unvote)
- [ ] Count decreases
- [ ] Refresh page → vote count persists

### 5. API Health
- [ ] Open browser console (F12)
- [ ] NetworkTab → all API calls should succeed (green)
- [ ] No 403/404/500 errors

---

## ✅ Post-Deploy (Ongoing)

- [ ] Check Render logs daily for 1 week (main.py errors)
- [ ] Monitor database: no connection errors
- [ ] Test signup/login 1x per week
- [ ] Verify emails are sent

---

## 🚨 If Deployment Fails

**Backend won't build:**
- Check logs for Python syntax errors
- Verify PostgreSQL URL format
- Run locally first: `uvicorn main:app --reload`

**Frontend shows blank page:**
- Check VITE_API_BASE_URL in Vercel env vars
- Verify backend is running
- Check browser console for errors

**Login fails:**
- Verify Google OAuth URLs in Console
- Check GOOGLE_CLIENT_ID/SECRET are correct
- Render logs should show detailed error

**See [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) Troubleshooting section for detailed fixes**

---

## 📋 URLs for Reference

After deployment, keep these URLs handy:

- **Backend:** `https://council-ticket-system-XXXX.onrender.com`
- **Frontend:** `https://council-ticket-system-XXXX.vercel.app`
- **Health Check:** `https://council-ticket-system-XXXX.onrender.com/health`
- **API Docs:** `https://council-ticket-system-XXXX.onrender.com/docs`

---

✅ **Deployment Complete!** Your app is live in production.
