# Quick Start: MongoDB Setup for PhishingShield

## Step-by-Step Instructions

### Step 1: Install MongoDB (Choose One Option)

#### Option A: Local MongoDB (Easiest for Development)

**macOS:**
```bash
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
1. Download MongoDB from: https://www.mongodb.com/try/download/community
2. Install the MSI file
3. MongoDB will start automatically as a service

**Linux:**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

#### Option B: MongoDB Atlas (Cloud - Best for Production)

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create free M0 cluster
4. Create database user (remember username/password)
5. Add network access (0.0.0.0/0 for all, or your IP)
6. Get connection string and add to `.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/phishingshield
   ```

### Step 2: Install Node.js Dependencies

```bash
cd server
npm install
```

This will install:
- `mongodb` - MongoDB driver
- `mongoose` - MongoDB ODM

### Step 3: (Optional) Migrate Existing JSON Data

If you have existing data in JSON files that you want to keep:

```bash
cd server
node migrate-to-mongodb.js
```

This will:
- ✅ Copy all your trust scores to MongoDB
- ✅ Copy all your reports to MongoDB
- ✅ Copy all your users to MongoDB
- ✅ Copy audit logs to MongoDB
- ✅ Keep JSON files as backup

### Step 4: Start Your Server

```bash
cd server
npm start
```

### Step 5: Verify It's Working

Check the server console logs. You should see:

```
[MongoDB] ✓ Connected successfully
[Server] MongoDB ready
Server running on port 3000
```

If you see this instead:
```
[MongoDB] ✗ Connection failed
[Server] MongoDB not available, using JSON file storage
```

That's OK! It means MongoDB isn't installed yet, but the system will continue working with JSON files.

## Testing

1. **Test Trust Scores:**
   - Open admin portal → Community Trust
   - Should load quickly
   - Vote on a website from popup
   - Check if vote appears in admin portal

2. **Check Server Logs:**
   - Look for `[MongoDB]` messages
   - Should see successful connections

## Troubleshooting

### MongoDB Not Connecting?

1. **Check if MongoDB is running:**
   ```bash
   # macOS
   brew services list
   
   # Or check manually
   mongod --version
   ```

2. **Test connection:**
   ```bash
   mongosh mongodb://localhost:27017/phishingshield
   ```

3. **Check .env file:**
   - Make sure `MONGODB_URI` is correct (or leave it out to use default)

### Still Using JSON?

That's fine! The system automatically falls back to JSON if MongoDB isn't available. You can:
- Continue using JSON (works perfectly)
- Install MongoDB later when ready
- No data loss either way

## What Happens Now?

- ✅ **Trust scores** → MongoDB (if connected) or JSON (if not)
- ✅ **Reports** → MongoDB (if connected) or JSON (if not)  
- ✅ **Users** → MongoDB (if connected) or JSON (if not)
- ✅ **Automatic fallback** → Always works, no errors

## Benefits You'll Get

Once MongoDB is connected:
- ⚡ Faster queries
- 🔒 Safe concurrent access
- 📈 Better scalability
- 🔄 Improved multi-device sync

But it works fine with JSON too! MongoDB is optional but recommended.
