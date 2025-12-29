# Firebase Setup Guide

To enable **Cross-Device Sync**, you must set up Firebase.

## Step 1: Create Project
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Add a **Web App** (</> icon).
4. Copy the `firebaseConfig` object.
5. Paste it into `js/firebase-config.js`.

## Step 2: Enable Database
1. In Firebase Console, go to **Firestore Database**.
2. Click **Create Database**.
3. Choose **Start in Test Mode** (for development).
4. Select a location near you.

## Step 3: Download SDKs (Required for Extension)
Because Chrome Extensions cannot load scripts from the web (`cdn.firebase.com`), you must download them.

1. Download **firebase-app.js** (Version 9 compat):
   `https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js`
   -> Save as `js/firebase-app.js`

2. Download **firebase-firestore.js**:
   `https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js`
   -> Save as `js/firebase-firestore.js`

3. Download **firebase-auth.js**:
   `https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js`
   -> Save as `js/firebase-auth.js`

## Step 4: Verify
Reload the extension. The Admin Panel and Dashboard will now try to connect to Firebase.
