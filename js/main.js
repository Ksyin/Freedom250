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
    const loadingOverlay = document.getElementById('loadingOverlay');
    await initAuth();

    onAuthStateChange((user, isLoggedIn) => {
      updateNavbarForAuth(user, isLoggedIn);
      if (isLoggedIn && user) {
        console.log('User logged in:', user.email, 'Role:', user.role);
      }
    });

    renderUniversitiesGrid();
    renderEventPanel();
    renderLiveAnalytics();
    setupEventListeners();

    if (loadingOverlay) {
      setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => loadingOverlay.style.display = 'none', 500);
      }, 500);
    }

    const user = getCurrentUser();
    if (user) {
      window.showToast(`Welcome back, ${user.displayName || user.email}!`, 'success');
    }

    try {
      const VAPID_KEY = null;
      if (VAPID_KEY) {
        const token = await initFCM(VAPID_KEY, (window.NOTIFY_SERVER_REGISTER || '/register-token'));
        if (token) { window.fcmToken = token; }
      }
    } catch (e) { console.warn('FCM init failed', e); }

    try {
      await loadAndRenderPartners();
    } catch (e) { console.warn('Failed to load partners', e); }
  } catch (error) {
    console.error('Initialization error:', error);
    window.showToast('Failed to load platform. Please refresh the page.', 'error');
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

function renderEventPanel() {
  updateEventDetail('freedom250');
}

function updateEventDetail(eventId) {
  // Event detail shown via openEventDetail() overlay in index.html
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

window.showAuthModal = function showAuthModal(eventContext) {
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
          <option value="">Choose a Team</option>
          <option value="Team Liberty|#B22234">Team Liberty</option>
          <option value="Team Freedom|#3C3B6E">Team Freedom</option>
          <option value="Team Unity|#10b981">Team Unity</option>
        </select>
        <button id="doRegister" class="btn btn-primary w-full">Create Account & Get Pass</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  modal.querySelector('#closeAuth').onclick = () => modal.remove();

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

  modal.querySelector('#doLogin').onclick = async () => {
    const email = modal.querySelector('#loginEmail').value.trim();
    const password = modal.querySelector('#loginPassword').value;
    if (!email || !password) return window.showToast('Please enter credentials', 'error');
    
    const loginBtn = modal.querySelector('#doLogin');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    
    const result = await signIn(email, password);
    if (result.success) {
      window.showToast('Logged in!', 'success');
      modal.remove();
      setTimeout(redirectToDashboard, 500);
    } else {
      window.showToast(result.error, 'error');
      loginBtn.disabled = false;
      loginBtn.innerHTML = 'Sign In';
    }
  };

  modal.querySelector('#doRegister').onclick = async () => {
    const name = modal.querySelector('#regName').value.trim();
    const email = modal.querySelector('#regEmail').value.trim();
    const password = modal.querySelector('#regPassword').value;
    if (!name || !email || !password) return window.showToast('Fill all fields', 'error');

    const registerBtn = modal.querySelector('#doRegister');
    registerBtn.disabled = true;
    const result = await signUp(email, password, name, ROLES.PARTICIPANT);
    if (result.success) {
      window.showToast('Account created!', 'success');
      modal.remove();
      setTimeout(redirectToDashboard, 500);
    } else {
      window.showToast(result.error, 'error');
      registerBtn.disabled = false;
    }
  };

  modal.querySelector('#doGoogle').onclick = async () => {
    const result = await signInWithGoogle();
    if (result.success) {
      modal.remove();
      setTimeout(redirectToDashboard, 500);
    }
  };
};

export function redirectToDashboard() {
  const user = getCurrentUser();
  if (!user) { window.showAuthModal(); return; }
  const dashboardPath = getDashboardPath(user);
  console.log("Redirecting to:", dashboardPath);
  window.location.href = dashboardPath;
}

function initCountdownTimer() {
  const eventDate = new Date('June 11, 2026 09:00:00').getTime();
  const updateCountdown = () => {
    const now = new Date().getTime();
    const distance = eventDate - now;
    if (distance < 0) return;
    document.getElementById('days').textContent = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0');
    document.getElementById('hours').textContent = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
    document.getElementById('minutes').textContent = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
  };
  updateCountdown();
  setInterval(updateCountdown, 60000);
}

function setupEventListeners() {
  initCountdownTimer();
  const heroEventBtn = document.getElementById('heroEventBtn');
  if (heroEventBtn) heroEventBtn.onclick = () => {
    const user = getCurrentUser();
    if (!user) { window.showAuthModal(); } else { redirectToDashboard(); }
  };

  const menuBtn = document.getElementById('mobileMenuBtn');
  const menuPanel = document.getElementById('mobileMenuPanel');
  if (menuBtn && menuPanel) {
    menuBtn.onclick = (e) => { e.stopPropagation(); menuPanel.classList.toggle('hidden'); };
    document.addEventListener('click', (e) => { if (!menuPanel.contains(e.target) && !menuBtn.contains(e.target)) menuPanel.classList.add('hidden'); });
  }
}

export async function loadAndRenderPartners() {
  const partnersContainer = document.querySelector('#partnersGrid');
  if (partnersContainer && db) {
    const snap = await getDocs(query(collection(db, 'booths'), orderBy('createdAt', 'desc')));
    if (!snap.empty) {
      partnersContainer.innerHTML = '';
      snap.forEach(doc => {
        const data = doc.data();
        partnersContainer.innerHTML += `<div class="partner-card"><img class="partner-logo" src="${data.logo || 'https://via.placeholder.com/120x40?text=Sponsor'}" alt="${data.name}"></div>`;
      });
    }
  }
}