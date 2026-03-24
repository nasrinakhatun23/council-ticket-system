# Production Checklist

## 1) Escalation Rule Final Alignment

- Decide one policy and keep it fixed: `ESCALATION_DAYS=2` or `ESCALATION_DAYS=4`
- Update `backend/.env` with the final value.
- Verify unresolved tickets are escalated after the selected number of days.

## 2) Production Configuration

Set these in deployment environment:

- `APP_ENV=production`
- `DATABASE_URL` (PostgreSQL/MySQL recommended)
- `SESSION_SECRET_KEY` (strong random value)
- `CORS_ALLOW_ORIGINS` (frontend production URL)
- `SMTP_SENDER_EMAIL`
- `SMTP_APP_PASSWORD`
- `SMTP_HOST`
- `SMTP_PORT`
- `COUNCIL_EMAIL`
- `COUNCIL_HEALTH_EMAIL`
- `COUNCIL_DISCIPLINE_EMAIL`
- `COUNCIL_CLEANLINESS_EMAIL`

## 3) Database Ready

- For development, SQLite is fine.
- For production, use PostgreSQL/MySQL in `DATABASE_URL`.
- Ensure old SQLite data is migrated before switching traffic.

## 4) UAT Final Testing

From backend folder run:

```powershell
$env:UAT_BASE_URL='http://127.0.0.1:8060'
$env:UAT_EMAIL='your_test_user_email'
$env:UAT_PASSWORD='your_test_user_password'
python uat_smoke_test.py
```

Expected output ends with:

`PASS: UAT smoke test completed`

## 5) Manual Verification

- Create ticket with each category and verify council assignment.
- Verify council-specific email is received.
- Vote ticket and check priority update.
- Update ticket status and confirm dashboard refresh.
- Submit feedback and check analytics counters.
