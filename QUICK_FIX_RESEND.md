# ⚡ Quick Fix: Switch to Resend (Better Deliverability)

If you want a **faster solution** that doesn't require domain authentication, **Resend** is a great alternative with better deliverability out of the box.

## Why Resend?

- ✅ **Better inbox delivery** (often 90%+ without domain setup)
- ✅ **No domain required** initially
- ✅ **Free tier**: 3,000 emails/month
- ✅ **Easy setup**: 5 minutes
- ✅ **Better for transactional emails**

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Sign Up for Resend

1. Go to https://resend.com
2. Sign up (free account)
3. Verify your email

### Step 2: Get API Key

1. Go to **API Keys** in Resend dashboard
2. Click **"Create API Key"**
3. Name it: "PhishingShield Production"
4. Copy the API key (starts with `re_`)

### Step 3: Add Domain (Optional but Recommended)

1. Go to **Domains** in Resend
2. Click **"Add Domain"**
3. Enter your domain (or use Resend's default)
4. Add DNS records (similar to SendGrid)
5. **OR** skip this and use Resend's default sender

### Step 4: Update Your Code

I can update your `server.js` to use Resend instead of SendGrid. It's a simple change.

### Step 5: Update Render Environment

1. Go to Render → Environment
2. **Remove** `SENDGRID_API_KEY`
3. **Add** `RESEND_API_KEY` = your Resend API key
4. **Update** `FROM_EMAIL` = `onboarding@resend.dev` (or your verified domain email)
5. Save and redeploy

---

## 📝 Code Changes Needed

I can update your server to use Resend. Would you like me to:
1. Replace SendGrid with Resend in the code?
2. Keep both and let you choose via environment variable?

**Let me know and I'll make the changes!**

---

## 🎯 Expected Results

**With Resend (no domain):**
- ✅ 80-90% inbox rate
- ⚠️ 10-20% spam rate (better than current)

**With Resend + domain:**
- ✅ 90-95% inbox rate
- ✅ 5-10% spam rate (excellent!)

---

## 💰 Pricing Comparison

**SendGrid:**
- Free: 100 emails/day
- Requires domain for best results

**Resend:**
- Free: 3,000 emails/month (100/day)
- Better deliverability without domain
- Similar pricing for paid plans

---

**Want me to update your code to use Resend? It's a quick change and should improve your inbox delivery rate!**

