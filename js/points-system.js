// js/points-system.js - Freedom 250 Point System and Tracking

import { db, collection, doc, updateDoc, increment, serverTimestamp, setDoc } from './firebase-config.js';
import { awardPoints, recordBoothScan, logEvent } from './firestore-schema.js';

/**
 * Point Values for Different Actions
 */
export const POINT_VALUES = {
  BOOTH_VISIT: 5,
  SESSION_ATTENDANCE: 20,
  CHALLENGE_WIN: 100,
  SCAVENGER_HUNT_COMPLETION: 50,
  NETWORKING_INTERACTION: 15,
  QUESTION_ASKED: 10,
  SOCIAL_SHARE: 30,
  ZONE_VISIT: 50,
  ZONE_ALL_VISITED: 500,
  DAILY_LOGIN: 5
};

/**
 * Point Multiplier Events
 */
export const MULTIPLIER_EVENTS = {
  POWER_HOUR: 2.0,        // During specific time window
  HAPPY_HOUR: 1.5,        // Early morning bonus
  STREAK_BONUS: 1.2,      // For consecutive daily logins
  REFERRAL_BONUS: 1.1     // When referring friends
};

/**
 * Award points for a booth visit
 */
export async function awardBoothPoints(userId, boothId, basePoints = POINT_VALUES.BOOTH_VISIT) {
  try {
    // Apply any active multipliers
    const multiplier = await getActiveMultiplier();
    const finalPoints = Math.round(basePoints * multiplier);

    // Record the scan
    await recordBoothScan(userId, boothId, finalPoints);

    // Update user's cumulative stats
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points: increment(finalPoints),
      xp: increment(Math.round(finalPoints * 0.5)) // XP is 50% of points
    });

    // Log the event
    await logEvent(userId, 'booth_points_awarded', {
      boothId,
      basePoints,
      multiplier,
      finalPoints
    });

    return {
      success: true,
      points: finalPoints,
      multiplier,
      message: `+${finalPoints} Liberty Coins!`
    };
  } catch (error) {
    console.error('[Points] Error awarding booth points:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Award points for session attendance
 */
export async function awardSessionPoints(userId, sessionId, basePoints = POINT_VALUES.SESSION_ATTENDANCE) {
  try {
    const multiplier = await getActiveMultiplier();
    const finalPoints = Math.round(basePoints * multiplier);

    // Check if user already attended this session
    const scansRef = collection(db, 'scans');
    const existingScans = await checkExistingAction(userId, sessionId, 'session');

    if (existingScans > 0) {
      // Already attended this session, award reduced bonus
      const bonusPoints = Math.round(basePoints * 0.25 * multiplier);
      await awardPoints(userId, 'session_bonus', bonusPoints, sessionId);
      return {
        success: true,
        points: bonusPoints,
        message: 'Already attended! +' + bonusPoints + ' bonus'
      };
    }

    // First attendance - award full points
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points: increment(finalPoints),
      xp: increment(Math.round(finalPoints * 0.5))
    });

    // Record the attendance
    await awardPoints(userId, 'session', finalPoints, sessionId);

    return {
      success: true,
      points: finalPoints,
      multiplier,
      message: `+${finalPoints} Liberty Coins!`
    };
  } catch (error) {
    console.error('[Points] Error awarding session points:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Award points for challenge completion
 */
export async function awardChallengePoints(userId, challengeId, basePoints = POINT_VALUES.CHALLENGE_WIN) {
  try {
    const multiplier = await getActiveMultiplier();
    const finalPoints = Math.round(basePoints * multiplier);

    // Check if challenge already completed
    const existingCompletion = await checkExistingAction(userId, challengeId, 'challenge');
    if (existingCompletion > 0) {
      return {
        success: false,
        message: 'Challenge already completed'
      };
    }

    // Award points
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points: increment(finalPoints),
      xp: increment(Math.round(finalPoints * 0.5))
    });

    // Record completion
    await awardPoints(userId, 'challenge', finalPoints, challengeId);

    // Check for achievement badges
    await checkAchievements(userId, finalPoints);

    return {
      success: true,
      points: finalPoints,
      multiplier,
      message: `Challenge Complete! +${finalPoints} Liberty Coins!`
    };
  } catch (error) {
    console.error('[Points] Error awarding challenge points:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Award points for networking interaction
 */
export async function awardNetworkingPoints(userId, targetUserId = null) {
  try {
    const basePoints = POINT_VALUES.NETWORKING_INTERACTION;
    const multiplier = await getActiveMultiplier();
    const finalPoints = Math.round(basePoints * multiplier);

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points: increment(finalPoints),
      xp: increment(Math.round(finalPoints * 0.5))
    });

    await awardPoints(userId, 'networking', finalPoints, targetUserId || 'general');

    return {
      success: true,
      points: finalPoints,
      message: `Great networking! +${finalPoints} Liberty Coins!`
    };
  } catch (error) {
    console.error('[Points] Error awarding networking points:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Award daily login bonus
 */
export async function awardDailyLoginBonus(userId) {
  try {
    const user = (await (await import('./firebase-config.js')).getDoc(doc(db, 'users', userId))).data();
    
    // Check if user already got daily bonus today
    const lastLoginDate = new Date(user.lastDailyBonus || 0).toDateString();
    const todayDate = new Date().toDateString();

    if (lastLoginDate === todayDate) {
      return {
        success: false,
        message: 'Daily bonus already claimed'
      };
    }

    // Award daily bonus + streak bonus if applicable
    let points = POINT_VALUES.DAILY_LOGIN;
    let streakDays = 1;

    if (user.loginStreak) {
      // Check if streak is still active (logged in yesterday)
      const lastLogin = new Date(user.lastLoginDate);
      const today = new Date();
      const daysDiff = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        streakDays = (user.loginStreak || 0) + 1;
        points = Math.round(points * (1 + streakDays * 0.1)); // 10% bonus per day
      }
    }

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points: increment(points),
      xp: increment(Math.round(points * 0.5)),
      lastDailyBonus: serverTimestamp(),
      loginStreak: streakDays,
      lastLoginDate: new Date().toISOString()
    });

    await awardPoints(userId, 'daily_login', points);

    return {
      success: true,
      points,
      streak: streakDays,
      message: streakDays > 1 
        ? `Daily Bonus! 🔥 ${streakDays} day streak! +${points} Liberty Coins!`
        : `Daily Login! +${points} Liberty Coins!`
    };
  } catch (error) {
    console.error('[Points] Error awarding daily bonus:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Award social sharing bonus
 */
export async function awardSocialShareBonus(userId, platform = 'general') {
  try {
    const basePoints = POINT_VALUES.SOCIAL_SHARE;
    const multiplier = await getActiveMultiplier();
    const finalPoints = Math.round(basePoints * multiplier);

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points: increment(finalPoints),
      xp: increment(Math.round(finalPoints * 0.5))
    });

    await awardPoints(userId, 'social_share', finalPoints, platform);

    return {
      success: true,
      points: finalPoints,
      message: `Thanks for sharing! +${finalPoints} Liberty Coins!`
    };
  } catch (error) {
    console.error('[Points] Error awarding social bonus:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Manually award points (admin only)
 */
export async function manuallyAwardPoints(userId, amount, reason = '', adminId = null) {
  try {
    if (!adminId) {
      return { success: false, message: 'Admin ID required' };
    }

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points: increment(amount),
      xp: increment(Math.round(amount * 0.5))
    });

    await awardPoints(userId, 'admin_award', amount, null, adminId);

    // Log admin action
    await logEvent(adminId, 'manual_points_award', {
      recipientId: userId,
      amount,
      reason
    });

    return {
      success: true,
      points: amount,
      message: `Admin awarded +${amount} Liberty Coins`
    };
  } catch (error) {
    console.error('[Points] Error with manual award:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get currently active multiplier
 */
export async function getActiveMultiplier() {
  try {
    const now = new Date();
    const hour = now.getHours();

    // Power Hour: 18:00-19:00 (2x multiplier)
    if (hour === 18) {
      return MULTIPLIER_EVENTS.POWER_HOUR;
    }

    // Happy Hour: 8:00-9:00 (1.5x multiplier)
    if (hour === 8) {
      return MULTIPLIER_EVENTS.HAPPY_HOUR;
    }

    return 1.0;
  } catch (error) {
    console.error('[Points] Error getting multiplier:', error);
    return 1.0;
  }
}

/**
 * Check if user already performed an action
 */
async function checkExistingAction(userId, actionId, actionType) {
  try {
    const scansRef = collection(db, 'scans');
    const { query, where, getDocs } = await import('./firebase-config.js');
    
    const q = query(
      scansRef,
      where('userId', '==', userId),
      where(actionType + 'Id', '==', actionId)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.warn('[Points] Could not check existing action:', error);
    return 0;
  }
}

/**
 * Check for achievement badges
 */
async function checkAchievements(userId, pointsEarned) {
  try {
    const userRef = doc(db, 'users', userId);
    const { getDoc } = await import('./firebase-config.js');
    const userDoc = await getDoc(userRef);
    const user = userDoc.data();

    const badges = user.badges || [];
    const badgesToAdd = [];

    // Check for various achievements
    const totalPoints = (user.points || 0) + pointsEarned;

    if (totalPoints >= 100 && !badges.some(b => b.name === 'Century Club')) {
      badgesToAdd.push({ name: 'Century Club', icon: 'fa-star', unlockedAt: serverTimestamp() });
    }
    if (totalPoints >= 500 && !badges.some(b => b.name === 'High Roller')) {
      badgesToAdd.push({ name: 'High Roller', icon: 'fa-crown', unlockedAt: serverTimestamp() });
    }
    if (totalPoints >= 1000 && !badges.some(b => b.name === 'Liberty Legend')) {
      badgesToAdd.push({ name: 'Liberty Legend', icon: 'fa-trophy', unlockedAt: serverTimestamp() });
    }

    if (badgesToAdd.length > 0) {
      await updateDoc(userRef, {
        badges: [...badges, ...badgesToAdd]
      });
    }
  } catch (error) {
    console.warn('[Points] Error checking achievements:', error);
  }
}

/**
 * Get user's point transaction history
 */
export async function getUserPointsHistory(userId, limit = 50) {
  try {
    const pointsRef = collection(db, 'points');
    const { query, where, orderBy, getDocs } = await import('./firebase-config.js');

    const q = query(
      pointsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const transactions = [];
    snapshot.forEach(doc => {
      transactions.push(doc.data());
    });

    return transactions.slice(0, limit);
  } catch (error) {
    console.error('[Points] Error fetching point history:', error);
    return [];
  }
}

/**
 * Calculate user's current level based on XP
 */
export function calculateLevel(xp = 0) {
  const xpPerLevel = 500;
  return Math.floor(xp / xpPerLevel) + 1;
}

/**
 * Calculate XP needed for next level
 */
export function getXpToNextLevel(xp = 0) {
  const xpPerLevel = 500;
  const currentLevelXp = xp % xpPerLevel;
  return xpPerLevel - currentLevelXp;
}

/**
 * Get freedom rank title based on level
 */
export function getFreedomRank(level = 1) {
  if (level <= 2) return 'Freedom Pioneer';
  if (level <= 5) return 'Freedom Explorer';
  if (level <= 8) return 'Freedom Adventurer';
  if (level <= 12) return 'Freedom Champion';
  if (level <= 15) return 'Liberty Hero';
  return 'Freedom Legend';
}

export default {
  POINT_VALUES,
  MULTIPLIER_EVENTS,
  awardBoothPoints,
  awardSessionPoints,
  awardChallengePoints,
  awardNetworkingPoints,
  awardDailyLoginBonus,
  awardSocialShareBonus,
  manuallyAwardPoints,
  getActiveMultiplier,
  getUserPointsHistory,
  calculateLevel,
  getXpToNextLevel,
  getFreedomRank
};
