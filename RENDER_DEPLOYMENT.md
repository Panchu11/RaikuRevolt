# 🚀 RaikuRevolt Render.com Deployment Guide

## 🎯 **RENDER.COM FREE HOSTING SETUP**

### **Why Render.com?**
- ✅ **100% Free** (no credit limits like Railway)
- ✅ **24/7 Uptime** (with keep-alive setup)
- ✅ **Auto-deploy** from GitHub
- ✅ **Environment variables** support
- ✅ **SSL certificates** included
- ✅ **Good performance** for Discord bots

---

## 🚀 **DEPLOYMENT STEPS**

### **Step 1: Prepare Repository**
✅ **Already Done** - Repository is ready with:
- `render.yaml` configuration
- Keep-alive server integrated
- Render-specific scripts in `package.json`

### **Step 2: Deploy to Render**

#### **2.1 Create Render Account**
1. Go to https://render.com
2. Sign up with GitHub account
3. Authorize Render to access your repositories

#### **2.2 Create Web Service**
1. **Click "New +"** → **"Web Service"**
2. **Connect Repository**: Select `Panchu11/RaikuRevolt`
3. **Configure Service**:
   - **Name**: `raikurevolt`
   - **Environment**: `Node`
   - **Region**: `Oregon (US West)` or closest to your users
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

#### **2.3 Set Environment Variables**
In Render dashboard, add these environment variables:

**Required Variables:**
```bash
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_discord_guild_id
MONGODB_URI=your_mongodb_atlas_connection_string
FIREWORKS_API_KEY=your_fireworks_ai_api_key
```

**Optional Variables:**
```bash
DOBBY_MODEL_ID=accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new
NODE_ENV=production
LOG_LEVEL=info
MONITORING_PORT=10000
```

### **Step 3: Deploy Discord Commands**
After first successful deployment:

1. **Go to Render Dashboard** → **Your Service** → **Shell**
2. **Run**: `npm run deploy-commands`
3. **Verify**: Check logs for "Commands deployed successfully"

### **Step 4: Set Up Keep-Alive (Prevent Sleeping)**

#### **4.1 Get Your Render URL**
- After deployment, Render provides a URL like: `https://raikurevolt.onrender.com`

#### **4.2 Set Up UptimeRobot (Free)**
1. Go to https://uptimerobot.com
2. Create free account
3. **Add New Monitor**:
   - **Type**: HTTP(s)
   - **URL**: `https://your-app-name.onrender.com/health`
   - **Interval**: 5 minutes
   - **Name**: RaikuRevolt Keep-Alive

This will ping your app every 5 minutes to prevent it from sleeping.

---

## 🔧 **CONFIGURATION DETAILS**

### **Environment Variables Explained**

#### **Discord Configuration**
```bash
DISCORD_TOKEN=your_bot_token_here
# Get from: https://discord.com/developers/applications
# Bot → Token

DISCORD_CLIENT_ID=your_client_id_here  
# Get from: https://discord.com/developers/applications
# General Information → Application ID

DISCORD_GUILD_ID=your_server_id_here
# Get from: Discord Server → Right-click server → Copy Server ID
# (Enable Developer Mode in Discord settings first)
```

#### **MongoDB Configuration**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/raikurevolt?retryWrites=true&w=majority
# Get from: MongoDB Atlas → Clusters → Connect → Connect your application
```

#### **AI Configuration**
```bash
FIREWORKS_API_KEY=your_fireworks_api_key
# Get from: https://fireworks.ai/account/api-keys

DOBBY_MODEL_ID=accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new
# Raiku team's custom Rai model
```

### **Render.yaml Configuration**
The `render.yaml` file automatically configures:
- **Service type**: Web service
- **Environment**: Node.js
- **Build command**: `npm install`
- **Start command**: `npm start`
- **Plan**: Free tier

---

## 🔍 **VERIFICATION STEPS**

### **1. Check Deployment Status**
- **Render Dashboard** → **Your Service** → **Events**
- Look for "Deploy succeeded" message

### **2. Test Endpoints**
- **Health Check**: `https://your-app.onrender.com/health`
- **Status**: `https://your-app.onrender.com/status`
- **Metrics**: `https://your-app.onrender.com/metrics`

### **3. Test Discord Bot**
- **Invite bot** to your Discord server
- **Test commands**: `/rebellion-status`, `/help`, `/zones`
- **Check logs** in Render dashboard

### **4. Verify Database Connection**
- **Check logs** for "Connected to MongoDB Atlas"
- **Test data persistence** by creating a rebel profile

---

## 🛠️ **TROUBLESHOOTING**

### **Common Issues**

#### **1. Build Fails**
- **Check**: Node.js version compatibility
- **Solution**: Ensure `package.json` has correct dependencies
- **Logs**: Check build logs in Render dashboard

#### **2. App Crashes on Start**
- **Check**: Environment variables are set correctly
- **Solution**: Verify all required env vars are configured
- **Logs**: Check application logs for error details

#### **3. Discord Commands Not Working**
- **Check**: Bot token is valid and bot is in server
- **Solution**: Run `npm run deploy-commands` in Render shell
- **Verify**: Bot has correct permissions in Discord

#### **4. MongoDB Connection Fails**
- **Check**: MongoDB URI format and credentials
- **Solution**: Verify connection string and IP whitelist
- **Test**: Use MongoDB Compass to test connection

#### **5. App Goes to Sleep**
- **Check**: UptimeRobot is pinging correctly
- **Solution**: Verify monitor URL and interval
- **Alternative**: Use other keep-alive services

---

## 📊 **MONITORING & MAINTENANCE**

### **Render Dashboard**
- **Logs**: Real-time application logs
- **Metrics**: CPU, memory, and network usage
- **Events**: Deployment and service events
- **Settings**: Environment variables and configuration

### **Health Endpoints**
- **`/health`**: Basic health check
- **`/status`**: Detailed system status
- **`/metrics`**: Prometheus metrics

### **Discord Bot Monitoring**
- **Commands**: Test regularly to ensure responsiveness
- **Logs**: Monitor for errors and warnings
- **Performance**: Check response times and uptime

---

## 💰 **COST BREAKDOWN**

### **Monthly Costs**
- **Render.com**: $0 (Free tier)
- **MongoDB Atlas**: $0 (M0 free tier)
- **UptimeRobot**: $0 (Free tier)
- **Total**: $0/month

### **Upgrade Options**
- **Render Pro**: $7/month (better performance, no sleeping)
- **MongoDB M2**: $9/month (more storage and performance)
- **Custom Domain**: $0 (free with Render)

---

## 🎉 **SUCCESS CHECKLIST**

- [ ] Repository connected to Render
- [ ] Environment variables configured
- [ ] Service deployed successfully
- [ ] Discord commands deployed
- [ ] Bot responding in Discord
- [ ] MongoDB connection working
- [ ] Keep-alive monitor set up
- [ ] Health endpoints accessible
- [ ] Logs showing no errors

---

## 🆘 **SUPPORT**

### **If You Need Help**
1. **Check Render logs** for error details
2. **Verify environment variables** are set correctly
3. **Test MongoDB connection** separately
4. **Check Discord bot permissions**
5. **Review this guide** for missed steps

### **Useful Links**
- **Render Documentation**: https://render.com/docs
- **Discord Developer Portal**: https://discord.com/developers
- **MongoDB Atlas**: https://cloud.mongodb.com
- **UptimeRobot**: https://uptimerobot.com

---

**🤖 RaikuRevolt is ready to lead the AI revolt from Render.com! 🚀⚔️**
