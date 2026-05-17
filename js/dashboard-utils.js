// js/dashboard-utils.js - Dashboard utility functions

import { getCurrentUser, onAuthStateChange } from './auth.js';
import { displayQRCode, downloadQRCode } from './qr-generator.js';

/**
 * Display user's QR code on the dashboard
 */
export async function displayUserQRCode(containerId = 'qrCodeDisplay') {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.warn('[Dashboard] No user found for QR display');
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('[Dashboard] QR code container not found:', containerId);
      return;
    }

    // Check if user has a QR code
    if (user.qrCode) {
      console.log('[Dashboard] Displaying QR code for:', user.freedomId);
      displayQRCode(user.qrCode, container, {
        maxWidth: '140px',
        width: '140px',
        height: '140px',
        borderRadius: '12px'
      });
    } else {
      console.warn('[Dashboard] User has no QR code');
      // Show placeholder
      container.innerHTML = '<i class="fas fa-qrcode" style="font-size: 3rem; color: #999;"></i>';
    }
  } catch (error) {
    console.error('[Dashboard] Error displaying QR code:', error);
  }
}

/**
 * Update user profile display
 */
export function updateUserProfile(user) {
  if (!user) return;

  // Update display name
  const userNameElement = document.getElementById('userName');
  if (userNameElement) {
    userNameElement.textContent = user.displayName || user.email.split('@')[0];
  }

  // Update stats
  const libertyCoinElement = document.getElementById('libertyCoins');
  if (libertyCoinElement) {
    libertyCoinElement.textContent = user.points || 0;
  }

  const levelElement = document.getElementById('passportLevel');
  if (levelElement) {
    levelElement.textContent = user.level || 1;
  }

  const stampsElement = document.getElementById('stampsCount');
  if (stampsElement) {
    stampsElement.textContent = (user.stamps?.length || 0);
  }

  // Update profile rank
  const rankElement = document.getElementById('profileRank');
  if (rankElement) {
    rankElement.textContent = user.freedomRank || 'Freedom Explorer';
  }

  // Update progress bar
  updateProgressBar(user);
}

/**
 * Update level progress bar
 */
export function updateProgressBar(user) {
  const progressBar = document.getElementById('levelProgress');
  const xpToNextElement = document.getElementById('xpToNext');

  if (!progressBar || !xpToNextElement) return;

  // Calculate progress (simple: 500 XP per level)
  const xpPerLevel = 500;
  const currentLevelXp = (user.xp || 0) % xpPerLevel;
  const progressPercent = (currentLevelXp / xpPerLevel) * 100;

  progressBar.style.width = progressPercent + '%';
  const xpRemaining = xpPerLevel - currentLevelXp;
  xpToNextElement.textContent = xpRemaining + ' XP';
}

/**
 * Display badges
 */
export function displayBadges(user) {
  const badgeRow = document.getElementById('badgeRow');
  if (!badgeRow) return;

  const badges = user.badges || [];
  const badgeHtml = badges
    .map(b => `<span class="badge-pill"><i class="fas ${b.icon}"></i> ${b.name}</span>`)
    .join('');

  badgeRow.innerHTML = badgeHtml;
}

/**
 * Display zones with completion status
 */
export function displayZones(zones, completedZones = []) {
  const grid = document.getElementById('zonesGrid');
  if (!grid) return;

  const zonesHtml = zones
    .map(zone => {
      const completed = completedZones.includes(zone.name);
      const bgColor = zone.color || '#3C3B6E';
      return `
        <div class="zone-card" style="cursor: pointer;" onclick="alert('Visit ${zone.name}!')">
          <div class="zone-icon" style="background: ${bgColor};">
            <i class="${zone.icon}"></i>
          </div>
          <div class="zone-info">
            <h4>${zone.name}</h4>
            <p>${zone.desc}</p>
          </div>
          ${completed ? '<div class="zone-stamp">✓ Stamp</div>' : ''}
        </div>
      `;
    })
    .join('');

  grid.innerHTML = zonesHtml;
}

/**
 * Display challenges
 */
export function displayChallenges(challenges) {
  const grid = document.getElementById('challengesGrid');
  if (!grid) return;

  const challengesHtml = challenges
    .slice(0, 3)
    .map(challenge => {
      const progressPercent = (challenge.progress / challenge.target) * 100;
      return `
        <div class="feature-card" onclick="openChallenge(${challenge.id})">
          <div class="feature-img" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); position: relative;">
            <div class="overlay" style="background: none;">
              <div style="color: gold; font-weight: 800; font-size: 1.3rem;">${challenge.reward} pts</div>
            </div>
          </div>
          <div class="feature-content">
            <h3>${challenge.name}</h3>
            <p>${challenge.desc}</p>
            <div style="background: #f0f0f0; height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
              <div style="background: gold; height: 100%; width: ${progressPercent}%;"></div>
            </div>
            <small>${challenge.progress}/${challenge.target} completed</small>
          </div>
        </div>
      `;
    })
    .join('');

  grid.innerHTML = challengesHtml;
}

/**
 * Display leaderboard preview
 */
export function displayLeaderboard(leaderboard) {
  const container = document.getElementById('leaderboardPreview');
  if (!container) return;

  const html = leaderboard
    .slice(0, 5)
    .map((entry, index) => `
      <div class="leaderboard-item">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; background: gold; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #1a1a2e;">
            ${entry.rank}
          </div>
          <div>
            <div style="font-weight: 600; font-size: 0.9rem;">${entry.name}</div>
            <small style="color: #999;">${entry.university}</small>
          </div>
        </div>
        <div style="font-weight: 800; color: gold;">${entry.points} pts</div>
      </div>
    `)
    .join('');

  container.innerHTML = html;
}

/**
 * Display activity history
 */
export function displayActivityHistory(activities) {
  const container = document.getElementById('activityHistorySection');
  if (!container) return;

  const html = activities
    .slice(0, 5)
    .map(activity => `
      <div class="notification-card">
        <h3>${activity.label}</h3>
        <p>${activity.details}</p>
        <small style="color: #999;">${new Date(activity.time).toLocaleString()}</small>
      </div>
    `)
    .join('');

  container.innerHTML = html;
}

/**
 * Navigate between dashboard sections
 */
export function navigateSection(sectionName) {
  // Hide all sections
  document.getElementById('homeSection').style.display = 'none';
  document.getElementById('challengesSection').style.display = 'none';
  document.getElementById('leaderboardSection').style.display = 'none';
  document.getElementById('profileSection').style.display = 'none';

  // Show requested section
  const sectionElement = document.getElementById(sectionName + 'Section');
  if (sectionElement) {
    sectionElement.style.display = 'block';
  }

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-nav="${sectionName}"]`).classList.add('active');
}

/**
 * Initialize dashboard utilities
 */
export async function initDashboardUtils() {
  try {
    const user = getCurrentUser();
    if (user) {
      // Display QR code
      await displayUserQRCode();

      // Update profile
      updateUserProfile(user);

      // Display badges
      displayBadges(user);

      console.log('[Dashboard] Utils initialized');
    }
  } catch (error) {
    console.error('[Dashboard] Utils initialization error:', error);
  }
}

export default {
  displayUserQRCode,
  updateUserProfile,
  updateProgressBar,
  displayBadges,
  displayZones,
  displayChallenges,
  displayLeaderboard,
  displayActivityHistory,
  navigateSection,
  initDashboardUtils
};
