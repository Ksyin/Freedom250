// js/firestore-schema.js - Firestore Database Schema and Initialization

/**
 * Freedom 250 Firestore Database Schema
 * 
 * This file documents the complete database structure and provides utilities
 * for initializing collections and security rules.
 */

import { db, collection, doc, setDoc, serverTimestamp } from './firebase-config.js';

/**
 * FIRESTORE SCHEMA STRUCTURE
 */
export const SCHEMA = {
  // Users collection
  users: {
    description: 'Participant, volunteer, and admin user profiles',
    doc: 'uid',
    fields: {
      uid: 'string',
      email: 'string',
      displayName: 'string',
      profilePhoto: 'string (URL)',
      role: 'string (participant|volunteer|booth_admin|admin|organizer)',
      teamId: 'string (optional)',
      freedomId: 'string (FREEDOM-YYYY-XXXXX)',
      qrCode: 'string (data URL)',
      points: 'number',
      level: 'number',
      xp: 'number',
      currentRank: 'string (Pioneer|Explorer|Champion|etc)',
      freedomRank: 'string (level-based title)',
      entryTimestamp: 'timestamp',
      createdAt: 'timestamp',
      badges: 'array<{name, icon, unlockedAt}>',
      stamps: 'array<string> (zone IDs)',
      activityHistory: 'array<{label, time, details}>',
      lastActivityAt: 'timestamp'
    }
  },

  // Roles collection
  roles: {
    description: 'Role definitions and permissions',
    doc: 'roleId',
    fields: {
      roleId: 'string',
      name: 'string',
      permissions: 'array<string>'
    }
  },

  // Booths collection
  booths: {
    description: 'Event booths/stands',
    doc: 'boothId',
    fields: {
      boothId: 'string',
      name: 'string',
      zone: 'string',
      description: 'string',
      pointsAwarded: 'number',
      sponsorId: 'string',
      scanCount: 'number',
      qrCode: 'string (data URL)',
      imageUrl: 'string',
      location: 'object {lat, lng}',
      createdAt: 'timestamp'
    }
  },

  // Activities collection
  activities: {
    description: 'Event activities, sessions, games',
    doc: 'activityId',
    fields: {
      activityId: 'string',
      name: 'string',
      type: 'string (session|game|workshop)',
      pointsAwarded: 'number',
      zone: 'string',
      startTime: 'timestamp',
      endTime: 'timestamp',
      description: 'string',
      speakerId: 'string (optional)',
      capacity: 'number',
      attendees: 'array<string> (user UIDs)',
      createdAt: 'timestamp'
    }
  },

  // Challenges collection
  challenges: {
    description: 'Gamified challenges and missions',
    doc: 'challengeId',
    fields: {
      challengeId: 'string',
      name: 'string',
      description: 'string',
      pointsAwarded: 'number',
      type: 'string (mission|scavenger|networking)',
      isHidden: 'boolean',
      deadline: 'timestamp',
      difficulty: 'string (easy|medium|hard)',
      requirements: 'object',
      createdAt: 'timestamp'
    }
  },

  // Points transactions
  points: {
    description: 'Point transaction log',
    doc: 'transactionId',
    fields: {
      transactionId: 'string',
      userId: 'string',
      source: 'string (booth|session|challenge|reward)',
      sourceId: 'string',
      amount: 'number',
      multiplier: 'number (1.0 default)',
      streakBonus: 'number (0 default)',
      totalAwarded: 'number',
      adminAwarded: 'boolean',
      adminId: 'string (if adminAwarded)',
      timestamp: 'timestamp'
    }
  },

  // Rewards collection
  rewards: {
    description: 'Reward items available for redemption',
    doc: 'rewardId',
    fields: {
      rewardId: 'string',
      name: 'string',
      description: 'string',
      type: 'string (merchandise|coupon|vip|giftHamper|sponsorReward|certificate)',
      pointCost: 'number',
      stock: 'number',
      imageUrl: 'string',
      claimed: 'array<{userId, claimedAt}>',
      createdAt: 'timestamp'
    }
  },

  // Sessions collection
  sessions: {
    description: 'Conference/keynote sessions',
    doc: 'sessionId',
    fields: {
      sessionId: 'string',
      title: 'string',
      speakerId: 'string',
      speakerName: 'string',
      zone: 'string',
      startTime: 'timestamp',
      endTime: 'timestamp',
      pointsAwarded: 'number',
      description: 'string',
      capacity: 'number',
      attendees: 'array<string>',
      createdAt: 'timestamp'
    }
  },

  // Scans collection (check-ins and actions)
  scans: {
    description: 'QR code scans and check-in events',
    doc: 'scanId',
    fields: {
      scanId: 'string',
      userId: 'string',
      boothId: 'string (optional)',
      sessionId: 'string (optional)',
      challengeId: 'string (optional)',
      scanType: 'string (booth|checkin|checkpoint)',
      pointsAwarded: 'number',
      timestamp: 'timestamp'
    }
  },

  // Locations collection
  locations: {
    description: 'Event venues and zones',
    doc: 'locationId',
    fields: {
      locationId: 'string',
      name: 'string',
      zone: 'string',
      description: 'string',
      coordinates: 'object {lat, lng}',
      mapUrl: 'string',
      imageUrl: 'string',
      createdAt: 'timestamp'
    }
  },

  // Leaderboards (denormalized for real-time updates)
  leaderboards: {
    description: 'Cached leaderboard data (updated in real-time)',
    doc: 'leaderboardId',
    fields: {
      leaderboardId: 'string',
      type: 'string (overall|booth|team|daily|session)',
      typeId: 'string (optional - boothId, teamId, etc)',
      entries: 'array<{rank, userId, userName, points, university}>',
      lastUpdated: 'timestamp'
    }
  },

  // Notifications
  notifications: {
    description: 'User notifications and announcements',
    doc: 'notifId',
    fields: {
      notifId: 'string',
      userId: 'string (null for broadcast)',
      type: 'string (push|sms|email|inApp)',
      title: 'string',
      message: 'string',
      data: 'object (optional)',
      sentAt: 'timestamp',
      read: 'boolean',
      readAt: 'timestamp (optional)'
    }
  },

  // Event logs
  eventLogs: {
    description: 'Audit logs for admin actions',
    doc: 'logId',
    fields: {
      logId: 'string',
      userId: 'string',
      action: 'string',
      metadata: 'object',
      timestamp: 'timestamp'
    }
  }
};

/**
 * Initialize Firestore collections
 * Should be called once during app setup
 */
export async function initializeFirestore() {
  try {
    console.log('[Firestore] Initializing collections...');
    
    // Check if collections exist (won't error if they do)
    // Firestore creates collections automatically when first document is added
    
    // Initialize event log for app startup
    await logEvent('system', 'app_startup', { timestamp: new Date().toISOString() });
    
    console.log('[Firestore] Collections initialized');
    return true;
  } catch (error) {
    console.error('[Firestore] Initialization error:', error);
    return false;
  }
}

/**
 * Add an event to the eventLogs collection
 */
export async function logEvent(userId, action, metadata = {}) {
  try {
    const eventLogsRef = collection(db, 'eventLogs');
    await setDoc(doc(eventLogsRef), {
      userId,
      action,
      metadata,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('[Firestore] Error logging event:', error);
  }
}

/**
 * Award points to a user
 */
export async function awardPoints(userId, source, amount, sourceId = null, adminId = null) {
  try {
    const pointsRef = collection(db, 'points');
    await setDoc(doc(pointsRef), {
      userId,
      source,
      sourceId,
      amount,
      multiplier: 1.0,
      streakBonus: 0,
      totalAwarded: amount,
      adminAwarded: adminId ? true : false,
      adminId: adminId || null,
      timestamp: serverTimestamp()
    });
    
    // Update user's total points
    const userRef = doc(db, 'users', userId);
    const { updateDoc, increment } = await import('./firebase-config.js');
    await updateDoc(userRef, {
      points: increment(amount)
    });
    
    await logEvent(adminId || userId, 'points_awarded', { 
      recipientId: userId, 
      amount, 
      source 
    });
    
    return true;
  } catch (error) {
    console.error('[Firestore] Error awarding points:', error);
    return false;
  }
}

/**
 * Record a booth scan
 */
export async function recordBoothScan(userId, boothId, pointsAwarded = 5) {
  try {
    const scansRef = collection(db, 'scans');
    await setDoc(doc(scansRef), {
      userId,
      boothId,
      scanType: 'booth',
      pointsAwarded,
      timestamp: serverTimestamp()
    });
    
    // Award points to user
    await awardPoints(userId, 'booth', pointsAwarded, boothId);
    
    await logEvent(userId, 'booth_scanned', { boothId, pointsAwarded });
    
    return true;
  } catch (error) {
    console.error('[Firestore] Error recording scan:', error);
    return false;
  }
}

/**
 * Record session attendance
 */
export async function recordSessionAttendance(userId, sessionId, pointsAwarded = 20) {
  try {
    const scansRef = collection(db, 'scans');
    await setDoc(doc(scansRef), {
      userId,
      sessionId,
      scanType: 'checkpoint',
      pointsAwarded,
      timestamp: serverTimestamp()
    });
    
    // Award points
    await awardPoints(userId, 'session', pointsAwarded, sessionId);
    
    await logEvent(userId, 'session_attended', { sessionId, pointsAwarded });
    
    return true;
  } catch (error) {
    console.error('[Firestore] Error recording attendance:', error);
    return false;
  }
}

/**
 * Create a new booth (admin only)
 */
export async function createBooth(boothData) {
  try {
    const boothsRef = collection(db, 'booths');
    const newBoothRef = doc(boothsRef);
    
    await setDoc(newBoothRef, {
      boothId: newBoothRef.id,
      ...boothData,
      scanCount: 0,
      createdAt: serverTimestamp()
    });
    
    await logEvent('admin', 'booth_created', { boothId: newBoothRef.id });
    
    return newBoothRef.id;
  } catch (error) {
    console.error('[Firestore] Error creating booth:', error);
    return null;
  }
}

/**
 * Send a notification to a user
 */
export async function sendNotification(userId, notificationType, title, message, data = {}) {
  try {
    const notifRef = collection(db, 'notifications');
    await setDoc(doc(notifRef), {
      userId,
      type: notificationType,
      title,
      message,
      data,
      sentAt: serverTimestamp(),
      read: false
    });
    
    return true;
  } catch (error) {
    console.error('[Firestore] Error sending notification:', error);
    return false;
  }
}

/**
 * Broadcast notification to all users
 */
export async function broadcastNotification(title, message, data = {}) {
  try {
    const notifRef = collection(db, 'notifications');
    await setDoc(doc(notifRef), {
      userId: null, // null indicates broadcast
      type: 'inApp',
      title,
      message,
      data,
      sentAt: serverTimestamp(),
      read: false
    });
    
    await logEvent('admin', 'broadcast_sent', { title });
    
    return true;
  } catch (error) {
    console.error('[Firestore] Error broadcasting notification:', error);
    return false;
  }
}

export default SCHEMA;
