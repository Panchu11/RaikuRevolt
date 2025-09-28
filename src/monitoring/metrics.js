/**
 * Production Metrics and Monitoring
 * Comprehensive metrics collection for RaikuRevolt performance monitoring
 */

import prometheus from 'prom-client';
import winston from 'winston';

// Create a Registry to register the metrics
const register = new prometheus.Registry();

// Add default metrics (CPU, memory, etc.)
prometheus.collectDefaultMetrics({ register });

// Custom metrics for RaikuRevolt
export const metrics = {
  // HTTP Request metrics
  httpRequestDuration: new prometheus.Histogram({
    name: 'raikurevolt_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
  }),

  httpRequestsTotal: new prometheus.Counter({
    name: 'raikurevolt_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  }),

  // Discord Bot metrics
  discordCommandsTotal: new prometheus.Counter({
    name: 'raikurevolt_discord_commands_total',
    help: 'Total number of Discord commands executed',
    labelNames: ['command', 'status', 'guild_id']
  }),

  discordCommandDuration: new prometheus.Histogram({
    name: 'raikurevolt_discord_command_duration_seconds',
    help: 'Duration of Discord command execution',
    labelNames: ['command'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
  }),

  discordInteractionsTotal: new prometheus.Counter({
    name: 'raikurevolt_discord_interactions_total',
    help: 'Total number of Discord interactions',
    labelNames: ['type', 'status']
  }),

  // Game metrics
  activeUsers: new prometheus.Gauge({
    name: 'raikurevolt_active_users',
    help: 'Number of currently active users',
    labelNames: ['time_window']
  }),

  totalUsers: new prometheus.Gauge({
    name: 'raikurevolt_total_users',
    help: 'Total number of registered users'
  }),

  gameActionsTotal: new prometheus.Counter({
    name: 'raikurevolt_game_actions_total',
    help: 'Total number of game actions performed',
    labelNames: ['action_type', 'user_class']
  }),

  raidParticipants: new prometheus.Gauge({
    name: 'raikurevolt_raid_participants',
    help: 'Number of users currently in raids'
  }),

  // AI Integration metrics
  aiRequestsTotal: new prometheus.Counter({
    name: 'raikurevolt_ai_requests_total',
    help: 'Total number of AI requests',
    labelNames: ['model', 'status']
  }),

  aiRequestDuration: new prometheus.Histogram({
    name: 'raikurevolt_ai_request_duration_seconds',
    help: 'Duration of AI requests',
    labelNames: ['model'],
    buckets: [0.5, 1, 2, 5, 10, 20, 30]
  }),

  aiTokensUsed: new prometheus.Counter({
    name: 'raikurevolt_ai_tokens_used_total',
    help: 'Total number of AI tokens consumed',
    labelNames: ['model', 'type']
  }),

  // Database metrics
  databaseOperationsTotal: new prometheus.Counter({
    name: 'raikurevolt_database_operations_total',
    help: 'Total number of database operations',
    labelNames: ['operation', 'collection', 'status', 'component']
  }),

  databaseOperationDuration: new prometheus.Histogram({
    name: 'raikurevolt_database_operation_duration_seconds',
    help: 'Duration of database operations',
    labelNames: ['operation', 'collection', 'component'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
  }),

  databaseConnections: new prometheus.Gauge({
    name: 'raikurevolt_database_connections',
    help: 'Number of active database connections'
  }),

  // Error metrics
  errorsTotal: new prometheus.Counter({
    name: 'raikurevolt_errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'severity', 'component']
  }),

  // Performance metrics
  memoryUsage: new prometheus.Gauge({
    name: 'raikurevolt_memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type']
  }),

  eventLoopLag: new prometheus.Histogram({
    name: 'raikurevolt_event_loop_lag_seconds',
    help: 'Event loop lag in seconds',
    buckets: [0.001, 0.01, 0.1, 1, 10]
  })
};

// Register all metrics
Object.values(metrics).forEach(metric => {
  register.registerMetric(metric);
});

// Metrics collection class
export class MetricsCollector {
  constructor(logger) {
    this.logger = logger;
    this.startTime = Date.now();
    this.setupPeriodicMetrics();
  }

  // Set up periodic metrics collection
  setupPeriodicMetrics() {
    // Collect memory usage every 30 seconds
    setInterval(() => {
      const memUsage = process.memoryUsage();
      metrics.memoryUsage.set({ type: 'rss' }, memUsage.rss);
      metrics.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
      metrics.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
      metrics.memoryUsage.set({ type: 'external' }, memUsage.external);
    }, 30000);

    // Measure event loop lag every 10 seconds
    setInterval(() => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e9;
        metrics.eventLoopLag.observe(lag);
      });
    }, 10000);
  }

  // Record Discord command execution
  recordDiscordCommand(command, status, guildId, duration) {
    metrics.discordCommandsTotal.inc({ command, status, guild_id: guildId });
    metrics.discordCommandDuration.observe({ command }, duration);
  }

  // Record Discord interaction
  recordDiscordInteraction(type, status) {
    metrics.discordInteractionsTotal.inc({ type, status });
  }

  // Record game action
  recordGameAction(actionType, userClass) {
    metrics.gameActionsTotal.inc({ action_type: actionType, user_class: userClass });
  }

  // Record AI request
  recordAIRequest(model, status, duration, tokensUsed = 0) {
    metrics.aiRequestsTotal.inc({ model, status });
    metrics.aiRequestDuration.observe({ model }, duration);
    if (tokensUsed > 0) {
      metrics.aiTokensUsed.inc({ model, type: 'total' }, tokensUsed);
    }
  }

  // Record database operation
  recordDatabaseOperation(operation, collection, status, duration) {
    metrics.databaseOperationsTotal.inc({ operation, collection, status });
    metrics.databaseOperationDuration.observe({ operation, collection }, duration);
  }

  // Record error
  recordError(type, severity, component) {
    metrics.errorsTotal.inc({ type, severity, component });
    this.logger.error(`Error recorded: ${type} (${severity}) in ${component}`);
  }

  // Update active users count
  updateActiveUsers(count, timeWindow = '5m') {
    metrics.activeUsers.set({ time_window: timeWindow }, count);
  }

  // Update total users count
  updateTotalUsers(count) {
    metrics.totalUsers.set(count);
  }

  // Update raid participants
  updateRaidParticipants(count) {
    metrics.raidParticipants.set(count);
  }

  // Update database connections
  updateDatabaseConnections(count) {
    metrics.databaseConnections.set(count);
  }

  // Get metrics for Prometheus scraping
  async getMetrics() {
    return register.metrics();
  }

  // Get metrics summary for logging
  getMetricsSummary() {
    const uptime = (Date.now() - this.startTime) / 1000;
    const memUsage = process.memoryUsage();
    
    return {
      uptime: `${Math.floor(uptime)}s`,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
      },
      activeUsers: metrics.activeUsers._hashMap?.get('time_window:5m')?.value || 0,
      totalUsers: metrics.totalUsers._hashMap?.get('')?.value || 0
    };
  }

  // Generic event recording method
  recordEvent(eventType, status, component, data = {}) {
    try {
      // Log the event
      this.logger.info(`📊 Event: ${eventType} - ${status} (${component})`, data);

      // Record in appropriate metric based on event type
      if (eventType.includes('command')) {
        metrics.discordCommandsTotal.inc({
          command: data.command || 'unknown',
          status,
          guild_id: data.guildId || 'unknown'
        });
      } else if (eventType.includes('interaction')) {
        metrics.discordInteractionsTotal.inc({ type: component, status });
      } else if (eventType.includes('database')) {
        metrics.databaseOperationsTotal.inc({ operation: eventType, status, component });
      }
    } catch (error) {
      this.logger.warn(`Failed to record event: ${error.message}`);
    }
  }

  // Generic error recording method
  recordError(eventType, severity, component, data = {}) {
    try {
      this.logger.error(`🚨 Error: ${eventType} - ${severity} (${component})`, data);

      // Increment error counter
      metrics.errorsTotal.inc({
        type: eventType,
        severity,
        component
      });
    } catch (error) {
      this.logger.warn(`Failed to record error: ${error.message}`);
    }
  }
}

// Middleware for HTTP request metrics
export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    
    metrics.httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode
    });
    
    metrics.httpRequestDuration.observe({
      method: req.method,
      route,
      status_code: res.statusCode
    }, duration);
  });
  
  next();
}

export { register };
export default MetricsCollector;
