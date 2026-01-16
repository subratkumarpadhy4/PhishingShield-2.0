# MongoDB Setup Guide

This guide will help you set up MongoDB for PhishingShield instead of using JSON files.

## Benefits of MongoDB

- ✅ **Better Performance**: Faster queries, especially with large datasets
- ✅ **Concurrent Access**: Safe multi-user access without file corruption
- ✅ **Scalability**: Handles growing data efficiently
- ✅ **Reliability**: ACID transactions, crash recovery
- ✅ **Real-time Sync**: Better support for multi-device synchronization

## Setup Options

### Option 1: Local MongoDB (Recommended for Development)

1. **Install MongoDB:**
   ```bash
   # macOS
   brew install mongodb-community
   brew services start mongodb-community

   # Windows
   # Download from https://www.mongodb.com/try/download/community
   # Install and start MongoDB service

   # Linux
   sudo apt-get install mongodb
   sudo systemctl start mongodb
   ```

2. **Verify Installation:**
   ```bash
   mongod --version
   ```

3. **Set Environment Variable (Optional):**
   ```bash
   # In .env file (or use default)
   MONGODB_URI=mongodb://localhost:27017/phishingshield
   ```

4. **Start Server:**
   ```bash
   cd server
   npm install
   npm start
   ```

### Option 2: MongoDB Atlas (Recommended for Production)

1. **Create Free Account:**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free (M0 cluster)

2. **Create Cluster:**
   - Create a free M0 cluster
   - Choose your preferred region

3. **Set Up Database Access:**
   - Go to "Database Access"
   - Create a database user (remember username/password)

4. **Set Up Network Access:**
   - Go to "Network Access"
   - Add IP Address: `0.0.0.0/0` (allow all, or your specific IP)

5. **Get Connection String:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

6. **Set Environment Variable:**
   ```bash
   # In .env file
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/phishingshield?retryWrites=true&w=majority
   ```

7. **Start Server:**
   ```bash
   cd server
   npm install
   npm start
   ```

## Migration from JSON to MongoDB

If you have existing JSON file data, migrate it to MongoDB:

```bash
cd server
node migrate-to-mongodb.js
```

This will:
- ✅ Migrate all trust scores
- ✅ Migrate all reports
- ✅ Migrate all users
- ✅ Migrate audit logs
- ✅ Migrate deleted users
- ✅ Keep JSON files as backup

## Fallback Behavior

The system automatically falls back to JSON files if:
- MongoDB is not installed
- MongoDB connection fails
- `MONGODB_URI` is not set

**No data loss!** If MongoDB is unavailable, the system continues using JSON files.

## Verify MongoDB is Working

Check server logs when starting:
```
[MongoDB] ✓ Connected successfully
[Server] MongoDB ready
```

If you see:
```
[MongoDB] ✗ Connection failed
[Server] MongoDB not available, using JSON file storage
```

Then MongoDB is not connected, but JSON fallback is working.

## Troubleshooting

### MongoDB Connection Failed

1. **Check if MongoDB is running:**
   ```bash
   # macOS/Linux
   brew services list  # or systemctl status mongodb

   # Check MongoDB logs
   tail -f /usr/local/var/log/mongodb/mongo.log
   ```

2. **Check connection string:**
   - Verify `MONGODB_URI` in `.env`
   - Test connection: `mongosh "your-connection-string"`

3. **Firewall Issues:**
   - Ensure MongoDB port (27017) is open
   - For Atlas, check Network Access settings

### Migration Issues

- JSON files are kept as backup
- You can re-run migration script safely (it uses upsert)
- Check server logs for specific errors

## Production Deployment

For production on Render/Heroku:

1. **Set `MONGODB_URI` environment variable:**
   ```bash
   # In Render dashboard → Environment Variables
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/phishingshield
   ```

2. **Run migration on first deploy:**
   - Connect via SSH or use Render shell
   - Run: `node server/migrate-to-mongodb.js`

3. **Verify:**
   - Check logs for MongoDB connection
   - Test endpoints in admin portal

## Performance Tips

1. **Indexes:** Already created automatically for:
   - Trust scores: `domain`
   - Reports: `id`, `hostname`, `status`, `userId`
   - Users: `email`
   - Audit logs: `timestamp`, `adminEmail`

2. **Connection Pooling:** Mongoose handles this automatically

3. **Query Optimization:** Use `.lean()` for read-only queries (already implemented)
