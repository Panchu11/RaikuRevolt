/**
 * Health Check and Uptime Monitoring
 * Comprehensive health monitoring for all RaikuRevolt components
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

export class HealthChecker {
  constructor(logger, metricsCollector, errorTracker) {
    this.logger = logger;
    this.metrics = metricsCollector;
    this.errorTracker = errorTracker;
    this.healthStatus = new Map();
    this.lastHealthCheck = new Map();
    this.healthHistory = new Map();
    
    this.setupHealthChecks();
  }

  // Set up periodic health checks
  setupHealthChecks() {
    // Main health check every 30 seconds
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);
    
    // Detailed health check every 5 minutes
    setInterval(() => {
      this.performDetailedHealthCheck();
    }, 300000);
    
    // Health history cleanup every hour
    setInterval(() => {
      this.cleanupHealthHistory();
    }, 3600000);
  }

  // Perform basic health check
  async performHealthCheck() {
    const startTime = performance.now();
    const healthResults = {};
    
    try {
      // Check Discord API connectivity
      healthResults.discord = await this.checkDiscordHealth();
      
      // Check AI service connectivity
      healthResults.ai = await this.checkAIHealth();
      
      // Check database connectivity
      healthResults.database = await this.checkDatabaseHealth();
      
      // Check system resources
      healthResults.system = await this.checkSystemHealth();
      
      // Calculate overall health
      const overallHealth = this.calculateOverallHealth(healthResults);
      
      // Update health status
      this.updateHealthStatus(healthResults, overallHealth);
      
      // Log health status
      const duration = performance.now() - startTime;
      this.logger.info(`💚 Health check completed in ${duration.toFixed(2)}ms - Status: ${overallHealth.status}`);
      
    } catch (error) {
      this.logger.error('❌ Health check failed:', error.message);
      await this.errorTracker.trackError(error, { component: 'health_check' });
    }
  }

  // Check Discord API health
  async checkDiscordHealth() {
    const startTime = performance.now();
    
    try {
      // Check if Discord client is ready
      const isReady = global.discordClient?.isReady() || false;
      const ping = global.discordClient?.ws?.ping || -1;
      
      const duration = performance.now() - startTime;
      
      return {
        status: isReady ? 'healthy' : 'unhealthy',
        ping: ping,
        responseTime: duration,
        details: {
          ready: isReady,
          guilds: global.discordClient?.guilds?.cache?.size || 0,
          users: global.discordClient?.users?.cache?.size || 0
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: performance.now() - startTime
      };
    }
  }

  // Check AI service health
  async checkAIHealth() {
    const startTime = performance.now();
    
    try {
      // Test AI service with a simple request
      const testPrompt = 'Health check';
      const response = await axios.post('https://api.fireworks.ai/inference/v1/chat/completions', {
        model: process.env.DOBBY_MODEL_ID,
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 10,
        temperature: 0.1
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.FIREWORKS_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      const duration = performance.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime: duration,
        details: {
          model: process.env.DOBBY_MODEL_ID,
          tokensUsed: response.data.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: performance.now() - startTime,
        details: {
          statusCode: error.response?.status,
          rateLimited: error.response?.status === 429
        }
      };
    }
  }

  // Check database health
  async checkDatabaseHealth() {
    const startTime = performance.now();
    
    try {
      // For now, simulate database check since we're using in-memory storage
      // In production, this would ping MongoDB
      const memoryUsage = process.memoryUsage();
      const duration = performance.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime: duration,
        details: {
          type: 'in-memory',
          memoryUsage: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: performance.now() - startTime
      };
    }
  }

  // Check system health
  async checkSystemHealth() {
    const startTime = performance.now();
    
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const uptime = process.uptime();
      
      // Calculate memory usage percentage (assuming 1GB limit for example)
      const memoryLimit = 1024 * 1024 * 1024; // 1GB
      const memoryUsagePercent = (memUsage.heapUsed / memoryLimit) * 100;
      
      // Determine health based on resource usage
      let status = 'healthy';
      if (memoryUsagePercent > 90) {
        status = 'critical';
      } else if (memoryUsagePercent > 75) {
        status = 'warning';
      }
      
      const duration = performance.now() - startTime;
      
      return {
        status,
        responseTime: duration,
        details: {
          uptime: Math.round(uptime),
          memory: {
            used: Math.round(memUsage.heapUsed / 1024 / 1024),
            total: Math.round(memUsage.heapTotal / 1024 / 1024),
            percentage: Math.round(memoryUsagePercent)
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: performance.now() - startTime
      };
    }
  }

  // Calculate overall health from component health
  calculateOverallHealth(healthResults) {
    const components = Object.keys(healthResults);
    const healthyComponents = components.filter(comp => 
      healthResults[comp].status === 'healthy'
    );
    const warningComponents = components.filter(comp => 
      healthResults[comp].status === 'warning'
    );
    const unhealthyComponents = components.filter(comp => 
      healthResults[comp].status === 'unhealthy' || 
      healthResults[comp].status === 'critical'
    );
    
    let overallStatus = 'healthy';
    let score = 100;
    
    if (unhealthyComponents.length > 0) {
      overallStatus = 'unhealthy';
      score = Math.max(0, 100 - (unhealthyComponents.length * 30));
    } else if (warningComponents.length > 0) {
      overallStatus = 'warning';
      score = Math.max(50, 100 - (warningComponents.length * 15));
    }
    
    return {
      status: overallStatus,
      score,
      healthy: healthyComponents.length,
      warning: warningComponents.length,
      unhealthy: unhealthyComponents.length,
      total: components.length
    };
  }

  // Update health status and history
  updateHealthStatus(healthResults, overallHealth) {
    const timestamp = Date.now();
    
    // Update current status
    this.healthStatus.set('current', {
      timestamp,
      overall: overallHealth,
      components: healthResults
    });
    
    // Update last check times
    for (const component of Object.keys(healthResults)) {
      this.lastHealthCheck.set(component, timestamp);
    }
    
    // Add to history
    if (!this.healthHistory.has('overall')) {
      this.healthHistory.set('overall', []);
    }
    
    const history = this.healthHistory.get('overall');
    history.push({
      timestamp,
      status: overallHealth.status,
      score: overallHealth.score
    });
    
    // Keep only last 24 hours of history
    const dayAgo = timestamp - (24 * 60 * 60 * 1000);
    this.healthHistory.set('overall', 
      history.filter(entry => entry.timestamp > dayAgo)
    );
  }

  // Perform detailed health check with additional metrics
  async performDetailedHealthCheck() {
    this.logger.info('🔍 Performing detailed health check...');
    
    try {
      // Check external dependencies
      const externalHealth = await this.checkExternalDependencies();
      
      // Check performance metrics
      const performanceHealth = await this.checkPerformanceMetrics();
      
      // Check game state health
      const gameHealth = await this.checkGameStateHealth();
      
      this.logger.info('📊 Detailed health check results:', {
        external: externalHealth,
        performance: performanceHealth,
        game: gameHealth
      });
      
    } catch (error) {
      this.logger.error('❌ Detailed health check failed:', error.message);
      await this.errorTracker.trackError(error, { component: 'detailed_health_check' });
    }
  }

  // Check external dependencies
  async checkExternalDependencies() {
    const dependencies = [];
    
    // Check Discord API status
    try {
      const response = await axios.get('https://discordstatus.com/api/v2/status.json', {
        timeout: 5000
      });
      dependencies.push({
        name: 'Discord API',
        status: response.data.status.indicator === 'none' ? 'operational' : 'degraded'
      });
    } catch (error) {
      dependencies.push({
        name: 'Discord API',
        status: 'unknown',
        error: error.message
      });
    }
    
    return dependencies;
  }

  // Check performance metrics
  async checkPerformanceMetrics() {
    const metrics = this.metrics.getMetricsSummary();
    
    return {
      uptime: metrics.uptime,
      memory: metrics.memory,
      activeUsers: metrics.activeUsers,
      totalUsers: metrics.totalUsers,
      eventLoopLag: process.hrtime.bigint() // Simplified
    };
  }

  // Check game state health
  async checkGameStateHealth() {
    // Access game instance if available
    const game = global.gameInstance;
    
    if (!game) {
      return { status: 'unknown', message: 'Game instance not available' };
    }
    
    return {
      status: 'healthy',
      rebels: game.rebels?.size || 0,
      activeTrades: game.activeTrades?.size || 0,
      raidParties: game.raidParties?.size || 0,
      globalEvents: game.globalEvents?.size || 0
    };
  }

  // Clean up old health history
  cleanupHealthHistory() {
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    for (const [key, history] of this.healthHistory.entries()) {
      if (Array.isArray(history)) {
        this.healthHistory.set(key, 
          history.filter(entry => entry.timestamp > dayAgo)
        );
      }
    }
  }

  // Get current health status
  getCurrentHealth() {
    return this.healthStatus.get('current') || {
      timestamp: Date.now(),
      overall: { status: 'unknown', score: 0 },
      components: {}
    };
  }

  // Get health history
  getHealthHistory(hours = 24) {
    const hoursAgo = Date.now() - (hours * 60 * 60 * 1000);
    const history = this.healthHistory.get('overall') || [];
    
    return history.filter(entry => entry.timestamp > hoursAgo);
  }

  // Get uptime percentage
  getUptimePercentage(hours = 24) {
    const history = this.getHealthHistory(hours);
    
    if (history.length === 0) return 100;
    
    const healthyCount = history.filter(entry => 
      entry.status === 'healthy'
    ).length;
    
    return Math.round((healthyCount / history.length) * 100);
  }

  // Express middleware for health endpoint
  healthEndpoint() {
    return (req, res) => {
      const health = this.getCurrentHealth();
      const uptime = this.getUptimePercentage();
      
      const statusCode = health.overall.status === 'healthy' ? 200 : 
                        health.overall.status === 'warning' ? 200 : 503;
      
      res.status(statusCode).json({
        status: health.overall.status,
        timestamp: health.timestamp,
        uptime: `${uptime}%`,
        components: health.components,
        version: process.env.APP_VERSION || '1.0.0'
      });
    };
  }
}

export default HealthChecker;
