// js/main.js - Main Application Logic
import { initAuth, getCurrentUser, onAuthStateChange, getDashboardPath } from './auth.js';
import pageNavigator from './page-navigator.js';
import { initFCM } from './push-email.js';

// Initialize page navigator and auth on page load
async function initializeApp() {
  try {
    // Initialize auth first
    await initAuth();
    console.log('[Main] Auth initialized');
    
    // Initialize page navigator (handles routing based on auth state)
    await pageNavigator.initialize();
    console.log('[Main] Page navigator initialized');
    
    // Initialize Firebase Cloud Messaging
    await initFCM();
    console.log('[Main] FCM initialized');
  } catch (error) {
    console.error('[Main] Initialization error:', error);
  }
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

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

// Open event detail
window.openEventDetail = function(eventId) {
  const event = platformData.events.find(e => e.id === eventId);
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
      <p class="event-detail-description">Join us for the ${event.name}, ${event.tagline}. This is a premier event bringing together students and leaders from across the region.</p>
      <div class="event-detail-cta">
        <h3>Ready to Join?</h3>
        <p>Sign in or register to get your Liberty Pass and unlock all features.</p>
        <div class="cta-buttons">
          <button class="btn btn-primary btn-lg" onclick="window.location.href='login.html'">Get Liberty Pass <i class="fas fa-ticket-alt"></i></button>
          <button class="btn btn-outline btn-lg" onclick="document.getElementById('eventDetailOverlay').classList.remove('active')">Close</button>
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

    // Setup auth state listener
    onAuthStateChange((user, isLoggedIn) => {
      updateNavbarForAuth(user, isLoggedIn);
    });

    // Render UI components
    renderEventsGrid();
    renderUniversitiesGrid();
    setupEventListeners();

    // Hide loading
    if (loadingOverlay) {
      setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => loadingOverlay.style.display = 'none', 500);
      }, 500);
    }

  } catch (error) {
    console.error('Initialization error:', error);
    window.showToast('Failed to load platform. Please refresh the page.', 'error');
  }
});

function updateNavbarForAuth(user, isLoggedIn) {
  const getPassBtn = document.getElementById('getPassBtn');
  const mobileGetPassBtn = document.getElementById('mobileGetPassBtn');

  if (isLoggedIn && user) {
    const roleLabel = (user.role === 'admin') ? 'Admin Pass' :
                      (user.role === 'organizer') ? 'Organizer Pass' :
                      user.role === 'volunteer' ? 'Volunteer Pass' :
                      user.role === 'booth_admin' ? 'Booth Pass' : 'My Liberty Pass';

    if (getPassBtn) {
      getPassBtn.innerHTML = `<i class="fas fa-passport"></i> ${roleLabel}`;
      getPassBtn.onclick = (e) => { e.preventDefault(); window.location.href = getDashboardPath(user); };
    }
    if (mobileGetPassBtn) {
      mobileGetPassBtn.innerHTML = `<i class="fas fa-passport"></i> ${roleLabel}`;
      mobileGetPassBtn.onclick = (e) => { e.preventDefault(); window.location.href = getDashboardPath(user); };
    }
  } else {
    if (getPassBtn) {
      getPassBtn.innerHTML = `Get Liberty Pass`;
      getPassBtn.onclick = (e) => { e.preventDefault(); window.location.href = 'login.html'; };
    }
    if (mobileGetPassBtn) {
      mobileGetPassBtn.innerHTML = `Get Liberty Pass`;
      mobileGetPassBtn.onclick = (e) => { e.preventDefault(); window.location.href = 'login.html'; };
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

// Setup all event listeners
function setupEventListeners() {
  // Hero button
  const heroEventBtn = document.getElementById('heroEventBtn');
  if (heroEventBtn) {
    heroEventBtn.onclick = () => {
      window.location.href = 'login.html';
    };
  }

  // Badge sign in button
  const badgeBtn = document.getElementById('badgeSignInBtn');
  if (badgeBtn) {
    badgeBtn.onclick = () => {
      window.location.href = 'login.html';
    };
  }

  // Booth buttons
  const boothStartBtn = document.getElementById('boothStartBtn');
  if (boothStartBtn) {
    boothStartBtn.onclick = () => {
      window.location.href = 'login.html#booth';
    };
  }

  // Footer links
  const footerSignUp = document.getElementById('footerSignUp');
  if (footerSignUp) {
    footerSignUp.onclick = (e) => {
      e.preventDefault();
      window.location.href = 'register.html';
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

    const mobileLinks = mobileMenuPanel.querySelectorAll('.mobile-link');
    mobileLinks.forEach(link => {
      link.onclick = (e) => {
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
  }
}
