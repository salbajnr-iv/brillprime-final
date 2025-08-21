
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class APIValidation {
  constructor() {
    this.issues = [];
    this.routeFiles = [];
    this.dbOperations = [];
  }

  scanRouteFiles() {
    console.log('🔍 Scanning route files...');
    
    const routesDir = path.join(__dirname, '../server/routes');
    const files = fs.readdirSync(routesDir);
    
    files.forEach(file => {
      if (file.endsWith('.ts')) {
        const filePath = path.join(routesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        this.analyzeRouteFile(file, content);
      }
    });
  }

  analyzeRouteFile(filename, content) {
    console.log(`📄 Analyzing ${filename}...`);
    
    // Check for common issues
    this.checkErrorHandling(filename, content);
    this.checkDatabaseQueries(filename, content);
    this.checkInputValidation(filename, content);
    this.checkAuthentication(filename, content);
    this.checkResponseStructure(filename, content);
  }

  checkErrorHandling(filename, content) {
    const routes = content.match(/router\.(get|post|put|delete|patch)\([^}]+\}/gs) || [];
    
    routes.forEach((route, index) => {
      if (!route.includes('try') || !route.includes('catch')) {
        this.issues.push({
          type: 'ERROR_HANDLING',
          severity: 'HIGH',
          file: filename,
          issue: `Route ${index + 1} missing try-catch error handling`,
          route: route.substring(0, 100) + '...'
        });
      }
      
      if (!route.includes('res.status(500)') && !route.includes('500')) {
        this.issues.push({
          type: 'ERROR_RESPONSE',
          severity: 'MEDIUM',
          file: filename,
          issue: `Route ${index + 1} missing 500 error response`,
          route: route.substring(0, 100) + '...'
        });
      }
    });
  }

  checkDatabaseQueries(filename, content) {
    // Check for SQL injection vulnerabilities
    const directQueries = content.match(/query\s*\(\s*['"`][^'"`]*\$\{[^}]*\}[^'"`]*['"`]/g);
    if (directQueries) {
      this.issues.push({
        type: 'SQL_INJECTION',
        severity: 'CRITICAL',
        file: filename,
        issue: 'Potential SQL injection vulnerability - using string interpolation in queries',
        details: directQueries
      });
    }

    // Check for missing database connection handling
    if (content.includes('db.') && !content.includes('catch')) {
      this.issues.push({
        type: 'DB_ERROR_HANDLING',
        severity: 'HIGH',
        file: filename,
        issue: 'Database operations without proper error handling'
      });
    }

    // Check for transaction consistency
    const hasBeginTransaction = content.includes('BEGIN') || content.includes('transaction');
    const hasCommit = content.includes('COMMIT');
    const hasRollback = content.includes('ROLLBACK');
    
    if (hasBeginTransaction && (!hasCommit || !hasRollback)) {
      this.issues.push({
        type: 'TRANSACTION_INCOMPLETE',
        severity: 'HIGH',
        file: filename,
        issue: 'Transaction started but missing commit/rollback handling'
      });
    }
  }

  checkInputValidation(filename, content) {
    const postRoutes = content.match(/router\.post\([^}]+\}/gs) || [];
    const putRoutes = content.match(/router\.put\([^}]+\}/gs) || [];
    
    [...postRoutes, ...putRoutes].forEach((route, index) => {
      if (!route.includes('validate') && !route.includes('sanitize') && !route.includes('req.body')) {
        return; // Skip if no body processing
      }
      
      if (!route.includes('validate') && !route.includes('sanitize')) {
        this.issues.push({
          type: 'INPUT_VALIDATION',
          severity: 'HIGH',
          file: filename,
          issue: `Route ${index + 1} missing input validation`,
          route: route.substring(0, 100) + '...'
        });
      }
    });
  }

  checkAuthentication(filename, content) {
    const protectedRoutes = content.match(/router\.(get|post|put|delete|patch)\([^}]+\}/gs) || [];
    
    protectedRoutes.forEach((route, index) => {
      // Skip public endpoints
      if (route.includes('/health') || route.includes('/public') || route.includes('/auth/login') || route.includes('/auth/register')) {
        return;
      }
      
      if (!route.includes('requireAuth') && !route.includes('auth') && !route.includes('middleware')) {
        this.issues.push({
          type: 'MISSING_AUTH',
          severity: 'MEDIUM',
          file: filename,
          issue: `Route ${index + 1} might be missing authentication middleware`,
          route: route.substring(0, 100) + '...'
        });
      }
    });
  }

  checkResponseStructure(filename, content) {
    const responses = content.match(/res\.(json|send)\([^)]+\)/g) || [];
    
    responses.forEach((response, index) => {
      if (!response.includes('success') && !response.includes('message') && !response.includes('data')) {
        this.issues.push({
          type: 'RESPONSE_STRUCTURE',
          severity: 'LOW',
          file: filename,
          issue: `Response ${index + 1} missing standard structure (success, message, data)`,
          response: response
        });
      }
    });
  }

  checkDatabaseSchema() {
    console.log('🗄️ Checking database schema consistency...');
    
    try {
      const dbPath = path.join(__dirname, '../server/db.ts');
      const schemaPath = path.join(__dirname, '../shared/schema.ts');
      
      if (fs.existsSync(dbPath)) {
        const dbContent = fs.readFileSync(dbPath, 'utf8');
        this.validateDatabaseOperations(dbContent);
      }
      
      if (fs.existsSync(schemaPath)) {
        const schemaContent = fs.readFileSync(schemaPath, 'utf8');
        this.validateSchemaDefinitions(schemaContent);
      }
      
    } catch (error) {
      this.issues.push({
        type: 'SCHEMA_ERROR',
        severity: 'CRITICAL',
        file: 'db.ts/schema.ts',
        issue: `Error reading database schema: ${error.message}`
      });
    }
  }

  validateDatabaseOperations(content) {
    // Check for proper enum usage
    const enumUsage = content.match(/roleEnum|verificationStatusEnum|orderStatusEnum|paymentStatusEnum/g);
    if (!enumUsage || enumUsage.length < 4) {
      this.issues.push({
        type: 'ENUM_MISSING',
        severity: 'MEDIUM',
        file: 'db.ts',
        issue: 'Missing or incomplete enum definitions'
      });
    }

    // Check for foreign key constraints
    const foreignKeys = content.match(/\.references\(\(\) => \w+\.\w+\)/g) || [];
    if (foreignKeys.length < 5) {
      this.issues.push({
        type: 'FOREIGN_KEYS',
        severity: 'MEDIUM',
        file: 'db.ts',
        issue: 'Insufficient foreign key relationships defined'
      });
    }

    // Check for indexes
    if (!content.includes('index') && !content.includes('Index')) {
      this.issues.push({
        type: 'MISSING_INDEXES',
        severity: 'MEDIUM',
        file: 'db.ts',
        issue: 'No database indexes defined for performance optimization'
      });
    }
  }

  validateSchemaDefinitions(content) {
    // Check for required security fields
    const securityFields = ['createdAt', 'updatedAt', 'isActive', 'isVerified'];
    securityFields.forEach(field => {
      if (!content.includes(field)) {
        this.issues.push({
          type: 'SECURITY_FIELD',
          severity: 'MEDIUM',
          file: 'schema.ts',
          issue: `Missing security field: ${field}`
        });
      }
    });
  }

  checkEnvironmentVariables() {
    console.log('🔧 Checking environment variable usage...');
    
    const envPath = path.join(__dirname, '../.env');
    if (!fs.existsSync(envPath)) {
      this.issues.push({
        type: 'ENV_MISSING',
        severity: 'CRITICAL',
        file: '.env',
        issue: 'Environment file not found'
      });
      return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'SESSION_SECRET',
      'NODE_ENV'
    ];

    requiredVars.forEach(varName => {
      if (!envContent.includes(varName)) {
        this.issues.push({
          type: 'ENV_VAR_MISSING',
          severity: 'HIGH',
          file: '.env',
          issue: `Required environment variable missing: ${varName}`
        });
      }
    });
  }

  generateReport() {
    console.log('\n📊 Generating Validation Report...');
    
    const criticalIssues = this.issues.filter(i => i.severity === 'CRITICAL');
    const highIssues = this.issues.filter(i => i.severity === 'HIGH');
    const mediumIssues = this.issues.filter(i => i.severity === 'MEDIUM');
    const lowIssues = this.issues.filter(i => i.severity === 'LOW');

    console.log('\n' + '='.repeat(60));
    console.log('🔍 API & DATABASE VALIDATION REPORT');
    console.log('='.repeat(60));
    console.log(`Total Issues Found: ${this.issues.length}`);
    console.log(`🔴 Critical: ${criticalIssues.length}`);
    console.log(`🟠 High: ${highIssues.length}`);
    console.log(`🟡 Medium: ${mediumIssues.length}`);
    console.log(`🟢 Low: ${lowIssues.length}`);

    if (criticalIssues.length > 0) {
      console.log('\n🔴 CRITICAL ISSUES:');
      criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.file}] ${issue.issue}`);
        if (issue.details) console.log(`   Details: ${JSON.stringify(issue.details)}`);
      });
    }

    if (highIssues.length > 0) {
      console.log('\n🟠 HIGH PRIORITY ISSUES:');
      highIssues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.file}] ${issue.issue}`);
      });
    }

    if (mediumIssues.length > 0) {
      console.log('\n🟡 MEDIUM PRIORITY ISSUES:');
      mediumIssues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.file}] ${issue.issue}`);
      });
    }

    console.log('='.repeat(60));

    return {
      timestamp: new Date().toISOString(),
      totalIssues: this.issues.length,
      breakdown: {
        critical: criticalIssues.length,
        high: highIssues.length,
        medium: mediumIssues.length,
        low: lowIssues.length
      },
      issues: this.issues
    };
  }

  async run() {
    console.log('🚀 Starting API & Database Validation...\n');
    
    this.scanRouteFiles();
    this.checkDatabaseSchema();
    this.checkEnvironmentVariables();
    
    return this.generateReport();
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new APIValidation();
  
  validator.run()
    .then((report) => {
      process.exit(report.breakdown.critical > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = APIValidation;
