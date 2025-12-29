# 📧 EmailJS Setup Guide

I've switched your code to use **EmailJS** instead of SendGrid/Resend. EmailJS is perfect for your use case!

## ✅ Why EmailJS?

- ✅ **Works with Gmail** - No domain verification needed!
- ✅ **Free tier**: 200 emails/month
- ✅ **Already configured** in your codebase
- ✅ **Simple setup** - Just uses your existing EmailJS account
- ✅ **No API keys needed** - Uses public key (already in code)

---

## 🎯 Setup Steps

### Step 1: Verify EmailJS Configuration

Your EmailJS is already configured in the code:
- **Service ID**: `service_orcv7av`
- **Template ID**: `template_f0lfm5h`
- **Public Key**: `BxDgzDbuSkLEs4H_9`

### Step 2: Update Render Environment (Optional)

You can override these in Render if needed:

1. **Go to Render Dashboard** → Your Service → **Environment**
2. **Optional - Add these** (if you want to use different values):
   ```
   EMAILJS_SERVICE_ID=service_orcv7av
   EMAILJS_TEMPLATE_ID=template_f0lfm5h
   EMAILJS_PUBLIC_KEY=BxDgzDbuSkLEs4H_9
   ```
3. **Remove** (if they exist):
   - `SENDGRID_API_KEY`
   - `RESEND_API_KEY`
   - `FROM_EMAIL` (EmailJS uses template settings)

### Step 3: Verify EmailJS Template

1. **Go to EmailJS Dashboard**: https://dashboard.emailjs.com
2. **Check your template** (`template_f0lfm5h`)
3. **Make sure it's set up** to send from your Gmail
4. **Verify the template** includes:
   - `{{otp}}` - OTP code
   - `{{to_email}}` - Recipient email
   - `{{to_name}}` - Recipient name

### Step 4: Deploy

**If using Git:**
```bash
git add server/server.js server/package.json
git commit -m "Switch to EmailJS - works with Gmail, no domain needed"
git push
```

**Or manually deploy in Render**

---

## 📊 How It Works

EmailJS uses **email templates** configured in your EmailJS dashboard:
- The template defines the email format
- The FROM email is set in EmailJS dashboard (your Gmail)
- The code sends data to EmailJS API
- EmailJS sends the email using your Gmail account

---

## ✅ Expected Results

**With EmailJS:**
- ✅ **Works immediately** - No verification needed
- ✅ **Uses your Gmail** - Set in EmailJS dashboard
- ✅ **Can send to anyone** - No restrictions
- ✅ **Free tier**: 200 emails/month
- ⚠️ **Deliverability**: Similar to SendGrid single sender (60-70% inbox)

---

## 🔍 Verify Setup

### Check EmailJS Dashboard

1. **Go to**: https://dashboard.emailjs.com
2. **Check Services** - Make sure your Gmail service is connected
3. **Check Templates** - Verify template is set up correctly
4. **Check Usage** - Monitor email count (200/month free)

### Check Render Logs

After deployment, you should see:
```
[EMAIL] EmailJS initialized successfully
[EMAIL] Service ID: service_orcv7av
[EMAIL] No domain verification needed - works with Gmail!
[EMAIL] Free tier: 200 emails/month
```

---

## 🆘 Troubleshooting

### "EmailJS not configured"

- Check that Service ID, Template ID, and Public Key are set
- They're already in the code, but you can override with environment variables

### "Template not found"

- Go to EmailJS dashboard
- Check that template `template_f0lfm5h` exists
- Verify it's set up correctly

### "Service not connected"

- Go to EmailJS dashboard → Services
- Make sure your Gmail service is connected
- Reconnect if needed

### "Rate limit exceeded"

- Free tier: 200 emails/month
- Check usage in EmailJS dashboard
- Upgrade if needed (or wait for next month)

---

## 💡 Pro Tips

1. **Monitor Usage**: Check EmailJS dashboard regularly
2. **Template Design**: Customize your email template in EmailJS dashboard
3. **FROM Email**: Set in EmailJS service settings (your Gmail)
4. **Upgrade**: If you need more than 200 emails/month, EmailJS has paid plans

---

## ✅ Quick Checklist

- [x] EmailJS already configured in code ✅
- [ ] Removed SendGrid/Resend environment variables (if they exist)
- [ ] Verified EmailJS template in dashboard
- [ ] Verified Gmail service connected in EmailJS
- [ ] Deployed updated code
- [ ] Tested sending an OTP
- [ ] Email arrived successfully

---

**EmailJS is perfect for your use case - it works with Gmail without any domain verification! Just deploy and you're good to go!**

