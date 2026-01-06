#!/usr/bin/env node

/**
 * Complete Auto Input Derivation Workflow
 * Chains together all steps: derive → generate-form → validate → docs
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { program } = require('commander');

program
  .name('workflow-all')
  .description('Run complete auto input derivation workflow')
  .argument('[dmn-path]', 'Path to benefit DMN file', 'src/main/resources/benefits/federal/ssi-eligibility.dmn')
  .option('--no-personas', 'Skip persona generation and testing')
  .option('--no-form', 'Skip form generation')
  .option('--no-docs', 'Skip documentation generation')
  .option('--strict', 'Use strict validation (fail on extra fields)')
  .action((dmnPath, options) => {
    console.log('Auto Input Derivation Workflow\n');
    console.log('='.repeat(60));
    console.log('\nRunning complete workflow...\n');

    const steps = [];
    let stepNumber = 1;

    try {
      // Step 1: Derive inputs
      steps.push({
        number: stepNumber++,
        name: 'Derive inputs from DMN',
        command: `node bin/derive-inputs.js "${dmnPath}"`
      });

      // Step 2: Generate personas (if enabled)
      if (options.personas !== false) {
        steps.push({
          number: stepNumber++,
          name: 'Generate test personas',
          command: 'node bin/generate-personas.js'
        });

        steps.push({
          number: stepNumber++,
          name: 'Test personas against API',
          command: 'node bin/test-personas.js'
        });
      }

      // Step 3: Generate form (if enabled)
      if (options.form !== false) {
        steps.push({
          number: stepNumber++,
          name: 'Generate Form.js schema',
          command: 'node bin/generate-form.js'
        });

        // Step 4: Validate form
        const validateCmd = options.strict
          ? 'node bin/validate-form.js schemas/generated-form.json --strict'
          : 'node bin/validate-form.js schemas/generated-form.json';

        steps.push({
          number: stepNumber++,
          name: 'Validate form sync',
          command: validateCmd
        });
      }

      // Step 5: Generate docs (if enabled)
      if (options.docs !== false) {
        steps.push({
          number: stepNumber++,
          name: 'Generate documentation',
          command: 'node bin/generate-docs.js'
        });
      }

      // Execute all steps
      for (const step of steps) {
        console.log(`\nStep ${step.number}: ${step.name}`);
        console.log('-'.repeat(60));

        try {
          const output = execSync(step.command, {
            cwd: process.cwd(),
            encoding: 'utf-8',
            stdio: 'inherit'
          });
        } catch (error) {
          console.error(`\n❌ Step ${step.number} failed: ${step.name}`);
          console.error(`   Command: ${step.command}`);
          process.exit(1);
        }
      }

      // Success summary
      console.log('\n' + '='.repeat(60));
      console.log('✅ Workflow Complete!\n');

      console.log('Generated artifacts:');
      console.log('  📄 schemas/input-schema.json - DMN input schema');

      if (fs.existsSync('schemas/personas.json')) {
        console.log('  👥 schemas/personas.json - Test personas');
      }

      if (fs.existsSync('schemas/generated-form.json')) {
        console.log('  📝 schemas/generated-form.json - Form.js schema');
      }

      // Find docs directory
      const docsDir = 'docs/benefits';
      if (fs.existsSync(docsDir)) {
        const benefits = fs.readdirSync(docsDir);
        if (benefits.length > 0) {
          console.log(`  📚 docs/benefits/${benefits[0]}/INPUTS.md - Documentation`);
        }
      }

      console.log('\nNext steps:');
      console.log('  - Review generated artifacts');
      console.log('  - Import form into Form.js editor');
      console.log('  - Share documentation with stakeholders');
      console.log('  - Customize as needed\n');

    } catch (error) {
      console.error('\n❌ Workflow failed:');
      console.error(error.message);
      process.exit(1);
    }
  });

program.parse();
