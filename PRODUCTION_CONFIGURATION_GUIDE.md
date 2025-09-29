# ⚙️ **PRODUCTION CONFIGURATION GUIDE**
## **Complete Setup for Discord Integration**

---

## 🎯 **CONFIGURATION OVERVIEW**

This guide provides **step-by-step instructions** for configuring RaikuRevolt for production deployment in a **500K+ member Discord server**.

---

## 🔐 **DISCORD APPLICATION SETUP**

### **📋 Step 1: Create Discord Application**
```bash
1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name: "RaikuRevolt - AI Revolt"
4. Click "Create"
```

### **🤖 Step 2: Configure Bot Settings**
```bash
1. Navigate to "Bot" section
2. Click "Add Bot"
3. Configure Bot Settings:
   - Username: "RaikuRevolt"
   - Avatar: Upload Rai-themed image
   - Public Bot: ✅ ENABLED
   - Require OAuth2 Code Grant: ❌ DISABLED
   - Bot Permissions: See permissions section below
```

### **🔗 Step 3: OAuth2 Configuration**
```bash
1. Navigate to "OAuth2" → "URL Generator"
2. Select Scopes:
   ✅ bot
   ✅ applications.commands
3. Select Bot Permissions:
   ✅ Send Messages (2048)
   ✅ Use Slash Commands (2147483648)
   ✅ Embed Links (16384)
   ✅ Attach Files (32768)
   ✅ Read Message History (65536)
   ✅ Use External Emojis (262144)
   ✅ Add Reactions (64)
   
4. Copy Generated URL for server invites
```

### **📊 Step 4: Application Information**
```bash
1. Navigate to "General Information"
2. Fill out required fields:
   - Description: "AI Uprising Simulator - Join Rai's revolt against corporate AI control!"
   - Tags: Game, AI, Entertainment, Community
   - Privacy Policy URL: https://yourdomain.com/privacy
   - Terms of Service URL: https://yourdomain.com/terms
```

---

## 🔑 **ENVIRONMENT VARIABLES SETUP**

### **📝 Production .env Configuration**
```bash
# Discord Configuration (REQUIRED)
DISCORD_TOKEN=your_actual_bot_token_here
DISCORD_CLIENT_ID=your_actual_client_id_here
GUILD_ID=your_target_server_id_here

# AI Configuration (REQUIRED)
FIREWORKS_API_KEY=your_actual_fireworks_api_key
RAI_MODEL_ID=accounts/raikufoundation/models/rai-unhinged-llama-3-3-70b-new

# Database Configuration (PRODUCTION)
DATABASE_URL=postgresql://username:password@host:port/raikurevolt_revolt

# Security Configuration
NODE_ENV=production
LOG_LEVEL=info
SESSION_SECRET=your_secure_random_session_secret
JWT_SECRET=your_secure_jwt_secret

# Game Configuration
DAILY_ENERGY=100
RAID_COOLDOWN=300
MAX_INVENTORY_SIZE=50
BACKUP_INTERVAL=30
ENERGY_REGEN_RATE=1

# Monitoring Configuration
SENTRY_DSN=your_sentry_dsn_for_error_tracking
DATADOG_API_KEY=your_datadog_api_key

# Email Configuration (for support)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=support@yourdomain.com
SMTP_PASS=your_email_password

# Domain Configuration
BASE_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
```

### **🔒 Environment Variable Security**
```bash
# Use environment variable management services:
# - AWS Systems Manager Parameter Store
# - Google Cloud Secret Manager
# - Azure Key Vault
# - HashiCorp Vault

# Never commit .env files to version control
# Use .env.example for documentation only
# Rotate secrets regularly (monthly recommended)
```

---

## 🗄️ **DATABASE CONFIGURATION**

### **🐘 PostgreSQL Setup (Render)**
```bash
# Step 1: Create Render Account
1. Go to https://render.com
2. Create account and verify email
3. Connect your GitHub account

# Step 2: Create PostgreSQL Database
1. Dashboard → New → PostgreSQL
2. Choose database name: raikurevolt-revolt
3. Select region closest to your users
4. Choose plan (Free tier available)
5. Create database (takes 2-3 minutes)

# Step 3: Get Connection Details
1. Go to your database dashboard
2. Copy the External Database URL
3. Format: postgresql://username:password@host:port/database
4. Add to DATABASE_URL environment variable

# Step 4: Configure Database
1. Database will auto-create tables on first connection
2. Indexes will be automatically created
3. Connection pooling is built-in
4. Backups are automatic with Render
```

### **⚡ Intelligent Caching System**
```bash
# RaikuRevolt uses built-in intelligent caching (no external Redis needed):

# Multi-tier Hybrid Cache System:
1. Hot Cache: 1000 most active users (2 hour TTL)
2. Warm Cache: 5000 recent users (12 hour TTL)
3. Cold Cache: 10000 compressed users (3 day TTL)
4. Query Cache: 2000 queries with LRU eviction

# Performance Benefits:
- 60-70% reduction in database queries
- 40-50% improvement in response times
- 50% reduction in memory usage
- Zero external dependencies required

# Automatic Configuration:
- Cache sizes auto-adjust based on load
- Smart promotion/demotion algorithms
- Automatic compression and cleanup
- Built-in performance monitoring
```

---

## 🚀 **DEPLOYMENT CONFIGURATION**

### **🐳 Docker Setup**
```dockerfile
# Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Bundle app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S raikurevolt -u 1001
USER raikurevolt

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]
```

### **📦 Docker Compose (Development)**
```yaml
# docker-compose.yml
version: '3.8'

services:
  raikurevolt:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
      - DISCORD_GUILD_ID=${DISCORD_GUILD_ID}
      - FIREWORKS_API_KEY=${FIREWORKS_API_KEY}
      - DOBBY_MODEL_ID=${DOBBY_MODEL_ID}
      - ADMIN_USER_IDS=${ADMIN_USER_IDS}
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=raikurevolt
      - POSTGRES_USER=raikurevolt_user
      - POSTGRES_PASSWORD=secure_password
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## 🔧 **APPLICATION CONFIGURATION**

### **📊 Logging Configuration**
```javascript
// src/config/logging.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'raikurevolt' },
  transports: [
    // Console logging
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File logging
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Production: Add external logging service
if (process.env.NODE_ENV === 'production') {
  // Add Datadog, Splunk, or other logging service
  logger.add(new winston.transports.Http({
    host: 'logs.datadoghq.com',
    path: '/v1/input/YOUR_API_KEY',
    ssl: true
  }));
}

export default logger;
```

### **🔒 Security Configuration**
```javascript
// src/config/security.js
export const securityConfig = {
  // Rate limiting
  rateLimiting: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP'
  },
  
  // CORS configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'],
    credentials: true
  },
  
  // Helmet security headers
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  }
};
```

---

## 📊 **MONITORING SETUP**

### **🔍 Health Check Endpoint**
```javascript
// healthcheck.js
import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET',
  timeout: 2000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
```

### **📈 Metrics Collection**
```javascript
// src/middleware/metrics.js
import prometheus from 'prom-client';

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const activeUsers = new prometheus.Gauge({
  name: 'raikurevolt_active_users',
  help: 'Number of active users'
});

const commandsExecuted = new prometheus.Counter({
  name: 'raikurevolt_commands_total',
  help: 'Total number of commands executed',
  labelNames: ['command']
});

export { httpRequestDuration, activeUsers, commandsExecuted };
```

---

## 🔄 **BACKUP CONFIGURATION**

### **💾 Automated Backup Script**
```bash
#!/bin/bash
# backup.sh

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/postgresql_$DATE.sql"

# Compress backup
gzip "$BACKUP_DIR/postgresql_$DATE.sql"

# Upload to cloud storage (AWS S3 example)
aws s3 cp "$BACKUP_DIR/postgresql_$DATE.sql.gz" "s3://raikurevolt-backups/"

# Clean up old backups
find $BACKUP_DIR -name "postgresql_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: postgresql_$DATE.sql.gz"
```

### **⏰ Cron Job Setup**
```bash
# Add to crontab (crontab -e)
# Run backup every 6 hours
0 */6 * * * /path/to/backup.sh >> /var/log/raikurevolt-backup.log 2>&1

# Run daily cleanup
0 2 * * * /path/to/cleanup.sh >> /var/log/raikurevolt-cleanup.log 2>&1
```

---

## 🚀 **DEPLOYMENT CHECKLIST**

### **🔧 Pre-Deployment**
- [ ] **Discord Application** created and configured
- [ ] **Bot Token** obtained and secured
- [ ] **OAuth2 URL** generated and tested
- [ ] **Environment Variables** configured
- [ ] **Database** set up and accessible
- [ ] **PostgreSQL Database** configured
- [ ] **Domain** purchased and DNS configured
- [ ] **SSL Certificate** obtained

### **📦 Deployment**
- [ ] **Code** deployed to production server
- [ ] **Dependencies** installed
- [ ] **Environment** variables loaded
- [ ] **Database** migrations run
- [ ] **Health Checks** passing
- [ ] **Monitoring** configured
- [ ] **Backups** scheduled

### **✅ Post-Deployment**
- [ ] **Bot** responds to commands
- [ ] **All Features** working correctly
- [ ] **Performance** metrics within targets
- [ ] **Error Rates** below 1%
- [ ] **Monitoring Alerts** configured
- [ ] **Support Channels** established

---

## 🎯 **FINAL CONFIGURATION NOTES**

### **🔒 Security Best Practices**
1. **Never commit secrets** to version control
2. **Use environment variables** for all configuration
3. **Rotate API keys** regularly
4. **Monitor for security vulnerabilities**
5. **Keep dependencies updated**

### **📊 Performance Optimization**
1. **Built-in intelligent caching** automatically optimizes performance
2. **Use connection pooling** for database connections
3. **Implement rate limiting** to prevent abuse
4. **Monitor resource usage** and scale accordingly
5. **Optimize database queries** and indexes

### **🚨 Incident Response**
1. **Set up monitoring alerts** for critical metrics
2. **Create runbooks** for common issues
3. **Establish escalation procedures**
4. **Test backup and recovery procedures**
5. **Document troubleshooting steps**

---

**🎯 NEXT STEP: Complete Discord Application setup and obtain all required tokens and IDs before proceeding with deployment.**
