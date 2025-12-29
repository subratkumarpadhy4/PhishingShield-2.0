# 🚀 Next Steps: Deploy to Render

## Step 1: Commit Your Changes (if using Git)

If your Render service is connected to a Git repository:

```bash
cd /Users/subratkumarpadhy/PhishingShield
git add server/server.js
git commit -m "Fix Render deployment: bind to 0.0.0.0 and improve email handling"
git push
```

Render will automatically redeploy when you push.

**OR** if you're not using Git, you can manually redeploy from the Render dashboard.

---

## Step 2: Set Environment Variables in Render

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Click on your PhishingShield service**
3. **Go to "Environment" tab** (in the left sidebar)
4. **Add these environment variables**:

### Required Variables:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `EMAIL_USER` | `phishingshield@gmail.com` | Your Gmail address |
| `EMAIL_PASS` | `your-app-password` | Gmail App Password (see below) |
| `JWT_SECRET` | `generate-random-string` | Optional but recommended |

### How to Get Gmail App Password:

1. Go to https://myaccount.google.com/apppasswords
2. Sign in with your Gmail account
3. Select "Mail" and "Other (Custom name)"
4. Enter "PhishingShield Render"
5. Click "Generate"
6. Copy the 16-character password (no spaces)
7. Paste it as the value for `EMAIL_PASS`

### Generate JWT_SECRET (optional):

Run this in your terminal:
```bash
openssl rand -base64 32
```

Copy the output and use it as `JWT_SECRET` value.

---

## Step 3: Save and Redeploy

1. **Click "Save Changes"** after adding environment variables
2. **Go to "Events" or "Logs" tab** to watch the deployment
3. **Wait for deployment to complete** (usually 2-3 minutes)

---

## Step 4: Verify Deployment

### Check Server is Running:

1. **Look at the logs** in Render dashboard
2. You should see: `PhishingShield Backend running on port XXXX`
3. **No more "localhost" errors**

### Test the API:

1. **Get your Render service URL** (e.g., `https://phishingshield.onrender.com`)
2. **Test the health endpoint**:
   ```
   GET https://your-service-url.onrender.com/api/reports
   ```
   Should return: `[]` (empty array)

3. **Test OTP endpoint** (if email is configured):
   ```
   POST https://your-service-url.onrender.com/api/send-otp
   Content-Type: application/json
   
   {
     "email": "test@example.com"
   }
   ```

### Check OTP in Logs:

If email fails (which is common), check the Render logs:
- Go to **Logs** tab in Render dashboard
- Look for: `[OTP FALLBACK] Code for test@example.com: XXXX`
- The OTP will be logged there

---

## Step 5: Update Your Frontend/Extension

Update your extension's API endpoint to point to your Render URL:

1. **Find where you set the API URL** (probably in `js/background.js` or similar)
2. **Change from** `http://localhost:10000` 
3. **Change to** `https://your-service-url.onrender.com`

Example:
```javascript
const API_URL = 'https://phishingshield.onrender.com';
```

---

## ✅ Expected Results

After deployment, you should see:

✅ Server starts without errors  
✅ No "Connection refused" errors  
✅ API endpoints respond  
✅ OTPs are either sent via email OR logged to console  

---

## ⚠️ If Email Still Times Out

This is **normal** on Render. The server will:
- ✅ Still work perfectly
- ✅ Log OTPs to console (check Render logs)
- ✅ Return success responses

**To fix email completely**, consider:
- Using SendGrid (see `RENDER_DEPLOYMENT.md`)
- Using Mailgun
- Using AWS SES

---

## 🆘 Need Help?

If you encounter issues:

1. **Check Render logs** - Most errors are visible there
2. **Verify environment variables** are set correctly
3. **Check service is running** - Status should be "Live"
4. **Test API endpoints** using curl or Postman

---

## Quick Checklist

- [ ] Code changes committed/pushed (if using Git)
- [ ] Environment variables set in Render:
  - [ ] `EMAIL_USER`
  - [ ] `EMAIL_PASS` 
  - [ ] `JWT_SECRET` (optional)
- [ ] Service redeployed
- [ ] Server starts successfully (check logs)
- [ ] API endpoints respond
- [ ] Frontend updated with new API URL

