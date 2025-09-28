#!/usr/bin/env node

/**
 * RaikuRevolt Handover Script
 * Facilitates easy switching between development and Sentient team credentials
 * Helps with deployment preparation and environment setup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Console colors for better output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class HandoverManager {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    // Print colored output
    log(message, color = 'reset') {
        // Using console.log for interactive script output (acceptable for CLI tools)
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    // Ask user for input
    async ask(question) {
        return new Promise((resolve) => {
            this.rl.question(`${colors.cyan}${question}${colors.reset}`, resolve);
        });
    }

    // Main handover process
    async run() {
        this.log('\n🤖 RaikuRevolt Handover Manager', 'bright');
        this.log('================================', 'blue');
        this.log('This tool helps prepare RaikuRevolt for handover to the Sentient team.\n', 'yellow');

        try {
            const action = await this.selectAction();
            
            switch (action) {
                case '1':
                    await this.setupSentientEnvironment();
                    break;
                case '2':
                    await this.validateConfiguration();
                    break;
                case '3':
                    await this.generateDeploymentPackage();
                    break;
                case '4':
                    await this.showHandoverChecklist();
                    break;
                case '5':
                    await this.testConnections();
                    break;
                default:
                    this.log('Invalid selection. Exiting.', 'red');
            }
        } catch (error) {
            this.log(`\n❌ Error: ${error.message}`, 'red');
        } finally {
            this.rl.close();
        }
    }

    // Select action menu
    async selectAction() {
        this.log('Select an action:', 'bright');
        this.log('1. Setup Sentient Team Environment', 'green');
        this.log('2. Validate Current Configuration', 'green');
        this.log('3. Generate Deployment Package', 'green');
        this.log('4. Show Handover Checklist', 'green');
        this.log('5. Test Database/Discord Connections', 'green');
        
        return await this.ask('\nEnter your choice (1-5): ');
    }

    // Setup Sentient team environment
    async setupSentientEnvironment() {
        this.log('\n🔧 Setting up Sentient Team Environment', 'bright');
        this.log('=========================================', 'blue');

        const credentials = await this.collectSentientCredentials();
        await this.createSentientEnvFile(credentials);
        
        this.log('\n✅ Sentient team environment file created!', 'green');
        this.log('📁 File location: .env.raiku-production', 'cyan');
        this.log('\n📋 Next steps:', 'yellow');
        this.log('1. Review the generated .env.raiku-production file', 'white');
        this.log('2. Test the configuration locally', 'white');
        this.log('3. Deploy to PebbleHost with these credentials', 'white');
    }

    // Collect Sentient team credentials
    async collectSentientCredentials() {
        this.log('\n📝 Please provide Sentient team credentials:', 'yellow');
        
        const credentials = {};
        
        // Discord credentials
        this.log('\n🔗 Discord Configuration:', 'cyan');
        credentials.DISCORD_TOKEN = await this.ask('Discord Bot Token: ');
        credentials.DISCORD_CLIENT_ID = await this.ask('Discord Client ID: ');
        credentials.DISCORD_GUILD_ID = await this.ask('Discord Guild ID: ');
        
        // MongoDB credentials
        this.log('\n🗄️ MongoDB Configuration:', 'cyan');
        credentials.MONGODB_URI = await this.ask('MongoDB Atlas URI: ');
        credentials.MONGODB_DATABASE = await this.ask('Database Name (default: raikurevolt_revolt): ') || 'raikurevolt_revolt';
        
        // AI credentials
        this.log('\n🧠 AI Configuration:', 'cyan');
        credentials.FIREWORKS_API_KEY = await this.ask('Fireworks AI API Key: ');
        
        // Optional services
        this.log('\n🔧 Optional Services (press Enter to skip):', 'cyan');
        credentials.AWS_ACCESS_KEY_ID = await this.ask('AWS Access Key ID: ');
        credentials.AWS_SECRET_ACCESS_KEY = await this.ask('AWS Secret Access Key: ');
        credentials.SENTRY_DSN = await this.ask('Sentry DSN: ');
        
        return credentials;
    }

    // Create Sentient environment file
    async createSentientEnvFile(credentials) {
        const envContent = `# RaikuRevolt Production Environment - Sentient Team
# Generated on ${new Date().toISOString()}

# ===========================================
# DISCORD CONFIGURATION
# ===========================================
DISCORD_TOKEN=${credentials.DISCORD_TOKEN}
DISCORD_CLIENT_ID=${credentials.DISCORD_CLIENT_ID}
DISCORD_GUILD_ID=${credentials.DISCORD_GUILD_ID}

# ===========================================
# MONGODB CONFIGURATION
# ===========================================
MONGODB_URI=${credentials.MONGODB_URI}
MONGODB_DATABASE=${credentials.MONGODB_DATABASE}

# ===========================================
# AI CONFIGURATION
# ===========================================
FIREWORKS_API_KEY=${credentials.FIREWORKS_API_KEY}
DOBBY_MODEL_ID=accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new

# ===========================================
# SERVER CONFIGURATION
# ===========================================
NODE_ENV=production
LOG_LEVEL=info
MONITORING_PORT=3000

# ===========================================
# GAME CONFIGURATION
# ===========================================
DAILY_ENERGY=100
RAID_COOLDOWN=300
MAX_INVENTORY_SIZE=50
BACKUP_INTERVAL=30
ENERGY_REGEN_RATE=1

# ===========================================
# SECURITY CONFIGURATION
# ===========================================
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# ===========================================
# OPTIONAL SERVICES
# ===========================================
${credentials.AWS_ACCESS_KEY_ID ? `AWS_ACCESS_KEY_ID=${credentials.AWS_ACCESS_KEY_ID}` : '# AWS_ACCESS_KEY_ID=your_aws_key'}
${credentials.AWS_SECRET_ACCESS_KEY ? `AWS_SECRET_ACCESS_KEY=${credentials.AWS_SECRET_ACCESS_KEY}` : '# AWS_SECRET_ACCESS_KEY=your_aws_secret'}
${credentials.SENTRY_DSN ? `SENTRY_DSN=${credentials.SENTRY_DSN}` : '# SENTRY_DSN=your_sentry_dsn'}

# ===========================================
# PEBBLEHOST CONFIGURATION
# ===========================================
# These will be set automatically by PebbleHost
# PORT=3000
# HOST=0.0.0.0
`;

        const envPath = path.join(projectRoot, '.env.raiku-production');
        fs.writeFileSync(envPath, envContent);
    }

    // Validate current configuration
    async validateConfiguration() {
        this.log('\n🔍 Validating Current Configuration', 'bright');
        this.log('===================================', 'blue');

        const envPath = path.join(projectRoot, '.env');
        
        if (!fs.existsSync(envPath)) {
            this.log('❌ No .env file found', 'red');
            return;
        }

        const envContent = fs.readFileSync(envPath, 'utf8');
        const requiredVars = [
            'DISCORD_TOKEN',
            'DISCORD_CLIENT_ID',
            'DISCORD_GUILD_ID',
            'FIREWORKS_API_KEY'
        ];

        this.log('\n📋 Checking required environment variables:', 'yellow');
        
        for (const varName of requiredVars) {
            const hasVar = envContent.includes(`${varName}=`) && 
                          !envContent.includes(`${varName}=your_`) &&
                          !envContent.includes(`${varName}=SENTIENT_`);
            
            if (hasVar) {
                this.log(`✅ ${varName}`, 'green');
            } else {
                this.log(`❌ ${varName} - Missing or placeholder value`, 'red');
            }
        }

        // Check optional variables
        this.log('\n📋 Checking optional variables:', 'yellow');
        const optionalVars = ['MONGODB_URI', 'AWS_ACCESS_KEY_ID', 'SENTRY_DSN'];
        
        for (const varName of optionalVars) {
            const hasVar = envContent.includes(`${varName}=`) && 
                          !envContent.includes(`# ${varName}=`);
            
            if (hasVar) {
                this.log(`✅ ${varName}`, 'green');
            } else {
                this.log(`⚠️  ${varName} - Not configured`, 'yellow');
            }
        }
    }

    // Generate deployment package
    async generateDeploymentPackage() {
        this.log('\n📦 Generating Deployment Package', 'bright');
        this.log('=================================', 'blue');

        const packageInfo = {
            name: 'RaikuRevolt Deployment Package',
            version: '1.0.0',
            generatedAt: new Date().toISOString(),
            files: [
                'src/',
                'docs/',
                'deployment/',
                'package.json',
                '.env.template',
                '.env.raiku-team',
                'README.md'
            ],
            instructions: [
                '1. Upload all files to PebbleHost',
                '2. Set environment variables in PebbleHost control panel',
                '3. Run "npm install" to install dependencies',
                '4. Run "npm run deploy-commands" to register Discord commands',
                '5. Start the application with "npm start"',
                '6. Test all functionality'
            ]
        };

        const packagePath = path.join(projectRoot, 'deployment-package.json');
        fs.writeFileSync(packagePath, JSON.stringify(packageInfo, null, 2));

        this.log('✅ Deployment package information generated!', 'green');
        this.log(`📁 File location: ${packagePath}`, 'cyan');
    }

    // Show handover checklist
    async showHandoverChecklist() {
        this.log('\n📋 Handover Checklist', 'bright');
        this.log('====================', 'blue');

        const checklist = [
            '🔧 Setup Phase',
            '  □ Create Sentient team PebbleHost account',
            '  □ Create Sentient team MongoDB Atlas cluster',
            '  □ Create Sentient team Discord application',
            '  □ Generate Sentient team environment configuration',
            '',
            '🚀 Deployment Phase',
            '  □ Upload RaikuRevolt files to PebbleHost',
            '  □ Configure environment variables in PebbleHost',
            '  □ Install dependencies (npm install)',
            '  □ Deploy Discord commands (npm run deploy-commands)',
            '  □ Start the application (npm start)',
            '',
            '✅ Testing Phase',
            '  □ Test Discord bot connection',
            '  □ Test MongoDB database connection',
            '  □ Test all Discord commands',
            '  □ Test monitoring endpoints',
            '  □ Verify security systems',
            '',
            '📋 Handover Phase',
            '  □ Transfer PebbleHost account ownership',
            '  □ Transfer MongoDB Atlas project ownership',
            '  □ Transfer Discord application ownership',
            '  □ Provide documentation and credentials',
            '  □ Conduct handover meeting',
            '',
            '🔄 Post-Handover',
            '  □ Monitor application for 24-48 hours',
            '  □ Provide ongoing support as needed',
            '  □ Document any issues and resolutions'
        ];

        checklist.forEach(item => {
            if (item.startsWith('🔧') || item.startsWith('🚀') || item.startsWith('✅') || item.startsWith('📋') || item.startsWith('🔄')) {
                this.log(item, 'cyan');
            } else if (item.trim() === '') {
                console.log('');
            } else {
                this.log(item, 'white');
            }
        });
    }

    // Test connections
    async testConnections() {
        this.log('\n🔌 Testing Connections', 'bright');
        this.log('======================', 'blue');

        this.log('\n⚠️  This feature requires the application to be running.', 'yellow');
        this.log('Please ensure RaikuRevolt is started before running connection tests.', 'yellow');
        
        const shouldContinue = await this.ask('\nContinue with connection tests? (y/n): ');
        
        if (shouldContinue.toLowerCase() !== 'y') {
            this.log('Connection tests cancelled.', 'yellow');
            return;
        }

        // Test monitoring endpoint
        try {
            this.log('\n🔍 Testing monitoring endpoint...', 'cyan');
            const response = await fetch('http://localhost:3000/status');
            if (response.ok) {
                this.log('✅ Monitoring endpoint is accessible', 'green');
            } else {
                this.log('❌ Monitoring endpoint returned error', 'red');
            }
        } catch (error) {
            this.log('❌ Could not connect to monitoring endpoint', 'red');
            this.log('   Make sure RaikuRevolt is running on port 3000', 'yellow');
        }
    }
}

// Run the handover manager
const handover = new HandoverManager();
handover.run().catch(console.error);
