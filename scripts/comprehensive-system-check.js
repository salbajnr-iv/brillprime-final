
#!/usr/bin/env node

const { spawn } = require('child_process');
const BackendTestRunner = require('./run-backend-tests');
const ManualSystemValidator = require('./manual-system-validator');

class ComprehensiveSystemCheck {
  constructor() {
    this.results = {
      automatedTests: null,
      manualValidation: null,
      startTime: Date.now(),
      overallStatus: 'PENDING'
    };
  }

  async runComprehensiveCheck() {
    console.log('🚀 BRILLPRIME COMPREHENSIVE SYSTEM CHECK');
    console.log('='.repeat(80));
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('This will run both automated tests and manual validation...\n');

    try {
      // Step 1: Run automated backend tests
      console.log('🤖 PHASE 1: AUTOMATED BACKEND TESTS');
      console.log('-'.repeat(60));
      await this.runAutomatedTests();

      // Step 2: Run manual system validation
      console.log('\n🔍 PHASE 2: MANUAL SYSTEM VALIDATION');
      console.log('-'.repeat(60));
      await this.runManualValidation();

      // Step 3: Generate comprehensive report
      this.generateComprehensiveReport();

      return this.results;

    } catch (error) {
      console.error('💥 Comprehensive system check failed:', error.message);
      this.results.overallStatus = 'FAILED';
      return this.results;
    }
  }

  async runAutomatedTests() {
    try {
      const testRunner = new BackendTestRunner();
      const automatedResults = await testRunner.runAllTests();
      
      this.results.automatedTests = {
        success: automatedResults.success,
        summary: automatedResults.results.summary,
        duration: automatedResults.results.summary.duration || 'Unknown'
      };

      if (automatedResults.success) {
        console.log('✅ Automated tests: PASSED');
      } else {
        console.log('❌ Automated tests: FAILED');
      }

    } catch (error) {
      console.error('❌ Automated tests failed to run:', error.message);
      this.results.automatedTests = {
        success: false,
        error: error.message
      };
    }
  }

  async runManualValidation() {
    try {
      const validator = new ManualSystemValidator();
      await validator.runFullValidation();
      
      this.results.manualValidation = {
        success: validator.validationResults.summary.failedTests === 0,
        summary: validator.validationResults.summary,
        details: {
          apiEndpoints: validator.validationResults.apiEndpoints.length,
          databaseChecks: validator.validationResults.databaseChecks.length,
          securityChecks: validator.validationResults.securityChecks.length,
          integrationChecks: validator.validationResults.integrationChecks.length
        }
      };

      await validator.cleanup();

      if (this.results.manualValidation.success) {
        console.log('✅ Manual validation: PASSED');
      } else {
        console.log('❌ Manual validation: FAILED');
      }

    } catch (error) {
      console.error('❌ Manual validation failed to run:', error.message);
      this.results.manualValidation = {
        success: false,
        error: error.message
      };
    }
  }

  generateComprehensiveReport() {
    const endTime = Date.now();
    const totalDuration = ((endTime - this.results.startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE SYSTEM CHECK REPORT');
    console.log('='.repeat(80));
    console.log(`Total Duration: ${totalDuration}s`);
    console.log(`Completed at: ${new Date().toISOString()}`);

    // Determine overall status
    const automatedPassed = this.results.automatedTests?.success || false;
    const manualPassed = this.results.manualValidation?.success || false;
    
    if (automatedPassed && manualPassed) {
      this.results.overallStatus = 'ALL_PASSED';
    } else if (!automatedPassed && !manualPassed) {
      this.results.overallStatus = 'ALL_FAILED';
    } else {
      this.results.overallStatus = 'PARTIAL_FAILURE';
    }

    // Display results summary
    console.log('\n📋 RESULTS SUMMARY:');
    console.log('-'.repeat(40));
    
    // Automated Tests Results
    if (this.results.automatedTests) {
      const status = this.results.automatedTests.success ? '✅ PASSED' : '❌ FAILED';
      console.log(`🤖 Automated Tests: ${status}`);
      
      if (this.results.automatedTests.summary) {
        const summary = this.results.automatedTests.summary;
        console.log(`   Total: ${summary.totalTests}, Passed: ${summary.passedTests}, Failed: ${summary.failedTests}`);
      }
      
      if (this.results.automatedTests.error) {
        console.log(`   Error: ${this.results.automatedTests.error}`);
      }
    }

    // Manual Validation Results
    if (this.results.manualValidation) {
      const status = this.results.manualValidation.success ? '✅ PASSED' : '❌ FAILED';
      console.log(`🔍 Manual Validation: ${status}`);
      
      if (this.results.manualValidation.summary) {
        const summary = this.results.manualValidation.summary;
        console.log(`   Total: ${summary.total}, Passed: ${summary.passed}, Failed: ${summary.failed}, Warnings: ${summary.warnings}`);
      }
      
      if (this.results.manualValidation.details) {
        const details = this.results.manualValidation.details;
        console.log(`   API Endpoints: ${details.apiEndpoints}, DB Checks: ${details.databaseChecks}`);
        console.log(`   Security Checks: ${details.securityChecks}, Integrations: ${details.integrationChecks}`);
      }
      
      if (this.results.manualValidation.error) {
        console.log(`   Error: ${this.results.manualValidation.error}`);
      }
    }

    // Overall Assessment
    console.log('\n🎯 OVERALL ASSESSMENT:');
    console.log('-'.repeat(40));
    
    switch (this.results.overallStatus) {
      case 'ALL_PASSED':
        console.log('🎉 EXCELLENT! All tests and validations passed.');
        console.log('✅ Your BrillPrime backend is ready for deployment.');
        console.log('🚀 No critical issues found - proceed with confidence.');
        break;
        
      case 'ALL_FAILED':
        console.log('🚨 CRITICAL! Both automated tests and manual validation failed.');
        console.log('❌ DO NOT DEPLOY - Fix all issues before proceeding.');
        console.log('🔧 Review error logs and address all failing tests.');
        break;
        
      case 'PARTIAL_FAILURE':
        console.log('⚠️ MIXED RESULTS - Some tests passed, others failed.');
        console.log('🔍 Review failed tests and determine if they are blocking issues.');
        console.log('🛠️ Consider fixing failures before deployment.');
        break;
        
      default:
        console.log('❓ INCOMPLETE - Unable to determine overall status.');
        console.log('🔍 Review individual test results above.');
    }

    // Deployment Readiness
    console.log('\n🚀 DEPLOYMENT READINESS:');
    console.log('-'.repeat(40));
    
    if (this.results.overallStatus === 'ALL_PASSED') {
      console.log('✅ READY FOR DEPLOYMENT');
      console.log('   - All automated tests passing');
      console.log('   - All manual validations successful');
      console.log('   - No critical security issues');
      console.log('   - Database integrity verified');
      console.log('   - API endpoints functioning correctly');
    } else {
      console.log('❌ NOT READY FOR DEPLOYMENT');
      console.log('   - Address all failing tests');
      console.log('   - Fix critical errors');
      console.log('   - Re-run comprehensive check');
      console.log('   - Ensure all systems are green before deploying');
    }

    console.log('\n📁 NEXT STEPS:');
    console.log('-'.repeat(40));
    
    if (this.results.overallStatus === 'ALL_PASSED') {
      console.log('1. Deploy to Render with confidence');
      console.log('2. Monitor application logs after deployment');
      console.log('3. Run post-deployment health checks');
      console.log('4. Set up monitoring and alerting');
    } else {
      console.log('1. Review detailed error reports in test-reports/ directory');
      console.log('2. Fix all failing tests and critical issues');
      console.log('3. Re-run: npm run validate:full');
      console.log('4. Only deploy when all tests are green');
    }

    console.log('='.repeat(80));

    // Save comprehensive report
    this.saveComprehensiveReport(totalDuration);
  }

  saveComprehensiveReport(duration) {
    const fs = require('fs');
    const path = require('path');
    
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      overallStatus: this.results.overallStatus,
      automatedTests: this.results.automatedTests,
      manualValidation: this.results.manualValidation,
      deploymentReady: this.results.overallStatus === 'ALL_PASSED'
    };
    
    const reportPath = path.join(__dirname, '../test-reports', `comprehensive-check-${Date.now()}.json`);
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
      console.log(`📄 Comprehensive report saved to: ${reportPath}`);
    } catch (error) {
      console.log(`⚠️ Could not save comprehensive report: ${error.message}`);
    }
  }
}

// Run comprehensive check if called directly
if (require.main === module) {
  const checker = new ComprehensiveSystemCheck();
  
  checker.runComprehensiveCheck()
    .then((results) => {
      const success = results.overallStatus === 'ALL_PASSED';
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Comprehensive system check failed:', error);
      process.exit(1);
    });
}

module.exports = ComprehensiveSystemCheck;
