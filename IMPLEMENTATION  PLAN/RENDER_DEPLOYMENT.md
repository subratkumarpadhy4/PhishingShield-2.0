# Render Deployment Guide for PhishingShield

## Quick Fix Summary

The server has been updated to work with Render. The main changes:
1. ✅ Server now binds to `0.0.0.0` (required for Render)
2. ✅ Better email error handling with timeouts
3. ✅ Environment variable configuration for email credentials

## Environment Variables to Set in Render

Go to your Render dashboard → Your Service → Environment → Add the following:

### Required Variables:

1. **PORT** (usually auto-set by Render, but verify it exists)
   - Render automatically sets this, but ensure it's present

2. **EMAIL_USER** (optional but recommended)
   - Your Gmail address (e.g., `phishingshield@gmail.com`)
   - If not set, OTPs will be logged to console only

3. **EMAIL_PASS** (optional but recommended)
   - Your Gmail App Password (not your regular password)
   - Generate one at: https://myaccount.google.com/apppasswords
   - If not set, OTPs will be logged to console only

4. **JWT_SECRET** (optional but recommended for production)
   - A secure random string for JWT token signing
   - Generate one: `openssl rand -base64 32`
   - Default is used if not set (not secure for production)

5. **NODE_ENV** (optional)
   - Set to `production` for production deployments

## Email Configuration Notes

### Why Email Might Fail on Render:

1. **Network Restrictions**: Some cloud platforms block outbound SMTP connections
2. **Firewall Rules**: Gmail may block connections from cloud IPs
3. **Port Blocking**: Ports 587/465 might be blocked

### Solutions:

1. **Use Environment Variables**: Set `EMAIL_USER` and `EMAIL_PASS` in Render dashboard
2. **Alternative Email Services**: Consider using:
   - SendGrid (recommended for cloud)
   - Mailgun
   - AWS SES
   - Resend
3. **Fallback Behavior**: The server will log OTPs to console if email fails, so the app still works

## Render Service Configuration

### Build Command:
```bash
npm install
```

### Start Command:
```bash
npm start
```

### Health Check Path (optional):
```
/api/reports
```

## Testing After Deployment

1. Check logs in Render dashboard to see if server started successfully
2. Test OTP endpoint: `POST /api/send-otp` with `{ "email": "test@example.com" }`
3. Check logs for OTP code if email fails
4. Verify server responds: `GET /api/reports`

## Troubleshooting

### Server Not Starting:
- Check that `PORT` environment variable is set
- Verify `package.json` has correct start script
- Check Render logs for errors

### Email Timeout Errors:
- This is expected if SMTP is blocked
- OTPs will be logged to console (check Render logs)
- Consider switching to SendGrid or another email service

### Connection Refused:
- Ensure server binds to `0.0.0.0` (already fixed in code)
- Check Render service is running
- Verify port is correct

## Alternative: Use SendGrid for Email

If Gmail continues to timeout, here's how to switch to SendGrid:

1. Sign up at https://sendgrid.com
2. Get API key from SendGrid dashboard
3. Update email configuration in `server.js`:

```javascript
transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
    }
});
```

4. Set `SENDGRID_API_KEY` environment variable in Render

