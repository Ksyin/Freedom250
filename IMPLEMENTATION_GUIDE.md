# Freedom 250 Event Management System - Implementation Guide

## Project Overview
Freedom 250 is a full-stack event management platform for the Freedom 250 Festival at JKUAT, serving participants, volunteers, admins, and organizers. The system features gamification, real-time leaderboards, QR-based check-ins, and a comprehensive point system.

## Tech Stack
- **Frontend**: Vanilla JavaScript with ES modules + Firebase CDN
- **Backend**: Firebase (Firestore, Auth, Storage, Messaging)
- **QR Code**: `qrcode` library (CDN)
- **Database**: Firestore (15+ collections)
- **Authentication**: Firebase Auth (email/password + Google)

## Current Implementation Status

### ✅ COMPLETED - Phase 1: Core Infrastructure

#### 1. QR Code Generation (FIXED)
**Files Updated**: `js/qr-generator.js`, `js/auth.js`
- Unique QR codes generated on user registration
- QR codes auto-generated on login if missing
- Freedom ID format: `FREEDOM-2025-XXXXX`
- QR code stored in Firestore as data URL
- Fallback QR generation if main library fails

**How it works**:
1. User signs up/signs in
2. Freedom ID is generated from user UID
3. QR code is generated encoding the Freedom ID
4. Both are stored in Firestore user document
5. QR code is available for display on dashboard

#### 2. Login Screen Cleanup / Auth Routing (FIXED)
**Files Created**: `js/page-navigator.js`
**Files Updated**: `login.html`, `register.html`, `js/main.js`

- **PageNavigator class** listens to auth state changes globally
- Automatically redirects authenticated users from login/register to appropriate dashboard
- Redirects unauthenticated users from protected pages to login
- Role-based routing:
  - `participant` → `dashboard-participant.html`
  - `volunteer` → `dashboard-volunteer.html`
  - `booth_admin` → `dashboard-booth-admin.html`
  - `admin`/`organizer` → `dashboard-admin.html`

**How it works**:
1. Auth state changes (login, logout, page navigation)
2. PageNavigator's `onAuthStateChange` listener fires
3. Current page URL is checked
4. If unauthenticated + on dashboard → redirect to login
5. If authenticated + on login → redirect to dashboard (by role)

#### 3. Firestore Schema (COMPLETE)
**File Created**: `js/firestore-schema.js`

**Collections Implemented**:
```
users/                 - User profiles (participants, admins, volunteers)
roles/                 - Role definitions and permissions
booths/                - Event booths/stands with QR codes
activities/            - Sessions, workshops, games
challenges/            - Gamified missions and challenges
points/                - Transaction log for all point awards
rewards/               - Redemption store items
sessions/              - Conference/keynote sessions
scans/                 - QR code scans and check-ins
locations/             - Event venues and zones
leaderboards/          - Real-time leaderboard snapshots
notifications/         - User and broadcast notifications
eventLogs/             - Audit trail for admin actions
```

**Utilities Provided**:
- `awardPoints()` - Award points to users
- `recordBoothScan()` - Record booth visits
- `recordSessionAttendance()` - Track session attendance
- `createBooth()` - Create new booths (admin)
- `sendNotification()` - Send individual notifications
- `broadcastNotification()` - Send broadcast announcements
- `logEvent()` - Create audit logs

#### 4. Dashboard Utils (COMPLETE)
**File Created**: `js/dashboard-utils.js`

**Functions Provided**:
- `displayUserQRCode()` - Display user's QR code
- `updateUserProfile()` - Update profile display
- `updateProgressBar()` - Update level progress
- `displayBadges()` - Show earned badges
- `displayZones()` - Show event zones
- `displayChallenges()` - Show challenges
- `displayLeaderboard()` - Show top participants
- `displayActivityHistory()` - Show user activity
- `navigateSection()` - Switch dashboard sections

---

## ⚠️ IN PROGRESS - Phase 2: Participant Features

### 1. Digital Passport (Started)
**File**: `dashboard-participant.html` (needs integration)

**Completed**:
- HTML structure with QR section
- Stats display (points, level, stamps)
- Progress bar styling
- Badges row layout

**TODO**:
1. Integrate `dashboard-utils.js` into the script
2. Call `initDashboardUtils()` on page load
3. Display real QR code image (currently shows placeholder)
4. Update all stats from Firestore in real-time
5. Add sections for zones, challenges, leaderboard
6. Implement navigation between dashboard tabs

**Implementation Steps**:
```javascript
// Add to dashboard-participant.html script:
import { initDashboardUtils, displayZones, displayChallenges } from './js/dashboard-utils.js';

// On page load:
await initDashboardUtils();
displayZones(zonesData, completedZones);
displayChallenges(challengesData);
```

### 2. Point System (Schema Ready)
**Schema File**: `js/firestore-schema.js` (functions: `awardPoints`, `recordBoothScan`, `recordSessionAttendance`)

**TODO**:
1. Create point award triggers for each action:
   - Booth visit: +5 points
   - Session attendance: +20 points
   - Challenge completion: +50-100 points
   - Networking: +15 points
   - Social sharing: +30 points

2. Create admin panel for manual point awards

3. Implement point multipliers:
   - Time-based (e.g., double points during "power hour")
   - Streak bonuses
   - Challenge multipliers

4. Real-time point syncing:
   - Use Firestore `onSnapshot()` for live updates
   - Update user's display immediately

### 3. Leaderboards (Schema Ready)
**Schema File**: `js/firestore-schema.js`

**5 Leaderboard Types**:
1. **Overall** - Total points across all participants
2. **Booth-specific** - Most visits per booth
3. **Team-based** - Aggregated university/team scores
4. **Daily** - Daily point winners (resets daily)
5. **Session-specific** - Most attendees per session

**TODO**:
1. Create real-time query functions for each leaderboard type
2. Implement Firestore queries with sorting and limiting:
   ```javascript
   query(collection(db, 'users'), 
     orderBy('points', 'desc'), 
     limit(100)
   )
   ```
3. Use `onSnapshot()` for real-time updates
4. Cache results in `leaderboards/` collection
5. Update dashboard display component
6. Add pagination for large leaderboards

### 4. QR Code Check-in System
**Partially Ready**: `recordBoothScan()` in schema

**TODO**:
1. Create QR code scanner component
2. Implement `html5-qrcode` library for scanning
3. Create booth admin scan page
4. On scan:
   - Decode Freedom ID
   - Find user in database
   - Record scan
   - Award points
   - Show confirmation UI
5. Add visual feedback (success/error messages)
6. Handle offline mode (sync when online)

---

## 🔨 NEXT STEPS - Phase 3: Gamification

### Levels & XP System
**TODO**:
1. Define level progression (e.g., 500 XP per level)
2. Create functions to calculate level from XP
3. Award XP with every point-earning action
4. Show "Level Up!" notifications
5. Create level-based unlocks (badges, rewards)

### Achievement Badges
**TODO**:
1. Define achievement types:
   - Freedom Starter (on signup)
   - Explorer (visit 3 zones)
   - Champion (win a game)
   - Networker (connect 10+ people)
   - Completionist (visit all zones)
   - etc.

2. Implement badge unlock logic
3. Show badges on profile
4. Create badge collection UI

### Freedom Rank System
**TODO**:
1. Define rank titles by level:
   - Levels 1-5: Pioneer
   - Levels 6-10: Explorer
   - Levels 11-15: Champion
   - Levels 16+: Legend

2. Implement rank calculations
3. Display rank on dashboard with visual indicator

### Freedom Stamps/Missions
**TODO**:
1. Create zone-based missions
2. Award stamps for visiting zones
3. Create "collect all stamps" challenge
4. Visual stamp collection album on dashboard
5. Bonus for completing all 7 zones

---

## 🛡️ NEXT STEPS - Phase 4: Admin & Advanced Features

### Admin Dashboard
**TODO**:
1. Create `dashboard-admin.html` page
2. Implement admin-only features:
   - View all participants
   - Manual point awards
   - Booth management
   - Challenge creation
   - Notification broadcasting

### QR Code Scanning (Admin/Staff)
**TODO**:
1. Create dedicated scanner page for booth staff
2. Implement real-time check-in
3. Instant feedback UI
4. Daily attendance tracking

### Reward System
**TODO**:
1. Create reward redemption interface
2. Implement point spending mechanics
3. Track claimed rewards
4. Admin verification system for physical prizes
5. Digital coupon generation

### Notification System
**TODO**:
1. Implement Firebase Cloud Messaging
2. Push notifications for:
   - Session reminders
   - Challenge alerts
   - Winner announcements
   - Important updates

3. Email notification integration (EmailJS or Firebase Extension)
4. SMS integration (optional - Twilio/Africa's Talking)
5. In-app notification center

### Real-time Analytics
**TODO**:
1. Create admin analytics dashboard:
   - Live participant count
   - Points distribution
   - Most popular booths
   - Top performers
   - Zone traffic heatmap

2. Implement real-time data aggregation
3. Create export/report functionality

---

## 📝 Quick Implementation Checklist

### Immediate Next Steps (by priority):

1. **Update Dashboard-Participant HTML** (High Priority)
   - [ ] Import and initialize dashboard-utils
   - [ ] Display real QR code
   - [ ] Connect to Firestore for live data
   - [ ] Add logout button functionality

2. **Create Point Award System** (High Priority)
   - [ ] Create point award endpoints
   - [ ] Integrate with booth scan recording
   - [ ] Add session attendance tracking
   - [ ] Create challenge completion tracking

3. **Build Leaderboard Queries** (High Priority)
   - [ ] Create query functions for each type
   - [ ] Set up real-time listeners
   - [ ] Display on dashboard
   - [ ] Add pagination

4. **Create QR Scanner** (Medium Priority)
   - [ ] Add html5-qrcode library
   - [ ] Build scanner UI
   - [ ] Create scan recording flow
   - [ ] Add offline support

5. **Implement Gamification** (Medium Priority)
   - [ ] Create XP/level system
   - [ ] Define achievement badges
   - [ ] Implement rank titles
   - [ ] Create stamp collection

6. **Build Admin Dashboard** (Medium Priority)
   - [ ] Create admin HTML page
   - [ ] Implement role checks
   - [ ] Add point award interface
   - [ ] Create booth management

---

## 🔐 Firestore Security Rules (TODO)

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own documents
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }

    // Public read for leaderboards and locations
    match /leaderboards/{document=**} {
      allow read: if true;
    }
    match /locations/{document=**} {
      allow read: if true;
    }

    // Admins can read all data
    match /{document=**} {
      allow read: if hasRole('admin');
    }
  }
}
```

---

## 🚀 Deployment

### Vercel Deployment
- Current: `https://freedom250.vercel.app`
- Auto-deploy from GitHub on push to main branch
- Environment variables needed:
  - Firebase API keys (in firebase-config.js)
  - Vercel redirects configured in `vercel.json`

### Testing URLs
- Base: `https://freedom250.vercel.app`
- Participant: `https://freedom250.vercel.app/dashboard-participant.html`
- Admin: `https://freedom250.vercel.app/dashboard-admin.html`

---

## 📚 File Reference

### Authentication
- `js/auth.js` - Auth functions with QR generation
- `js/qr-generator.js` - QR code utilities
- `js/page-navigator.js` - Auth-based routing
- `login.html` - Login page
- `register.html` - Registration page

### Database
- `js/firestore-schema.js` - Schema and DB utilities
- `js/firebase-config.js` - Firebase initialization

### Dashboard
- `js/dashboard-utils.js` - Dashboard UI helpers
- `dashboard-participant.html` - Participant dashboard
- `dashboard-admin.html` - Admin dashboard (TODO)
- `dashboard-volunteer.html` - Volunteer dashboard (TODO)
- `dashboard-booth-admin.html` - Booth staff dashboard (TODO)

### Landing
- `index.html` - Marketing/landing page
- `js/main.js` - Main app initialization

---

## 🐛 Known Issues & Fixes Applied

### Fixed Issues
1. ✅ QR Code Not Generating
   - Implemented QR code generation on signup/login
   - Added fallback canvas-based generation
   - Stores data URL in Firestore

2. ✅ Login Screen Not Disappearing
   - Created PageNavigator for auth-based routing
   - Automatic redirects on auth state changes
   - Uses `window.location.replace()` for clean navigation

### Potential Issues to Watch
- QR code library may not load from CDN in some regions
- Firestore offline persistence might cause conflicts
- Real-time listeners need proper cleanup to avoid memory leaks

---

## 💡 Tips for Developers

1. **Test Auth Flow**: Always test login → redirect → logout → redirect
2. **QR Code**: Test both online and offline QR generation
3. **Firestore**: Use Firestore emulator for local development
4. **Real-time**: Remember to unsubscribe from listeners (return unsubscribe function)
5. **Permissions**: Always check user role before showing sensitive data

---

## Contact & Support
This implementation guide covers the Freedom 250 Event Management System. For questions or issues, refer to the code comments or Firebase documentation.

Last Updated: May 2026
