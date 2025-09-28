#!/usr/bin/env node

/**
 * RaikuRevolt Deployment Script
 * Automated deployment and setup for PebbleHost
 * Handles environment validation, dependency installation, and service startup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Console colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

class DeploymentManager {
    constructor() {
        this.deploymentSteps = [
            'validateEnvironment',
            'installDependencies',
            'deployDiscordCommands',
            'validateConfiguration',
            'startApplication'
        ];
    }

    // Print colored output
    log(message, color = 'reset') {
        // Using console.log for interactive script output (acceptable for CLI tools)
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    // Run deployment process
    async deploy() {
        this.log('\n🚀 RaikuRevolt Deployment Manager', 'bright');
        this.log('===============================', 'blue');
        this.log('Automated deployment for PebbleHost\n', 'yellow');

        try {
            for (const step of this.deploymentSteps) {
                await this[step]();
            }

            this.log('\n🎉 Deployment completed successfully!', 'green');
            this.log('RaikuRevolt is ready for production use.', 'cyan');
            
        } catch (error) {
            this.log(`\n❌ Deployment failed: ${error.message}`, 'red');
            process.exit(1);
        }
    }

    // Step 1: Validate environment
    async validateEnvironment() {
        this.log('📋 Step 1: Validating Environment', 'cyan');
        this.log('==================================', 'blue');

        // Check if .env file exists
        const envPath = path.join(projectRoot, '.env');
        if (!fs.existsSync(envPath)) {
            throw new Error('.env file not found. Please create environment configuration.');
        }

        // Read and validate environment variables
        const envContent = fs.readFileSync(envPath, 'utf8');
        const requiredVars = [
            'DISCORD_TOKEN',
            'DISCORD_CLIENT_ID',
            'DISCORD_GUILD_ID',
            'FIREWORKS_API_KEY'
        ];

        const missingVars = [];
        for (const varName of requiredVars) {
            if (!envContent.includes(`${varName}=`) || 
                envContent.includes(`${varName}=your_`) ||
                envContent.includes(`${varName}=SENTIENT_`)) {
                missingVars.push(varName);
            }
        }

        if (missingVars.length > 0) {
            throw new Error(`Missing or invalid environment variables: ${missingVars.join(', ')}`);
        }

        // Check optional MongoDB configuration
        if (envContent.includes('MONGODB_URI=') && !envContent.includes('# MONGODB_URI=')) {
            this.log('✅ MongoDB configuration found', 'green');
        } else {
            this.log('⚠️  MongoDB not configured - will run in development mode', 'yellow');
        }

        this.log('✅ Environment validation passed\n', 'green');
    }

    // Step 2: Install dependencies
    async installDependencies() {
        this.log('📦 Step 2: Installing Dependencies', 'cyan');
        this.log('==================================', 'blue');

        try {
            await this.runCommand('npm', ['install'], 'Installing npm packages...');
            this.log('✅ Dependencies installed successfully\n', 'green');
        } catch (error) {
            throw new Error(`Failed to install dependencies: ${error.message}`);
        }
    }

    // Step 3: Deploy Discord commands
    async deployDiscordCommands() {
        this.log('🔗 Step 3: Deploying Discord Commands', 'cyan');
        this.log('=====================================', 'blue');

        try {
            await this.runCommand('npm', ['run', 'deploy-commands'], 'Deploying Discord slash commands...');
            this.log('✅ Discord commands deployed successfully\n', 'green');
        } catch (error) {
            throw new Error(`Failed to deploy Discord commands: ${error.message}`);
        }
    }

    // Step 4: Validate configuration
    async validateConfiguration() {
        this.log('🔍 Step 4: Validating Configuration', 'cyan');
        this.log('===================================', 'blue');

        // Check if package.json exists
        const packagePath = path.join(projectRoot, 'package.json');
        if (!fs.existsSync(packagePath)) {
            throw new Error('package.json not found');
        }

        // Validate package.json scripts
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const requiredScripts = ['start', 'deploy-commands'];
        
        for (const script of requiredScripts) {
            if (!packageJson.scripts || !packageJson.scripts[script]) {
                throw new Error(`Missing required script: ${script}`);
            }
        }

        // Check if main application file exists
        const mainFile = path.join(projectRoot, 'src', 'index.js');
        if (!fs.existsSync(mainFile)) {
            throw new Error('Main application file (src/index.js) not found');
        }

        this.log('✅ Configuration validation passed\n', 'green');
    }

    // Step 5: Start application
    async startApplication() {
        this.log('🚀 Step 5: Starting Application', 'cyan');
        this.log('===============================', 'blue');

        this.log('Starting RaikuRevolt application...', 'yellow');
        this.log('Monitor the logs for startup status.', 'yellow');
        this.log('Press Ctrl+C to stop the application.\n', 'yellow');

        // Start the application
        const child = spawn('npm', ['start'], {
            cwd: projectRoot,
            stdio: 'inherit'
        });

        // Handle process termination
        process.on('SIGINT', () => {
            this.log('\n🛑 Shutting down RaikuRevolt...', 'yellow');
            child.kill('SIGINT');
            process.exit(0);
        });

        child.on('error', (error) => {
            throw new Error(`Failed to start application: ${error.message}`);
        });

        child.on('exit', (code) => {
            if (code !== 0) {
                throw new Error(`Application exited with code ${code}`);
            }
        });
    }

    // Run a command and return a promise
    runCommand(command, args, description) {
        return new Promise((resolve, reject) => {
            this.log(`⏳ ${description}`, 'yellow');
            
            const child = spawn(command, args, {
                cwd: projectRoot,
                stdio: 'pipe'
            });

            let output = '';
            let errorOutput = '';

            child.stdout.on('data', (data) => {
                output += data.toString();
            });

            child.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
                }
            });

            child.on('error', (error) => {
                reject(error);
            });
        });
    }

    // Generate deployment report
    generateDeploymentReport() {
        const report = {
            timestamp: new Date().toISOString(),
            status: 'success',
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            platform: process.platform,
            steps: this.deploymentSteps,
            endpoints: [
                'http://localhost:3000/status',
                'http://localhost:3000/health',
                'http://localhost:3000/metrics'
            ]
        };

        const reportPath = path.join(projectRoot, 'deployment-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        this.log(`📊 Deployment report saved: ${reportPath}`, 'cyan');
    }
}

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const deployment = new DeploymentManager();
    deployment.deploy().catch(console.error);
}

export default DeploymentManager;
