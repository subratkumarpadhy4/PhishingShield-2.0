/**
 * Favicon Database Builder
 * Fetches favicons for top brands and generates a hash database for the Chameleon Engine.
 * 
 * Usage: node scripts/build_favicon_db.js
 */

const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Target Brands to Fingerprint
const TARGETS = [
    { name: 'paypal', domain: 'paypal.com' },
    { name: 'google', domain: 'google.com' },
    { name: 'microsoft', domain: 'microsoft.com' },
    { name: 'facebook', domain: 'facebook.com' },
    { name: 'amazon', domain: 'amazon.com' },
    { name: 'apple', domain: 'apple.com' },
    { name: 'netflix', domain: 'netflix.com' },
    { name: 'instagram', domain: 'instagram.com' },
    { name: 'chase', domain: 'chase.com' },
    { name: 'bankofamerica', domain: 'bankofamerica.com' },
    { name: 'linkedin', domain: 'linkedin.com' },
    { name: 'dropbox', domain: 'dropbox.com' }
];

const OUTPUT_FILE = path.join(__dirname, '../js/favicon_db.json');

// Helper to fetch image buffer with Redirect Support
function fetchFavicon(domain, urlOverride = null) {
    return new Promise((resolve, reject) => {
        // Use Google's S2 service for consistent 64x64 PNGs
        const url = urlOverride || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

        https.get(url, (res) => {
            // Handle Redirects (301, 302)
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchFavicon(domain, res.headers.location)
                    .then(resolve)
                    .catch(reject);
            }

            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to fetch: ${res.statusCode}`));
            }

            const data = [];
            res.on('data', (chunk) => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
        }).on('error', reject);
    });
}

// Generate Sha256 Hash of the image buffer
function generateHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function buildDatabase() {
    console.log("🦎 Chameleon Builder: Generating Favicon DNA...");
    const db = {};

    for (const target of TARGETS) {
        try {
            process.stdout.write(`   Fingerprinting ${target.name} (${target.domain})... `);
            const buffer = await fetchFavicon(target.domain);
            const hash = generateHash(buffer);

            db[hash] = {
                brand: target.name,
                domain: target.domain
            };
            console.log(`✅ [${hash.substring(0, 8)}...]`);
        } catch (e) {
            console.log(`❌ Error: ${e.message}`);
        }
    }

    // Write DB
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(db, null, 4));
    console.log(`\n✨ Database saved to ${OUTPUT_FILE}`);
    console.log(`   Total Signatures: ${Object.keys(db).length}`);
}

buildDatabase();
