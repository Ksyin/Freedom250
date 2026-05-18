// js/realtime-push.js
import { db, collection, addDoc, doc, getDoc, getDocs, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc, arrayUnion, increment } from './firebase-config.js';

// ==================== NOTIFICATIONS ====================
export async function sendPushNotification(userId, title, message, type = 'info', data = {}) {
  try {
    const notification = {
      userId,
      title,
      message,
      type,
      data,
      read: false,
      createdAt: serverTimestamp(),
      delivered: true
    };

    const docRef = await addDoc(collection(db, 'notifications'), notification);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Send notification error:', error);
    return { success: false, error: error.message };
  }
}

export async function broadcastNotification(title, message, type = 'announcement', data = {}) {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const notifications = [];

    for (const userDoc of usersSnapshot.docs) {
      notifications.push({
        userId: userDoc.id,
        title,
        message,
        type,
        data,
        read: false,
        createdAt: serverTimestamp(),
        delivered: true
      });
    }

    // Batch write notifications
    for (const notif of notifications) {
      await addDoc(collection(db, 'notifications'), notif);
    }

    // Also store as global announcement
    await addDoc(collection(db, 'announcements'), {
      title,
      message,
      type,
      data,
      createdAt: serverTimestamp(),
      createdBy: data.createdBy || 'system'
    });

    return { success: true, count: notifications.length };
  } catch (error) {
    console.error('Broadcast error:', error);
    return { success: false, error: error.message };
  }
}

export function subscribeToNotifications(userId, callback) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({ id: doc.id, ...doc.data() });
    });
    callback(notifications);
  });
}

export async function markNotificationRead(notificationId) {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      readAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function getUnreadCount(userId) {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    return 0;
  }
}

// ==================== POLLS ====================
export async function createPoll(title, question, options, createdBy, expiresAt = null) {
  try {
    const poll = {
      title,
      question,
      options: options.map(opt => ({ text: opt, votes: 0 })),
      totalVotes: 0,
      createdBy,
      createdAt: serverTimestamp(),
      expiresAt: expiresAt || null,
      active: true
    };

    const docRef = await addDoc(collection(db, 'polls'), poll);
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function castVote(pollId, userId, optionIndex) {
  try {
    const pollRef = doc(db, 'polls', pollId);
    const poll = await getDoc(pollRef);

    if (!poll.exists()) return { success: false, error: 'Poll not found' };

    const pollData = poll.data();
    const userVotesRef = collection(db, 'pollVotes');

    // Check if user already voted
    const existingQuery = query(userVotesRef, where('pollId', '==', pollId), where('userId', '==', userId));
    const existing = await getDocs(existingQuery);

    if (!existing.empty) {
      return { success: false, error: 'You have already voted in this poll' };
    }

    // Record vote
    await addDoc(userVotesRef, {
      pollId,
      userId,
      optionIndex,
      votedAt: serverTimestamp()
    });

    // Update poll counts
    const newOptions = [...pollData.options];
    newOptions[optionIndex].votes += 1;

    await updateDoc(pollRef, {
      options: newOptions,
      totalVotes: increment(1)
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function subscribeToPolls(callback) {
  const q = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const polls = [];
    snapshot.forEach(doc => {
      polls.push({ id: doc.id, ...doc.data() });
    });
    callback(polls);
  });
}

export async function getUserVote(pollId, userId) {
  try {
    const q = query(
      collection(db, 'pollVotes'),
      where('pollId', '==', pollId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data().optionIndex;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// ==================== QUIZZES ====================
export async function createQuiz(title, description, questions, pointsPerQuestion, createdBy) {
  try {
    const quiz = {
      title,
      description,
      questions,
      pointsPerQuestion,
      totalPoints: questions.length * pointsPerQuestion,
      createdBy,
      createdAt: serverTimestamp(),
      active: true,
      totalAttempts: 0
    };

    const docRef = await addDoc(collection(db, 'quizzes'), quiz);
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function submitQuizAnswer(userId, quizId, questionIndex, answer, isCorrect) {
  try {
    const answerRef = collection(db, 'quizAnswers');
    const existingQuery = query(
      answerRef,
      where('userId', '==', userId),
      where('quizId', '==', quizId),
      where('questionIndex', '==', questionIndex)
    );
    const existing = await getDocs(existingQuery);

    if (!existing.empty) {
      return { success: false, error: 'Question already answered' };
    }

    await addDoc(answerRef, {
      userId,
      quizId,
      questionIndex,
      answer,
      isCorrect,
      submittedAt: serverTimestamp()
    });

    // Update user points if correct
    if (isCorrect) {
      const quiz = await getDoc(doc(db, 'quizzes', quizId));
      const points = quiz.data()?.pointsPerQuestion || 10;
      await updateDoc(doc(db, 'users', userId), {
        points: increment(points)
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getQuizProgress(userId, quizId) {
  try {
    const q = query(
      collection(db, 'quizAnswers'),
      where('userId', '==', userId),
      where('quizId', '==', quizId)
    );
    const snapshot = await getDocs(q);
    const answers = {};
    snapshot.forEach(doc => {
      const data = doc.data();
      answers[data.questionIndex] = data.isCorrect;
    });
    return answers;
  } catch (error) {
    return {};
  }
}

export function subscribeToQuizzes(callback) {
  const q = query(collection(db, 'quizzes'), where('active', '==', true), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const quizzes = [];
    snapshot.forEach(doc => {
      quizzes.push({ id: doc.id, ...doc.data() });
    });
    callback(quizzes);
  });
}

// ==================== REAL-TIME LEADERBOARD ====================
export function subscribeToLeaderboard(callback, limitCount = 50) {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'participant'),
    orderBy('points', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const leaderboard = [];
    let rank = 1;
    snapshot.forEach(doc => {
      const user = doc.data();
      leaderboard.push({
        rank: rank++,
        userId: doc.id,
        name: user.displayName || user.email?.split('@')[0] || 'Explorer',
        points: user.points || 0,
        level: user.level || 1,
        university: user.university || 'Unknown',
        profilePhoto: user.profilePhoto
      });
    });
    callback(leaderboard);
  });
}

// ==================== REWARD SYSTEM ====================
export async function getAllRewards() {
  try {
    const snapshot = await getDocs(collection(db, 'rewards'));
    const rewards = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      rewards.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        cost: data.cost,
        stock: data.stock,
        imageUrl: data.imageUrl,
        available: data.stock - (data.claimed?.length || 0)
      });
    });
    return rewards;
  } catch (error) {
    return [];
  }
}

export async function redeemReward(userId, rewardId) {
  try {
    const rewardRef = doc(db, 'rewards', rewardId);
    const reward = await getDoc(rewardRef);

    if (!reward.exists()) return { success: false, error: 'Reward not found' };

    const rewardData = reward.data();
    const userRef = doc(db, 'users', userId);
    const user = await getDoc(userRef);

    if (!user.exists()) return { success: false, error: 'User not found' };

    const userData = user.data();
    const claimedCount = rewardData.claimed?.length || 0;

    if (claimedCount >= rewardData.stock) {
      return { success: false, error: 'Reward out of stock' };
    }

    if ((userData.points || 0) < rewardData.cost) {
      return { success: false, error: `Insufficient points. Need ${rewardData.cost} points` };
    }

    // Process redemption
    await updateDoc(userRef, {
      points: increment(-rewardData.cost)
    });

    await updateDoc(rewardRef, {
      claimed: arrayUnion({
        userId,
        userName: userData.displayName || userData.email,
        claimedAt: new Date().toISOString(),
        status: 'pending'
      })
    });

    // Add to user's claimed rewards
    await addDoc(collection(db, 'userRewards'), {
      userId,
      rewardId,
      rewardName: rewardData.name,
      cost: rewardData.cost,
      claimedAt: serverTimestamp(),
      status: 'pending'
    });

    // Send notification
    await sendPushNotification(userId, '🎁 Reward Redeemed!', `You redeemed ${rewardData.name} for ${rewardData.cost} points`, 'success');

    return { success: true, message: `Redeemed ${rewardData.name} successfully!` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createReward(rewardData) {
  try {
    const docRef = await addDoc(collection(db, 'rewards'), {
      ...rewardData,
      claimed: [],
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== USER MANAGEMENT ====================
export async function getAllUsers() {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const users = [];
    snapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    return users;
  } catch (error) {
    return [];
  }
}

export async function updateUserRole(userId, newRole) {
  try {
    await updateDoc(doc(db, 'users', userId), { role: newRole });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function awardPointsToUser(userId, points, reason, awardedBy) {
  try {
    await updateDoc(doc(db, 'users', userId), {
      points: increment(points)
    });

    await addDoc(collection(db, 'pointTransactions'), {
      userId,
      points,
      reason,
      awardedBy,
      awardedAt: serverTimestamp()
    });

    await sendPushNotification(userId, '💰 Points Awarded!', `${reason}: +${points} Liberty Coins`, 'success');

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}