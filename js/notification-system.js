// js/notification-system.js - Notification System for Freedom 250

import { db, collection, doc, updateDoc, query, where, getDocs, orderBy, onSnapshot } from './firebase-config.js';
import { sendNotification, broadcastNotification } from './firestore-schema.js';

/**
 * NOTIFICATION TYPES
 */
export const NOTIFICATION_TYPES = {
  PUSH: 'push',
  EMAIL: 'email',
  SMS: 'sms',
  IN_APP: 'inApp'
};

/**
 * NOTIFICATION CATEGORIES
 */
export const NOTIFICATION_CATEGORIES = {
  ACHIEVEMENT: 'achievement',
  POINTS: 'points',
  LEVEL_UP: 'levelUp',
  SESSION: 'session',
  BOOTH: 'booth',
  CHALLENGE: 'challenge',
  LEADERBOARD: 'leaderboard',
  ANNOUNCEMENT: 'announcement',
  REWARD: 'reward',
  SYSTEM: 'system'
};

/**
 * Send notification for achievement unlock
 */
export async function notifyAchievementUnlocked(userId, badgeName, badgeIcon) {
  try {
    const title = '🏆 Achievement Unlocked!';
    const message = `You've earned the "${badgeName}" badge!`;
    const data = { badgeName, badgeIcon, category: NOTIFICATION_CATEGORIES.ACHIEVEMENT };

    await sendNotification(userId, NOTIFICATION_TYPES.IN_APP, title, message, data);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending achievement notification:', error);
    return false;
  }
}

/**
 * Send notification for point award
 */
export async function notifyPointsAwarded(userId, points, reason) {
  try {
    const title = `💰 +${points} Liberty Coins!`;
    const message = `You earned points for ${reason}`;
    const data = { points, reason, category: NOTIFICATION_CATEGORIES.POINTS };

    await sendNotification(userId, NOTIFICATION_TYPES.IN_APP, title, message, data);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending points notification:', error);
    return false;
  }
}

/**
 * Send notification for level up
 */
export async function notifyLevelUp(userId, newLevel, rankTitle) {
  try {
    const title = `⭐ Level ${newLevel}!`;
    const message = `Congratulations! You've reached ${rankTitle}!`;
    const data = { level: newLevel, rank: rankTitle, category: NOTIFICATION_CATEGORIES.LEVEL_UP };

    await sendNotification(userId, NOTIFICATION_TYPES.IN_APP, title, message, data);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending level up notification:', error);
    return false;
  }
}

/**
 * Send session reminder
 */
export async function notifySessionReminder(userId, sessionName, startTime) {
  try {
    const startDate = new Date(startTime);
    const timeString = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const title = '📅 Session Starting Soon';
    const message = `${sessionName} starts at ${timeString}`;
    const data = { sessionName, startTime, category: NOTIFICATION_CATEGORIES.SESSION };

    await sendNotification(userId, NOTIFICATION_TYPES.IN_APP, title, message, data);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending session reminder:', error);
    return false;
  }
}

/**
 * Send booth notification
 */
export async function notifyBoothUpdate(userId, boothName, message) {
  try {
    const title = `📍 ${boothName}`;
    const data = { boothName, category: NOTIFICATION_CATEGORIES.BOOTH };

    await sendNotification(userId, NOTIFICATION_TYPES.IN_APP, title, message, data);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending booth notification:', error);
    return false;
  }
}

/**
 * Send challenge notification
 */
export async function notifyChallengeUpdate(userId, challengeName, status) {
  try {
    const title = status === 'completed' 
      ? `🎉 Challenge Complete!` 
      : `⚡ New Challenge Available`;
    const message = status === 'completed' 
      ? `You've completed "${challengeName}"`
      : `Try the new challenge: ${challengeName}`;
    const data = { challengeName, status, category: NOTIFICATION_CATEGORIES.CHALLENGE };

    await sendNotification(userId, NOTIFICATION_TYPES.IN_APP, title, message, data);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending challenge notification:', error);
    return false;
  }
}

/**
 * Send leaderboard notification
 */
export async function notifyLeaderboardChange(userId, newRank, totalParticipants) {
  try {
    const title = `📊 Leaderboard Update`;
    const message = `You're ranked #${newRank} out of ${totalParticipants} participants!`;
    const data = { rank: newRank, total: totalParticipants, category: NOTIFICATION_CATEGORIES.LEADERBOARD };

    await sendNotification(userId, NOTIFICATION_TYPES.IN_APP, title, message, data);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending leaderboard notification:', error);
    return false;
  }
}

/**
 * Send broadcast announcement
 */
export async function broadcastAnnouncement(title, message, data = {}) {
  try {
    const fullData = { ...data, category: NOTIFICATION_CATEGORIES.ANNOUNCEMENT };
    await broadcastNotification(title, message, fullData);
    return true;
  } catch (error) {
    console.error('[Notifications] Error broadcasting announcement:', error);
    return false;
  }
}

/**
 * Send power hour notification
 */
export async function notifyPowerHour(userId) {
  try {
    const title = '⏰ Power Hour Active!';
    const message = '2x points for all activities! Earn double!';
    const data = { category: NOTIFICATION_CATEGORIES.SYSTEM, type: 'power_hour' };

    await sendNotification(userId, NOTIFICATION_TYPES.IN_APP, title, message, data);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending power hour notification:', error);
    return false;
  }
}

/**
 * Send reward notification
 */
export async function notifyRewardRedeemed(userId, rewardName, pointsSpent) {
  try {
    const title = '🎁 Reward Redeemed';
    const message = `You've claimed "${rewardName}" for ${pointsSpent} Liberty Coins`;
    const data = { rewardName, pointsSpent, category: NOTIFICATION_CATEGORIES.REWARD };

    await sendNotification(userId, NOTIFICATION_TYPES.IN_APP, title, message, data);
    return true;
  } catch (error) {
    console.error('[Notifications] Error sending reward notification:', error);
    return false;
  }
}

/**
 * Get user's notifications (real-time)
 */
export function getUserNotifications(userId, callback) {
  try {
    const notifRef = collection(db, 'notifications');
    const q = query(
      notifRef,
      where('userId', 'in', [userId, null]), // User's notifications + broadcasts
      orderBy('sentAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = [];
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(notifications);
    });

    return unsubscribe;
  } catch (error) {
    console.error('[Notifications] Error fetching notifications:', error);
    callback([]);
    return () => {};
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const { serverTimestamp } = await import('./firebase-config.js');
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, {
      read: true,
      readAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('[Notifications] Error marking as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(userId) {
  try {
    const notifRef = collection(db, 'notifications');
    const q = query(
      notifRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const { serverTimestamp } = await import('./firebase-config.js');

    snapshot.forEach(async (doc) => {
      await updateDoc(doc.ref, {
        read: true,
        readAt: serverTimestamp()
      });
    });

    return true;
  } catch (error) {
    console.error('[Notifications] Error marking all as read:', error);
    return false;
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId) {
  try {
    const notifRef = collection(db, 'notifications');
    const q = query(
      notifRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('[Notifications] Error getting unread count:', error);
    return 0;
  }
}

/**
 * Schedule notification (for future events)
 */
export async function scheduleNotification(userId, title, message, scheduledFor, data = {}) {
  try {
    const notifRef = collection(db, 'notifications');
    await (await import('./firebase-config.js')).addDoc(notifRef, {
      userId,
      type: NOTIFICATION_TYPES.IN_APP,
      title,
      message,
      data: { ...data, scheduled: true },
      sentAt: scheduledFor,
      scheduledAt: new Date().toISOString(),
      read: false
    });
    return true;
  } catch (error) {
    console.error('[Notifications] Error scheduling notification:', error);
    return false;
  }
}

/**
 * Send bulk notification to multiple users
 */
export async function sendBulkNotification(userIds, title, message, data = {}) {
  try {
    for (const userId of userIds) {
      await sendNotification(userId, NOTIFICATION_TYPES.IN_APP, title, message, data);
    }
    return { success: true, count: userIds.length };
  } catch (error) {
    console.error('[Notifications] Error sending bulk notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get notification preferences for user
 */
export async function getNotificationPreferences(userId) {
  try {
    const { getDoc } = await import('./firebase-config.js');
    const userDoc = await getDoc(doc(db, 'users', userId));
    const user = userDoc.data();

    return user.notificationPreferences || {
      pushEnabled: true,
      emailEnabled: true,
      inAppEnabled: true,
      achievements: true,
      points: true,
      leaderboard: true,
      announcements: true
    };
  } catch (error) {
    console.error('[Notifications] Error fetching preferences:', error);
    return {};
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(userId, preferences) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      notificationPreferences: preferences
    });
    return true;
  } catch (error) {
    console.error('[Notifications] Error updating preferences:', error);
    return false;
  }
}

export default {
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES,
  notifyAchievementUnlocked,
  notifyPointsAwarded,
  notifyLevelUp,
  notifySessionReminder,
  notifyBoothUpdate,
  notifyChallengeUpdate,
  notifyLeaderboardChange,
  broadcastAnnouncement,
  notifyPowerHour,
  notifyRewardRedeemed,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  scheduleNotification,
  sendBulkNotification,
  getNotificationPreferences,
  updateNotificationPreferences
};
