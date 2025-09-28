/**
 * Advanced Security Manager
 * Comprehensive security features including DDoS protection, advanced rate limiting,
 * input validation, and security monitoring
 */

// crypto and validator imports kept for future use; disable unused warnings locally
import crypto from 'crypto'; // eslint-disable-line no-unused-vars
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import validator from 'validator'; // eslint-disable-line no-unused-vars

export class SecurityManager {
  constructor(logger, metricsCollector, errorTracker) {
    this.logger = logger;
    this.metrics = metricsCollector;
    this.errorTracker = errorTracker;
    
    // Security configuration
    this.rateLimitWindows = new Map();
    this.suspiciousActivity = new Map();
    this.blockedIPs = new Set();
    this.securityEvents = [];
    
    this.setupSecurityRules();
    this.startSecurityMonitoring();
  }

  // Set up security rules and thresholds
  setupSecurityRules() {
    this.securityRules = {
      // Rate limiting rules
      rateLimits: {
        general: { requests: 100, window: 60000 }, // 100 requests per minute
        commands: { requests: 30, window: 60000 },  // 30 commands per minute
        ai: { requests: 10, window: 60000 },        // 10 AI requests per minute
        admin: { requests: 5, window: 60000 }       // 5 admin actions per minute
      },
      
      // Input validation rules
      validation: {
        maxStringLength: 1000,
        maxArrayLength: 100,
        // Allow a broad but safer character set; avoid overzealous blocking
        // eslint-disable-next-line no-useless-escape
        allowedCharacters: /[\w\s\-_.!,?@#$%^&*+=:;"'(){}\[\]<>\/\\|`~]*/,
        blockedPatterns: [
          /script/gi,
          /javascript/gi,
          /eval\(/gi,
          /function\(/gi,
          /<script/gi,
          /on\w+\s*=/gi
        ]
      },
      
      // Suspicious activity thresholds
      suspiciousActivity: {
        rapidRequests: { count: 50, window: 10000 },    // 50 requests in 10 seconds
        errorRate: { count: 10, window: 60000 },        // 10 errors in 1 minute
        failedCommands: { count: 5, window: 300000 },   // 5 failed commands in 5 minutes
        unusualPatterns: { count: 3, window: 60000 }    // 3 unusual patterns in 1 minute
      }
    };
    
    this.logger.info('🔒 Security rules configured');
  }

  // Start security monitoring
  startSecurityMonitoring() {
    // Clean up old security data every 5 minutes
    setInterval(() => {
      this.cleanupSecurityData();
    }, 300000);
    
    // Generate security reports every hour
    setInterval(() => {
      this.generateSecurityReport();
    }, 3600000);
    
    this.logger.info('🛡️ Security monitoring started');
  }

  // Advanced rate limiting with multiple tiers (tunable via env)
  createAdvancedRateLimit(type = 'general') {
    const rules = this.securityRules.rateLimits[type] || this.securityRules.rateLimits.general;
    const windowMs = parseInt(process.env[`RATE_LIMIT_${type.toUpperCase()}_WINDOW`] || rules.window, 10);
    const max = parseInt(process.env[`RATE_LIMIT_${type.toUpperCase()}_MAX`] || rules.requests, 10);
    
    return rateLimit({
      windowMs,
      max,
      message: {
        error: 'Rate limit exceeded',
        type: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(rules.window / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      
      // Custom key generator for Discord users
      keyGenerator: (req) => req.headers['x-user-id'] || req.ip,
      
      // Enhanced rate limit handler
      handler: (req, res, _next) => {
        const identifier = req.headers['x-user-id'] || req.ip;
        this.recordSuspiciousActivity(identifier, 'rate_limit_exceeded');
        
        this.logger.warn(`🚨 Rate limit exceeded: ${identifier} (${type})`);
        this.metrics.recordError('rate_limit', 'medium', 'security');
        
        res.status(429).json({
          error: 'Rate limit exceeded',
          type: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(rules.window / 1000)
        });
      },
      
      // Skip rate limiting for whitelisted IPs
      skip: (req) => this.isWhitelistedIP(req.ip)
    });
  }

  // Helmet security headers configuration
  getHelmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.fireworks.ai"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      frameguard: { action: 'deny' },
      xssFilter: true,
      referrerPolicy: { policy: 'same-origin' }
    });
  }

  // Comprehensive input validation
  validateInput(input, context = {}) {
    const errors = [];
    
    try {
      // Basic type validation
      if (typeof input === 'string') {
        // Length validation
        if (input.length > this.securityRules.validation.maxStringLength) {
          errors.push(`Input too long (max: ${this.securityRules.validation.maxStringLength})`);
        }
        
        // Character validation
        if (!this.securityRules.validation.allowedCharacters.test(input)) {
          errors.push('Input contains invalid characters');
        }
        
        // Pattern validation (XSS, injection attempts)
        for (const pattern of this.securityRules.validation.blockedPatterns) {
          if (pattern.test(input)) {
            errors.push('Input contains potentially malicious content');
            this.recordSuspiciousActivity(context.userId || 'unknown', 'malicious_input');
            break;
          }
        }
        
        // SQL injection patterns
        if (this.containsSQLInjection(input)) {
          errors.push('Input contains SQL injection patterns');
          this.recordSuspiciousActivity(context.userId || 'unknown', 'sql_injection_attempt');
        }
        
        // Command injection patterns
        if (context && context.publicInput && this.containsCommandInjection(input)) {
          errors.push('Input contains command injection patterns');
          this.recordSuspiciousActivity(context.userId || 'unknown', 'command_injection_attempt');
        }
      }
      
      // Array validation
      if (Array.isArray(input)) {
        if (input.length > this.securityRules.validation.maxArrayLength) {
          errors.push(`Array too long (max: ${this.securityRules.validation.maxArrayLength})`);
        }
        
        // Validate each array element
        for (const item of input) {
          const itemErrors = this.validateInput(item, context);
          errors.push(...itemErrors);
        }
      }
      
      // Object validation
      if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
        for (const [key, value] of Object.entries(input)) {
          const keyErrors = this.validateInput(key, context);
          const valueErrors = this.validateInput(value, context);
          errors.push(...keyErrors, ...valueErrors);
        }
      }
      
    } catch (error) {
      this.logger.error('Input validation error:', error.message);
      errors.push('Validation error occurred');
    }
    
    return errors;
  }

  // Check for SQL injection patterns
  containsSQLInjection(input) {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(--|\/\*|\*\/)/g,
      /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/gi,
      /(\bCHAR\s*\(\s*\d+\s*\))/gi
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // Check for command injection patterns
  containsCommandInjection(input) {
    const commandPatterns = [
      /[;&|`$(){}[\]]/g,
      /\b(rm|del|format|shutdown|reboot|kill|ps|ls|dir|cat|type|echo|curl|wget)\b/gi,
      /(\.\.\/|\.\.\\)/g,
      /(\$\{|\$\()/g
    ];
    
    return commandPatterns.some(pattern => pattern.test(input));
  }

  // Record suspicious activity
  recordSuspiciousActivity(identifier, activityType, details = {}) {
    const timestamp = Date.now();
    
    if (!this.suspiciousActivity.has(identifier)) {
      this.suspiciousActivity.set(identifier, []);
    }
    
    const activities = this.suspiciousActivity.get(identifier);
    activities.push({
      type: activityType,
      timestamp,
      details
    });
    
    // Check if user should be flagged or blocked
    this.evaluateThreatLevel(identifier, activities);
    
    // Log security event
    this.securityEvents.push({
      identifier,
      type: activityType,
      timestamp,
      details
    });
    
    this.logger.warn(`🚨 Suspicious activity: ${identifier} - ${activityType}`, details);
  }

  // Evaluate threat level and take action
  evaluateThreatLevel(identifier, activities) {
    const now = Date.now();
    // const rules = this.securityRules.suspiciousActivity;
    
    // Count recent activities by type
    const recentActivities = activities.filter(
      activity => now - activity.timestamp < 300000 // Last 5 minutes
    );
    
    const activityCounts = {};
    for (const activity of recentActivities) {
      activityCounts[activity.type] = (activityCounts[activity.type] || 0) + 1;
    }
    
    // Check thresholds
    let threatLevel = 'low';
    let shouldBlock = false;
    
    // High frequency of any suspicious activity
    for (const count of Object.values(activityCounts)) {
      if (count >= 5) {
        threatLevel = 'high';
        shouldBlock = true;
        break;
      } else if (count >= 3) {
        threatLevel = 'medium';
      }
    }
    
    // Multiple types of suspicious activity
    if (Object.keys(activityCounts).length >= 3) {
      threatLevel = 'high';
      shouldBlock = true;
    }
    
    // Take action based on threat level
    if (shouldBlock) {
      this.blockIdentifier(identifier, 'automated_threat_detection');
    }
    
    return threatLevel;
  }

  // Block an identifier (IP or user ID)
  blockIdentifier(identifier, reason) {
    this.blockedIPs.add(identifier);
    
    this.logger.error(`🚫 Blocked identifier: ${identifier} - Reason: ${reason}`);
    this.metrics.recordError('security_block', 'high', 'security');
    
    // Send alert
    this.sendSecurityAlert({
      type: 'IDENTIFIER_BLOCKED',
      identifier,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  // Check if identifier is blocked
  isBlocked(identifier) {
    return this.blockedIPs.has(identifier);
  }

  // Check if IP is whitelisted
  isWhitelistedIP(ip) {
    const whitelist = process.env.IP_WHITELIST?.split(',') || [];
    return whitelist.includes(ip);
  }

  // Send security alert
  async sendSecurityAlert(alertData) {
    try {
      // Send to Discord webhook if configured
      if (process.env.SECURITY_WEBHOOK) {
        await this.sendDiscordSecurityAlert(alertData);
      }
      
      // Send to error tracker
      await this.errorTracker.trackError(
        new Error(`Security Alert: ${alertData.type}`),
        { component: 'security', alertData }
      );
      
    } catch (error) {
      this.logger.error('Failed to send security alert:', error.message);
    }
  }

  // Send Discord security alert
  async sendDiscordSecurityAlert(alertData) {
    const axios = (await import('axios')).default;
    
    try {
      await axios.post(process.env.SECURITY_WEBHOOK, {
        embeds: [{
          title: '🚨 Security Alert',
          description: `**Type:** ${alertData.type}\n**Identifier:** ${alertData.identifier}\n**Reason:** ${alertData.reason}`,
          color: 0xff0000,
          timestamp: alertData.timestamp,
          footer: {
            text: 'RaikuRevolt Security System'
          }
        }]
      });
    } catch (error) {
      this.logger.error('Failed to send Discord security alert:', error.message);
    }
  }

  // Clean up old security data
  cleanupSecurityData() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean up suspicious activity records
    for (const [identifier, activities] of this.suspiciousActivity.entries()) {
      const recentActivities = activities.filter(
        activity => now - activity.timestamp < maxAge
      );
      
      if (recentActivities.length === 0) {
        this.suspiciousActivity.delete(identifier);
      } else {
        this.suspiciousActivity.set(identifier, recentActivities);
      }
    }
    
    // Clean up security events
    this.securityEvents = this.securityEvents.filter(
      event => now - event.timestamp < maxAge
    );
    
    // Clean up rate limit windows
    for (const [key, data] of this.rateLimitWindows.entries()) {
      if (now - data.resetTime > data.windowMs) {
        this.rateLimitWindows.delete(key);
      }
    }
  }

  // Generate security report
  generateSecurityReport() {
    const now = Date.now();
    const lastHour = now - 3600000;
    
    const recentEvents = this.securityEvents.filter(
      event => event.timestamp > lastHour
    );
    
    const eventsByType = {};
    for (const event of recentEvents) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      period: 'last_hour',
      totalEvents: recentEvents.length,
      eventsByType,
      blockedIdentifiers: this.blockedIPs.size,
      suspiciousIdentifiers: this.suspiciousActivity.size
    };
    
    this.logger.info('📊 Security Report:', report);
    
    return report;
  }

  // Get security statistics
  getSecurityStats() {
    return {
      blockedIdentifiers: this.blockedIPs.size,
      suspiciousIdentifiers: this.suspiciousActivity.size,
      recentEvents: this.securityEvents.length,
      rateLimitRules: Object.keys(this.securityRules.rateLimits).length
    };
  }

  // Middleware for request security validation
  securityMiddleware() {
    return (req, res, next) => {
      const identifier = req.headers['x-user-id'] || req.ip;
      
      // Check if blocked
      if (this.isBlocked(identifier)) {
        return res.status(403).json({
          error: 'Access denied',
          type: 'BLOCKED_IDENTIFIER'
        });
      }
      
      // Validate request body
      if (req.body) {
        const validationErrors = this.validateInput(req.body, { userId: identifier });
        if (validationErrors.length > 0) {
          this.recordSuspiciousActivity(identifier, 'invalid_input', { errors: validationErrors });
          return res.status(400).json({
            error: 'Invalid input',
            type: 'VALIDATION_ERROR',
            details: validationErrors
          });
        }
      }
      
      next();
    };
  }
}

export default SecurityManager;
