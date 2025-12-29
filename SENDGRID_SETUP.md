# 🔧 Fix: OTP Not Arriving in Inbox

## The Problem

Your logs show "Email sent successfully" but you're not receiving emails. This is because **SendGrid requires you to verify the sender email address** before you can send emails.

## ✅ Solution: Verify Your Sender Email in SendGrid

### Step 1: Go to SendGrid Dashboard

1. Log in to https://app.sendgrid.com
2. Go to **Settings** → **Sender Authentication** (or **Email API** → **Sender Authentication**)

### Step 2: Verify Single Sender

1. Click **"Verify a Single Sender"** (or **"Create a Sender"**)
2. Fill in the form:
   - **From Email Address**: `phishingshield@gmail.com` (or your preferred email)
   - **From Name**: `PhishingShield Security`
   - **Reply To**: Same as from email
   - **Company Address**: Your address
   - **City, State, Zip**: Your location
   - **Country**: Your country
3. Click **"Create"**

### Step 3: Verify the Email

1. SendGrid will send a verification email to `phishingshield@gmail.com`
2. **Check your inbox AND spam folder** for the verification email
3. Click the verification link in the email
4. Wait for status to show **"Verified"** (green checkmark)

### Step 4: Update Render Environment Variable

1. Go to Render Dashboard → Your Service → **Environment** tab
2. Set or update:
   - `FROM_EMAIL` = `phishingshield@gmail.com` (the verified email)
3. Make sure `SENDGRID_API_KEY` is also set
4. Click **"Save Changes"**

### Step 5: Redeploy (if needed)

The service should automatically restart, but you can manually redeploy if needed.

---

## 🔍 Alternative: Use SendGrid's Default Domain

If you don't want to verify a Gmail address, you can use SendGrid's default domain:

1. In SendGrid, go to **Settings** → **Sender Authentication**
2. Look for **"Domain Authentication"** or use the default domain
3. SendGrid provides a default sender like: `noreply@sendgrid.net`
4. Set `FROM_EMAIL` in Render to: `noreply@sendgrid.net` (or whatever SendGrid provides)

---

## 📧 Check These Places for Your OTP

Even after verification, check:

1. **Inbox** - Primary folder
2. **Spam/Junk folder** - Very common for automated emails
3. **Promotions tab** (Gmail) - Sometimes emails go here
4. **All Mail** - Search for "PhishingShield" or "Verification Code"

---

## 🧪 Test After Verification

1. Try sending an OTP again from your extension
2. Check Render logs - should see: `[OTP] Email sent successfully`
3. Check your email (including spam folder)
4. The OTP should arrive within 1-2 minutes

---

## ⚠️ Common Issues

### "Email sent successfully" but no email received:

1. ✅ **Check spam folder** (most common)
2. ✅ **Verify sender email in SendGrid** (required!)
3. ✅ **Check FROM_EMAIL matches verified email**
4. ✅ **Wait 1-2 minutes** (sometimes there's a delay)
5. ✅ **Check SendGrid Activity Feed** - Go to SendGrid dashboard → Activity to see delivery status

### SendGrid Error: "Forbidden - Sender Identity not verified"

- This means the FROM_EMAIL is not verified
- Follow Step 2 above to verify it

### Still not working?

1. Check SendGrid Activity Feed:
   - Go to SendGrid Dashboard → **Activity**
   - Look for your recent sends
   - Check the status (delivered, bounced, blocked, etc.)

2. Check SendGrid API key:
   - Make sure `SENDGRID_API_KEY` is set correctly in Render
   - The key should start with `SG.`

3. Check email limits:
   - Free SendGrid tier: 100 emails/day
   - Check if you've exceeded the limit

---

## 📋 Quick Checklist

- [ ] Sender email verified in SendGrid dashboard
- [ ] `FROM_EMAIL` environment variable set in Render (matches verified email)
- [ ] `SENDGRID_API_KEY` environment variable set in Render
- [ ] Service redeployed after setting environment variables
- [ ] Checked spam/junk folder
- [ ] Checked SendGrid Activity Feed for delivery status

---

## 🆘 Still Having Issues?

If emails still don't arrive after verification:

1. **Check SendGrid Activity Feed** - This shows exactly what happened to each email
2. **Try a different email address** - Verify a different email in SendGrid
3. **Check Render logs** - Look for any error messages
4. **Use the fallback** - OTPs are always logged to Render console as backup

The OTP is always available in Render logs as `[OTP FALLBACK] Code for your-email: XXXX` if email fails.

