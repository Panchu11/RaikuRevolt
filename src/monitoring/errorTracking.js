/**
 * Error Tracking and Alerting System
 * Comprehensive error monitoring with Sentry integration and custom alerting
 */

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import winston from 'winston';
import axios from 'axios';

// Error severity levels
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Error categories
export const ErrorCategory = {
  DISCORD_API: 'discord_api',
  AI_SERVICE: 'ai_service',
  DATABASE: 'database',
  GAME_LOGIC: 'game_logic',
  AUTHENTICATION: 'authentication',
  RATE_LIMITING: 'rate_limiting',
  VALIDATION: 'validation',
  SYSTEM: 'system'
};

export class ErrorTracker {
  constructor(logger, metricsCollector) {
    this.logger = logger;
    this.metrics = metricsCollector;
    this.errorCounts = new Map();
    this.alertThresholds = new Map();
    this.lastAlertTimes = new Map();
    
    this.setupSentry();
    this.setupAlertThresholds();
    this.startErrorMonitoring();
  }

  // Initialize Sentry error tracking
  setupSentry() {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.APP_VERSION || '1.0.0',
        
        // Performance monitoring
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        
        integrations: [
          new ProfilingIntegration(),
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: null })
        ],
        
        // Error filtering
        beforeSend(event, hint) {
          // Filter out known non-critical errors
          const error = hint.originalException;
          if (error?.message?.includes('DiscordAPIError[10062]')) {
            // Unknown interaction - user took too long to respond
            return null;
          }
          return event;
        },
        
        // Additional context
        initialScope: {
          tags: {
            component: 'raikurevolt-bot'
          }
        }
      });
      
      this.logger.info('✅ Sentry error tracking initialized');
    } else {
      this.logger.warn('⚠️  Sentry DSN not configured - error tracking disabled');
    }
  }

  // Set up alert thresholds for different error types
  setupAlertThresholds() {
    this.alertThresholds.set(ErrorCategory.DISCORD_API, {
      count: 10,
      timeWindow: 300000, // 5 minutes
      severity: ErrorSeverity.HIGH
    });
    
    this.alertThresholds.set(ErrorCategory.AI_SERVICE, {
      count: 5,
      timeWindow: 300000,
      severity: ErrorSeverity.HIGH
    });
    
    this.alertThresholds.set(ErrorCategory.DATABASE, {
      count: 3,
      timeWindow: 300000,
      severity: ErrorSeverity.CRITICAL
    });
    
    this.alertThresholds.set(ErrorCategory.SYSTEM, {
      count: 1,
      timeWindow: 60000, // 1 minute
      severity: ErrorSeverity.CRITICAL
    });
  }

  // Start error monitoring and cleanup
  startErrorMonitoring() {
    // Clean up old error counts every 5 minutes
    setInterval(() => {
      this.cleanupOldErrors();
    }, 300000);
    
    // Log error summary every hour
    setInterval(() => {
      this.logErrorSummary();
    }, 3600000);
  }

  // Track and report an error
  async trackError(error, context = {}) {
    const errorInfo = this.categorizeError(error, context);
    
    // Record metrics
    this.metrics.recordError(
      errorInfo.category,
      errorInfo.severity,
      context.component || 'unknown'
    );
    
    // Log error
    this.logger.error('Error tracked:', {
      message: error.message,
      category: errorInfo.category,
      severity: errorInfo.severity,
      stack: error.stack,
      context
    });
    
    // Send to Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.withScope(scope => {
        scope.setTag('category', errorInfo.category);
        scope.setLevel(this.mapSeverityToSentryLevel(errorInfo.severity));
        scope.setContext('error_context', context);
        Sentry.captureException(error);
      });
    }
    
    // Check for alert conditions
    await this.checkAlertConditions(errorInfo, context);
    
    return errorInfo;
  }

  // Categorize error based on type and context
  categorizeError(error, context) {
    let category = ErrorCategory.SYSTEM;
    let severity = ErrorSeverity.MEDIUM;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorStack = error.stack?.toLowerCase() || '';
    
    // Discord API errors
    if (errorMessage.includes('discordapierror') || context.component === 'discord') {
      category = ErrorCategory.DISCORD_API;
      severity = errorMessage.includes('rate limit') ? ErrorSeverity.MEDIUM : ErrorSeverity.HIGH;
    }
    
    // AI service errors
    else if (errorMessage.includes('ai') || errorMessage.includes('fireworks') || context.component === 'ai') {
      category = ErrorCategory.AI_SERVICE;
      severity = ErrorSeverity.HIGH;
    }
    
    // Database errors
    else if (errorMessage.includes('mongo') || errorMessage.includes('database') || context.component === 'database') {
      category = ErrorCategory.DATABASE;
      severity = ErrorSeverity.CRITICAL;
    }
    
    // Authentication errors
    else if (errorMessage.includes('auth') || errorMessage.includes('token') || errorMessage.includes('permission')) {
      category = ErrorCategory.AUTHENTICATION;
      severity = ErrorSeverity.HIGH;
    }
    
    // Rate limiting errors
    else if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      category = ErrorCategory.RATE_LIMITING;
      severity = ErrorSeverity.MEDIUM;
    }
    
    // Validation errors
    else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.LOW;
    }
    
    // Game logic errors
    else if (context.component === 'game' || errorStack.includes('game')) {
      category = ErrorCategory.GAME_LOGIC;
      severity = ErrorSeverity.MEDIUM;
    }
    
    // System errors (memory, CPU, etc.)
    else if (errorMessage.includes('memory') || errorMessage.includes('heap') || errorMessage.includes('cpu')) {
      category = ErrorCategory.SYSTEM;
      severity = ErrorSeverity.CRITICAL;
    }
    
    return { category, severity };
  }

  // Check if error conditions warrant an alert
  async checkAlertConditions(errorInfo, context) {
    const key = `${errorInfo.category}_${Date.now()}`;
    const now = Date.now();
    
    // Initialize error count for this category if not exists
    if (!this.errorCounts.has(errorInfo.category)) {
      this.errorCounts.set(errorInfo.category, []);
    }
    
    // Add current error timestamp
    const errors = this.errorCounts.get(errorInfo.category);
    errors.push(now);
    
    // Get threshold for this category
    const threshold = this.alertThresholds.get(errorInfo.category);
    if (!threshold) return;
    
    // Count errors within time window
    const windowStart = now - threshold.timeWindow;
    const recentErrors = errors.filter(timestamp => timestamp >= windowStart);
    
    // Update the array with only recent errors
    this.errorCounts.set(errorInfo.category, recentErrors);
    
    // Check if threshold is exceeded
    if (recentErrors.length >= threshold.count) {
      const lastAlertKey = `${errorInfo.category}_alert`;
      const lastAlert = this.lastAlertTimes.get(lastAlertKey) || 0;
      
      // Only send alert if enough time has passed since last alert (prevent spam)
      if (now - lastAlert > threshold.timeWindow) {
        await this.sendAlert(errorInfo, recentErrors.length, threshold, context);
        this.lastAlertTimes.set(lastAlertKey, now);
      }
    }
  }

  // Send alert notification
  async sendAlert(errorInfo, errorCount, threshold, context) {
    const alertMessage = {
      title: `🚨 RaikuRevolt Error Alert - ${errorInfo.category.toUpperCase()}`,
      description: `${errorCount} errors in ${threshold.timeWindow / 1000}s`,
      severity: errorInfo.severity,
      timestamp: new Date().toISOString(),
      context
    };
    
    this.logger.error('ALERT TRIGGERED:', alertMessage);
    
    // Send to Discord webhook if configured
    if (process.env.DISCORD_ALERT_WEBHOOK) {
      await this.sendDiscordAlert(alertMessage);
    }
    
    // Send to email if configured
    if (process.env.ALERT_EMAIL) {
      await this.sendEmailAlert(alertMessage);
    }
    
    // Send to Sentry as high priority
    if (process.env.SENTRY_DSN) {
      Sentry.captureMessage(`Alert: ${alertMessage.title}`, 'error');
    }
  }

  // Send Discord webhook alert
  async sendDiscordAlert(alertMessage) {
    try {
      const color = this.getSeverityColor(alertMessage.severity);
      
      await axios.post(process.env.DISCORD_ALERT_WEBHOOK, {
        embeds: [{
          title: alertMessage.title,
          description: alertMessage.description,
          color: color,
          timestamp: alertMessage.timestamp,
          fields: [
            {
              name: 'Severity',
              value: alertMessage.severity.toUpperCase(),
              inline: true
            },
            {
              name: 'Component',
              value: alertMessage.context.component || 'Unknown',
              inline: true
            }
          ]
        }]
      });
    } catch (error) {
      this.logger.error('Failed to send Discord alert:', error.message);
    }
  }

  // Send email alert
  async sendEmailAlert(alertMessage) {
    // Implementation would depend on email service (SendGrid, AWS SES, etc.)
    this.logger.info('Email alert would be sent:', alertMessage);
  }

  // Get color for severity level
  getSeverityColor(severity) {
    switch (severity) {
      case ErrorSeverity.LOW: return 0x00ff00;      // Green
      case ErrorSeverity.MEDIUM: return 0xffff00;   // Yellow
      case ErrorSeverity.HIGH: return 0xff8800;     // Orange
      case ErrorSeverity.CRITICAL: return 0xff0000; // Red
      default: return 0x808080;                     // Gray
    }
  }

  // Map severity to Sentry level
  mapSeverityToSentryLevel(severity) {
    switch (severity) {
      case ErrorSeverity.LOW: return 'info';
      case ErrorSeverity.MEDIUM: return 'warning';
      case ErrorSeverity.HIGH: return 'error';
      case ErrorSeverity.CRITICAL: return 'fatal';
      default: return 'error';
    }
  }

  // Clean up old error counts
  cleanupOldErrors() {
    const now = Date.now();
    
    for (const [category, errors] of this.errorCounts.entries()) {
      const threshold = this.alertThresholds.get(category);
      if (threshold) {
        const windowStart = now - threshold.timeWindow;
        const recentErrors = errors.filter(timestamp => timestamp >= windowStart);
        this.errorCounts.set(category, recentErrors);
      }
    }
  }

  // Log error summary
  logErrorSummary() {
    const summary = {};
    
    for (const [category, errors] of this.errorCounts.entries()) {
      summary[category] = errors.length;
    }
    
    this.logger.info('📊 Error Summary (last hour):', summary);
  }

  // Get error statistics
  getErrorStats() {
    const stats = {};
    
    for (const [category, errors] of this.errorCounts.entries()) {
      stats[category] = {
        count: errors.length,
        threshold: this.alertThresholds.get(category)?.count || 0
      };
    }
    
    return stats;
  }
}

export default ErrorTracker;
