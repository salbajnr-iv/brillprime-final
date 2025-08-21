
#!/usr/bin/env node

const { Pool } = require('pg');

class DatabaseTester {
  constructor() {
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable not set');
      process.exit(1);
    }
    
    this.pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    this.testResults = [];
  }

  async testConnection() {
    console.log('🔗 Testing database connection...');
    
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT version()');
      client.release();
      
      console.log('✅ Database connection successful');
      console.log(`📊 PostgreSQL version: ${result.rows[0].version.split(',')[0]}`);
      
      this.testResults.push({ test: 'connection', status: 'PASS', details: result.rows[0].version });
      return true;
    } catch (error) {
      console.log(`❌ Database connection failed: ${error.message}`);
      this.testResults.push({ test: 'connection', status: 'FAIL', error: error.message });
      return false;
    }
  }

  async testTableStructure() {
    console.log('\n🗄️ Testing table structure...');
    
    const requiredTables = [
      'users',
      'orders', 
      'transactions',
      'notifications',
      'identity_verifications',
      'error_logs'
    ];

    try {
      const client = await this.pool.connect();
      
      for (const tableName of requiredTables) {
        // Check if table exists
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [tableName]);
        
        if (!tableExists.rows[0].exists) {
          throw new Error(`Table '${tableName}' does not exist`);
        }
        
        // Check table structure
        const columns = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        console.log(`✅ Table '${tableName}' exists with ${columns.rows.length} columns`);
        
        // Validate key columns for specific tables
        if (tableName === 'users') {
          const requiredColumns = ['id', 'email', 'password', 'full_name', 'role'];
          const existingColumns = columns.rows.map(c => c.column_name);
          
          for (const col of requiredColumns) {
            if (!existingColumns.includes(col)) {
              throw new Error(`Required column '${col}' missing from users table`);
            }
          }
        }
        
        if (tableName === 'orders') {
          const requiredColumns = ['id', 'order_number', 'customer_id', 'status', 'total_amount'];
          const existingColumns = columns.rows.map(c => c.column_name);
          
          for (const col of requiredColumns) {
            if (!existingColumns.includes(col)) {
              throw new Error(`Required column '${col}' missing from orders table`);
            }
          }
        }
      }
      
      client.release();
      
      console.log('✅ All required tables and columns verified');
      this.testResults.push({ test: 'table_structure', status: 'PASS', details: `${requiredTables.length} tables verified` });
      
    } catch (error) {
      console.log(`❌ Table structure test failed: ${error.message}`);
      this.testResults.push({ test: 'table_structure', status: 'FAIL', error: error.message });
      throw error;
    }
  }

  async testEnumTypes() {
    console.log('\n🎯 Testing enum types...');
    
    try {
      const client = await this.pool.connect();
      
      const enums = await client.query(`
        SELECT t.typname as enum_name, e.enumlabel as enum_value
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        ORDER BY t.typname, e.enumsortorder
      `);
      
      const enumGroups = {};
      enums.rows.forEach(row => {
        if (!enumGroups[row.enum_name]) {
          enumGroups[row.enum_name] = [];
        }
        enumGroups[row.enum_name].push(row.enum_value);
      });
      
      console.log('📋 Enum types found:');
      Object.entries(enumGroups).forEach(([name, values]) => {
        console.log(`  ${name}: [${values.join(', ')}]`);
      });
      
      // Verify required enums exist
      const requiredEnums = ['role', 'verification_status', 'order_status', 'payment_status'];
      for (const enumName of requiredEnums) {
        if (!enumGroups[enumName]) {
          throw new Error(`Required enum '${enumName}' not found`);
        }
      }
      
      client.release();
      
      console.log('✅ All required enum types verified');
      this.testResults.push({ test: 'enum_types', status: 'PASS', details: Object.keys(enumGroups) });
      
    } catch (error) {
      console.log(`❌ Enum types test failed: ${error.message}`);
      this.testResults.push({ test: 'enum_types', status: 'FAIL', error: error.message });
      throw error;
    }
  }

  async testCRUDOperations() {
    console.log('\n📝 Testing CRUD operations...');
    
    try {
      const client = await this.pool.connect();
      
      // Test user creation
      const testEmail = `test_${Date.now()}@example.com`;
      const userResult = await client.query(`
        INSERT INTO users (email, full_name, password, role) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id, email, full_name, role
      `, [testEmail, 'Test User', 'hashed_password', 'CONSUMER']);
      
      const userId = userResult.rows[0].id;
      console.log(`✅ User created successfully (ID: ${userId})`);
      
      // Test user read
      const readResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (readResult.rows.length === 0) {
        throw new Error('Failed to read created user');
      }
      console.log('✅ User read operation successful');
      
      // Test user update
      await client.query('UPDATE users SET full_name = $1 WHERE id = $2', ['Updated Test User', userId]);
      const updatedResult = await client.query('SELECT full_name FROM users WHERE id = $1', [userId]);
      if (updatedResult.rows[0].full_name !== 'Updated Test User') {
        throw new Error('User update failed');
      }
      console.log('✅ User update operation successful');
      
      // Test order creation with foreign key
      const orderResult = await client.query(`
        INSERT INTO orders (order_number, customer_id, order_type, status, total_amount) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id, order_number
      `, [`ORD-${Date.now()}`, userId, 'PRODUCT', 'PENDING', '100.00']);
      
      const orderId = orderResult.rows[0].id;
      console.log(`✅ Order created successfully (ID: ${orderId})`);
      
      // Test transaction creation
      const transactionResult = await client.query(`
        INSERT INTO transactions (order_id, user_id, amount, currency, payment_method, payment_status) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING id, transaction_ref
      `, [orderId, userId, '100.00', 'NGN', 'card', 'PENDING']);
      
      const transactionId = transactionResult.rows[0].id;
      console.log(`✅ Transaction created successfully (ID: ${transactionId})`);
      
      // Test complex join query
      const joinResult = await client.query(`
        SELECT 
          u.full_name, 
          o.order_number, 
          t.amount,
          t.payment_status
        FROM users u
        JOIN orders o ON u.id = o.customer_id
        JOIN transactions t ON o.id = t.order_id
        WHERE u.id = $1
      `, [userId]);
      
      if (joinResult.rows.length === 0) {
        throw new Error('Join query failed');
      }
      console.log('✅ Complex join query successful');
      
      // Clean up test data
      await client.query('DELETE FROM transactions WHERE id = $1', [transactionId]);
      await client.query('DELETE FROM orders WHERE id = $1', [orderId]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      console.log('✅ Test data cleanup successful');
      
      client.release();
      
      this.testResults.push({ test: 'crud_operations', status: 'PASS', details: 'All CRUD operations successful' });
      
    } catch (error) {
      console.log(`❌ CRUD operations test failed: ${error.message}`);
      this.testResults.push({ test: 'crud_operations', status: 'FAIL', error: error.message });
      throw error;
    }
  }

  async testTransactionIntegrity() {
    console.log('\n🔄 Testing transaction integrity...');
    
    try {
      const client = await this.pool.connect();
      
      await client.query('BEGIN');
      
      try {
        // Create test user in transaction
        const userResult = await client.query(`
          INSERT INTO users (email, full_name, password, role) 
          VALUES ($1, $2, $3, $4) 
          RETURNING id
        `, [`txn_test_${Date.now()}@example.com`, 'Transaction Test', 'password', 'CONSUMER']);
        
        const userId = userResult.rows[0].id;
        
        // Create order that should fail (invalid foreign key)
        try {
          await client.query(`
            INSERT INTO orders (order_number, customer_id, order_type, status, total_amount) 
            VALUES ($1, $2, $3, $4, $5)
          `, [`ORD-${Date.now()}`, 99999, 'PRODUCT', 'PENDING', '100.00']);
          
          throw new Error('Transaction should have failed');
        } catch (error) {
          // Expected to fail, rollback
          await client.query('ROLLBACK');
          console.log('✅ Transaction rollback successful');
        }
        
        // Verify user was not created (rollback worked)
        const checkResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (checkResult.rows.length > 0) {
          throw new Error('Transaction rollback failed - user still exists');
        }
        
        console.log('✅ Transaction integrity verified');
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      
      client.release();
      
      this.testResults.push({ test: 'transaction_integrity', status: 'PASS', details: 'Transaction rollback working correctly' });
      
    } catch (error) {
      console.log(`❌ Transaction integrity test failed: ${error.message}`);
      this.testResults.push({ test: 'transaction_integrity', status: 'FAIL', error: error.message });
      throw error;
    }
  }

  async testIndexes() {
    console.log('\n📊 Testing database indexes...');
    
    try {
      const client = await this.pool.connect();
      
      const indexes = await client.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `);
      
      console.log(`📋 Found ${indexes.rows.length} indexes:`);
      indexes.rows.forEach(idx => {
        console.log(`  ${idx.tablename}.${idx.indexname}`);
      });
      
      // Check for critical indexes
      const criticalIndexes = [
        'users_email_key',
        'users_pkey',
        'orders_pkey',
        'transactions_pkey'
      ];
      
      const existingIndexes = indexes.rows.map(i => i.indexname);
      const missingIndexes = criticalIndexes.filter(idx => !existingIndexes.includes(idx));
      
      if (missingIndexes.length > 0) {
        console.log(`⚠️ Missing critical indexes: ${missingIndexes.join(', ')}`);
      } else {
        console.log('✅ All critical indexes present');
      }
      
      client.release();
      
      this.testResults.push({ 
        test: 'indexes', 
        status: missingIndexes.length === 0 ? 'PASS' : 'WARN', 
        details: `${indexes.rows.length} indexes found, ${missingIndexes.length} missing`
      });
      
    } catch (error) {
      console.log(`❌ Index test failed: ${error.message}`);
      this.testResults.push({ test: 'indexes', status: 'FAIL', error: error.message });
    }
  }

  async testPerformance() {
    console.log('\n⚡ Testing database performance...');
    
    try {
      const client = await this.pool.connect();
      
      // Test query performance
      const start = Date.now();
      await client.query('SELECT COUNT(*) FROM users');
      const queryTime = Date.now() - start;
      
      console.log(`📊 Simple query time: ${queryTime}ms`);
      
      // Test connection pool
      const poolStart = Date.now();
      const promises = Array(5).fill().map(() => this.pool.query('SELECT 1'));
      await Promise.all(promises);
      const poolTime = Date.now() - poolStart;
      
      console.log(`📊 Connection pool (5 concurrent): ${poolTime}ms`);
      
      client.release();
      
      const performanceGood = queryTime < 100 && poolTime < 500;
      
      this.testResults.push({ 
        test: 'performance', 
        status: performanceGood ? 'PASS' : 'WARN', 
        details: `Query: ${queryTime}ms, Pool: ${poolTime}ms`
      });
      
      if (performanceGood) {
        console.log('✅ Database performance acceptable');
      } else {
        console.log('⚠️ Database performance may need optimization');
      }
      
    } catch (error) {
      console.log(`❌ Performance test failed: ${error.message}`);
      this.testResults.push({ test: 'performance', status: 'FAIL', error: error.message });
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Database Test Report...');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const warnings = this.testResults.filter(r => r.status === 'WARN').length;
    
    console.log('\n' + '='.repeat(60));
    console.log('🗄️ DATABASE TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.filter(r => r.status === 'FAIL').forEach((result, index) => {
        console.log(`${index + 1}. ${result.test}: ${result.error}`);
      });
    }
    
    if (warnings > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.testResults.filter(r => r.status === 'WARN').forEach((result, index) => {
        console.log(`${index + 1}. ${result.test}: ${result.details}`);
      });
    }
    
    console.log('='.repeat(60));
    
    return {
      timestamp: new Date().toISOString(),
      summary: { total: this.testResults.length, passed, failed, warnings },
      results: this.testResults
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Database Test Suite...\n');
    
    try {
      const connected = await this.testConnection();
      if (!connected) {
        throw new Error('Database connection failed - aborting tests');
      }
      
      await this.testTableStructure();
      await this.testEnumTypes();
      await this.testCRUDOperations();
      await this.testTransactionIntegrity();
      await this.testIndexes();
      await this.testPerformance();
      
      return await this.generateReport();
      
    } catch (error) {
      console.error(`💥 Test suite failed: ${error.message}`);
      throw error;
    }
  }

  async cleanup() {
    await this.pool.end();
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new DatabaseTester();
  
  tester.runAllTests()
    .then((report) => {
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Database tests failed:', error);
      process.exit(1);
    })
    .finally(() => {
      tester.cleanup();
    });
}

module.exports = DatabaseTester;
