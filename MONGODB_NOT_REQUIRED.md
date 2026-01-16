# MongoDB is NOT Required for Regular Users! ✅

## Important: Users Don't Need MongoDB Installed

The extension is designed to work **WITHOUT MongoDB** for regular users. Only the **global server** needs MongoDB.

---

## How It Works:

### For Regular Users (No MongoDB Needed):

1. **Local Server** uses **JSON files** automatically
   - If MongoDB not installed → Uses `server/data/trust_scores.json`
   - If MongoDB not connected → Falls back to JSON files
   - **No installation needed!**

2. **Votes still sync globally:**
   - Your vote → Saved to local JSON file
   - Immediately forwarded → Global server (has MongoDB)
   - Global server saves → MongoDB database

3. **Admin portal shows all data:**
   - Fetches from global server first
   - Global server has MongoDB with ALL votes
   - You see everyone's votes ✅

---

## Who Needs MongoDB?

| User Type | MongoDB Needed? |
|-----------|----------------|
| **Regular User** | ❌ **NO** - Uses JSON files |
| **Global Server** (Render.com) | ✅ **YES** - Central database |
| **You** (if you want MongoDB) | ⚪ **OPTIONAL** - Can use JSON |

---

## Automatic Fallback Logic:

The code automatically detects if MongoDB is available:

```javascript
// In server.js - Automatic fallback
if (isConnected()) {
    // Use MongoDB (if available)
    await TrustScore.find({});
} else {
    // Fallback to JSON files (always works)
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
```

**Result:** Works with OR without MongoDB!

---

## Example Scenario:

### Your Friend (No MongoDB):

1. Installs extension
2. Starts local server: `cd server && npm start`
3. MongoDB connection fails → **No problem!**
4. System uses JSON files automatically
5. Friend votes on website → Saved to JSON
6. Vote forwarded to global server → Global server saves to MongoDB
7. Friend opens admin portal → Fetches from global server → Sees all votes ✅

### You (With MongoDB - Optional):

1. MongoDB installed locally
2. Starts local server: `cd server && npm start`
3. MongoDB connects → Uses MongoDB
4. Votes saved to MongoDB locally
5. Vote forwarded to global server → Global server saves to MongoDB
6. Admin portal shows data from MongoDB ✅

---

## Summary:

✅ **Regular users**: Just use JSON files (no setup needed)  
✅ **Global server**: Needs MongoDB (for central storage)  
✅ **Both work the same**: Both sync with global server  
✅ **Both see same data**: Both fetch from global server

**Your friend doesn't need MongoDB!** The extension works automatically with JSON files.

---

## What to Tell Your Users:

> "You don't need to install MongoDB. The extension works automatically with JSON files. Just start the server and it will work!"

**Only YOU need MongoDB if:**
- You want faster local queries
- You want to test locally
- You're running the global server

**For the global server on Render.com:**
- Needs MongoDB (MongoDB Atlas recommended)
- This is where all votes are stored centrally
