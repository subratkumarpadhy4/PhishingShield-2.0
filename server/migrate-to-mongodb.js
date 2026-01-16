/**
 * Migration Script: JSON Files to MongoDB
 * 
 * This script migrates existing JSON file data to MongoDB.
 * Run: node migrate-to-mongodb.js
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { connectDB, TrustScore, Report, User, AuditLog, AdminSession, DeletedUser } = require('./db');

const DATA_DIR = path.join(__dirname, 'data');
const TRUST_FILE = path.join(DATA_DIR, 'trust_scores.json');
const REPORTS_FILE = path.join(__dirname, 'reports.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'audit_logs.json');
const DELETED_USERS_FILE = path.join(DATA_DIR, 'deleted_users.json');

async function readJSONFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return Array.isArray(data) ? data : [];
        }
        return [];
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
        return [];
    }
}

async function migrateTrustScores() {
    console.log('\n[Migration] Migrating Trust Scores...');
    const data = await readJSONFile(TRUST_FILE);
    
    if (data.length === 0) {
        console.log('[Migration] No trust scores to migrate');
        return;
    }

    let migrated = 0;
    let skipped = 0;

    for (const item of data) {
        try {
            const normalizedDomain = (item.domain || '').toLowerCase().trim();
            if (!normalizedDomain) {
                skipped++;
                continue;
            }

            // Ensure voters is a plain object (handle Map or object)
            let votersObj = item.voters || {};
            if (votersObj instanceof Map) {
                votersObj = Object.fromEntries(votersObj);
            }
            
            // Recalculate vote counts from voters if counts are 0 but voters exist
            let safeCount = item.safe || 0;
            let unsafeCount = item.unsafe || 0;
            
            if ((safeCount === 0 && unsafeCount === 0) && Object.keys(votersObj).length > 0) {
                safeCount = Object.values(votersObj).filter(v => v === 'safe').length;
                unsafeCount = Object.values(votersObj).filter(v => v === 'unsafe').length;
            }
            
            await TrustScore.findOneAndUpdate(
                { domain: normalizedDomain },
                {
                    domain: normalizedDomain,
                    safe: safeCount,
                    unsafe: unsafeCount,
                    voters: votersObj, // Plain object works with Mixed type
                    updatedAt: new Date()
                },
                { upsert: true }
            );
            migrated++;
        } catch (error) {
            console.error(`[Migration] Error migrating trust score ${item.domain}:`, error.message);
            skipped++;
        }
    }

    console.log(`[Migration] ✓ Trust Scores: ${migrated} migrated, ${skipped} skipped`);
}

async function migrateReports() {
    console.log('\n[Migration] Migrating Reports...');
    const data = await readJSONFile(REPORTS_FILE);
    
    if (data.length === 0) {
        console.log('[Migration] No reports to migrate');
        return;
    }

    let migrated = 0;
    let skipped = 0;

    for (const item of data) {
        try {
            if (!item.id) {
                skipped++;
                continue;
            }

            await Report.findOneAndUpdate(
                { id: item.id },
                { ...item },
                { upsert: true }
            );
            migrated++;
        } catch (error) {
            console.error(`[Migration] Error migrating report ${item.id}:`, error.message);
            skipped++;
        }
    }

    console.log(`[Migration] ✓ Reports: ${migrated} migrated, ${skipped} skipped`);
}

async function migrateUsers() {
    console.log('\n[Migration] Migrating Users...');
    const data = await readJSONFile(USERS_FILE);
    
    if (data.length === 0) {
        console.log('[Migration] No users to migrate');
        return;
    }

    let migrated = 0;
    let skipped = 0;

    for (const item of data) {
        try {
            const normalizedEmail = (item.email || '').toLowerCase().trim();
            if (!normalizedEmail) {
                skipped++;
                continue;
            }

            await User.findOneAndUpdate(
                { email: normalizedEmail },
                { ...item, email: normalizedEmail },
                { upsert: true }
            );
            migrated++;
        } catch (error) {
            console.error(`[Migration] Error migrating user ${item.email}:`, error.message);
            skipped++;
        }
    }

    console.log(`[Migration] ✓ Users: ${migrated} migrated, ${skipped} skipped`);
}

async function migrateAuditLogs() {
    console.log('\n[Migration] Migrating Audit Logs...');
    const data = await readJSONFile(AUDIT_LOG_FILE);
    
    if (data.length === 0) {
        console.log('[Migration] No audit logs to migrate');
        return;
    }

    try {
        await AuditLog.insertMany(data, { ordered: false });
        console.log(`[Migration] ✓ Audit Logs: ${data.length} migrated`);
    } catch (error) {
        console.error(`[Migration] Error migrating audit logs:`, error.message);
        if (error.writeErrors) {
            console.log(`[Migration] Partial success: ${error.writeErrors.length} failed out of ${data.length}`);
        }
    }
}

async function migrateDeletedUsers() {
    console.log('\n[Migration] Migrating Deleted Users...');
    const data = await readJSONFile(DELETED_USERS_FILE);
    
    if (data.length === 0) {
        console.log('[Migration] No deleted users to migrate');
        return;
    }

    let migrated = 0;
    let skipped = 0;

    for (const item of data) {
        try {
            const normalizedEmail = (item.email || '').toLowerCase().trim();
            if (!normalizedEmail) {
                skipped++;
                continue;
            }

            await DeletedUser.findOneAndUpdate(
                { email: normalizedEmail },
                {
                    email: normalizedEmail,
                    deletedAt: item.deletedAt ? new Date(item.deletedAt) : new Date()
                },
                { upsert: true }
            );
            migrated++;
        } catch (error) {
            console.error(`[Migration] Error migrating deleted user ${item.email}:`, error.message);
            skipped++;
        }
    }

    console.log(`[Migration] ✓ Deleted Users: ${migrated} migrated, ${skipped} skipped`);
}

async function main() {
    console.log('='.repeat(60));
    console.log('MongoDB Migration Script');
    console.log('='.repeat(60));

    try {
        // Connect to MongoDB
        console.log('\n[Migration] Connecting to MongoDB...');
        await connectDB();
        console.log('[Migration] ✓ Connected to MongoDB');

        // Run migrations
        await migrateTrustScores();
        await migrateReports();
        await migrateUsers();
        await migrateAuditLogs();
        await migrateDeletedUsers();

        console.log('\n' + '='.repeat(60));
        console.log('[Migration] ✓ Migration completed successfully!');
        console.log('[Migration] Your data is now in MongoDB.');
        console.log('[Migration] JSON files are kept as backup.');
        console.log('='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('\n[Migration] ✗ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
if (require.main === module) {
    main();
}

module.exports = { main };
