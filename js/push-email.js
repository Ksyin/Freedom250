// Client-side FCM + notification helper (scaffolding)
// Usage: import { initFCM, sendTestNotificationToServer } from './push-email.js'

import { app } from './firebase-config.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js';

export async function initFCM(vapidKey, serverRegisterUrl = '/register-token') {
  if (!('serviceWorker' in navigator)) throw new Error('Service workers not supported');

  // Register service worker (needs to exist at the root)
  const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  const messaging = getMessaging(app);

  try {
    const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swRegistration });
    if (currentToken) {
      // Optionally POST the token to your server for later notifications
      try {
        await fetch(serverRegisterUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: currentToken })
        });
      } catch (e) {
        console.warn('Failed to register token with server', e.message || e);
      }
    }
    return currentToken;
  } catch (err) {
    console.warn('Unable to get FCM token', err.message || err);
    return null;
  }
}

export async function sendTestNotificationToServer(serverUrl, token, title = 'Test', body = 'Hello from Freedom250') {
  return fetch(serverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, title, body })
  }).then(r => r.json());
}

export function onForegroundMessage(handler) {
  const messaging = getMessaging(app);
  onMessage(messaging, payload => handler(payload));
}
