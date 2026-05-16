require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const sgMail = require('@sendgrid/mail');
const admin = require('firebase-admin');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

// Basic CORS for local development
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid configured');
} else {
  console.log('SENDGRID_API_KEY not provided; /send-email will be disabled');
}

// Initialize Firebase Admin if credentials provided
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
    console.log('Firebase Admin initialized from env JSON');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp();
    console.log('Firebase Admin initialized from GOOGLE_APPLICATION_CREDENTIALS');
  } else {
    console.log('Firebase Admin not initialized; FCM endpoints disabled');
  }
} catch (err) {
  console.error('Failed to init Firebase Admin:', err.message || err);
}

app.get('/', (req, res) => res.json({ ok: true, service: 'freedom250-notifications' }));

// Send transactional email via SendGrid
app.post('/send-email', async (req, res) => {
  if (!process.env.SENDGRID_API_KEY) return res.status(500).json({ error: 'SendGrid not configured' });
  const { to, subject, text, html, from } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'Missing required fields: to, subject' });

  const msg = {
    to,
    from: from || process.env.DEFAULT_FROM_EMAIL || 'noreply@freedom250.example',
    subject,
    text: text || '',
    html: html || text || ''
  };

  try {
    await sgMail.send(msg);
    res.json({ ok: true });
  } catch (err) {
    console.error('SendGrid error', err);
    res.status(500).json({ error: err.message || err.toString() });
  }
});

// Send push notification via Firebase Admin (FCM)
app.post('/send-notification', async (req, res) => {
  if (!admin.apps.length) return res.status(500).json({ error: 'Firebase Admin not initialized' });
  const { token, title, body, data } = req.body;
  if (!token || !title) return res.status(400).json({ error: 'Missing required fields: token, title' });

  const message = {
    token,
    notification: {
      title,
      body: body || ''
    },
    data: data || {}
  };

  try {
    const resp = await admin.messaging().send(message);
    res.json({ ok: true, result: resp });
  } catch (err) {
    console.error('FCM error', err);
    res.status(500).json({ error: err.message || err.toString() });
  }
});

// Register FCM token (optional: store in Firestore fcmTokens collection)
app.post('/register-token', async (req, res) => {
  if (!admin.apps.length) return res.status(500).json({ error: 'Firebase Admin not initialized' });
  const { token, userId } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  try {
    const db = admin.firestore();
    await db.collection('fcmTokens').add({ token, userId: userId || null, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ ok: true });
  } catch (err) {
    console.error('register-token error', err);
    res.status(500).json({ error: err.message || err.toString() });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Notification server listening on ${port}`));
