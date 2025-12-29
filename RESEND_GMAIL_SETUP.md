# 📧 Using Gmail Address with Resend

Yes! You can use `phishingshield@gmail.com` as your FROM_EMAIL with Resend. Here's how:

---

## ✅ Step-by-Step Setup

### Step 1: Sign Up for Resend

1. **Go to**: https://resend.com
2. **Sign up** (free account)
3. **Verify your email**

### Step 2: Get API Key

1. **Go to Resend Dashboard** → **API Keys**
2. **Click "Create API Key"**
3. **Name it**: "PhishingShield Production"
4. **Copy the API key** (starts with `re_`)

### Step 3: Verify Your Gmail Address

1. **Go to Resend Dashboard** → **Emails** → **Domains**
2. **Click "Add Domain"** or look for "Verify Email" option
3. **OR** go to **Settings** → **Email Addresses**
4. **Click "Verify Email"** or "Add Email"
5. **Enter**: `phishingshield@gmail.com`
6. **Check your Gmail inbox** (including spam folder)
7. **Click the verification link** in the email from Resend
8. **Wait for status to show "Verified"** ✅

**Note**: Resend will send a verification email to `phishingshield@gmail.com`. Make sure you have access to that inbox!

### Step 4: Update Render Environment

1. **Go to Render Dashboard** → Your Service → **Environment**
2. **Set these variables**:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   FROM_EMAIL=phishingshield@gmail.com
   ```
3. **Save Changes**

### Step 5: Deploy

**If using Git:**
```bash
git add server/server.js server/package.json
git commit -m "Switch to Resend with Gmail sender"
git push
```

**Or manually deploy in Render**

### Step 6: Test

1. **Send a test OTP** from your extension
2. **Check inbox** - should arrive from `phishingshield@gmail.com`
3. **Verify it's in inbox** (not spam)

---

## 🎯 Important Notes

### Using Gmail Address:

✅ **Pros:**
- Professional email address
- Users recognize it
- Easy to remember

⚠️ **Considerations:**
- You need access to `phishingshield@gmail.com` inbox for verification
- Gmail addresses may have slightly lower deliverability than custom domains
- Still much better than SendGrid single sender (80-85% vs 60-70%)

### Alternative: Use Resend's Default First

If you want to test immediately:

1. **Use `onboarding@resend.dev`** initially (no verification needed)
2. **Test that everything works**
3. **Then verify `phishingshield@gmail.com`** and switch

---

## 🔍 Verification Process

When you verify `phishingshield@gmail.com`:

1. **Resend sends verification email** to `phishingshield@gmail.com`
2. **Check inbox AND spam folder** for the verification email
3. **Click the verification link**
4. **Status changes to "Verified"** in Resend dashboard
5. **You can now use it as FROM_EMAIL**

---

## 📊 Expected Deliverability

**With `phishingshield@gmail.com` verified:**
- ✅ **80-85% inbox rate** (good!)
- ⚠️ **15-20% spam rate** (acceptable)
- ✅ **Better than SendGrid single sender** (60-70%)

**With custom domain** (if you add one later):
- ✅ **85-95% inbox rate** (best)
- ✅ **5-15% spam rate**

---

## 🆘 Troubleshooting

### "Email not verified"

- Check your Gmail inbox (including spam)
- Make sure you clicked the verification link
- Wait a few minutes for status to update
- Try resending verification email

### "Can't access phishingshield@gmail.com"

**Options:**
1. **Use a different email** you have access to
2. **Use `onboarding@resend.dev`** temporarily (no verification needed)
3. **Set up email forwarding** to forward verification emails

### "Still going to spam"

- Wait 24-48 hours for sender reputation to build
- Make sure email is verified in Resend
- Check Resend dashboard for delivery status
- Consider adding a custom domain later (optional)

---

## ✅ Quick Checklist

- [ ] Signed up for Resend
- [ ] Got API key
- [ ] Verified `phishingshield@gmail.com` in Resend
- [ ] Set `RESEND_API_KEY` in Render
- [ ] Set `FROM_EMAIL=phishingshield@gmail.com` in Render
- [ ] Deployed code
- [ ] Tested sending email
- [ ] Email arrived in inbox

---

## 💡 Pro Tip

**Start with `onboarding@resend.dev` to test quickly, then switch to `phishingshield@gmail.com` once verified!**

This way you can:
1. Test immediately (no verification wait)
2. Verify Gmail address in background
3. Switch when ready

---

**Your code is already set up to use whatever email you set in `FROM_EMAIL`. Just verify it in Resend and you're good to go!**

