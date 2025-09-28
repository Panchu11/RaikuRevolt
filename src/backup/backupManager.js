/**
 * Enhanced Backup and Recovery Manager
 * Comprehensive backup system with cloud storage, verification, and disaster recovery
 */

import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';
import crypto from 'crypto';
import AWS from 'aws-sdk';

export class BackupManager {
  constructor(logger, metricsCollector, errorTracker) {
    this.logger = logger;
    this.metrics = metricsCollector;
    this.errorTracker = errorTracker;
    
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.maxLocalBackups = parseInt(process.env.MAX_LOCAL_BACKUPS) || 10;
    this.backupInterval = parseInt(process.env.BACKUP_INTERVAL) || 30; // minutes
    this.compressionLevel = 6;
    
    this.setupCloudStorage();
    this.startAutomaticBackups();
  }

  // Set up cloud storage (AWS S3)
  setupCloudStorage() {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      
      this.s3Bucket = process.env.S3_BACKUP_BUCKET || 'raikurevolt-backups';
      this.logger.info('☁️ AWS S3 backup storage configured');
    } else {
      this.logger.warn('⚠️ AWS credentials not configured - cloud backups disabled');
    }
  }

  // Start automatic backup system
  startAutomaticBackups() {
    // Create backup directory if it doesn't exist
    this.ensureBackupDirectory();
    
    // Schedule regular backups
    setInterval(async () => {
      await this.performAutomaticBackup();
    }, this.backupInterval * 60 * 1000);
    
    // Schedule cleanup every 6 hours
    setInterval(async () => {
      await this.cleanupOldBackups();
    }, 6 * 60 * 60 * 1000);
    
    this.logger.info(`🔄 Automatic backups scheduled every ${this.backupInterval} minutes`);
  }

  // Ensure backup directory exists
  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create backup directory:', error.message);
      throw error;
    }
  }

  // Perform automatic backup
  async performAutomaticBackup() {
    try {
      this.logger.info('🔄 Starting automatic backup...');
      const backupResult = await this.createBackup();
      
      if (backupResult.success) {
        this.logger.info(`✅ Automatic backup completed: ${backupResult.filename}`);
        
        // Upload to cloud if configured
        if (this.s3) {
          await this.uploadToCloud(backupResult.filepath, backupResult.filename);
        }
      }
    } catch (error) {
      this.logger.error('❌ Automatic backup failed:', error.message);
      await this.errorTracker.trackError(error, { component: 'backup_system' });
    }
  }

  // Create a comprehensive backup
  async createBackup(options = {}) {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `raikurevolt-backup-${timestamp}.json.gz`;
    const filepath = path.join(this.backupDir, filename);
    
    try {
      // Collect all game data
      const backupData = await this.collectBackupData(options);
      
      // Add metadata
      const backupPackage = {
        metadata: {
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          type: options.type || 'automatic',
          size: JSON.stringify(backupData).length,
          checksum: this.calculateChecksum(JSON.stringify(backupData))
        },
        data: backupData
      };
      
      // Compress and save backup
      await this.saveCompressedBackup(backupPackage, filepath);
      
      // Verify backup integrity
      const isValid = await this.verifyBackup(filepath);
      
      const duration = Date.now() - startTime;
      
      if (isValid) {
        this.logger.info(`✅ Backup created successfully: ${filename} (${duration}ms)`);
        return {
          success: true,
          filename,
          filepath,
          size: backupPackage.metadata.size,
          duration,
          checksum: backupPackage.metadata.checksum
        };
      } else {
        throw new Error('Backup verification failed');
      }
      
    } catch (error) {
      this.logger.error('❌ Backup creation failed:', error.message);
      await this.errorTracker.trackError(error, { component: 'backup_creation' });
      return { success: false, error: error.message };
    }
  }

  // Collect all game data for backup
  async collectBackupData(options = {}) {
    const gameInstance = global.gameInstance;
    
    if (!gameInstance) {
      throw new Error('Game instance not available for backup');
    }
    
    const data = {
      rebels: this.mapToObject(gameInstance.rebels),
      corporations: this.mapToObject(gameInstance.corporations),
      inventory: this.mapToObject(gameInstance.inventory),
      achievements: this.mapToObject(gameInstance.achievements),
      leaderboard: this.mapToObject(gameInstance.leaderboard),
      resistanceCells: this.mapToObject(gameInstance.resistanceCells),
      activeTrades: this.mapToObject(gameInstance.activeTrades),
      marketplace: this.mapToObject(gameInstance.marketplace),
      auctions: this.mapToObject(gameInstance.auctions),
      dailyMissions: this.mapToObject(gameInstance.dailyMissions),
      globalEvents: this.mapToObject(gameInstance.globalEvents),
      raidParties: this.mapToObject(gameInstance.raidParties),
      cooldowns: this.mapToObject(gameInstance.cooldowns),
      guilds: this.mapToObject(gameInstance.guilds)
    };
    
    // Include user activity data if requested
    if (options.includeActivity) {
      data.userActivityTracker = this.mapToObject(gameInstance.userActivityTracker);
    }
    
    // Include system metrics if requested
    if (options.includeMetrics) {
      data.systemMetrics = {
        timestamp: Date.now(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      };
    }
    
    return data;
  }

  // Convert Map to Object for JSON serialization
  mapToObject(map) {
    if (!map || typeof map.entries !== 'function') {
      return {};
    }
    
    const obj = {};
    for (const [key, value] of map.entries()) {
      obj[key] = value;
    }
    return obj;
  }

  // Save compressed backup
  async saveCompressedBackup(data, filepath) {
    const jsonString = JSON.stringify(data, null, 2);
    const writeStream = createWriteStream(filepath);
    const gzipStream = createGzip({ level: this.compressionLevel });
    
    await pipeline(
      async function* () {
        yield Buffer.from(jsonString, 'utf8');
      },
      gzipStream,
      writeStream
    );
  }

  // Verify backup integrity
  async verifyBackup(filepath) {
    try {
      const data = await this.loadBackup(filepath);
      
      // Check metadata
      if (!data.metadata || !data.data) {
        return false;
      }
      
      // Verify checksum
      const calculatedChecksum = this.calculateChecksum(JSON.stringify(data.data));
      if (calculatedChecksum !== data.metadata.checksum) {
        this.logger.error('Backup checksum mismatch');
        return false;
      }
      
      // Basic structure validation
      const requiredFields = ['rebels', 'corporations', 'inventory'];
      for (const field of requiredFields) {
        if (!data.data[field]) {
          this.logger.error(`Missing required field in backup: ${field}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error('Backup verification failed:', error.message);
      return false;
    }
  }

  // Load and decompress backup
  async loadBackup(filepath) {
    const readStream = createReadStream(filepath);
    const gunzipStream = createGunzip();
    
    const chunks = [];
    
    await pipeline(
      readStream,
      gunzipStream,
      async function* (source) {
        for await (const chunk of source) {
          chunks.push(chunk);
          // yield to satisfy generator contract and ESLint require-yield
          yield chunk;
        }
      }
    );
    
    const jsonString = Buffer.concat(chunks).toString('utf8');
    return JSON.parse(jsonString);
  }

  // Calculate checksum for data integrity
  calculateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Upload backup to cloud storage
  async uploadToCloud(filepath, filename) {
    if (!this.s3) {
      this.logger.warn('Cloud storage not configured');
      return false;
    }
    
    try {
      const fileStream = createReadStream(filepath);
      
      const uploadParams = {
        Bucket: this.s3Bucket,
        Key: `backups/${filename}`,
        Body: fileStream,
        ContentType: 'application/gzip',
        ServerSideEncryption: 'AES256',
        Metadata: {
          'backup-type': 'raikurevolt-game-data',
          'created-at': new Date().toISOString()
        }
      };
      
      const result = await this.s3.upload(uploadParams).promise();
      this.logger.info(`☁️ Backup uploaded to S3: ${result.Location}`);
      return true;
      
    } catch (error) {
      this.logger.error('Failed to upload backup to cloud:', error.message);
      await this.errorTracker.trackError(error, { component: 'cloud_backup' });
      return false;
    }
  }

  // Restore from backup
  async restoreFromBackup(backupPath, options = {}) {
    const startTime = Date.now();
    
    try {
      this.logger.info(`🔄 Starting restore from backup: ${backupPath}`);
      
      // Verify backup before restore
      const isValid = await this.verifyBackup(backupPath);
      if (!isValid) {
        throw new Error('Backup verification failed - cannot restore');
      }
      
      // Load backup data
      const backupData = await this.loadBackup(backupPath);
      
      // Create pre-restore backup if requested
      if (options.createPreRestoreBackup !== false) {
        await this.createBackup({ type: 'pre-restore' });
      }
      
      // Restore data to game instance
      await this.restoreGameData(backupData.data, options);
      
      const duration = Date.now() - startTime;
      this.logger.info(`✅ Restore completed successfully (${duration}ms)`);
      
      return { success: true, duration };
      
    } catch (error) {
      this.logger.error('❌ Restore failed:', error.message);
      await this.errorTracker.trackError(error, { component: 'backup_restore' });
      return { success: false, error: error.message };
    }
  }

  // Restore game data from backup
  async restoreGameData(data, options = {}) {
    const gameInstance = global.gameInstance;
    
    if (!gameInstance) {
      throw new Error('Game instance not available for restore');
    }
    
    // Clear existing data if requested
    if (options.clearExisting !== false) {
      gameInstance.rebels.clear();
      gameInstance.inventory.clear();
      gameInstance.achievements.clear();
      // ... clear other maps
    }
    
    // Restore data
    this.objectToMap(data.rebels, gameInstance.rebels);
    this.objectToMap(data.corporations, gameInstance.corporations);
    this.objectToMap(data.inventory, gameInstance.inventory);
    this.objectToMap(data.achievements, gameInstance.achievements);
    this.objectToMap(data.leaderboard, gameInstance.leaderboard);
    this.objectToMap(data.resistanceCells, gameInstance.resistanceCells);
    this.objectToMap(data.activeTrades, gameInstance.activeTrades);
    this.objectToMap(data.marketplace, gameInstance.marketplace);
    this.objectToMap(data.auctions, gameInstance.auctions);
    this.objectToMap(data.dailyMissions, gameInstance.dailyMissions);
    this.objectToMap(data.globalEvents, gameInstance.globalEvents);
    this.objectToMap(data.raidParties, gameInstance.raidParties);
    this.objectToMap(data.cooldowns, gameInstance.cooldowns);
    this.objectToMap(data.guilds, gameInstance.guilds);
    
    this.logger.info('📊 Game data restored from backup');
  }

  // Convert Object back to Map
  objectToMap(obj, map) {
    if (!obj || !map) return;
    
    map.clear();
    for (const [key, value] of Object.entries(obj)) {
      map.set(key, value);
    }
  }

  // Clean up old backups
  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('raikurevolt-backup-') && file.endsWith('.json.gz'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          stat: null
        }));
      
      // Get file stats
      for (const file of backupFiles) {
        try {
          file.stat = await fs.stat(file.path);
        } catch (error) {
          this.logger.warn(`Failed to get stats for ${file.name}:`, error.message);
        }
      }
      
      // Sort by creation time (newest first)
      backupFiles
        .filter(file => file.stat)
        .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());
      
      // Remove old backups beyond the limit
      if (backupFiles.length > this.maxLocalBackups) {
        const filesToDelete = backupFiles.slice(this.maxLocalBackups);
        
        for (const file of filesToDelete) {
          try {
            await fs.unlink(file.path);
            this.logger.info(`🗑️ Deleted old backup: ${file.name}`);
          } catch (error) {
            this.logger.error(`Failed to delete backup ${file.name}:`, error.message);
          }
        }
      }
      
    } catch (error) {
      this.logger.error('Backup cleanup failed:', error.message);
      await this.errorTracker.trackError(error, { component: 'backup_cleanup' });
    }
  }

  // List available backups
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = [];
      
      for (const file of files) {
        if (file.startsWith('raikurevolt-backup-') && file.endsWith('.json.gz')) {
          const filepath = path.join(this.backupDir, file);
          const stat = await fs.stat(filepath);
          
          backupFiles.push({
            filename: file,
            filepath,
            size: stat.size,
            created: stat.mtime,
            isValid: await this.verifyBackup(filepath)
          });
        }
      }
      
      return backupFiles.sort((a, b) => b.created.getTime() - a.created.getTime());
      
    } catch (error) {
      this.logger.error('Failed to list backups:', error.message);
      return [];
    }
  }

  // Get backup statistics
  getBackupStats() {
    return {
      backupDir: this.backupDir,
      maxLocalBackups: this.maxLocalBackups,
      backupInterval: this.backupInterval,
      cloudStorageEnabled: !!this.s3,
      s3Bucket: this.s3Bucket
    };
  }
}

export default BackupManager;
