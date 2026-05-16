// js/main.js - Main Application Logic
import { initAuth, signUp, signIn, signInWithGoogle, signOutUser, getCurrentUser, onAuthStateChange, ROLES, getDashboardPath } from './auth.js';
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
    { id: 'jkuat', name: 'Jomo Kenyatta University of Agriculture and Technology', shortName: 'JKUAT', logo: 'JK', events: 5, participants: 2847 },
    { id: 'uon', name: 'University of Nairobi', shortName: 'UoN', logo: 'UoN', events: 4, participants: 2150 },
    { id: 'strathmore', name: 'Strathmore University', shortName: 'Strath', logo: 'SU', events: 4, participants: 1650 },
    { id: 'dedan', name: 'Dedan Kimathi University of Technology', shortName: 'DeKUT', logo: 'DK', events: 3, participants: 980 },
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

// Event data for detail view
const EVENTS_DATA = {
  'freedom250': {
    name: 'Freedom 250 Festival',
    tagline: 'Where Gen Z Kenya Meets America',
    date: 'June 11–12, 2026',
    location: 'JKUAT Main Campus, Nairobi',
    participants: 2847,
    status: 'live',
    points: 342,
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1000&h=400&fit=crop',
    description: 'A premier festival activating Nairobi\'s next generation of leaders through immersive civic engagement, innovation showcases, and cross-cultural exchange. 7 themed experience tents, live performances, drone soccer, robotics, and embassy keynotes — all in one electrifying weekend at JKUAT.',
    highlights: [
      'Drone Soccer & Robotics Challenge at The Garage',
      'Embassy leadership keynotes on the Main Stage',
      'Entrepreneurship pitches at The Launchpad',
      'Democracy simulations at The Townhall',
      'Study abroad info at The Varsity Lounge',
      'Live art, music, and the Garden of Heroes mural',
      'Live team leaderboards & Liberty Coins rewards',
      'QR badge check-in and instant point tracking'
    ]
  },
  'tech-frontier': {
    name: 'Tech Frontier Summit',
    tagline: 'Exploring the Future of Technology',
    date: 'September 15–17, 2026',
    location: 'University of Nairobi, Nairobi',
    participants: 1250,
    status: 'upcoming',
    points: 98,
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1000&h=400&fit=crop',
    description: 'Three days of deep-dive technology programming — from AI and machine learning workshops to hardware prototyping sprints. Connect with engineers, founders, and policymakers shaping the digital frontier across East Africa and beyond.',
    highlights: [
      'AI & Machine Learning workshops',
      'Hardware prototyping labs',
      'Startup pitch competition',
      'VC networking sessions',
      'Policy & ethics in tech panels',
      'Student showcase & demos',
      'Liberty Coins rewards system',
      'International speaker lineup'
    ]
  },
  'innovation-week': {
    name: 'Innovation Week',
    tagline: 'Drone Soccer & Robotics at Full Tilt',
    date: 'October 5–7, 2026',
    location: 'Strathmore University, Nairobi',
    participants: 890,
    status: 'upcoming',
    points: 45,
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=1000&h=400&fit=crop',
    description: 'A three-day maker festival packed with drone competitions, robotics challenges, and hands-on engineering. Teams compete in high-energy head-to-head events while building real-world projects with mentorship from leading engineers and innovation leaders.',
    highlights: [
      'National Drone Soccer Championship',
      'Robotics design & build challenge',
      'Rapid prototyping bootcamp',
      'Electronics & IoT workshops',
      'Team leaderboard competition',
      'Prizes & scholarship pathways',
      'Mentorship from engineers',
      'Liberty Coins & badge rewards'
    ]
  }
};

// Open event detail
window.openEventDetail = function(eventId) {
  const event = EVENTS_DATA[eventId];
  if (!event) return;

  const panel = document.getElementById('eventDetailPanel');
  const statusClass = event.status === 'live' ? 'status-live' : 'status-upcoming';
  const statusLabel = event.status === 'live' ? '● Live Now' : 'Upcoming';

  panel.innerHTML = `
    <button class="event-detail-close" id="closeEventDetail" aria-label="Close"><i class="fas fa-times"></i></button>
    <div class="event-detail-hero">
      <img src="${event.image}" alt="${event.name}">
      <div class="event-detail-hero-overlay"></div>
      <div class="event-detail-hero-text">
        <span class="event-card-status ${statusClass}" style="position:relative;top:auto;right:auto;display:inline-block;margin-bottom:10px;">${statusLabel}</span>
        <h2>${event.name}</h2>
        <p>${event.tagline}</p>
      </div>
    </div>
    <div class="event-detail-body">
      <div class="event-detail-grid">
        <div class="event-detail-stat"><strong><i class="fas fa-calendar" style="font-size:1rem;color:var(--red)"></i></strong><span>Date</span><div style="margin-top:6px;font-size:.9rem;font-weight:700;color:var(--blue)">${event.date}</div></div>
        <div class="event-detail-stat"><strong><i class="fas fa-map-marker-alt" style="font-size:1rem;color:var(--red)"></i></strong><span>Location</span><div style="margin-top:6px;font-size:.9rem;font-weight:700;color:var(--blue)">${event.location}</div></div>
        <div class="event-detail-stat"><strong>${event.participants.toLocaleString()}</strong><span>Registered</span></div>
      </div>
      <p class="event-detail-description">${event.description}</p>
      <div class="event-detail-highlights">
        ${event.highlights.map(h => `<div class="event-highlight"><i class="fas fa-check-circle"></i><p>${h}</p></div>`).join('')}
      </div>
      <div class="event-detail-cta">
        <h3>Ready to Join ${event.name}?</h3>
        <p>Get your Liberty Pass to register, earn points, and unlock your participant badge.</p>
        <div class="cta-buttons">
          <button class="btn btn-primary btn-lg" onclick="window.closeEventDetailAndAuth('${eventId}')">Get Liberty Pass <i class="fas fa-ticket-alt"></i></button>
          <button class="btn btn-outline-white btn-lg" onclick="document.getElementById('eventDetailOverlay').classList.remove('active')">Maybe Later</button>
        </div>
      </div>
    </div>
  `;

  // Re-bind close button
  const closeBtn = document.getElementById('closeEventDetail');
  if (closeBtn) {
    closeBtn.onclick = () => {
      document.getElementById('eventDetailOverlay').classList.remove('active');
    };
  }

  document.getElementById('eventDetailOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
};

// Close overlay and show auth
window.closeEventDetailAndAuth = function(eventId) {
  document.getElementById('eventDetailOverlay').classList.remove('active');
  document.body.style.overflow = '';
  window.showAuthModal(eventId);
};

// Close overlay on backdrop click
document.addEventListener('click', (e) => {
  const overlay = document.getElementById('eventDetailOverlay');
  if (e.target === overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// Close on ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('eventDetailOverlay');
    if (overlay && overlay.classList.contains('active')) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
    const authModal = document.getElementById('authModal');
    if (authModal) authModal.remove();
    const mobileMenu = document.getElementById('mobileMenuPanel');
    if (mobileMenu) mobileMenu.classList.remove('open');
  }
});

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const loadingOverlay = document.getElementById('loadingOverlay');

    // Bind nav buttons immediately (before Firebase resolves) so they're never dead
    updateNavbarForAuth(null, false);

    // Initialize auth first
    await initAuth();

    // Setup auth state listener
    onAuthStateChange((user, isLoggedIn) => {
      updateNavbarForAuth(user, isLoggedIn);
      if (isLoggedIn && user) {
        console.log('User logged in:', user.email, 'Role:', user.role);
        window.showToast(`Welcome back, ${user.displayName || user.email}!`, 'success');
      }
    });

    // Render UI components
    renderEventsGrid();
    renderUniversitiesGrid();
    renderPartnersGrid();
    setupEventListeners();

    // Hide loading
    if (loadingOverlay) {
      setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => loadingOverlay.style.display = 'none', 500);
      }, 500);
    }

    // Try to init FCM silently
    try {
      const VAPID_KEY = null;
      if (VAPID_KEY) {
        const token = await initFCM(VAPID_KEY);
        if (token) { window.fcmToken = token; }
      }
    } catch (e) { console.warn('FCM init failed', e); }

  } catch (error) {
    console.error('Initialization error:', error);
    window.showToast('Failed to load platform. Please refresh the page.', 'error');
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
  }
});

function updateNavbarForAuth(user, isLoggedIn) {
  const loginBtn = document.getElementById('loginBtn');
  const getPassBtn = document.getElementById('getPassBtn');
  const mobileLoginBtn = document.getElementById('mobileLoginBtn');
  const mobileGetPassBtn = document.getElementById('mobileGetPassBtn');

  if (isLoggedIn && user) {
    if (loginBtn) loginBtn.classList.add('hidden');
    if (mobileLoginBtn) mobileLoginBtn.classList.add('hidden');

    const roleLabel = (user.role === 'admin') ? 'Admin Pass' :
                      (user.role === 'organizer') ? 'Organizer Pass' :
                      user.role === 'volunteer' ? 'Volunteer Pass' :
                      user.role === 'booth_admin' ? 'Booth Pass' : 'My Liberty Pass';

    if (getPassBtn) {
      getPassBtn.innerHTML = `<i class="fas fa-passport"></i> ${roleLabel}`;
      getPassBtn.onclick = (e) => { e.preventDefault(); redirectToDashboard(); };
    }
    if (mobileGetPassBtn) {
      mobileGetPassBtn.innerHTML = `<i class="fas fa-passport"></i> ${roleLabel}`;
      mobileGetPassBtn.onclick = (e) => { e.preventDefault(); redirectToDashboard(); };
    }
  } else {
    if (loginBtn) {
      loginBtn.classList.remove('hidden');
      loginBtn.onclick = (e) => { e.preventDefault(); window.showAuthModal(); };
    }
    if (mobileLoginBtn) {
      mobileLoginBtn.classList.remove('hidden');
      mobileLoginBtn.onclick = (e) => { e.preventDefault(); window.showAuthModal(); };
    }

    if (getPassBtn) {
      getPassBtn.innerHTML = `Get Liberty Pass`;
      getPassBtn.onclick = (e) => { e.preventDefault(); window.showAuthModal(); };
    }
    if (mobileGetPassBtn) {
      mobileGetPassBtn.innerHTML = `Get Liberty Pass`;
      mobileGetPassBtn.onclick = (e) => { e.preventDefault(); window.showAuthModal(); };
    }
  }
}

function renderEventsGrid() {
  const container = document.getElementById('eventsGrid');
  if (!container) return;

  container.innerHTML = platformData.events.map(event => `
    <div class="event-card" onclick="openEventDetail('${event.id}')">
      <div class="event-card-img">
        <img src="${event.image}" alt="${event.name}" loading="lazy">
        <span class="event-card-status ${event.status === 'live' ? 'status-live' : 'status-upcoming'}">${event.status === 'live' ? '● Live' : 'Upcoming'}</span>
      </div>
      <div class="event-card-body">
        <div class="event-card-date">${event.date}</div>
        <h3>${event.name}</h3>
        <p class="event-card-tagline">${event.tagline}</p>
        <div class="event-card-meta">
          <span><i class="fas fa-map-marker-alt"></i> ${event.location}</span>
          <span><i class="fas fa-users"></i> ${event.participants.toLocaleString()} registered</span>
        </div>
        <div class="event-card-footer">
          <span class="event-card-participants">🏆 ${event.points} Liberty Coins awarded</span>
          <span class="event-card-cta">View Details <i class="fas fa-arrow-right"></i></span>
        </div>
      </div>
    </div>
  `).join('');
}

function renderUniversitiesGrid() {
  const container = document.getElementById('universitiesGrid');
  if (!container) return;
  container.innerHTML = platformData.universities.map(univ => `
    <div class="university-card">
      <div class="university-logo">${univ.logo}</div>
      <div>
        <h4>${univ.name}</h4>
        <p>${univ.events} Events · ${univ.participants.toLocaleString()} participants</p>
      </div>
    </div>
  `).join('');
}

async function renderPartnersGrid() {
  const container = document.getElementById('partnersGrid');
  if (!container) return;

  // Default partners if Firebase not available
  const defaultPartners = [
    { name: 'U.S. Embassy Nairobi', logo: '🇺🇸' },
    { name: 'JKUAT', logo: '🎓' },
    { name: 'American Spaces', logo: '⭐' },
    { name: 'Kenya Innovation', logo: '💡' }
  ];

  try {
    if (db) {
      const snap = await getDocs(query(collection(db, 'partners'), orderBy('name', 'asc')));
      if (!snap.empty) {
        container.innerHTML = '';
        snap.forEach(doc => {
          const data = doc.data();
          container.innerHTML += `<div class="partner-card"><div class="partner-logo" style="font-size:1.2rem; font-weight:bold;">${data.logo || '🤝'}</div><div style="margin-top:8px; font-size:0.8rem;">${data.name}</div></div>`;
        });
        return;
      }
    }
  } catch (e) {
    console.warn('Failed to load partners from Firebase', e);
  }

  // Fallback to default partners
  container.innerHTML = defaultPartners.map(partner => `
    <div class="partner-card">
      <div class="partner-logo" style="font-size:1.5rem;">${partner.logo}</div>
      <div style="margin-top:8px; font-size:0.75rem;">${partner.name}</div>
    </div>
  `).join('');
}

// Auth Modal
window.showAuthModal = function showAuthModal(eventContext) {
  // Remove existing modal
  const existingModal = document.getElementById('authModal');
  if (existingModal) existingModal.remove();

  const eventLabel = eventContext && typeof eventContext === 'string'
    ? { 'freedom250': 'Freedom 250 Festival', 'tech-frontier': 'Tech Frontier Summit', 'innovation-week': 'Innovation Week' }[eventContext] || null
    : null;

  const contextBanner = eventLabel ? `<div class="auth-context"><i class="fas fa-ticket-alt"></i> Getting Liberty Pass for: <strong>${eventLabel}</strong></div>` : '';

  const modal = document.createElement('div');
  modal.className = 'auth-modal';
  modal.id = 'authModal';
  modal.innerHTML = `
    <div class="auth-panel">
      <button class="auth-close" id="closeAuth"><i class="fas fa-times"></i></button>
      ${contextBanner}
      <div class="auth-tabs">
        <button class="auth-tab active" data-tab="login">Sign In</button>
        <button class="auth-tab" data-tab="register">Create Account</button>
      </div>
      <div id="loginForm" class="auth-form active">
        <h3>Welcome Back</h3>
        <input type="email" id="loginEmail" placeholder="Email Address" class="auth-input">
        <input type="password" id="loginPassword" placeholder="Password" class="auth-input">
        <button id="doLogin" class="btn btn-primary w-full">Sign In</button>
        <div class="auth-divider">OR</div>
        <button id="doGoogle" class="btn btn-google w-full"><i class="fab fa-google"></i> Continue with Google</button>
      </div>
      <div id="registerForm" class="auth-form">
        <h3>Create Your Account</h3>
        <input type="text" id="regName" placeholder="Full Name" class="auth-input">
        <input type="email" id="regEmail" placeholder="Email Address" class="auth-input">
        <input type="password" id="regPassword" placeholder="Password (min 6 characters)" class="auth-input">
        <select id="regTeam" class="auth-input">
          <option value="">Choose a Team (optional)</option>
          <option value="Team Liberty|#B22234">Team Liberty</option>
          <option value="Team Freedom|#3C3B6E">Team Freedom</option>
          <option value="Team Unity|#10b981">Team Unity</option>
        </select>
        <button id="doRegister" class="btn btn-primary w-full">Create Account & Get Pass</button>
        <p class="auth-terms" style="margin-top:12px;">By registering, you agree to our Terms of Service and Privacy Policy.</p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close on backdrop click
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  // Close button
  const closeBtn = modal.querySelector('#closeAuth');
  if (closeBtn) closeBtn.onclick = () => modal.remove();

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
  if (loginBtn) {
    loginBtn.onclick = async () => {
      const email = modal.querySelector('#loginEmail').value.trim();
      const password = modal.querySelector('#loginPassword').value;
      if (!email || !password) {
        window.showToast('Please enter email and password', 'error');
        return;
      }

      loginBtn.disabled = true;
      loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

      const result = await signIn(email, password);
      if (result.success) {
        window.showToast('Logged in successfully!', 'success');
        modal.remove();
        setTimeout(() => redirectToDashboard(), 500);
      } else {
        window.showToast(result.error || 'Login failed', 'error');
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Sign In';
      }
    };
  }

  // Register handler
  const registerBtn = modal.querySelector('#doRegister');
  if (registerBtn) {
    registerBtn.onclick = async () => {
      const name = modal.querySelector('#regName').value.trim();
      const email = modal.querySelector('#regEmail').value.trim();
      const password = modal.querySelector('#regPassword').value;
      const teamSelect = modal.querySelector('#regTeam');
      const teamValue = teamSelect ? teamSelect.value : '';
      const [teamName, teamColor] = teamValue ? teamValue.split('|') : [null, null];

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
        modal.remove();
        setTimeout(() => redirectToDashboard(), 500);
      } else {
        window.showToast(result.error || 'Registration failed', 'error');
        registerBtn.disabled = false;
        registerBtn.innerHTML = 'Create Account & Get Pass';
      }
    };
  }

  // Google handler
  const googleBtn = modal.querySelector('#doGoogle');
  if (googleBtn) {
    googleBtn.onclick = async () => {
      googleBtn.disabled = true;
      googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';

      const result = await signInWithGoogle();
      if (result.success) {
        window.showToast('Logged in with Google!', 'success');
        modal.remove();
        setTimeout(() => redirectToDashboard(), 500);
      } else {
        window.showToast(result.error || 'Google login failed', 'error');
        googleBtn.disabled = false;
        googleBtn.innerHTML = '<i class="fab fa-google"></i> Continue with Google';
      }
    };
  }
};

// Redirect to dashboard based on user role
export function redirectToDashboard() {
  const user = getCurrentUser();
  if (!user) {
    window.showAuthModal();
    return;
  }
  showDashboardPanel(user);
}

// Sign out helper (global so inline onclick can call it)
window.doSignOut = async function() {
  const result = await signOutUser();
  if (result.success) {
    const panel = document.getElementById('dashboardPanel');
    if (panel) { panel.remove(); document.body.style.overflow = ''; }
    window.showToast('Signed out successfully', 'info');
  }
};

// ── INLINE DASHBOARD PANEL ──────────────────────────────────────────────────
function showDashboardPanel(user) {
  const existing = document.getElementById('dashboardPanel');
  if (existing) existing.remove();

  const roleColors = { admin:'#B22234', organizer:'#0A3161', booth_admin:'#7c3aed', volunteer:'#059669', participant:'#0A3161' };
  const roleLabels = { admin:'Admin', organizer:'Event Organizer', booth_admin:'Booth Admin', volunteer:'Volunteer', participant:'Participant' };

  const color     = roleColors[user.role] || '#0A3161';
  const roleLabel = roleLabels[user.role] || 'Participant';
  const qrValue   = user.qrCode || `freedom250_${user.uid}`;
  const initial   = (user.displayName || user.email || '?')[0].toUpperCase();

  const isAdmin = ['admin','organizer'].includes(user.role);
  const isBooth = user.role === 'booth_admin';
  const isVolunteer = user.role === 'volunteer';

  const panel = document.createElement('div');
  panel.id = 'dashboardPanel';
  panel.style.cssText = 'position:fixed;inset:0;background:#f0f2f7;z-index:4000;overflow-y:auto;font-family:DM Sans,system-ui,sans-serif;';

  panel.innerHTML = `
    <!-- TOP BAR -->
    <div style="background:${color};color:#fff;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;gap:12px;box-shadow:0 4px 20px rgba(0,0,0,0.25);">
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <span style="font-family:Sora,sans-serif;font-weight:900;font-size:1.15rem;letter-spacing:-.02em;">FREEDOM<span style="color:rgba(255,255,255,0.55)">250</span></span>
        <span style="background:rgba(255,255,255,0.18);padding:4px 14px;border-radius:99px;font-size:0.73rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">${roleLabel} Dashboard</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <span style="font-size:0.83rem;opacity:0.8;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${user.displayName || user.email}</span>
        <button onclick="window.doSignOut()" style="background:rgba(255,255,255,0.18);border:1.5px solid rgba(255,255,255,0.3);color:#fff;padding:7px 16px;border-radius:8px;cursor:pointer;font-size:0.8rem;font-weight:600;font-family:inherit;transition:background .2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'">Sign Out</button>
        <button onclick="document.getElementById('dashboardPanel').remove();document.body.style.overflow='';" style="background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.2);color:#fff;width:34px;height:34px;border-radius:8px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>
    </div>

    <!-- BODY -->
    <div style="max-width:960px;margin:0 auto;padding:32px 20px 48px;">

      <!-- PROFILE CARD -->
      <div style="background:#fff;border-radius:18px;padding:28px 28px;display:grid;grid-template-columns:auto 1fr auto;gap:22px;align-items:center;border:1px solid #e2e6ef;box-shadow:0 4px 20px rgba(10,49,97,0.07);margin-bottom:20px;">
        <div style="width:60px;height:60px;border-radius:16px;background:${color};color:#fff;font-family:Sora,sans-serif;font-weight:900;font-size:1.6rem;display:flex;align-items:center;justify-content:center;">${initial}</div>
        <div>
          <div style="font-family:Sora,sans-serif;font-weight:800;font-size:1.15rem;color:#0A3161;margin-bottom:3px;">${user.displayName || 'Participant'}</div>
          <div style="font-size:0.83rem;color:#8891a5;">${user.email}</div>
          <div style="margin-top:10px;display:flex;gap:7px;flex-wrap:wrap;">
            <span style="background:#edf2fa;color:#0A3161;padding:4px 13px;border-radius:99px;font-size:0.72rem;font-weight:700;">${roleLabel}</span>
            ${user.teamName ? `<span style="background:#fdf2f3;color:#B22234;padding:4px 13px;border-radius:99px;font-size:0.72rem;font-weight:700;">${user.teamName}</span>` : ''}
          </div>
        </div>
        <div style="text-align:center;background:linear-gradient(135deg,#fdf2f3,#fff0f1);border-radius:14px;padding:18px 24px;border:1px solid rgba(178,34,52,0.15);">
          <div style="font-family:Sora,sans-serif;font-size:2.2rem;font-weight:900;color:#B22234;line-height:1;">${user.points || 0}</div>
          <div style="font-size:0.68rem;font-weight:700;color:#B22234;opacity:.7;text-transform:uppercase;letter-spacing:.1em;margin-top:4px;">Liberty Coins</div>
        </div>
      </div>

      <!-- TWO-COLUMN GRID -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">

        <!-- QR BADGE -->
        <div style="background:#fff;border-radius:18px;padding:28px;border:1px solid #e2e6ef;box-shadow:0 4px 20px rgba(10,49,97,0.07);display:flex;flex-direction:column;align-items:center;text-align:center;">
          <div style="font-family:Sora,sans-serif;font-weight:800;color:#0A3161;font-size:0.95rem;margin-bottom:4px;">Your Liberty Pass</div>
          <div style="font-size:0.8rem;color:#8891a5;margin-bottom:18px;">Present at any booth to earn points</div>
          <div id="dashQR" style="padding:14px;background:#fff;border:2px solid #e2e6ef;border-radius:12px;"></div>
          <div style="margin-top:12px;font-family:monospace;font-size:0.7rem;color:#8891a5;background:#f2f4f7;padding:6px 14px;border-radius:8px;word-break:break-all;max-width:200px;">${qrValue}</div>
        </div>

        <!-- QUICK STATS -->
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="background:#fff;border-radius:14px;padding:20px;border:1px solid #e2e6ef;box-shadow:0 2px 10px rgba(10,49,97,0.05);flex:1;">
            <div style="font-size:0.72rem;font-weight:700;color:#8891a5;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">Your Activity</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div style="background:#edf2fa;border-radius:10px;padding:14px;text-align:center;"><div style="font-family:Sora,sans-serif;font-size:1.6rem;font-weight:900;color:#0A3161;">${user.points || 0}</div><div style="font-size:0.7rem;color:#8891a5;font-weight:600;">Points</div></div>
              <div style="background:#fdf2f3;border-radius:10px;padding:14px;text-align:center;"><div style="font-family:Sora,sans-serif;font-size:1.6rem;font-weight:900;color:#B22234;">1</div><div style="font-size:0.7rem;color:#8891a5;font-weight:600;">Events</div></div>
              <div style="background:#f0fdf4;border-radius:10px;padding:14px;text-align:center;"><div style="font-family:Sora,sans-serif;font-size:1.6rem;font-weight:900;color:#059669;">0</div><div style="font-size:0.7rem;color:#8891a5;font-weight:600;">Badges</div></div>
              <div style="background:#fdf2f3;border-radius:10px;padding:14px;text-align:center;"><div style="font-family:Sora,sans-serif;font-size:1.6rem;font-weight:900;color:#B22234;">#–</div><div style="font-size:0.7rem;color:#8891a5;font-weight:600;">Rank</div></div>
            </div>
          </div>
          <div style="background:linear-gradient(135deg,#0A3161,#1a4f8f);border-radius:14px;padding:20px;color:#fff;">
            <div style="font-size:0.72rem;font-weight:700;opacity:.6;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">🔴 Active Event</div>
            <div style="font-family:Sora,sans-serif;font-weight:800;font-size:1rem;margin-bottom:3px;">Freedom 250 Festival</div>
            <div style="font-size:0.8rem;opacity:.7;">June 11–12, 2026 · JKUAT</div>
          </div>
        </div>
      </div>

      ${isAdmin || isBooth || isVolunteer ? `
      <!-- ROLE-SPECIFIC TOOLS -->
      <div style="background:#fff;border-radius:18px;padding:28px;border:1px solid #e2e6ef;box-shadow:0 4px 20px rgba(10,49,97,0.07);margin-bottom:20px;">
        <div style="font-family:Sora,sans-serif;font-weight:800;color:#0A3161;margin-bottom:18px;font-size:0.95rem;">
          ${isAdmin ? '⚙️ Admin Tools' : isBooth ? '🎪 Booth Tools' : '🙋 Volunteer Tools'}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;">
          ${isAdmin ? `
            <button style="background:#edf2fa;border:none;border-radius:12px;padding:18px;cursor:pointer;text-align:left;font-family:Sora,sans-serif;font-weight:700;color:#0A3161;font-size:0.83rem;transition:background .2s;" onmouseover="this.style.background='#dce7f8'" onmouseout="this.style.background='#edf2fa'">📊 Analytics</button>
            <button style="background:#edf2fa;border:none;border-radius:12px;padding:18px;cursor:pointer;text-align:left;font-family:Sora,sans-serif;font-weight:700;color:#0A3161;font-size:0.83rem;" onmouseover="this.style.background='#dce7f8'" onmouseout="this.style.background='#edf2fa'">👥 Users</button>
            <button style="background:#edf2fa;border:none;border-radius:12px;padding:18px;cursor:pointer;text-align:left;font-family:Sora,sans-serif;font-weight:700;color:#0A3161;font-size:0.83rem;" onmouseover="this.style.background='#dce7f8'" onmouseout="this.style.background='#edf2fa'">🎟️ Events</button>
            <button style="background:#edf2fa;border:none;border-radius:12px;padding:18px;cursor:pointer;text-align:left;font-family:Sora,sans-serif;font-weight:700;color:#0A3161;font-size:0.83rem;" onmouseover="this.style.background='#dce7f8'" onmouseout="this.style.background='#edf2fa'">🏆 Leaderboard</button>
          ` : isBooth ? `
            <button style="background:#edf2fa;border:none;border-radius:12px;padding:18px;cursor:pointer;text-align:left;font-family:Sora,sans-serif;font-weight:700;color:#0A3161;font-size:0.83rem;" onmouseover="this.style.background='#dce7f8'" onmouseout="this.style.background='#edf2fa'">📷 Scan QR</button>
            <button style="background:#edf2fa;border:none;border-radius:12px;padding:18px;cursor:pointer;text-align:left;font-family:Sora,sans-serif;font-weight:700;color:#0A3161;font-size:0.83rem;" onmouseover="this.style.background='#dce7f8'" onmouseout="this.style.background='#edf2fa'">🎯 Award Points</button>
            <button style="background:#edf2fa;border:none;border-radius:12px;padding:18px;cursor:pointer;text-align:left;font-family:Sora,sans-serif;font-weight:700;color:#0A3161;font-size:0.83rem;" onmouseover="this.style.background='#dce7f8'" onmouseout="this.style.background='#edf2fa'">📋 Check-ins</button>
          ` : `
            <button style="background:#edf2fa;border:none;border-radius:12px;padding:18px;cursor:pointer;text-align:left;font-family:Sora,sans-serif;font-weight:700;color:#0A3161;font-size:0.83rem;" onmouseover="this.style.background='#dce7f8'" onmouseout="this.style.background='#edf2fa'">✅ My Tasks</button>
            <button style="background:#edf2fa;border:none;border-radius:12px;padding:18px;cursor:pointer;text-align:left;font-family:Sora,sans-serif;font-weight:700;color:#0A3161;font-size:0.83rem;" onmouseover="this.style.background='#dce7f8'" onmouseout="this.style.background='#edf2fa'">👥 Attendees</button>
          `}
        </div>
      </div>` : ''}

      <!-- COMING SOON NOTICE -->
      <div style="background:linear-gradient(135deg,#fdf2f3,#fff8f8);border-radius:14px;padding:20px 24px;border:1px solid rgba(178,34,52,0.15);display:flex;align-items:center;gap:14px;">
        <div style="font-size:1.5rem;">🚀</div>
        <div>
          <div style="font-family:Sora,sans-serif;font-weight:800;color:#0A3161;font-size:0.9rem;margin-bottom:3px;">Full Dashboard Coming Soon</div>
          <div style="font-size:0.82rem;color:#8891a5;">Your Liberty Pass is active. Full event features — live leaderboards, booth check-ins, and team challenges — go live on June 11.</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);
  document.body.style.overflow = 'hidden';

  // Generate QR code
  setTimeout(() => {
    const qrEl = document.getElementById('dashQR');
    if (qrEl && window.QRCode) {
      try {
        new window.QRCode(qrEl, { text: qrValue, width: 150, height: 150, colorDark: '#0A3161', colorLight: '#ffffff' });
      } catch(e) {
        qrEl.style.cssText = 'width:150px;height:150px;background:#edf2fa;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:2rem;';
        qrEl.textContent = '🎫';
      }
    }
  }, 150);

  // Make QR panel responsive on small screens
  const twoCol = panel.querySelector('[style*="grid-template-columns:1fr 1fr"]');
  if (twoCol && window.innerWidth < 600) {
    twoCol.style.gridTemplateColumns = '1fr';
  }
}

// Countdown timer
function initCountdownTimer() {
  const eventDate = new Date('June 11, 2026 09:00:00').getTime();
  const updateCountdown = () => {
    const now = new Date().getTime();
    const distance = eventDate - now;
    if (distance < 0) return;
    const daysElem = document.getElementById('days');
    const hoursElem = document.getElementById('hours');
    const minutesElem = document.getElementById('minutes');
    if (daysElem) daysElem.textContent = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0');
    if (hoursElem) hoursElem.textContent = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
    if (minutesElem) minutesElem.textContent = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
  };
  updateCountdown();
  setInterval(updateCountdown, 60000);
}

// Setup all event listeners
function setupEventListeners() {
  initCountdownTimer();

  // Hero button
  const heroEventBtn = document.getElementById('heroEventBtn');
  if (heroEventBtn) {
    heroEventBtn.onclick = () => {
      const user = getCurrentUser();
      if (!user) {
        window.showAuthModal();
      } else {
        redirectToDashboard();
      }
    };
  }

  // Badge sign in button
  const badgeBtn = document.getElementById('badgeSignInBtn');
  if (badgeBtn) {
    badgeBtn.onclick = () => {
      const user = getCurrentUser();
      if (!user) {
        window.showAuthModal();
      } else {
        redirectToDashboard();
      }
    };
  }

  // Booth buttons
  const boothStartBtn = document.getElementById('boothStartBtn');
  if (boothStartBtn) {
    boothStartBtn.onclick = () => {
      const user = getCurrentUser();
      if (!user) {
        window.showAuthModal();
      } else if (user.role === ROLES.BOOTH_ADMIN) {
        window.location.href = '/booth-admin';
      } else {
        window.showToast('Booth admin access requires special privileges', 'info');
      }
    };
  }

  const boothTeamBtn = document.getElementById('boothTeamBtn');
  if (boothTeamBtn) {
    boothTeamBtn.onclick = () => {
      window.location.href = '#tents';
    };
  }

  // Footer links
  const footerSignUp = document.getElementById('footerSignUp');
  if (footerSignUp) {
    footerSignUp.onclick = (e) => {
      e.preventDefault();
      window.showAuthModal();
    };
  }

  const footerVolunteer = document.getElementById('footerVolunteer');
  if (footerVolunteer) {
    footerVolunteer.onclick = (e) => {
      e.preventDefault();
      window.showToast('Please contact the volunteer coordinator at volunteer@freedom250.org', 'info');
    };
  }

  const footerBooth = document.getElementById('footerBooth');
  if (footerBooth) {
    footerBooth.onclick = (e) => {
      e.preventDefault();
      window.showToast('For booth hosting inquiries, please email partnerships@freedom250.org', 'info');
    };
  }

  // Contact form
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.onsubmit = (e) => {
      e.preventDefault();
      window.showToast('Thank you for your message! We will get back to you soon.', 'success');
      const inputs = contactForm.querySelectorAll('input, textarea');
      inputs.forEach(input => input.value = '');
    };
  }

  // Help FAB
  const helpFab = document.getElementById('assistantFab');
  if (helpFab) {
    helpFab.onclick = () => {
      window.showToast('📞 Need help? Email support@freedom250.org or call +254 700 000 000', 'info');
    };
  }

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenuPanel = document.getElementById('mobileMenuPanel');
  if (mobileMenuBtn && mobileMenuPanel) {
    mobileMenuBtn.onclick = (e) => {
      e.stopPropagation();
      mobileMenuPanel.classList.toggle('open');
    };

    // Close mobile menu when clicking a link
    const mobileLinks = mobileMenuPanel.querySelectorAll('.mobile-link');
    mobileLinks.forEach(link => {
      link.onclick = (e) => {   // ← fixed: e is now properly defined
        mobileMenuPanel.classList.remove('open');
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const sectionId = href.substring(1);
          const element = document.getElementById(sectionId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }
      };
    });

    // Close mobile menu on outside click
    document.addEventListener('click', (e) => {
      if (!mobileMenuPanel.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mobileMenuPanel.classList.remove('open');
      }
    });
  }

  // Home link
  const homeLink = document.getElementById('homeLink');
  if (homeLink) {
    homeLink.onclick = (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }
}