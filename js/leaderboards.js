// js/leaderboards.js - Real-time Leaderboard System for Freedom 250

import { db, collection, query, where, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp } from './firebase-config.js';

/**
 * LEADERBOARD TYPES
 */
export const LEADERBOARD_TYPES = {
  OVERALL: 'overall',
  BOOTH: 'booth',
  TEAM: 'team',
  DAILY: 'daily',
  SESSION: 'session'
};

/**
 * Get overall leaderboard (top participants by total points)
 * Returns live updates via listener
 */
export function getOverallLeaderboard(callback, limit_count = 100) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('role', '==', 'participant'),
      orderBy('points', 'desc'),
      limit(limit_count)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const leaderboard = [];
      snapshot.forEach((doc, index) => {
        const user = doc.data();
        leaderboard.push({
          rank: index + 1,
          userId: user.uid,
          name: user.displayName || 'Anonymous',
          email: user.email,
          points: user.points || 0,
          level: user.level || 1,
          xp: user.xp || 0,
          university: user.university || 'Unknown',
          profilePhoto: user.profilePhoto,
          freedomRank: user.freedomRank || 'Pioneer'
        });
      });

      // Cache in leaderboards collection
      await cacheLeaderboard(LEADERBOARD_TYPES.OVERALL, leaderboard);

      callback(leaderboard);
    });

    return unsubscribe;
  } catch (error) {
    console.error('[Leaderboards] Error getting overall leaderboard:', error);
    callback([]);
    return () => {};
  }
}

/**
 * Get booth-specific leaderboard
 * Top participants by visits to a specific booth
 */
export function getBoothLeaderboard(boothId, callback, limit_count = 50) {
  try {
    const scansRef = collection(db, 'scans');
    const q = query(
      scansRef,
      where('boothId', '==', boothId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Group by user and count
      const userScans = {};
      const boothLeaderboard = [];

      snapshot.forEach((doc) => {
        const scan = doc.data();
        if (!userScans[scan.userId]) {
          userScans[scan.userId] = 0;
        }
        userScans[scan.userId]++;
      });

      // Sort by scan count
      const sortedUsers = Object.entries(userScans)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit_count);

      // Get user details
      for (let i = 0; i < sortedUsers.length; i++) {
        const [userId, scanCount] = sortedUsers[i];
        try {
          const userDoc = await (await import('./firebase-config.js')).getDoc(doc(db, 'users', userId));
          const user = userDoc.data();

          boothLeaderboard.push({
            rank: i + 1,
            userId,
            name: user.displayName || 'Anonymous',
            visits: scanCount,
            points: user.points || 0,
            university: user.university || 'Unknown'
          });
        } catch (err) {
          console.warn('Could not fetch user details for:', userId);
        }
      }

      // Cache
      await cacheLeaderboard(`${LEADERBOARD_TYPES.BOOTH}_${boothId}`, boothLeaderboard);

      callback(boothLeaderboard);
    });

    return unsubscribe;
  } catch (error) {
    console.error('[Leaderboards] Error getting booth leaderboard:', error);
    callback([]);
    return () => {};
  }
}

/**
 * Get team/university leaderboard
 * Aggregated points per university
 */
export function getTeamLeaderboard(callback) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('role', '==', 'participant'),
      orderBy('points', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const teamScores = {};
      const teamLeaderboard = [];

      // Aggregate points by university
      snapshot.forEach((doc) => {
        const user = doc.data();
        const university = user.university || 'Unknown';

        if (!teamScores[university]) {
          teamScores[university] = {
            university,
            totalPoints: 0,
            participantCount: 0,
            averagePoints: 0
          };
        }

        teamScores[university].totalPoints += user.points || 0;
        teamScores[university].participantCount++;
      });

      // Calculate averages and sort
      Object.values(teamScores).forEach(team => {
        team.averagePoints = Math.round(team.totalPoints / team.participantCount);
      });

      const sorted = Object.values(teamScores)
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((team, index) => ({
          rank: index + 1,
          ...team
        }));

      teamLeaderboard.push(...sorted);

      // Cache
      await cacheLeaderboard(LEADERBOARD_TYPES.TEAM, teamLeaderboard);

      callback(teamLeaderboard);
    });

    return unsubscribe;
  } catch (error) {
    console.error('[Leaderboards] Error getting team leaderboard:', error);
    callback([]);
    return () => {};
  }
}

/**
 * Get daily leaderboard
 * Top earners today (resets at midnight)
 */
export function getDailyLeaderboard(callback, limit_count = 50) {
  try {
    const pointsRef = collection(db, 'points');
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      pointsRef,
      where('timestamp', '>=', today),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const userDailyPoints = {};
      const dailyLeaderboard = [];

      // Aggregate points earned today per user
      snapshot.forEach((doc) => {
        const transaction = doc.data();
        if (!userDailyPoints[transaction.userId]) {
          userDailyPoints[transaction.userId] = 0;
        }
        userDailyPoints[transaction.userId] += transaction.totalAwarded || transaction.amount || 0;
      });

      // Sort by points
      const sortedUsers = Object.entries(userDailyPoints)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit_count);

      // Get user details
      for (let i = 0; i < sortedUsers.length; i++) {
        const [userId, dailyPoints] = sortedUsers[i];
        try {
          const userDoc = await (await import('./firebase-config.js')).getDoc(doc(db, 'users', userId));
          const user = userDoc.data();

          dailyLeaderboard.push({
            rank: i + 1,
            userId,
            name: user.displayName || 'Anonymous',
            pointsToday: dailyPoints,
            totalPoints: user.points || 0,
            level: user.level || 1
          });
        } catch (err) {
          console.warn('Could not fetch user details for:', userId);
        }
      }

      // Cache
      await cacheLeaderboard(LEADERBOARD_TYPES.DAILY, dailyLeaderboard);

      callback(dailyLeaderboard);
    });

    return unsubscribe;
  } catch (error) {
    console.error('[Leaderboards] Error getting daily leaderboard:', error);
    callback([]);
    return () => {};
  }
}

/**
 * Get session-specific leaderboard
 * Most attendees per session
 */
export function getSessionLeaderboard(sessionId, callback, limit_count = 50) {
  try {
    const scansRef = collection(db, 'scans');
    const q = query(
      scansRef,
      where('sessionId', '==', sessionId)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const sessionLeaderboard = [];

      const attendees = snapshot.docs.map(doc => doc.data().userId);
      const uniqueAttendees = [...new Set(attendees)].slice(0, limit_count);

      // Get user details
      for (let i = 0; i < uniqueAttendees.length; i++) {
        const userId = uniqueAttendees[i];
        try {
          const userDoc = await (await import('./firebase-config.js')).getDoc(doc(db, 'users', userId));
          const user = userDoc.data();

          sessionLeaderboard.push({
            rank: i + 1,
            userId,
            name: user.displayName || 'Anonymous',
            points: user.points || 0,
            university: user.university || 'Unknown'
          });
        } catch (err) {
          console.warn('Could not fetch user details for:', userId);
        }
      }

      // Cache
      await cacheLeaderboard(`${LEADERBOARD_TYPES.SESSION}_${sessionId}`, sessionLeaderboard);

      callback(sessionLeaderboard);
    });

    return unsubscribe;
  } catch (error) {
    console.error('[Leaderboards] Error getting session leaderboard:', error);
    callback([]);
    return () => {};
  }
}

/**
 * Get user's rank in overall leaderboard
 */
export async function getUserRank(userId, callback) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('role', '==', 'participant'),
      orderBy('points', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let rank = null;
      let userPosition = null;

      snapshot.forEach((doc, index) => {
        if (doc.id === userId) {
          rank = index + 1;
          userPosition = doc.data();
        }
      });

      callback({
        userId,
        rank,
        points: userPosition?.points || 0,
        level: userPosition?.level || 1
      });
    });

    return unsubscribe;
  } catch (error) {
    console.error('[Leaderboards] Error getting user rank:', error);
    callback({ userId, rank: null, points: 0 });
    return () => {};
  }
}

/**
 * Cache leaderboard to Firestore for faster retrieval
 */
async function cacheLeaderboard(leaderboardType, entries) {
  try {
    const leaderboardsRef = collection(db, 'leaderboards');
    const leaderboardDocId = leaderboardType.replace(/\//g, '_');

    await setDoc(doc(leaderboardsRef, leaderboardDocId), {
      type: leaderboardType.split('_')[0],
      typeId: leaderboardType.split('_')[1] || null,
      entries,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.warn('[Leaderboards] Error caching leaderboard:', error);
  }
}

/**
 * Get cached leaderboard (faster, not real-time)
 */
export async function getCachedLeaderboard(leaderboardType) {
  try {
    const leaderboardsRef = collection(db, 'leaderboards');
    const leaderboardDocId = leaderboardType.replace(/\//g, '_');

    const { getDoc } = await import('./firebase-config.js');
    const snapshot = await getDoc(doc(leaderboardsRef, leaderboardDocId));

    if (snapshot.exists()) {
      return snapshot.data().entries || [];
    }
    return [];
  } catch (error) {
    console.error('[Leaderboards] Error getting cached leaderboard:', error);
    return [];
  }
}

/**
 * Initialize all leaderboards (typically called on app startup)
 */
export function initializeAllLeaderboards(callbacks = {}) {
  const unsubscribes = [];

  console.log('[Leaderboards] Initializing all leaderboard listeners');

  // Overall leaderboard
  if (callbacks.onOverallUpdate) {
    unsubscribes.push(getOverallLeaderboard(callbacks.onOverallUpdate));
  }

  // Team leaderboard
  if (callbacks.onTeamUpdate) {
    unsubscribes.push(getTeamLeaderboard(callbacks.onTeamUpdate));
  }

  // Daily leaderboard
  if (callbacks.onDailyUpdate) {
    unsubscribes.push(getDailyLeaderboard(callbacks.onDailyUpdate));
  }

  // Return function to unsubscribe from all
  return () => {
    unsubscribes.forEach(unsub => unsub());
    console.log('[Leaderboards] Unsubscribed from all listeners');
  };
}

/**
 * Format leaderboard entry for display
 */
export function formatLeaderboardEntry(entry, type = LEADERBOARD_TYPES.OVERALL) {
  const formatted = {
    rank: entry.rank,
    displayName: entry.name || 'Anonymous',
    points: entry.points || entry.pointsToday || entry.totalPoints || 0
  };

  if (entry.university) {
    formatted.subtitle = entry.university;
  } else if (entry.level) {
    formatted.subtitle = `Level ${entry.level}`;
  }

  if (entry.visits) {
    formatted.stat = `${entry.visits} visits`;
  } else if (entry.averagePoints) {
    formatted.stat = `${entry.averagePoints} avg`;
  }

  return formatted;
}

export default {
  LEADERBOARD_TYPES,
  getOverallLeaderboard,
  getBoothLeaderboard,
  getTeamLeaderboard,
  getDailyLeaderboard,
  getSessionLeaderboard,
  getUserRank,
  getCachedLeaderboard,
  initializeAllLeaderboards,
  formatLeaderboardEntry
};
