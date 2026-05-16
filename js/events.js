// js/events.js - Event Management Module
import { db, collection, getDocs, getDoc, setDoc, updateDoc, addDoc, query, where, orderBy, limit, doc } from './firebase-config.js';
import { storage, formatDate } from './utils.js';

// Event status constants
export const EVENT_STATUS = {
  DRAFT: 'draft',
  UPCOMING: 'upcoming',
  LIVE: 'live',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Get all events
export async function getEvents(filters = {}) {
  try {
    let eventsQuery = collection(db, 'events');
    const constraints = [];
    
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.universityId) {
      constraints.push(where('universityId', '==', filters.universityId));
    }
    if (filters.featured) {
      constraints.push(where('featured', '==', true));
    }
    
    constraints.push(orderBy('startDate', 'asc'));
    
    const q = query(eventsQuery, ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting events:', error);
    return [];
  }
}

// Get single event
export async function getEvent(eventId) {
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);
    
    if (eventDoc.exists()) {
      return { id: eventDoc.id, ...eventDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting event:', error);
    return null;
  }
}

// Create event
export async function createEvent(eventData) {
  try {
    const eventsRef = collection(db, 'events');
    const newEvent = {
      ...eventData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: EVENT_STATUS.DRAFT,
      participants: 0,
      points: 0
    };
    
    const docRef = await addDoc(eventsRef, newEvent);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating event:', error);
    return { success: false, error: error.message };
  }
}

// Update event
export async function updateEvent(eventId, updates) {
  try {
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating event:', error);
    return { success: false, error: error.message };
  }
}

// Register participant for event
export async function registerForEvent(eventId, userId, userData) {
  try {
    // Add to event participants subcollection
    const participantRef = doc(db, 'events', eventId, 'participants', userId);
    await setDoc(participantRef, {
      userId,
      name: userData.displayName,
      email: userData.email,
      registeredAt: new Date().toISOString(),
      checkedIn: false,
      points: 0,
      badges: [],
      teamId: null
    });
    
    // Update event participant count
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);
    const currentCount = eventDoc.data()?.participants || 0;
    await updateDoc(eventRef, { participants: currentCount + 1 });
    
    // Add to user's events
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userEvents = userDoc.data()?.events || [];
    await updateDoc(userRef, { events: [...userEvents, eventId] });
    
    return { success: true };
  } catch (error) {
    console.error('Error registering for event:', error);
    return { success: false, error: error.message };
  }
}

// Get event participants
export async function getEventParticipants(eventId, limitCount = 100) {
  try {
    const participantsRef = collection(db, 'events', eventId, 'participants');
    const q = query(participantsRef, orderBy('points', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting participants:', error);
    return [];
  }
}

// Get event booths
export async function getEventBooths(eventId) {
  try {
    const boothsRef = collection(db, 'events', eventId, 'booths');
    const snapshot = await getDocs(boothsRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting booths:', error);
    return [];
  }
}

// Get event schedule
export async function getEventSchedule(eventId) {
  try {
    const scheduleRef = collection(db, 'events', eventId, 'schedule');
    const q = query(scheduleRef, orderBy('startTime', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting schedule:', error);
    return [];
  }
}

// Check in participant
export async function checkInParticipant(eventId, userId) {
  try {
    const participantRef = doc(db, 'events', eventId, 'participants', userId);
    await updateDoc(participantRef, {
      checkedIn: true,
      checkInTime: new Date().toISOString()
    });
    
    // Award points for check-in
    await awardPoints(eventId, userId, 10, 'Event check-in');
    
    return { success: true };
  } catch (error) {
    console.error('Error checking in participant:', error);
    return { success: false, error: error.message };
  }
}

// Award points to participant
export async function awardPoints(eventId, userId, points, reason) {
  try {
    // Update participant points
    const participantRef = doc(db, 'events', eventId, 'participants', userId);
    const participantDoc = await getDoc(participantRef);
    const currentPoints = participantDoc.data()?.points || 0;
    await updateDoc(participantRef, { points: currentPoints + points });
    
    // Add to points history
    const historyRef = collection(db, 'events', eventId, 'participants', userId, 'pointsHistory');
    await addDoc(historyRef, {
      points,
      reason,
      timestamp: new Date().toISOString()
    });
    
    // Update total event points
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);
    const currentTotal = eventDoc.data()?.points || 0;
    await updateDoc(eventRef, { points: currentTotal + points });
    
    return { success: true };
  } catch (error) {
    console.error('Error awarding points:', error);
    return { success: false, error: error.message };
  }
}

// Get event leaderboard
export async function getEventLeaderboard(eventId) {
  try {
    const participantsRef = collection(db, 'events', eventId, 'participants');
    const q = query(participantsRef, orderBy('points', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc, index) => ({
      rank: index + 1,
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}