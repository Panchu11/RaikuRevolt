# PebbleHost Deployment Configuration for RaikuRevolt

## 🚀 **PEBBLEHOST SETUP GUIDE**

### **📋 PREREQUISITES**

1. **PebbleHost Account** (Raiku team will need to create this)
2. **MongoDB Atlas Cluster** (Raiku team will need to set up)
3. **Discord Bot Application** (Raiku team will need to create)
4. **Fireworks AI API Key** (Raiku team should have this)

### **🎯 RECOMMENDED PEBBLEHOST PLAN**

**For RaikuRevolt Production Deployment:**
- **Plan**: Premium or Business Plan
- **RAM**: Minimum 2GB (4GB recommended for high traffic)
- **Storage**: Minimum 10GB
- **Node.js Version**: 18.x or higher
- **Location**: Choose closest to your user base

### **⚙️ PEBBLEHOST CONFIGURATION**

#### **1. Environment Variables Setup**

In PebbleHost control panel, set these environment variables:

```bash
# Discord Configuration
DISCORD_TOKEN=your_raiku_team_discord_token
DISCORD_CLIENT_ID=your_raiku_team_client_id
DISCORD_GUILD_ID=your_raiku_team_guild_id

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/raikurevolt

# AI Configuration
FIREWORKS_API_KEY=your_raiku_team_fireworks_key
RAI_MODEL_ID=accounts/raikufoundation/models/rai-unhinged-llama-3-3-70b-new

# Server Configuration
NODE_ENV=production
LOG_LEVEL=info
MONITORING_PORT=3000

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

#### **2. Package.json Scripts for PebbleHost**

The following scripts are already configured in package.json:

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "deploy-commands": "node src/deploy-commands.js",
    "test": "jest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

#### **3. PebbleHost Startup Command**

Set the startup command in PebbleHost to:
```bash
npm start
```

#### **4. Port Configuration**

PebbleHost will automatically set the PORT environment variable. The application is configured to use:
- **Default Port**: 3000 (for monitoring)
- **Discord Bot**: Runs on the same process

### **📁 FILE STRUCTURE FOR DEPLOYMENT**

```
raikurevolt/
├── src/                    # Source code
├── docs/                   # Documentation
├── deployment/             # Deployment configs
├── tests/                  # Test files
├── package.json           # Dependencies
├── .env.template          # Environment template
├── .env.raiku-team     # Raiku team config
└── README.md              # Project documentation
```

### **🔄 DEPLOYMENT PROCESS**

#### **Step 1: Prepare Repository**
```bash
# Clone the repository
git clone <repository-url>
cd raikurevolt

# Install dependencies
npm install

# Test locally (optional)
npm run dev
```

#### **Step 2: Configure Environment**
1. Copy `.env.raiku-team` to `.env`
2. Replace all placeholder values with actual Raiku team credentials
3. Test configuration locally

#### **Step 3: Deploy to PebbleHost**
1. Upload files to PebbleHost via FTP/SFTP or Git
2. Set environment variables in PebbleHost control panel
3. Set startup command to `npm start`
4. Start the application

#### **Step 4: Deploy Discord Commands**
```bash
# Run this once after deployment to register Discord commands
npm run deploy-commands
```

#### **Step 5: Verify Deployment**
1. Check application logs in PebbleHost
2. Visit monitoring endpoint: `https://your-domain.com/status`
3. Test Discord commands in your server

### **🔧 MONGODB ATLAS SETUP**

#### **1. Create MongoDB Atlas Cluster**
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create new project: "RaikuRevolt-Raiku"
3. Create cluster (M0 free tier for testing, M2+ for production)
4. Create database user with read/write permissions
5. Whitelist PebbleHost IP addresses

#### **2. Database Configuration**
- **Database Name**: `raikurevolt`
- **Collections**: Will be created automatically
- **Indexes**: Will be created automatically on first run

#### **3. Connection String Format**
```
mongodb+srv://username:password@cluster.mongodb.net/raikurevolt?retryWrites=true&w=majority
```

### **🛡️ SECURITY CONSIDERATIONS**

#### **1. Environment Variables**
- Never commit `.env` files to version control
- Use PebbleHost environment variable system
- Rotate credentials regularly

#### **2. MongoDB Security**
- Use strong passwords
- Enable IP whitelisting
- Use connection string with SSL

#### **3. Discord Bot Security**
- Keep bot token secure
- Use minimal required permissions
- Monitor bot usage

### **📊 MONITORING & MAINTENANCE**

#### **1. Health Monitoring**
- **Status Endpoint**: `/status`
- **Health Check**: `/health`
- **Metrics**: `/metrics`

#### **2. Log Monitoring**
- Check PebbleHost application logs
- Monitor error rates
- Set up alerts for critical issues

#### **3. Performance Monitoring**
- Monitor memory usage
- Check database response times
- Monitor Discord API rate limits

### **🔄 HANDOVER CHECKLIST**

#### **Before Handover:**
- [ ] Test all functionality locally
- [ ] Verify MongoDB connection
- [ ] Test Discord commands
- [ ] Check monitoring endpoints
- [ ] Validate security settings

#### **During Handover:**
- [ ] Provide Raiku team with access credentials
- [ ] Transfer PebbleHost account ownership
- [ ] Transfer MongoDB Atlas project
- [ ] Transfer Discord application ownership
- [ ] Provide documentation and support

#### **After Handover:**
- [ ] Verify Raiku team can deploy
- [ ] Test all functionality in production
- [ ] Monitor for issues
- [ ] Provide ongoing support as needed

### **🆘 TROUBLESHOOTING**

#### **Common Issues:**

1. **MongoDB Connection Failed**
   - Check connection string format
   - Verify IP whitelist includes PebbleHost IPs
   - Check database user permissions

2. **Discord Bot Not Responding**
   - Verify bot token is correct
   - Check bot permissions in Discord server
   - Ensure commands are deployed

3. **Application Won't Start**
   - Check PebbleHost logs for errors
   - Verify all environment variables are set
   - Check Node.js version compatibility

4. **High Memory Usage**
   - Monitor memory usage in PebbleHost
   - Consider upgrading to higher plan
   - Check for memory leaks in logs

### **📞 SUPPORT CONTACTS**

- **PebbleHost Support**: Available through their control panel
- **MongoDB Atlas Support**: Available through their console
- **Discord Developer Support**: Available through Discord Developer Portal

---

**This configuration ensures a smooth deployment and easy handover to the Raiku team while maintaining all functionality and security standards.**
