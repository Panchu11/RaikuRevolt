# 🚀 **PRODUCTION DEPLOYMENT GUIDE FOR RAIKU TEAM**

## 📋 **OVERVIEW**

This guide provides step-by-step instructions for deploying RaikuRevolt to production with 1000+ user capacity.

---

## 🔧 **PREREQUISITES**

### **Required Services**
1. **Render Account** - For hosting and PostgreSQL database
2. **Discord Developer Account** - For bot application
3. **Fireworks AI Account** - For Raiku Rai model access

### **Optional Services (Recommended)**
1. **Sentry Account** - For error tracking
2. **AWS Account** - For backup storage

---

## 🗄️ **DATABASE SETUP**

### **Step 1: Create Render PostgreSQL Database**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" → "PostgreSQL"
3. Configure database:
   - **Name:** `raikurevolt-database`
   - **Database:** `raikurevolt_revolt`
   - **User:** `raikurevolt_user`
   - **Region:** Choose closest to your users
   - **Plan:** Starter ($7/month) or higher for production

### **Step 2: Get Database Connection String**
1. After creation, go to database dashboard
2. Copy the "External Database URL"
3. Format: `postgresql://username:password@host:port/database`

---

## 🤖 **DISCORD BOT SETUP**

### **Step 1: Create Discord Application**
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name: "RaikuRevolt - AI Revolt"
4. Go to "Bot" section
5. Click "Add Bot"
6. Copy the bot token

### **Step 2: Configure Bot Permissions**
Required permissions:
- Send Messages
- Use Slash Commands
- Embed Links
- Attach Files
- Read Message History
- Add Reactions
- Use External Emojis
- Manage Messages

### **Step 3: Generate Invite URL**
1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`, `applications.commands`
3. Select permissions (use permission calculator: 2147862592)
4. Copy generated URL

---

## 🚀 **RENDER DEPLOYMENT**

### **Step 1: Create Web Service**
1. Go to Render Dashboard
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure service:
   - **Name:** `raikurevolt-bot`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm run render-start`
   - **Plan:** Starter ($7/month) or higher

### **Step 2: Configure Environment Variables**
Add these environment variables in Render dashboard:

```bash
# Required Variables
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_discord_server_id
DATABASE_URL=your_postgresql_connection_string
FIREWORKS_API_KEY=your_fireworks_api_key
RAI_MODEL_ID=accounts/raikufoundation/models/rai-unhinged-llama-3-3-70b-new
ADMIN_USER_IDS=your_admin_discord_user_ids

# Production Configuration
NODE_ENV=production
LOG_LEVEL=info
MONITORING_PORT=10000

# Game Configuration
DAILY_ENERGY=100
RAID_COOLDOWN=300
MAX_INVENTORY_SIZE=50
BACKUP_INTERVAL=30
ENERGY_REGEN_RATE=1

# Security Configuration
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

### **Step 3: Deploy**
1. Click "Create Web Service"
2. Wait for deployment to complete
3. Check logs for any errors
4. Test health endpoint: `https://your-app.onrender.com/health`

---

## 🧪 **TESTING DEPLOYMENT**

### **Step 1: Health Checks**
1. Visit: `https://your-app.onrender.com/health`
2. Should return: `{"status": "healthy", ...}`

### **Step 2: Discord Bot Testing**
1. Invite bot to your Discord server
2. Test basic command: `/help`
3. Test admin command: `/admin status`
4. Test game command: `/rebellion-status`

### **Step 3: Database Testing**
1. Create a user: `/rebellion-status`
2. Check database for user record
3. Test data persistence across restarts

---

## 📊 **MONITORING SETUP**

### **Health Monitoring**
- Health endpoint: `https://your-app.onrender.com/health`
- Metrics endpoint: `https://your-app.onrender.com/metrics`
- Admin dashboard: `/admin status` command

### **Error Tracking (Optional)**
1. Create Sentry account
2. Add `SENTRY_DSN` environment variable
3. Monitor errors in Sentry dashboard

---

## 🔒 **SECURITY CHECKLIST**

- [ ] All environment variables set correctly
- [ ] No hardcoded credentials in code
- [ ] Admin user IDs configured for Raiku team
- [ ] Rate limiting enabled
- [ ] HTTPS enforced (automatic on Render)
- [ ] Database access restricted

---

## 📈 **SCALING FOR 1000+ USERS**

### **Recommended Upgrades**
1. **Render Plan:** Professional ($25/month) or higher
2. **Database Plan:** Standard ($20/month) or higher
3. **Redis Cache:** Add Redis for session management
4. **Load Balancing:** Multiple instances if needed

### **Performance Monitoring**
- Monitor memory usage via `/admin performance`
- Watch database connection count
- Monitor response times
- Set up alerts for high usage

---

## 🆘 **TROUBLESHOOTING**

### **Common Issues**
1. **Bot not responding:** Check Discord token and permissions
2. **Database errors:** Verify DATABASE_URL format
3. **AI not working:** Check Fireworks API key
4. **Admin access denied:** Verify ADMIN_USER_IDS

### **Support Resources**
- Check Render logs for errors
- Use `/admin status` for system health
- Monitor database performance in Render dashboard

---

## ✅ **DEPLOYMENT CHECKLIST**

- [ ] PostgreSQL database created and configured
- [ ] Discord bot application created
- [ ] All environment variables set
- [ ] Render web service deployed
- [ ] Health checks passing
- [ ] Bot responding to commands
- [ ] Admin access working
- [ ] Database persistence confirmed
- [ ] Monitoring configured
- [ ] Security measures verified

**🎉 Your RaikuRevolt bot is now ready for production with 1000+ users!**
