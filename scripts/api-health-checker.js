
#!/usr/bin/env node

const axios = require('axios');
const { Pool } = require('pg');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const DATABASE_URL = process.env.DATABASE_URL;

class HealthChecker {
  constructor() {
    this.results = {
      database: {},
      api: {},
      endpoints: {},
      errors: []
    };
    
    if (DATABASE_URL) {
      this.pool = new Pool({ connectionString: DATABASE_URL });
    }
  }

  async checkDatabaseConnection() {
    console.log('🔍 Checking database connection...');
    
    try {
      if (!this.pool) {
        throw new Error('Database URL not configured');
      }
      
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      
      this.results.database.connection = 'HEALTHY';
      this.results.database.timestamp = result.rows[0].current_time;
      console.log('✅ Database connection: HEALTHY');
      
      return true;
    } catch (error) {
      this.results.database.connection = 'FAILED';
      this.results.database.error = error.message;
      this.results.errors.push(`Database connection failed: ${error.message}`);
      console.log('❌ Database connection: FAILED');
      return false;
    }
  }

  async checkDatabaseTables() {
    console.log('🔍 Checking database tables...');
    
    try {
      const client = await this.pool.connect();
      
      // Check critical tables exist
      const tables = [
        'users', 'orders', 'transactions', 'notifications', 
        'identity_verifications', 'error_logs'
      ];
      
      for (const table of tables) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [table]);
        
        if (!result.rows[0].exists) {
          throw new Error(`Table '${table}' does not exist`);
        }
      }
      
      client.release();
      this.results.database.tables = 'HEALTHY';
      console.log('✅ Database tables: HEALTHY');
      
      return true;
    } catch (error) {
      this.results.database.tables = 'FAILED';
      this.results.errors.push(`Database tables check failed: ${error.message}`);
      console.log('❌ Database tables: FAILED');
      return false;
    }
  }

  async checkAPIEndpoint(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 10000
      };
      
      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = data;
      }
      
      const response = await axios(config);
      
      this.results.endpoints[`${method} ${endpoint}`] = {
        status: 'HEALTHY',
        statusCode: response.status,
        responseTime: response.config.metadata?.endTime - response.config.metadata?.startTime || 'N/A'
      };
      
      console.log(`✅ ${method} ${endpoint}: ${response.status}`);
      return { success: true, response };
      
    } catch (error) {
      const statusCode = error.response?.status || 'NO_RESPONSE';
      const message = error.response?.data?.message || error.message;
      
      this.results.endpoints[`${method} ${endpoint}`] = {
        status: 'FAILED',
        statusCode,
        error: message
      };
      
      this.results.errors.push(`${method} ${endpoint}: ${message}`);
      console.log(`❌ ${method} ${endpoint}: ${statusCode} - ${message}`);
      return { success: false, error: message };
    }
  }

  async checkAuthenticationFlow() {
    console.log('\n🔐 Testing Authentication Flow...');
    
    // Test user registration
    const testUser = {
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      fullName: 'Test User',
      role: 'CONSUMER'
    };
    
    // Register user
    const registerResult = await this.checkAPIEndpoint('POST', '/api/auth/register', testUser);
    
    if (registerResult.success) {
      // Try to login
      const loginResult = await this.checkAPIEndpoint('POST', '/api/auth/login', {
        email: testUser.email,
        password: testUser.password
      });
      
      if (loginResult.success) {
        const token = loginResult.response.data.token;
        
        // Test protected endpoint
        await this.checkAPIEndpoint('GET', '/api/auth/profile', null, {
          'Authorization': `Bearer ${token}`
        });
        
        // Test logout
        await this.checkAPIEndpoint('POST', '/api/auth/logout', null, {
          'Authorization': `Bearer ${token}`
        });
      }
    }
  }

  async checkCRUDOperations() {
    console.log('\n📝 Testing CRUD Operations...');
    
    // Test basic endpoints that don't require authentication
    await this.checkAPIEndpoint('GET', '/api/health');
    await this.checkAPIEndpoint('GET', '/api/products');
    await this.checkAPIEndpoint('GET', '/api/merchants');
    
    // Test error handling
    await this.checkAPIEndpoint('GET', '/api/nonexistent-endpoint');
    await this.checkAPIEndpoint('POST', '/api/auth/login', { invalid: 'data' });
  }

  async checkDatabaseOperations() {
    console.log('\n💾 Testing Database Operations...');
    
    try {
      const client = await this.pool.connect();
      
      // Test user operations
      console.log('Testing user CRUD operations...');
      
      // Create test user
      const testUser = {
        email: `db_test_${Date.now()}@example.com`,
        fullName: 'Database Test User',
        password: 'hashedpassword',
        role: 'CONSUMER'
      };
      
      const userResult = await client.query(`
        INSERT INTO users (email, full_name, password, role) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id, email, full_name, role
      `, [testUser.email, testUser.fullName, testUser.password, testUser.role]);
      
      const userId = userResult.rows[0].id;
      console.log(`✅ User created with ID: ${userId}`);
      
      // Read user
      const readResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (readResult.rows.length === 0) {
        throw new Error('Failed to read created user');
      }
      console.log('✅ User read operation successful');
      
      // Update user
      await client.query('UPDATE users SET full_name = $1 WHERE id = $2', ['Updated Name', userId]);
      console.log('✅ User update operation successful');
      
      // Test transaction operations
      console.log('Testing transaction operations...');
      
      const transactionResult = await client.query(`
        INSERT INTO transactions (user_id, amount, currency, payment_method, payment_status) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id
      `, [userId, '100.00', 'NGN', 'card', 'PENDING']);
      
      const transactionId = transactionResult.rows[0].id;
      console.log(`✅ Transaction created with ID: ${transactionId}`);
      
      // Clean up test data
      await client.query('DELETE FROM transactions WHERE id = $1', [transactionId]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      console.log('✅ Test data cleaned up');
      
      client.release();
      
      this.results.database.operations = 'HEALTHY';
      
    } catch (error) {
      this.results.database.operations = 'FAILED';
      this.results.errors.push(`Database operations failed: ${error.message}`);
      console.log(`❌ Database operations failed: ${error.message}`);
    }
  }

  async checkWebSocketConnections() {
    console.log('\n🔌 Testing WebSocket Connections...');
    
    try {
      // Test WebSocket health endpoint
      await this.checkAPIEndpoint('GET', '/api/websocket/health');
      
      this.results.api.websocket = 'HEALTHY';
      console.log('✅ WebSocket service: HEALTHY');
      
    } catch (error) {
      this.results.api.websocket = 'FAILED';
      this.results.errors.push(`WebSocket check failed: ${error.message}`);
      console.log('❌ WebSocket service: FAILED');
    }
  }

  async checkPaymentIntegration() {
    console.log('\n💳 Testing Payment Integration...');
    
    try {
      // Test payment status endpoint
      await this.checkAPIEndpoint('GET', '/api/payments/status');
      
      this.results.api.payments = 'HEALTHY';
      console.log('✅ Payment service: HEALTHY');
      
    } catch (error) {
      this.results.api.payments = 'FAILED';
      this.results.errors.push(`Payment integration check failed: ${error.message}`);
      console.log('❌ Payment service: FAILED');
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Health Report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      overall_status: this.results.errors.length === 0 ? 'HEALTHY' : 'ISSUES_FOUND',
      summary: {
        total_checks: Object.keys(this.results.endpoints).length,
        passed_checks: Object.values(this.results.endpoints).filter(e => e.status === 'HEALTHY').length,
        failed_checks: Object.values(this.results.endpoints).filter(e => e.status === 'FAILED').length,
        database_status: this.results.database.connection || 'NOT_CHECKED',
        total_errors: this.results.errors.length
      },
      details: this.results
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 HEALTH CHECK REPORT');
    console.log('='.repeat(60));
    console.log(`Overall Status: ${report.overall_status}`);
    console.log(`Total Checks: ${report.summary.total_checks}`);
    console.log(`Passed: ${report.summary.passed_checks}`);
    console.log(`Failed: ${report.summary.failed_checks}`);
    console.log(`Database: ${report.summary.database_status}`);
    console.log(`Errors: ${report.summary.total_errors}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('='.repeat(60));
    
    return report;
  }

  async runFullHealthCheck() {
    console.log('🏥 Starting BrillPrime API & Database Health Check...\n');
    
    // Database checks
    const dbConnected = await this.checkDatabaseConnection();
    if (dbConnected) {
      await this.checkDatabaseTables();
      await this.checkDatabaseOperations();
    }
    
    // API endpoint checks
    await this.checkCRUDOperations();
    await this.checkAuthenticationFlow();
    await this.checkWebSocketConnections();
    await this.checkPaymentIntegration();
    
    // Generate final report
    return await this.generateReport();
  }

  async cleanup() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

// Add request timing interceptor
axios.interceptors.request.use((config) => {
  config.metadata = { startTime: Date.now() };
  return config;
});

axios.interceptors.response.use((response) => {
  response.config.metadata.endTime = Date.now();
  return response;
});

// Run health check if called directly
if (require.main === module) {
  const checker = new HealthChecker();
  
  checker.runFullHealthCheck()
    .then((report) => {
      process.exit(report.overall_status === 'HEALTHY' ? 0 : 1);
    })
    .catch((error) => {
      console.error('Health check failed:', error);
      process.exit(1);
    })
    .finally(() => {
      checker.cleanup();
    });
}

module.exports = HealthChecker;
