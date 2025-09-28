#!/usr/bin/env node

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
}

async function fixItemsTableSchema() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔌 Connecting to database...');
        
        // Test connection
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        
        console.log('✅ Connected to database successfully');

        // Check if quantity column exists
        console.log('🔍 Checking items table schema...');
        const checkQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'items' AND column_name = 'quantity'
        `;
        const result = await pool.query(checkQuery);
        
        if (result.rows.length === 0) {
            console.log('⚠️ Quantity column missing from items table. Adding it now...');
            
            // Add the missing quantity column
            const alterQuery = `
                ALTER TABLE items 
                ADD COLUMN quantity INTEGER DEFAULT 1
            `;
            await pool.query(alterQuery);
            
            console.log('✅ Quantity column added to items table successfully');
        } else {
            console.log('✅ Items table schema is correct - quantity column already exists');
        }

        // Verify the fix
        console.log('🔍 Verifying table structure...');
        const verifyQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'items'
            ORDER BY ordinal_position
        `;
        const verifyResult = await pool.query(verifyQuery);
        
        console.log('📋 Current items table structure:');
        verifyResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
        });

    } catch (error) {
        console.error('❌ Error fixing items table schema:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('🔌 Database connection closed');
    }
}

// Run the migration
fixItemsTableSchema()
    .then(() => {
        console.log('🎉 Items table schema fix completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    });
