# Freedom250 Notification Server (example)

This small Express example demonstrates how to send transactional email via SendGrid and push notifications via Firebase Admin (FCM). It's intentionally minimal — treat it as scaffolding for production use.

Quick start (local):

1. Copy `.env.example` to `.env` and fill in your `SENDGRID_API_KEY` and Firebase credentials (either `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`).

Environment variables you should set in `.env`:

- `SENDGRID_API_KEY` — your SendGrid API key for transactional emails.
- `DEFAULT_FROM_EMAIL` — the default from address for outgoing emails (e.g., `events@freedom250.org`).
- `ADMIN_EMAIL` — organizer/admin email that receives assistance messages from the site.
- `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` — Firebase service account credentials for FCM.

2. Install dependencies:

```bash
cd server
npm install
```

3. Start the server:

```bash
npm start
```

Endpoints:
- `POST /send-email` { to, subject, text, html } — sends email via SendGrid
- `POST /send-notification` { token, title, body, data } — sends FCM notification using Firebase Admin
- `POST /register-token` { token, userId } — stores token in Firestore `fcmTokens` collection (optional)

Security & production notes:
- Never commit API keys or service account JSON to source control. Use environment variables or secret managers.
- Use HTTPS in production. Limit CORS origins.
- Consider rate limiting and authentication for these endpoints (e.g., signed JWTs from your app).
