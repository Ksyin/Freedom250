// js/gamification.js - Freedom 250 Gamification System (Levels, Badges, Achievements)

import { db, doc, updateDoc, arrayUnion, serverTimestamp } from './firebase-config.js';
import { calculateLevel, getXpToNextLevel, getFreedomRank } from './points-system.js';

/**
 * ACHIEVEMENT BADGES
 */
export const ACHIEVEMENTS = {
  // Welcome badges
  FREEDOM_STARTER: {
    id: 'freedom_starter',
    name: 'Freedom Starter',
    description: 'Created your Freedom 250 account',
    icon: 'fa-flag',
    points: 0,
    automatic: true
  },

  // Zone badges
  ZONE_EXPLORER: {
    id: 'zone_explorer',
    name: 'Zone Explorer',
    description: 'Visited 3 different zones',
    icon: 'fa-map',
    points: 50,
    requirement: { type: 'zones_visited', value: 3 }
  },
  ZONE_CONQUEROR: {
    id: 'zone_conqueror',
    name: 'Zone Conqueror',
    description: 'Visited all 7 Freedom Zones',
    icon: 'fa-globe',
    points: 500,
    requirement: { type: 'zones_visited', value: 7 }
  },

  // Point badges
  CENTURY_CLUB: {
    id: 'century_club',
    name: 'Century Club',
    description: 'Earned 100 Liberty Coins',
    icon: 'fa-star',
    points: 0,
    requirement: { type: 'points', value: 100 }
  },
  HIGH_ROLLER: {
    id: 'high_roller',
    name: 'High Roller',
    description: 'Earned 500 Liberty Coins',
    icon: 'fa-crown',
    points: 0,
    requirement: { type: 'points', value: 500 }
  },
  LIBERTY_LEGEND: {
    id: 'liberty_legend',
    name: 'Liberty Legend',
    description: 'Earned 1000 Liberty Coins',
    icon: 'fa-trophy',
    points: 0,
    requirement: { type: 'points', value: 1000 }
  },

  // Level badges
  LEVEL_FIVE: {
    id: 'level_five',
    name: 'Rising Star',
    description: 'Reached Level 5',
    icon: 'fa-rocket',
    points: 0,
    requirement: { type: 'level', value: 5 }
  },
  LEVEL_TEN: {
    id: 'level_ten',
    name: 'Unstoppable',
    description: 'Reached Level 10',
    icon: 'fa-fire',
    points: 0,
    requirement: { type: 'level', value: 10 }
  },

  // Networking badges
  NETWORKER: {
    id: 'networker',
    name: 'Great Networker',
    description: 'Connected with 10 other participants',
    icon: 'fa-handshake',
    points: 150,
    requirement: { type: 'networking', value: 10 }
  },

  // Session badges
  SESSION_ATTENDEE: {
    id: 'session_attendee',
    name: 'Keen Listener',
    description: 'Attended 5 sessions',
    icon: 'fa-ear-listen',
    points: 100,
    requirement: { type: 'sessions_attended', value: 5 }
  },
  SESSION_CHAMPION: {
    id: 'session_champion',
    name: 'Session Champion',
    description: 'Attended all available sessions',
    icon: 'fa-graduation-cap',
    points: 300,
    requirement: { type: 'sessions_attended', value: 999 } // Unrealistic, shows dedication
  },

  // Challenge badges
  CHALLENGE_MASTER: {
    id: 'challenge_master',
    name: 'Challenge Master',
    description: 'Completed 5 challenges',
    icon: 'fa-flag-checkered',
    points: 200,
    requirement: { type: 'challenges_completed', value: 5 }
  },

  // Streak badge
  COMEBACK_KID: {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Maintained a 7-day login streak',
    icon: 'fa-fire',
    points: 100,
    requirement: { type: 'login_streak', value: 7 }
  },

  // Social badge
  SOCIAL_BUTTERFLY: {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Shared on social media 5 times',
    icon: 'fa-share-alt',
    points: 75,
    requirement: { type: 'social_shares', value: 5 }
  }
};

/**
 * FREEDOM RANK TITLES (Based on Level)
 */
export const FREEDOM_RANKS = {
  PIONEER: { levels: [1, 2], title: 'Freedom Pioneer', icon: 'fa-seedling' },
  EXPLORER: { levels: [3, 5], title: 'Freedom Explorer', icon: 'fa-map' },
  ADVENTURER: { levels: [6, 8], title: 'Freedom Adventurer', icon: 'fa-mountain-sun' },
  CHAMPION: { levels: [9, 12], title: 'Freedom Champion', icon: 'fa-medal' },
  HERO: { levels: [13, 15], title: 'Liberty Hero', icon: 'fa-shield' },
  LEGEND: { levels: [16, 999], title: 'Freedom Legend', icon: 'fa-crown' }
};

/**
 * FREEDOM ZONES & STAMPS
 */
export const FREEDOM_ZONES = [
  {
    id: 'garage',
    name: 'THE GARAGE',
    description: 'Innovation & Maker Lab - Drone Soccer, Robotics',
    icon: 'fa-microchip',
    color: '#3C3B6E'
  },
  {
    id: 'launchpad',
    name: 'THE LAUNCHPAD',
    description: 'Entrepreneurship & Business Pitches',
    icon: 'fa-chart-line',
    color: '#B22234'
  },
  {
    id: 'varsity',
    name: 'THE VARSITY LOUNGE',
    description: 'Education & Alumni - Study Abroad Opportunities',
    icon: 'fa-graduation-cap',
    color: '#3C3B6E'
  },
  {
    id: 'townhall',
    name: 'THE TOWNHALL',
    description: 'Democracy & Leadership - Voting Simulations',
    icon: 'fa-landmark',
    color: '#B22234'
  },
  {
    id: 'arena',
    name: 'THE ARENA',
    description: 'Sports & Wellness - Basketball, Disc Golf',
    icon: 'fa-basketball-ball',
    color: '#3C3B6E'
  },
  {
    id: 'taste',
    name: 'TASTE OF AMERICA',
    description: 'Food Court - American Cuisine & Bites',
    icon: 'fa-utensils',
    color: '#B22234'
  },
  {
    id: 'culture',
    name: 'CULTURE & MUSIC',
    description: 'Main Stage - Live Performances & Entertainment',
    icon: 'fa-music',
    color: '#3C3B6E'
  }
];

/**
 * Unlock an achievement badge for a user
 */
export async function unlockAchievement(userId, achievementId) {
  try {
    const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === achievementId);
    if (!achievement) {
      console.warn('[Gamification] Achievement not found:', achievementId);
      return false;
    }

    const userRef = doc(db, 'users', userId);

    // Add badge
    await updateDoc(userRef, {
      badges: arrayUnion({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        unlockedAt: serverTimestamp()
      })
    });

    console.log('[Gamification] Achievement unlocked:', achievement.name);
    return true;
  } catch (error) {
    console.error('[Gamification] Error unlocking achievement:', error);
    return false;
  }
}

/**
 * Check and unlock achievements based on user progress
 */
export async function checkAndUnlockAchievements(userId, userStats) {
  try {
    const achievementsToUnlock = [];

    // Check each achievement
    for (const achievement of Object.values(ACHIEVEMENTS)) {
      if (!achievement.requirement) continue;

      const requirement = achievement.requirement;
      const unlockIt = checkAchievementRequirement(userStats, requirement);

      if (unlockIt) {
        achievementsToUnlock.push(achievement.id);
      }
    }

    // Unlock all new achievements
    for (const achievementId of achievementsToUnlock) {
      await unlockAchievement(userId, achievementId);
    }

    return achievementsToUnlock;
  } catch (error) {
    console.error('[Gamification] Error checking achievements:', error);
    return [];
  }
}

/**
 * Check if achievement requirement is met
 */
function checkAchievementRequirement(userStats, requirement) {
  switch (requirement.type) {
    case 'points':
      return (userStats.points || 0) >= requirement.value;
    case 'level':
      return (userStats.level || 1) >= requirement.value;
    case 'zones_visited':
      return (userStats.stamps?.length || 0) >= requirement.value;
    case 'challenges_completed':
      return (userStats.challengesCompleted || 0) >= requirement.value;
    case 'sessions_attended':
      return (userStats.sessionsAttended || 0) >= requirement.value;
    case 'networking':
      return (userStats.networkingCount || 0) >= requirement.value;
    case 'login_streak':
      return (userStats.loginStreak || 0) >= requirement.value;
    case 'social_shares':
      return (userStats.socialShares || 0) >= requirement.value;
    default:
      return false;
  }
}

/**
 * Award a stamp for visiting a zone
 */
export async function awardZoneStamp(userId, zoneId) {
  try {
    const zone = FREEDOM_ZONES.find(z => z.id === zoneId);
    if (!zone) {
      console.warn('[Gamification] Zone not found:', zoneId);
      return false;
    }

    const userRef = doc(db, 'users', userId);

    // Add stamp
    await updateDoc(userRef, {
      stamps: arrayUnion(zoneId)
    });

    console.log('[Gamification] Zone stamp awarded:', zone.name);

    // Check if all zones visited for special achievement
    const userDoc = await (await import('./firebase-config.js')).getDoc(userRef);
    const user = userDoc.data();
    if ((user.stamps?.length || 0) >= FREEDOM_ZONES.length) {
      await unlockAchievement(userId, 'zone_conqueror');
    }

    return true;
  } catch (error) {
    console.error('[Gamification] Error awarding zone stamp:', error);
    return false;
  }
}

/**
 * Update user's Freedom Rank based on level
 */
export async function updateFreedomRank(userId, level) {
  try {
    let rankInfo = FREEDOM_RANKS.PIONEER;

    for (const rank of Object.values(FREEDOM_RANKS)) {
      const [minLevel, maxLevel] = rank.levels;
      if (level >= minLevel && level <= maxLevel) {
        rankInfo = rank;
        break;
      }
    }

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      currentRank: rankInfo.title,
      freedomRank: rankInfo.title
    });

    return rankInfo;
  } catch (error) {
    console.error('[Gamification] Error updating freedom rank:', error);
    return FREEDOM_RANKS.PIONEER;
  }
}

/**
 * Calculate level progression info
 */
export function getLevelProgressionInfo(xp) {
  const level = calculateLevel(xp);
  const xpToNext = getXpToNextLevel(xp);
  const currentLevelXp = xp % 500;
  const progressPercent = (currentLevelXp / 500) * 100;

  return {
    level,
    xp,
    currentLevelXp,
    xpToNext,
    progressPercent,
    rank: getFreedomRank(level)
  };
}

/**
 * Get user's achievement progress
 */
export async function getUserAchievementProgress(userId) {
  try {
    const { getDoc } = await import('./firebase-config.js');
    const userDoc = await getDoc(doc(db, 'users', userId));
    const user = userDoc.data();

    const progress = {};

    for (const achievement of Object.values(ACHIEVEMENTS)) {
      const earned = user.badges?.some(b => b.id === achievement.id);
      progress[achievement.id] = {
        earned,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        requirement: achievement.requirement
      };
    }

    return progress;
  } catch (error) {
    console.error('[Gamification] Error getting achievement progress:', error);
    return {};
  }
}

/**
 * Get zones visited by user
 */
export function getVisitedZones(userStamps = []) {
  return FREEDOM_ZONES.filter(zone => userStamps.includes(zone.id));
}

/**
 * Get unvisited zones by user
 */
export function getUnvisitedZones(userStamps = []) {
  return FREEDOM_ZONES.filter(zone => !userStamps.includes(zone.id));
}

/**
 * Get completion percentage of zones
 */
export function getZoneCompletionPercent(userStamps = []) {
  return Math.round((userStamps.length / FREEDOM_ZONES.length) * 100);
}

/**
 * Generate level-up notification
 */
export function generateLevelUpMessage(oldLevel, newLevel, rank) {
  const messages = {
    1: '🎮 Welcome to Freedom 250!',
    3: '📈 You\'re climbing fast!',
    5: '🌟 Rising Star status achieved!',
    10: '🏆 Unstoppable force unlocked!',
    15: '👑 Elite status achieved!',
    20: '🔥 LEGENDARY status!!!'
  };

  const message = messages[newLevel] || `🎉 Level ${newLevel}! - ${rank}`;
  return message;
}

/**
 * Calculate estimated time to next milestone
 */
export function estimateTimeToMilestone(currentXp, dailyXp = 100) {
  const nextMilestones = [100, 500, 1000, 5000, 10000];
  const currentMilestone = nextMilestones.find(m => m > currentXp);

  if (!currentMilestone) return 'You\'ve reached the top!';

  const xpNeeded = currentMilestone - currentXp;
  const daysNeeded = Math.ceil(xpNeeded / dailyXp);

  if (daysNeeded === 0) return 'Almost there!';
  if (daysNeeded === 1) return 'Tomorrow!';
  return `${daysNeeded} days`;
}

export default {
  ACHIEVEMENTS,
  FREEDOM_RANKS,
  FREEDOM_ZONES,
  unlockAchievement,
  checkAndUnlockAchievements,
  awardZoneStamp,
  updateFreedomRank,
  getLevelProgressionInfo,
  getUserAchievementProgress,
  getVisitedZones,
  getUnvisitedZones,
  getZoneCompletionPercent,
  generateLevelUpMessage,
  estimateTimeToMilestone
};
