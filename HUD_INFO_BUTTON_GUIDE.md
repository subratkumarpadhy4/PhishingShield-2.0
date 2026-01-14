# 🔍 Risk HUD Info Button - How It Works

## Overview

The Risk HUD (Heads-Up Display) appears in the bottom-right corner when visiting potentially risky websites. It shows:
- **Risk Score** (0-100)
- **Primary Threat** description
- **Action Buttons** for more information

## The Info Button (ℹ️)

### Location
The info button is the **ℹ️ icon** in the HUD, located between the 🔍 (Inspect) and 🚩 (Report) buttons.

### What It Does
When clicked, it **toggles a details panel** that shows:
- **All risk factors** detected by PhishingShield
- **Score breakdown** for each factor
- **Specific threats** found on the page

### How to Use It

1. **Visit a website** - PhishingShield automatically analyzes it
2. **HUD appears** (if risk score > 20, or > 0 in Fortress Mode)
3. **Click the ℹ️ button** - Details panel slides up
4. **Review the findings** - See what PhishingShield detected
5. **Click ℹ️ again** - Panel hides

## What the Details Panel Shows

### Example Output:
```
Risk Factors Detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Suspicious URL Pattern        +25
• Multiple Redirects            +15
• Insecure Form Detected        +20
• Urgency Keywords Found        +10
• 🤖 Real AI Analysis: CAUTION  +45
• Adaptive Trust: Verified      -40
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Score Badges:
- **Red badges** (+25, +15) = Risk factors (bad)
- **Green badges** (-40) = Trust factors (good)

## What PhishingShield Finds

### Local Analysis (Instant):
✅ **URL Patterns** - Suspicious domains, typosquatting  
✅ **Form Security** - Insecure password fields  
✅ **Content Analysis** - Urgency keywords, scam phrases  
✅ **Link Safety** - Deceptive links, redirects  
✅ **Download Risks** - Executable files, suspicious downloads  
✅ **Adaptive Trust** - Community reputation scores  

### AI Analysis (After 2-3 seconds):
✅ **Deep Content Scan** - AI analyzes page content  
✅ **Threat Classification** - SAFE/SUSPICIOUS/MALICIOUS  
✅ **Detailed Reasoning** - Why the AI flagged it  
✅ **Confidence Level** - How certain the AI is  

## Debugging

### If the button doesn't work:

1. **Check the console** (F12 → Console tab)
   - Look for `[HUD]` messages
   - Should see: "Info button initialized"
   - When clicked: "Info button clicked"

2. **Verify the panel exists**
   - Console should show: "Panel element: [object HTMLDivElement]"
   - If null, the HUD didn't render properly

3. **Check analysis data**
   - Console shows: "Analysis data: {score: X, reasons: [...]}"
   - If reasons array is empty, no threats were detected

### Console Output Example:
```
[HUD] Info button initialized. Panel element: <div id="hud-details-panel">
[HUD] Analysis data: {score: 45, reasons: Array(5), primaryThreat: "Suspicious Content"}
[HUD] Reasons count: 5
[HUD] Info button clicked. Current panel display: none
[HUD] Panel shown. Content: <h4>Risk Factors Detected</h4>...
```

## Button States

### Inactive (Default):
- Color: Gray (#aaa)
- Background: None
- Panel: Hidden

### Active (Clicked):
- Color: White (#fff)
- Background: Semi-transparent white
- Panel: Visible

## Tips

1. **Click ℹ️ immediately** to see local analysis before AI results
2. **Wait 2-3 seconds** for AI analysis to appear in the panel
3. **Panel auto-expands** when AI finds high-risk content
4. **Use 🔍 (Inspect)** to highlight risky elements on the page
5. **Use 🚩 (Report)** to flag the site to PhishingShield

## What You Should See

### Low Risk Site (Score < 20):
- HUD doesn't appear (unless Fortress Mode)
- +10 XP awarded for safe browsing

### Medium Risk (20-49):
- ⚠️ Yellow warning icon
- "Threat Detected" message
- Details show specific risks

### High Risk (50+):
- 🚨 Red alert icon
- "Critical Threat" message
- Detailed breakdown of all threats

## Troubleshooting

### "No specific threats found" in panel:
- The page is safe but triggered a minor flag
- Check if Fortress Mode is adding +25 base score
- AI might upgrade the score later

### Panel doesn't show:
- Check browser console for errors
- Reload the page
- Ensure PhishingShield extension is enabled

### Button not responding:
- Check console for click events
- Try clicking other buttons (🔍, 🚩)
- Reload extension (chrome://extensions)

---

**The info button (ℹ️) is your window into what PhishingShield found!**  
Click it to see the full analysis and understand why a site was flagged. 🛡️
