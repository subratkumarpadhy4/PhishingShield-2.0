/**
 * PhishingShield Chameleon Engine (Visual DNA Detection)
 * 
 * THE PROBLEM: 
 * Traditional scanners check if the URL is "bad". 
 * Phishers bypass this by using "clean" URLs (e.g. secure-login.net) 
 * hosting "perfect" visual clones of brands.
 * 
 * THE SOLUTION:
 * Chameleon ignores the URL. It looks at the "Visual DNA" of the page.
 * If a page LOOKS like PayPal but ISN'T paypal.com -> BLOCK.
 */

const Chameleon = {
    // Top Target Signatures (The "DNA" Database)
    signatures: {
        // --- TECH GIANTS ---
        google: {
            colors: ['#4285f4', '#ea4335'],
            keywords: ['sign in', 'continue to gmail', 'forgot email'],
            officialDomains: ['google.com', 'accounts.google.com', 'youtube.com', 'gmail.com', 'drive.google.com']
        },
        microsoft: {
            colors: ['#f25022', '#7fba00', '#00a4ef', '#ffb900'],
            keywords: ['sign in', 'microsoft account', 'skype', 'no account?'],
            officialDomains: ['microsoft.com', 'live.com', 'outlook.com', 'office.com', 'azure.com', 'sharepoint.com']
        },
        apple: {
            colors: ['#000000', '#f5f5f7'],
            keywords: ['apple id', 'manage your apple account', 'icloud'],
            officialDomains: ['apple.com', 'icloud.com']
        },
        amazon: {
            colors: ['#ff9900', '#146eb4'],
            keywords: ['sign-in', 'email or mobile phone number', 'amazon password'],
            officialDomains: ['amazon.com', 'amazon.co.uk', 'amazon.in', 'aws.amazon.com']
        },
        meta: {
            colors: ['#1877f2', '#42b72a'],
            keywords: ['log in', 'create new account', 'forgot password?'],
            officialDomains: ['facebook.com', 'messenger.com', 'meta.com', 'instagram.com', 'whatsapp.com']
        },
        netflix: {
            colors: ['#e50914'],
            keywords: ['sign in', 'netflix', 'unlimited movies'],
            officialDomains: ['netflix.com']
        },
        adobe: {
            colors: ['#fa0f00'],
            keywords: ['sign in', 'adobe account', 'creative cloud'],
            officialDomains: ['adobe.com']
        },
        dropbox: {
            colors: ['#0061fe'],
            keywords: ['sign in', 'dropbox', 'access your files'],
            officialDomains: ['dropbox.com']
        },
        linkedin: {
            colors: ['#0a66c2'],
            keywords: ['sign in', 'join now', 'linkedin'],
            officialDomains: ['linkedin.com']
        },
        twitter: {
            colors: ['#1d9bf0', '#000000'],
            keywords: ['sign in to x', 'log in', 'twitter'],
            officialDomains: ['twitter.com', 'x.com']
        },

        // --- FINANCE / BANKS ---
        paypal: {
            colors: ['#003087', '#0070ba'],
            keywords: ['log in', 'sign up', 'email or mobile number'],
            officialDomains: ['paypal.com', 'paypalobjects.com']
        },
        chase: {
            colors: ['#117aca'],
            keywords: ['welcome', 'username', 'password', 'chase'],
            officialDomains: ['chase.com']
        },
        wellsfargo: {
            colors: ['#d71e28'],
            keywords: ['sign on', 'enroll', 'wells fargo'],
            officialDomains: ['wellsfargo.com']
        },
        bofa: {
            colors: ['#e31837', '#0061aa'],
            keywords: ['sign in', 'online id', 'bank of america'],
            officialDomains: ['bankofamerica.com']
        },
        citi: {
            colors: ['#003b70', '#ee2724'],
            keywords: ['sign on', 'user id', 'citi'],
            officialDomains: ['citi.com']
        },
        capitalone: {
            colors: ['#004977', '#d03027'],
            keywords: ['sign in', 'username', 'capital one'],
            officialDomains: ['capitalone.com']
        },
        amex: {
            colors: ['#006fcf'],
            keywords: ['log in', 'user id', 'american express'],
            officialDomains: ['americanexpress.com']
        },
        hsbc: {
            colors: ['#db0011'],
            keywords: ['log on', 'username', 'hsbc'],
            officialDomains: ['hsbc.com', 'hsbc.co.uk']
        },
        barclays: {
            colors: ['#00aeef'],
            keywords: ['log in', 'surname', 'barclays'],
            officialDomains: ['barclays.co.uk', 'barclays.com']
        },
        stripe: {
            colors: ['#635bff'],
            keywords: ['sign in', 'stripe', 'payments'],
            officialDomains: ['stripe.com']
        },
        square: {
            colors: ['#000000'],
            keywords: ['sign in', 'square', 'dashboard'],
            officialDomains: ['squareup.com']
        },
        coinbase: {
            colors: ['#0052ff'],
            keywords: ['sign in', 'coinbase', 'crypto'],
            officialDomains: ['coinbase.com']
        },
        binance: {
            colors: ['#f0b90b'],
            keywords: ['log in', 'register', 'binance'],
            officialDomains: ['binance.com']
        },
        blockchain: {
            colors: ['#121d33'],
            keywords: ['login', 'wallet', 'blockchain'],
            officialDomains: ['blockchain.com']
        },

        // --- E-COMMERCE / SERVICES ---
        ebay: {
            colors: ['#e53238', '#0064d2', '#f5af02', '#86b817'],
            keywords: ['sign in', 'ebay', 'bid'],
            officialDomains: ['ebay.com']
        },
        walmart: {
            colors: ['#0071dc', '#ffc220'],
            keywords: ['sign in', 'account', 'walmart'],
            officialDomains: ['walmart.com']
        },
        target: {
            colors: ['#cc0000'],
            keywords: ['sign in', 'target circle'],
            officialDomains: ['target.com']
        },
        bestbuy: {
            colors: ['#0046be', '#ffeb3b'],
            keywords: ['sign in', 'account', 'best buy'],
            officialDomains: ['bestbuy.com']
        },
        alibaba: {
            colors: ['#ff6a00'],
            keywords: ['sign in', 'join free', 'alibaba'],
            officialDomains: ['alibaba.com', 'aliexpress.com']
        },
        rakuten: {
            colors: ['#bf0000'],
            keywords: ['sign in', 'join', 'rakuten'],
            officialDomains: ['rakuten.com']
        },
        shopify: {
            colors: ['#95bf47'],
            keywords: ['log in', 'store address', 'shopify'],
            officialDomains: ['shopify.com']
        },
        airbnb: {
            colors: ['#ff5a5f'],
            keywords: ['login', 'sign up', 'airbnb'],
            officialDomains: ['airbnb.com']
        },
        booking: {
            colors: ['#003580'],
            keywords: ['sign in', 'register', 'booking.com'],
            officialDomains: ['booking.com']
        },
        expedia: {
            colors: ['#00257a'],
            keywords: ['sign in', 'account', 'expedia'],
            officialDomains: ['expedia.com']
        },
        uber: {
            colors: ['#000000'],
            keywords: ['login', 'sign up', 'uber'],
            officialDomains: ['uber.com']
        },

        // --- GOV / INSTITUTIONS ---
        irs: {
            colors: ['#005ea2'],
            keywords: ['internal revenue service', 'payment', 'tax'],
            officialDomains: ['irs.gov']
        },
        uk_gov: {
            colors: ['#000000'],
            keywords: ['sign in', 'government gateway', 'gov.uk'],
            officialDomains: ['gov.uk']
        },
        who: {
            colors: ['#0093d5'],
            keywords: ['world health organization', 'login'],
            officialDomains: ['who.int']
        },
        un: {
            colors: ['#009edb'],
            keywords: ['united nations', 'login'],
            officialDomains: ['un.org']
        },

        // --- OTHERS ---
        docusign: {
            colors: ['#2d3a46'],
            keywords: ['please docusign', 'review document'],
            officialDomains: ['docusign.com', 'docusign.net']
        },
        zoom: {
            colors: ['#2d8cff'],
            keywords: ['sign in', 'join meeting', 'zoom'],
            officialDomains: ['zoom.us']
        },
        slack: {
            colors: ['#4a154b'],
            keywords: ['sign in', 'workspace', 'slack'],
            officialDomains: ['slack.com']
        },
        salesforce: {
            colors: ['#00a1e0'],
            keywords: ['login', 'salesforce'],
            officialDomains: ['salesforce.com', 'force.com']
        },
        twitch: {
            colors: ['#9146ff'],
            keywords: ['log in', 'sign up', 'twitch'],
            officialDomains: ['twitch.tv']
        },
        roblox: {
            colors: ['#000000'],
            keywords: ['login', 'roblox'],
            officialDomains: ['roblox.com']
        },
        steam: {
            colors: ['#171a21'],
            keywords: ['login', 'steam'],
            officialDomains: ['steampowered.com', 'steamcommunity.com']
        },
        epicgames: {
            colors: ['#000000'],
            keywords: ['sign in', 'epic games'],
            officialDomains: ['epicgames.com']
        },
        blizzard: {
            colors: ['#009cde'],
            keywords: ['log in', 'blizzard'],
            officialDomains: ['battle.net', 'blizzard.com']
        },
        sony: {
            colors: ['#000000'],
            keywords: ['sign in', 'psn', 'playstation'],
            officialDomains: ['playstation.com', 'sonyentertainmentnetwork.com']
        },
        nintendo: {
            colors: ['#e60012'],
            keywords: ['sign in', 'nintendo account'],
            officialDomains: ['nintendo.com']
        }
    },

    /**
     * Entry Point: Scans the current page's DOM for imposters.
     */
    scan: function () {
        // 1. Get current hostname (The "Identity Badge")
        const currentHost = window.location.hostname;

        // 2. Scan visual features (The "Face")
        const pageText = document.body.innerText.toLowerCase();
        const htmlLower = document.body.innerHTML.toLowerCase();

        let maxSimilarity = 0;
        let detectedBrand = null;

        // 3. Compare against DNA Database
        for (const [brand, dna] of Object.entries(this.signatures)) {

            // Skip check if we are actually on the real site
            // (e.g. Don't flag amazon.com as an Amazon clone)
            const isOfficial = dna.officialDomains.some(d => currentHost.endsWith(d));
            if (isOfficial) continue;

            let score = 0;

            // A. Keyword Match (30 points)
            let keywordMatches = 0;
            if (dna.keywords) {
                dna.keywords.forEach(kw => {
                    if (pageText.includes(kw)) keywordMatches++;
                });
            }
            if (keywordMatches >= 2) score += 30;

            // B. Visual/CSS Match (40 points)
            let visualMatches = 0;
            if (dna.colors) {
                dna.colors.forEach(col => {
                    if (htmlLower.includes(col.toLowerCase())) visualMatches++;
                });
            }
            if (dna.logoClasses) {
                dna.logoClasses.forEach(cls => {
                    if (htmlLower.includes(`class="${cls}"`) || htmlLower.includes(`class='${cls}'`)) visualMatches++;
                });
            }

            if (visualMatches >= 1) score += 40;

            // C. DOM Structure Match (30 points)
            let domMatches = 0;
            if (dna.inputs) {
                dna.inputs.forEach(inp => {
                    if (document.querySelector(`input[name="${inp}"]`) || document.querySelector(`input[id="${inp}"]`)) {
                        domMatches++;
                    }
                });
            }
            if (domMatches >= 1) score += 30;

            // D. Result for this brand
            if (score > maxSimilarity) {
                maxSimilarity = score;
                detectedBrand = brand;
            }
        }

        // 4. The Verdict
        // If similarity > 70%, it's a clone.
        if (maxSimilarity >= 70 && detectedBrand) {
            console.warn(`[Chameleon] 🦎 DNA MISMATCH DETECTED! Page looks like ${detectedBrand} (${maxSimilarity}%) but domain is ${currentHost}`);
            return {
                isClone: true,
                brand: detectedBrand,
                confidence: maxSimilarity
            };
        }

        return { isClone: false };
    }
};

// Auto-run scanner if loaded
if (typeof window !== 'undefined') {
    window.Chameleon = Chameleon;
}
