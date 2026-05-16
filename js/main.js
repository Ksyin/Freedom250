// js/main.js - Main Application Logic
import { initAuth, signUp, signIn, signInWithGoogle, signOutUser, getCurrentUser, onAuthStateChange, ROLES } from './auth.js';
import { initFCM, sendTestNotificationToServer } from './push-email.js';
import { db, collection, getDocs, addDoc, query, orderBy } from './firebase-config.js';

// Platform Data
const platformData = {
  events: [
    {
      id: 'freedom250',
      name: 'Freedom 250 Festival',
      tagline: 'Where Gen Z Kenya meets America',
      date: 'June 11-12, 2026',
      location: 'JKUAT Main Campus',
      image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop',
      participants: 2847,
      points: 342.5,
      status: 'live',
      featured: true
    },
    {
      id: 'tech-frontier',
      name: 'Tech Frontier Summit',
      tagline: 'Exploring the Future of Tech',
      date: 'September 15-17, 2026',
      location: 'Nairobi University',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop',
      participants: 1250,
      points: 98.2,
      status: 'upcoming',
      featured: true
    },
    {
      id: 'innovation-week',
      name: 'Innovation Week',
      tagline: 'Drone Soccer & Robotics Challenge',
      date: 'October 5-7, 2026',
      location: 'Strathmore University',
      image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=600&h=400&fit=crop',
      participants: 890,
      points: 45.3,
      status: 'upcoming',
      featured: true
    }
  ],
  universities: [
    { id: 'jkuat', name: 'Jomo Kenyatta University', shortName: 'JKUAT', logo: 'JK', events: 5, participants: 2847 },
    { id: 'uon', name: 'University of Nairobi', shortName: 'UoN', logo: 'UoN', events: 4, participants: 2150 },
    { id: 'strathmore', name: 'Strathmore University', shortName: 'Strath', logo: 'SU', events: 4, participants: 1650 },
    { id: 'dedan', name: 'Dedan Kimathi University', shortName: 'DeKUT', logo: 'DK', events: 3, participants: 980 },
    { id: 'machakos', name: 'Machakos University', shortName: 'MksU', logo: 'MU', events: 2, participants: 540 }
  ]
};

// Toast notification function
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `app-toast toast-${type}`;
  toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Show loading
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Initialize auth first
    await initAuth();

    // Set up auth state listener
    onAuthStateChange((user, isLoggedIn) => {
      updateNavbarForAuth(user, isLoggedIn);
      if (isLoggedIn && user) {
        console.log('User logged in:', user.email, 'Role:', user.role);
      }
    });

    // Render content
    renderUniversitiesGrid();
    renderEventPanel();
    renderBoothFlow();
    renderLiveAnalytics();
    setupEventListeners();

    // Hide loading after everything is ready
    if (loadingOverlay) {
      setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => loadingOverlay.style.display = 'none', 500);
      }, 500);
    }

    // Check if user is already logged in
    const user = getCurrentUser();
    if (user) {
      window.showToast(`Welcome back, ${user.displayName || user.email}!`, 'success');
    }

    // Initialize FCM (service worker + token request) for push notifications
    try {
      // Replace with your VAPID key when ready
      const VAPID_KEY = null; // 'YOUR_PUBLIC_VAPID_KEY'
      if (VAPID_KEY) {
        const token = await initFCM(VAPID_KEY, (window.NOTIFY_SERVER_REGISTER || '/register-token'));
        if (token) {
          window.fcmToken = token;
          console.log('FCM token acquired');
        }
      } else {
        console.log('FCM VAPID key not set; skipping token registration');
      }
    } catch (e) {
      console.warn('FCM init failed', e.message || e);
    }

    // Load booths/partners from Firestore and render partner grid
    try {
      await loadAndRenderPartners();
    } catch (e) {
      console.warn('Failed to load partners', e.message || e);
    }
  } catch (error) {
    console.error('Initialization error:', error);
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
    window.showToast('Failed to load platform. Please refresh the page.', 'error');
  }
});

function updateNavbarForAuth(user, isLoggedIn) {
  const loginBtn = document.getElementById('loginBtn');
  const dashboardBtn = document.getElementById('dashboardBtn');
  const mobileLoginBtn = document.getElementById('mobileLoginBtn');
  const mobileDashboardBtn = document.getElementById('mobileDashboardBtn');

  if (isLoggedIn && user) {
    if (loginBtn) loginBtn.classList.add('hidden');
    if (dashboardBtn) {
      dashboardBtn.classList.remove('hidden');
      const roleName = user.role === 'organizer' ? 'Admin' :
                      user.role === 'volunteer' ? 'Volunteer' :
                      user.role === 'booth_admin' ? 'Booth Admin' : 'Dashboard';
      dashboardBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${roleName}`;
    }
    if (mobileLoginBtn) mobileLoginBtn.classList.add('hidden');
    if (mobileDashboardBtn) {
      mobileDashboardBtn.classList.remove('hidden');
    }
  } else {
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (dashboardBtn) dashboardBtn.classList.add('hidden');
    if (mobileLoginBtn) mobileLoginBtn.classList.remove('hidden');
    if (mobileDashboardBtn) mobileDashboardBtn.classList.add('hidden');
  }
}


function renderEventPanel() {
  const section = document.getElementById('events');
  if (!section) return;
  section.style.display = 'none';
  updateEventDetail('freedom250');
  document.querySelectorAll('.event-selector').forEach(btn => {
    btn.addEventListener('click', () => {
      updateEventDetail(btn.dataset.event);
    });
  });
}

function updateEventDetail(eventId) {
  const event = platformData.events.find(e => e.id === eventId) || platformData.events[0];
  const section = document.getElementById('events');
  if (!section) return;

  const title = document.getElementById('eventTitle');
  const description = document.getElementById('eventDescription');
  const date = document.getElementById('eventDate');
  const location = document.getElementById('eventLocation');
  const participants = document.getElementById('eventParticipants');
  const points = document.getElementById('eventPoints');
  const status = document.getElementById('eventStatus');
  const feature = document.getElementById('eventFeature');
  const registerBtn = document.getElementById('registerEventBtn');
  const learnMoreBtn = document.getElementById('learnMoreEventBtn');

  if (title) title.textContent = event.name;
  if (description) description.textContent = event.tagline;
  if (date) date.textContent = event.date;
  if (location) location.textContent = event.location || 'JKUAT Main Campus';
  if (participants) participants.textContent = event.participants.toLocaleString();
  if (points) points.textContent = event.points;
  if (status) status.textContent = event.status.toUpperCase();
  if (feature) feature.textContent = event.featured ? 'Flagship' : 'Experience';
  if (registerBtn) {
    registerBtn.textContent = `Register for ${event.name}`;
    registerBtn.onclick = () => handleEventRegistration(event.id);
  }
  if (learnMoreBtn) {
    learnMoreBtn.onclick = () => {
      window.showToast(`${event.name} details coming soon.`, 'info');
    };
  }

  document.querySelectorAll('.event-selector').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.event === event.id);
  });
}

function showEventSection(eventId = 'freedom250') {
  const section = document.getElementById('events');
  if (!section) return;
  section.style.display = 'block';
  updateEventDetail(eventId);
  setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 10);
}

function renderUniversitiesGrid() {
  const container = document.getElementById('universitiesGrid');
  if (!container) return;

  container.innerHTML = platformData.universities.map(univ => `
    <div class="university-card">
      <div class="university-logo">${univ.logo}</div>
      <h4>${univ.name}</h4>
      <p>${univ.events} Events | ${univ.participants.toLocaleString()} participants</p>
    </div>
  `).join('');
}

function renderBoothFlow() {
  const user = getCurrentUser();
  renderParticipantQrCard(user);
}

async function renderParticipantQrCard(user) {
  const container = document.getElementById('participantQrCard');
  if (!container) return;

  if (!user) {
    container.innerHTML = `
      <div class="qr-card">
        <div>
          <span class="section-tag">Participant Badge</span>
          <h3>Your QR badge is ready once you sign in.</h3>
          <p>Sign in to unlock your booth access badge, team details, and instant point rewards.</p>
        </div>
        <button class="btn-primary btn-large" id="badgeSignInBtn">Sign In to Generate Badge</button>
      </div>
    `;
    const signInBtn = document.getElementById('badgeSignInBtn');
    if (signInBtn) signInBtn.onclick = showAuthModal;
    return;
  }

  const qrValue = user.qrCode || `freedom250_${user.uid}`;
  const teamLabel = user.teamName || user.teamId || 'Unassigned Team';
  container.innerHTML = `
      <div class="qr-card">
        <div>
          <span class="section-tag">Participant Badge</span>
          <h3>${user.displayName || 'Participant'}</h3>
          <p>Team: <strong>${teamLabel}</strong></p>
        </div>
        <div class="qr-chip" id="badgeQrCanvas"></div>
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
          <div><strong>${user.points || 0} pts</strong><br><small>Available rewards</small></div>
          <button class="btn-outline" id="downloadQrBtn">Download Badge</button>
        </div>
      </div>
    `;
      // apply team color accent if provided
      const cardEl = container.querySelector('.qr-card');
      if (cardEl && user.teamColor) cardEl.style.borderLeft = `6px solid ${user.teamColor}`;

  const canvasWrapper = document.getElementById('badgeQrCanvas');
  if (canvasWrapper && window.QRCode) {
    const canvas = document.createElement('canvas');
    try {
      await QRCode.toCanvas(canvas, qrValue, { width: 220, margin: 1, color: { dark: '#0A2540', light: '#ffffff' } });
      canvasWrapper.appendChild(canvas);
    } catch (err) {
      console.error('QR code generation failed', err);
      canvasWrapper.textContent = 'QR generation not available';
    }
  }

  const downloadBtn = document.getElementById('downloadQrBtn');
  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const canvas = document.querySelector('#badgeQrCanvas canvas');
      if (!canvas) return;
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(user.displayName || 'participant').replace(/\s+/g, '_').toLowerCase()}_freedom250_qr.png`;
      link.click();
    };
  }
}

function renderLiveAnalytics() {
  const metrics = [
    { title: 'Live Check-ins', value: '1,864' },
    { title: 'Team Engagement', value: '92%' },
    { title: 'Points Redeemed', value: '5,420' },
    { title: 'Active Booths', value: '7' }
  ];

  const metricContainer = document.querySelector('.live-card .analytics-metric')?.parentElement;
  if (!metricContainer) return;

  metricContainer.innerHTML = metrics.map(metric => `
    <div class="analytics-metric">
      <div><h4>${metric.title}</h4></div>
      <strong>${metric.value}</strong>
    </div>
  `).join('');
}

async function handleEventRegistration(eventId) {
  const user = getCurrentUser();
  if (!user) {
    window.showToast('Please sign in to register for events', 'error');
    showAuthModal();
    return;
  }

  window.showToast(`Registered for event! You've earned 50 points.`, 'success');
}

// Auth Modal
function showAuthModal() {
  // Remove existing modal if any
  const existingModal = document.getElementById('authModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.className = 'auth-modal';
  modal.id = 'authModal';
  modal.innerHTML = `
    <div class="auth-modal-content">
      <button class="auth-modal-close" id="closeAuth">&times;</button>
      <div class="auth-tabs">
        <button class="auth-tab active" data-tab="login">Sign In</button>
        <button class="auth-tab" data-tab="register">Create Account</button>
      </div>

      <div id="loginForm" class="auth-form active">
        <h3>Welcome Back</h3>
        <input type="email" id="loginEmail" placeholder="Email Address" class="auth-input" autocomplete="email">
        <input type="password" id="loginPassword" placeholder="Password" class="auth-input" autocomplete="current-password">
        <button id="doLogin" class="btn-primary w-full">Sign In</button>
        <div class="auth-divider">OR</div>
        <button id="doGoogle" class="btn-google w-full">
          <i class="fab fa-google"></i> Continue with Google
        </button>
      </div>

      <div id="registerForm" class="auth-form">
        <h3>Create Account</h3>
        <input type="text" id="regName" placeholder="Full Name" class="auth-input" autocomplete="name">
        <input type="email" id="regEmail" placeholder="Email Address" class="auth-input" autocomplete="email">
        <input type="password" id="regPassword" placeholder="Password (min 6 characters)" class="auth-input" autocomplete="new-password">
        <label style="font-size:0.85rem; margin-top:6px; color:#444;">Choose Team</label>
        <select id="regTeam" class="auth-input" style="padding:10px;">
          <option value="">Select a team</option>
          <option value="Team Liberty|#B22234">Team Liberty</option>
          <option value="Team Freedom|#3C3B6E">Team Freedom</option>
          <option value="Team Unity|#10b981">Team Unity</option>
        </select>
        <p class="auth-terms">By registering, you agree to our Terms of Service.</p>
        <button id="doRegister" class="btn-primary w-full">Create Account</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close modal on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Close button
  const closeBtn = modal.querySelector('#closeAuth');
  closeBtn.onclick = () => modal.remove();

  // Tab switching
  const tabs = modal.querySelectorAll('.auth-tab');
  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      modal.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      modal.querySelector(`#${target}Form`).classList.add('active');
    };
  });

  // Login handler
  const loginBtn = modal.querySelector('#doLogin');
  loginBtn.onclick = async () => {
    const email = modal.querySelector('#loginEmail').value.trim();
    const password = modal.querySelector('#loginPassword').value;

    if (!email || !password) {
      window.showToast('Please enter both email and password', 'error');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

    const result = await signIn(email, password);

    if (result.success) {
      window.showToast('Logged in successfully!', 'success');
      modal.remove();
      // Redirect based on role after a short delay
      setTimeout(() => redirectToDashboard(), 500);
    } else {
      window.showToast(result.error, 'error');
      loginBtn.disabled = false;
      loginBtn.innerHTML = 'Sign In';
    }
  };

  // Google login handler
  const googleBtn = modal.querySelector('#doGoogle');
  googleBtn.onclick = async () => {
    googleBtn.disabled = true;
    googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';

    const result = await signInWithGoogle();

    if (result.success) {
      window.showToast('Logged in with Google!', 'success');
      // Try to register token and send welcome email (best-effort)
      try {
        const base = window.NOTIFY_SERVER_URL || 'http://localhost:3000';
        const user = result.user;
        if (window.fcmToken) {
          fetch(base + '/register-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: window.fcmToken, userId: user.uid })
          }).catch(e => console.warn('Failed to register token', e.message || e));
        }
        const emailPayload = {
          to: user.email,
          from: window.NOTIFY_FROM_EMAIL || (window.NOTIFY_ADMIN_EMAIL || 'events@freedom250.org'),
          subject: 'Welcome to Freedom 250',
          text: `Hi ${user.displayName || ''},\n\nWelcome to Freedom 250!`,
          html: `<p>Hi ${user.displayName || ''},</p><p>Welcome to <strong>Freedom 250</strong>!</p>`
        };
        fetch(base + '/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(emailPayload) }).catch(e => console.warn('Send email failed', e.message || e));
      } catch (e) {
        console.warn('Post-google-signin notification wiring failed', e.message || e);
      }

      modal.remove();
      setTimeout(() => redirectToDashboard(), 500);
    } else {
      window.showToast(result.error, 'error');
      googleBtn.disabled = false;
      googleBtn.innerHTML = '<i class="fab fa-google"></i> Continue with Google';
    }
  };

  // Register handler
  const registerBtn = modal.querySelector('#doRegister');
  registerBtn.onclick = async () => {
    const name = modal.querySelector('#regName').value.trim();
    const email = modal.querySelector('#regEmail').value.trim();
    const password = modal.querySelector('#regPassword').value;

    if (!name || !email || !password) {
      window.showToast('Please fill all fields', 'error');
      return;
    }

    if (password.length < 6) {
      window.showToast('Password must be at least 6 characters', 'error');
      return;
    }

    registerBtn.disabled = true;
    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

    const result = await signUp(email, password, name, ROLES.PARTICIPANT);

    if (result.success) {
      window.showToast('Account created successfully!', 'success');
      modal.remove();
      setTimeout(() => redirectToDashboard(), 500);
    } else {
      window.showToast(result.error, 'error');
      registerBtn.disabled = false;
      registerBtn.innerHTML = 'Create Account';
    }
  };
  
  // Adjust register handler to capture team selection
  registerBtn.onclick = async () => {
    const name = modal.querySelector('#regName').value.trim();
    const email = modal.querySelector('#regEmail').value.trim();
    const password = modal.querySelector('#regPassword').value;
    const teamVal = modal.querySelector('#regTeam')?.value || '';
    let teamName = null, teamColor = null;
    if (teamVal && teamVal.includes('|')) {
      const parts = teamVal.split('|');
      teamName = parts[0];
      teamColor = parts[1];
    }

    if (!name || !email || !password) {
      window.showToast('Please fill all fields', 'error');
      return;
    }

    if (password.length < 6) {
      window.showToast('Password must be at least 6 characters', 'error');
      return;
    }

    registerBtn.disabled = true;
    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

    const result = await signUp(email, password, name, ROLES.PARTICIPANT, teamName, teamColor);

    if (result.success) {
      window.showToast('Account created successfully!', 'success');
      // After signup, optionally register FCM token and send welcome email via notification server
      try {
        const base = window.NOTIFY_SERVER_URL || 'http://localhost:3000';
        // Register token with server if available
        if (window.fcmToken) {
          fetch(base + '/register-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: window.fcmToken, userId: result.user.uid })
          }).catch(e => console.warn('Failed to register token with server', e.message || e));
        }

        // Send welcome email (best-effort)
        const emailPayload = {
          to: email,
          from: window.NOTIFY_FROM_EMAIL || (window.NOTIFY_ADMIN_EMAIL || 'events@freedom250.org'),
          subject: 'Welcome to Freedom 250',
          text: `Hi ${name},\n\nWelcome to Freedom 250! Your festival badge will be available after you sign in.\n\nSee you at the event!\n`,
          html: `<p>Hi ${name},</p><p>Welcome to <strong>Freedom 250</strong>! Your festival badge will be available after you sign in.</p><p>See you at the event!</p>`
        };

        fetch(base + '/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload)
        }).then(r => r.json()).then(resp => console.log('Welcome email result', resp)).catch(e => console.warn('Send email failed', e.message || e));
      } catch (e) {
        console.warn('Post-signup notification wiring failed', e.message || e);
      }

      modal.remove();
      setTimeout(() => redirectToDashboard(), 500);
    } else {
      window.showToast(result.error, 'error');
      registerBtn.disabled = false;
      registerBtn.innerHTML = 'Create Account';
    }
  };
}

function redirectToDashboard() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = '/';
    return;
  }

  let dashboardPath = '/participant';
  if (user.role === 'organizer') dashboardPath = '/organizer';
  else if (user.role === 'volunteer') dashboardPath = '/volunteer';
  else if (user.role === 'booth_admin') dashboardPath = '/booth-admin';

  window.location.href = dashboardPath;
}

// Initialize countdown timer
function initCountdownTimer() {
  const eventDate = new Date('June 11, 2026 09:00:00').getTime();
  
  const updateCountdown = () => {
    const now = new Date().getTime();
    const distance = eventDate - now;
    
    if (distance < 0) {
      document.getElementById('days').textContent = '0';
      document.getElementById('hours').textContent = '0';
      document.getElementById('minutes').textContent = '0';
      return;
    }
    
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    
    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
  };
  
  updateCountdown();
  setInterval(updateCountdown, 60000); // Update every minute
}

function setupEventListeners() {
  // Countdown timer
  initCountdownTimer();
  
  // Get Liberty Pass buttons (new)
  const getPassBtn = document.getElementById('getPassBtn');
  const mobileGetPassBtn = document.getElementById('mobileGetPassBtn');
  if (getPassBtn) getPassBtn.onclick = showAuthModal;
  if (mobileGetPassBtn) mobileGetPassBtn.onclick = showAuthModal;
  
  // Login buttons
  const loginBtn = document.getElementById('loginBtn');
  const mobileLoginBtn = document.getElementById('mobileLoginBtn');
  if (loginBtn) loginBtn.onclick = showAuthModal;
  if (mobileLoginBtn) mobileLoginBtn.onclick = showAuthModal;

  // Footer links
  const footerSignUp = document.getElementById('footerSignUp');
  const footerVolunteer = document.getElementById('footerVolunteer');
  const footerBooth = document.getElementById('footerBooth');

  if (footerSignUp) footerSignUp.onclick = (e) => { e.preventDefault(); showAuthModal(); };
  if (footerVolunteer) footerVolunteer.onclick = (e) => { e.preventDefault(); showAuthModal(); };
  if (footerBooth) footerBooth.onclick = (e) => { e.preventDefault(); showAuthModal(); };

  const boothStartBtn = document.getElementById('boothStartBtn');
  const boothTeamBtn = document.getElementById('boothTeamBtn');
  if (boothStartBtn) boothStartBtn.onclick = () => {
    const user = getCurrentUser();
    if (!user) {
      showAuthModal();
      return;
    }
    const tentsSection = document.getElementById('tents');
    if (tentsSection) tentsSection.scrollIntoView({ behavior: 'smooth' });
  };
  if (boothTeamBtn) boothTeamBtn.onclick = () => {
    const user = getCurrentUser();
    if (!user) {
      showAuthModal();
      return;
    }
    window.showToast('Team management is available in your dashboard.', 'info');
  };

  const heroEventBtn = document.getElementById('heroEventBtn');
  if (heroEventBtn) heroEventBtn.onclick = () => {
    const user = getCurrentUser();
    if (!user) {
      showAuthModal();
    } else {
      redirectToDashboard();
    }
  };

  document.querySelectorAll('a.nav-link[href="#events"], .mobile-link[href="#events"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showEventSection('freedom250');
      const menuPanel = document.getElementById('mobileMenuPanel');
      if (menuPanel) menuPanel.classList.add('hidden');
    });
  });

  document.body.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'badgeSignInBtn') {
      showAuthModal();
    }
  });

  // Dashboard buttons
  const dashboardBtn = document.getElementById('dashboardBtn');
  const mobileDashboardBtn = document.getElementById('mobileDashboardBtn');

  const goToDashboard = () => {
    const user = getCurrentUser();
    if (!user) {
      showAuthModal();
      return;
    }
    redirectToDashboard();
  };

  if (dashboardBtn) dashboardBtn.onclick = goToDashboard;
  if (mobileDashboardBtn) mobileDashboardBtn.onclick = goToDashboard;

  // Mobile menu
  const menuBtn = document.getElementById('mobileMenuBtn');
  const menuPanel = document.getElementById('mobileMenuPanel');
  if (menuBtn && menuPanel) {
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      menuPanel.classList.toggle('hidden');
    };

    document.addEventListener('click', (e) => {
      if (!menuPanel.contains(e.target) && !menuBtn.contains(e.target)) {
        menuPanel.classList.add('hidden');
      }
    });
  }
}

// Load booths/partners from Firestore
export async function loadAndRenderPartners() {
  const container = document.querySelector('#universitiesGrid');
  const partnersContainer = document.querySelector('#partnersGrid');
  if (!container) return;

  // Render universities first (JKUAT prioritized in platformData)
  container.innerHTML = platformData.universities.map(univ => `
    <div class="university-card">
      <div class="university-logo">${univ.logo}</div>
      <h4>${univ.name}</h4>
      <p>${univ.events} Events | ${univ.participants.toLocaleString()} participants</p>
    </div>
  `).join('');

  // Render dynamic partners/booths from Firestore if available
  if (partnersContainer && db) {
    try {
      const boothsRef = collection(db, 'booths');
      const q = query(boothsRef, orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        partnersContainer.innerHTML = '';
        snap.forEach(doc => {
          const data = doc.data();
          const el = document.createElement('div');
          el.className = 'partner-card';
          el.innerHTML = `<img class="partner-logo" src="${data.logo || 'https://via.placeholder.com/120x40?text=Sponsor'}" alt="${data.name}"><div style="display:none">${data.name}</div>`;
          // Highlight JKUAT partner when present
          try { if (data.name && /jkuat/i.test(data.name)) el.classList.add('highlight'); } catch (e) {}
          partnersContainer.appendChild(el);
        });
        // simple marquee: auto-scroll partners grid for visual polish
        partnersContainer.scrollLeft = 0;
        if (!partnersContainer._marquee) {
          partnersContainer._marquee = setInterval(() => {
            if (partnersContainer.scrollWidth > partnersContainer.clientWidth) {
              partnersContainer.scrollLeft = (partnersContainer.scrollLeft + 1) % (partnersContainer.scrollWidth - partnersContainer.clientWidth || 1);
            }
          }, 40);
        }
        return;
      }
    } catch (e) {
      console.warn('Error fetching booths', e.message || e);
    }
  }

  // Fallback partner logos
  if (partnersContainer) partnersContainer.innerHTML = `
    <div class="partner-card"><img class="partner-logo" src="https://via.placeholder.com/140x48?text=KFC" alt="KFC"></div>
    <div class="partner-card"><img class="partner-logo" src="https://via.placeholder.com/140x48?text=Galitos" alt="Galitos"></div>
    <div class="partner-card highlight"><img class="partner-logo" src="https://via.placeholder.com/140x48?text=JKUAT" alt="JKUAT"></div>
  `;
  // start marquee for fallback partners as well
  if (!partnersContainer._marquee) {
    partnersContainer._marquee = setInterval(() => {
      if (partnersContainer.scrollWidth > partnersContainer.clientWidth) {
        partnersContainer.scrollLeft = (partnersContainer.scrollLeft + 1) % (partnersContainer.scrollWidth - partnersContainer.clientWidth || 1);
      }
    }, 40);
  }
}

// Assistant modal handler
document.addEventListener('click', (e) => {
  if (e.target && (e.target.id === 'assistantFab' || e.target.closest && e.target.closest('#assistantFab'))) {
    showAssistantModal();
  }
});

function showAssistantModal() {
  // Remove existing
  const existing = document.getElementById('assistantModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'assistantModal';
  modal.className = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-modal-content">
      <button class="auth-modal-close" id="closeAssist">&times;</button>
      <h3>Assistant</h3>
      <p>Ask for guidance or contact an administrator. Messages will be sent to the event team.</p>
      <textarea id="assistMessage" placeholder="How can we help you?" style="width:100%; height:120px; padding:12px; margin-top:10px;"></textarea>
      <div style="display:flex; gap:8px; margin-top:12px;">
          <button id="assistSend" class="btn-primary">Send to Team</button>
          <button id="assistContact" class="btn-outline">Contact Admin</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#closeAssist').onclick = () => modal.remove();
    modal.querySelector('#assistContact').onclick = () => {
      const admin = window.NOTIFY_ADMIN_EMAIL || 'organizer@freedom250.org';
      window.location.href = `mailto:${admin}?subject=Assistance%20Request`;
    };
    modal.querySelector('#assistSend').onclick = async () => {
      const text = modal.querySelector('#assistMessage').value.trim();
      if (!text) return window.showToast('Please enter a message', 'error');
      try {
        const base = window.NOTIFY_SERVER_URL || 'http://localhost:3000';
        const admin = window.NOTIFY_ADMIN_EMAIL || 'organizer@freedom250.org';
        await fetch(base + '/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: admin, subject: 'Assistance Request', text, html: `<p>${text}</p>` }) });
        window.showToast('Message sent to the team', 'success');
        modal.remove();
      } catch (e) {
        console.warn('Assist send failed', e.message || e);
        window.showToast('Failed to send message', 'error');
      }
    };
}