importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js');

// NOTE: You'll need to replace this config with your project's config when deploying.
// For sandboxing, you can copy the same config from js/firebase-config.js.
const firebaseConfig = {
  // placeholder — keep a compatible config on deployment
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(function(payload) {
    const title = payload.notification?.title || 'Freedom250';
    const options = {
      body: payload.notification?.body || '',
      data: payload.data || {}
    };
    self.registration.showNotification(title, options);
  });
} catch (e) {
  console.warn('SW: Firebase messaging not initialized', e.message || e);
}
