
#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

class BackendTestRunner {
  constructor() {
    this.results = {
      healthCheck: null,
      apiValidation: null,
      databaseOperations: null,
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        startTime: Date.now()
      }
    };
  }

  async runTest(scriptName, testName) {
    return new Promise((resolve) => {
      console.log(`\n🚀 Running ${testName}...`);
      console.log('='.repeat(60));
      
      const scriptPath = path.join(__dirname, scriptName);
      const process = spawn('node', [scriptPath], {
        stdio: 'inherit',
        env: { ...process.env }
      });
      
      process.on('close', (code) => {
        const success = code === 0;
        console.log(`\n${success ? '✅' : '❌'} ${testName} ${success ? 'PASSED' : 'FAILED'}`);
        
        this.results.summary.totalTests++;
        if (success) {
          this.results.summary.passedTests++;
        } else {
          this.results.summary.failedTests++;
        }
        
        resolve({ name: testName, success, exitCode: code });
      });
      
      process.on('error', (error) => {
        console.error(`\n❌ ${testName} ERROR: ${error.message}`);
        this.results.summary.totalTests++;
        this.results.summary.failedTests++;
        resolve({ name: testName, success: false, error: error.message });
      });
    });
  }

  async runAllTests() {
    console.log('🔬 BrillPrime Backend Test Suite');
    console.log('='.repeat(60));
    console.log(`Started at: ${new Date().toISOString()}`);
    
    // Run all tests sequentially
    const tests = [
      { script: 'api-health-checker.js', name: 'API Health Check' },
      { script: 'validate-api-database.js', name: 'API & Database Validation' },
      { script: 'test-database-operations.js', name: 'Database Operations Test' }
    ];
    
    const testResults = [];
    
    for (const test of tests) {
      const result = await this.runTest(test.script, test.name);
      testResults.push(result);
      
      // Add a small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Generate final report
    this.generateFinalReport(testResults);
    
    return {
      success: this.results.summary.failedTests === 0,
      results: this.results
    };
  }

  generateFinalReport(testResults) {
    const endTime = Date.now();
    const duration = ((endTime - this.results.summary.startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL BACKEND TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Test Duration: ${duration}s`);
    console.log(`Total Tests: ${this.results.summary.totalTests}`);
    console.log(`✅ Passed: ${this.results.summary.passedTests}`);
    console.log(`❌ Failed: ${this.results.summary.failedTests}`);
    console.log(`Success Rate: ${((this.results.summary.passedTests / this.results.summary.totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Test Results Summary:');
    testResults.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.name}: ${status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    if (this.results.summary.failedTests === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Your backend is ready for deployment.');
      console.log('✅ API endpoints are working correctly');
      console.log('✅ Database operations are functioning properly'); 
      console.log('✅ No critical issues found');
    } else {
      console.log('\n⚠️ SOME TESTS FAILED - Review the errors above');
      console.log('🔧 Fix the issues before deploying to production');
    }
    
    console.log('='.repeat(60));
    
    // Save results to file for later review
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      summary: this.results.summary,
      testResults,
      overallStatus: this.results.summary.failedTests === 0 ? 'PASSED' : 'FAILED'
    };
    
    const fs = require('fs');
    const reportPath = path.join(__dirname, '../test-reports', `backend-test-${Date.now()}.json`);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
      console.log(`📄 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.log(`⚠️ Could not save report file: ${error.message}`);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new BackendTestRunner();
  
  runner.runAllTests()
    .then(({ success }) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = BackendTestRunner;
