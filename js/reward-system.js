// js/reward-system.js - Reward Redemption System for Freedom 250

import { db, collection, doc, updateDoc, arrayUnion, query, getDocs, where, increment } from './firebase-config.js';

/**
 * REWARD TYPES
 */
export const REWARD_TYPES = {
  MERCHANDISE: 'merchandise',
  COUPON: 'coupon',
  VIP_ACCESS: 'vip',
  GIFT_HAMPER: 'giftHamper',
  SPONSOR_REWARD: 'sponsorReward',
  CERTIFICATE: 'certificate'
};

/**
 * Sample rewards (to be populated from Firestore in production)
 */
export const SAMPLE_REWARDS = [
  {
    id: '1',
    name: 'Freedom 250 T-Shirt',
    type: REWARD_TYPES.MERCHANDISE,
    description: 'Exclusive event merchandise',
    pointCost: 100,
    stock: 500,
    imageUrl: 'https://via.placeholder.com/200x200?text=T-Shirt'
  },
  {
    id: '2',
    name: '$5 Starbucks Coupon',
    type: REWARD_TYPES.COUPON,
    description: 'Valid at any Starbucks in Kenya',
    pointCost: 50,
    stock: 200,
    imageUrl: 'https://via.placeholder.com/200x200?text=Coupon'
  },
  {
    id: '3',
    name: 'VIP Event Pass',
    type: REWARD_TYPES.VIP_ACCESS,
    description: 'VIP access to Freedom 250 closing ceremony',
    pointCost: 500,
    stock: 50,
    imageUrl: 'https://via.placeholder.com/200x200?text=VIP+Pass'
  },
  {
    id: '4',
    name: 'American Snack Hamper',
    type: REWARD_TYPES.GIFT_HAMPER,
    description: 'Assorted American snacks and treats',
    pointCost: 300,
    stock: 100,
    imageUrl: 'https://via.placeholder.com/200x200?text=Hamper'
  },
  {
    id: '5',
    name: 'Participation Certificate',
    type: REWARD_TYPES.CERTIFICATE,
    description: 'Digital certificate of participation',
    pointCost: 10,
    stock: 9999,
    imageUrl: 'https://via.placeholder.com/200x200?text=Certificate'
  },
  {
    id: '6',
    name: 'Sponsor Gift Bundle',
    type: REWARD_TYPES.SPONSOR_REWARD,
    description: 'Special gift from Freedom 250 sponsors',
    pointCost: 200,
    stock: 150,
    imageUrl: 'https://via.placeholder.com/200x200?text=Bundle'
  }
];

/**
 * Get all available rewards
 */
export async function getAllRewards() {
  try {
    const rewardsRef = collection(db, 'rewards');
    const snapshot = await getDocs(rewardsRef);

    const rewards = [];
    snapshot.forEach((doc) => {
      const reward = doc.data();
      const claimed = (reward.claimed || []).length;
      const available = Math.max(0, (reward.stock || 0) - claimed);

      rewards.push({
        id: doc.id,
        ...reward,
        available
      });
    });

    return rewards.length > 0 ? rewards : SAMPLE_REWARDS;
  } catch (error) {
    console.error('[Rewards] Error fetching rewards:', error);
    return SAMPLE_REWARDS;
  }
}

/**
 * Get reward details
 */
export async function getRewardDetails(rewardId) {
  try {
    const { getDoc } = await import('./firebase-config.js');
    const rewardDoc = await getDoc(doc(db, 'rewards', rewardId));

    if (rewardDoc.exists()) {
      const reward = rewardDoc.data();
      const claimed = (reward.claimed || []).length;
      const available = Math.max(0, (reward.stock || 0) - claimed);

      return {
        id: rewardDoc.id,
        ...reward,
        available
      };
    }

    // Return sample reward
    return SAMPLE_REWARDS.find(r => r.id === rewardId) || null;
  } catch (error) {
    console.error('[Rewards] Error fetching reward:', error);
    return null;
  }
}

/**
 * Redeem a reward for a participant
 */
export async function redeemReward(userId, rewardId) {
  try {
    // Get reward
    const reward = await getRewardDetails(rewardId);
    if (!reward) {
      return { success: false, error: 'Reward not found' };
    }

    // Check if available
    if (reward.available <= 0) {
      return { success: false, error: 'Reward out of stock' };
    }

    // Get user
    const { getDoc } = await import('./firebase-config.js');
    const userDoc = await getDoc(doc(db, 'users', userId));
    const user = userDoc.data();

    // Check if user has enough points
    if ((user.points || 0) < reward.pointCost) {
      return {
        success: false,
        error: `Insufficient points. You need ${reward.pointCost} but have ${user.points}`
      };
    }

    // Check if user already claimed this reward
    const alreadyClaimed = reward.claimed?.some(c => c.userId === userId);
    if (alreadyClaimed) {
      return {
        success: false,
        error: 'You have already claimed this reward'
      };
    }

    // Deduct points
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points: increment(-reward.pointCost)
    });

    // Record claim
    const claimData = {
      userId,
      userName: user.displayName,
      claimedAt: new Date().toISOString(),
      status: 'pending_verification'
    };

    const rewardRef = doc(db, 'rewards', rewardId);
    await updateDoc(rewardRef, {
      claimed: arrayUnion(claimData)
    });

    // Log action
    const { logEvent } = await import('./firestore-schema.js');
    await logEvent(userId, 'reward_redeemed', {
      rewardId,
      rewardName: reward.name,
      pointsSpent: reward.pointCost
    });

    return {
      success: true,
      message: `You have successfully redeemed "${reward.name}"!`,
      reward,
      pointsRemaining: user.points - reward.pointCost
    };
  } catch (error) {
    console.error('[Rewards] Error redeeming reward:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's claimed rewards
 */
export async function getUserClaimedRewards(userId) {
  try {
    const rewardsRef = collection(db, 'rewards');
    const snapshot = await getDocs(rewardsRef);

    const claimedRewards = [];
    snapshot.forEach((doc) => {
      const reward = doc.data();
      const userClaim = reward.claimed?.find(c => c.userId === userId);

      if (userClaim) {
        claimedRewards.push({
          id: doc.id,
          name: reward.name,
          type: reward.type,
          pointsSpent: reward.pointCost,
          claimedAt: userClaim.claimedAt,
          status: userClaim.status,
          verificationCode: userClaim.verificationCode
        });
      }
    });

    return claimedRewards;
  } catch (error) {
    console.error('[Rewards] Error fetching claimed rewards:', error);
    return [];
  }
}

/**
 * Get rewards by type
 */
export async function getRewardsByType(type) {
  try {
    const allRewards = await getAllRewards();
    return allRewards.filter(r => r.type === type);
  } catch (error) {
    console.error('[Rewards] Error filtering rewards:', error);
    return [];
  }
}

/**
 * Create new reward (admin only)
 */
export async function createReward(rewardData, adminId) {
  try {
    if (!adminId) {
      return { success: false, error: 'Admin authorization required' };
    }

    const rewardsRef = collection(db, 'rewards');
    const newRewardRef = doc(rewardsRef);

    await (await import('./firebase-config.js')).setDoc(newRewardRef, {
      rewardId: newRewardRef.id,
      ...rewardData,
      claimed: [],
      createdAt: new Date().toISOString()
    });

    // Log action
    const { logEvent } = await import('./firestore-schema.js');
    await logEvent(adminId, 'reward_created', {
      rewardId: newRewardRef.id,
      rewardName: rewardData.name
    });

    return { success: true, id: newRewardRef.id, message: 'Reward created' };
  } catch (error) {
    console.error('[Rewards] Error creating reward:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify reward claim (admin only)
 */
export async function verifyRewardClaim(rewardId, userId, adminId) {
  try {
    if (!adminId) {
      return { success: false, error: 'Admin authorization required' };
    }

    const rewardRef = doc(db, 'rewards', rewardId);
    const { getDoc } = await import('./firebase-config.js');
    const rewardDoc = await getDoc(rewardRef);

    if (!rewardDoc.exists()) {
      return { success: false, error: 'Reward not found' };
    }

    const reward = rewardDoc.data();
    const claimIndex = reward.claimed.findIndex(c => c.userId === userId);

    if (claimIndex === -1) {
      return { success: false, error: 'Claim not found' };
    }

    // Generate verification code
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Update claim status
    const updatedClaimed = [...reward.claimed];
    updatedClaimed[claimIndex] = {
      ...updatedClaimed[claimIndex],
      status: 'verified',
      verificationCode,
      verifiedBy: adminId,
      verifiedAt: new Date().toISOString()
    };

    await (await import('./firebase-config.js')).updateDoc(rewardRef, {
      claimed: updatedClaimed
    });

    // Log action
    const { logEvent } = await import('./firestore-schema.js');
    await logEvent(adminId, 'reward_verified', {
      rewardId,
      userId,
      verificationCode
    });

    return {
      success: true,
      message: 'Reward verified',
      verificationCode
    };
  } catch (error) {
    console.error('[Rewards] Error verifying claim:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate reward store stats (admin only)
 */
export async function getRewardStoreStats() {
  try {
    const allRewards = await getAllRewards();

    let totalValue = 0;
    let totalClaimed = 0;
    let totalAvailable = 0;
    const typeBreakdown = {};

    allRewards.forEach(r => {
      const claimed = (r.claimed || []).length;
      const available = r.available || 0;

      totalValue += r.pointCost * claimed;
      totalClaimed += claimed;
      totalAvailable += available;

      const type = r.type || 'unknown';
      if (!typeBreakdown[type]) {
        typeBreakdown[type] = { total: 0, claimed: 0 };
      }
      typeBreakdown[type].total += (r.stock || 0);
      typeBreakdown[type].claimed += claimed;
    });

    return {
      totalRewards: allRewards.length,
      totalPointsSpent: totalValue,
      totalRewardsClaimed: totalClaimed,
      totalRewardsAvailable: totalAvailable,
      typeBreakdown
    };
  } catch (error) {
    console.error('[Rewards] Error calculating stats:', error);
    return {};
  }
}

/**
 * Format reward for display
 */
export function formatRewardForDisplay(reward) {
  return {
    id: reward.id,
    name: reward.name,
    type: reward.type,
    description: reward.description,
    pointCost: reward.pointCost,
    available: reward.available || 0,
    image: reward.imageUrl,
    badge: `${reward.pointCost} pts`
  };
}

export default {
  REWARD_TYPES,
  SAMPLE_REWARDS,
  getAllRewards,
  getRewardDetails,
  redeemReward,
  getUserClaimedRewards,
  getRewardsByType,
  createReward,
  verifyRewardClaim,
  getRewardStoreStats,
  formatRewardForDisplay
};
