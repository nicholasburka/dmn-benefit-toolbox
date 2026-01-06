#!/usr/bin/env node

/**
 * Validate that a form collects all required DMN inputs
 */

const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const { validateFormSync, generateValidationReport } = require('../lib/form-validator');

program
  .name('validate-form')
  .description('Validate form against input schema')
  .argument('<form-path>', 'Path to Form.js JSON file')
  .option('-s, --schema <path>', 'Path to input-schema.json', 'schemas/input-schema.json')
  .option('--strict', 'Fail on extra fields (not just missing fields)')
  .action((formPath, options) => {
    console.log('Form Sync Validation\n');
    console.log('='.repeat(60));

    try {
      // Load form
      const absoluteFormPath = path.resolve(formPath);
      if (!fs.existsSync(absoluteFormPath)) {
        console.error(`\n❌ Error: Form file not found: ${formPath}`);
        process.exit(1);
      }

      console.log(`\n✓ Loading form: ${path.relative(process.cwd(), absoluteFormPath)}`);
      const formSchema = JSON.parse(fs.readFileSync(absoluteFormPath, 'utf-8'));

      // Load schema
      const absoluteSchemaPath = path.resolve(options.schema);
      if (!fs.existsSync(absoluteSchemaPath)) {
        console.error(`\n❌ Error: Schema file not found: ${options.schema}`);
        console.error('   Run derive-inputs first to generate the schema.');
        process.exit(1);
      }

      console.log(`✓ Loading schema: ${path.relative(process.cwd(), absoluteSchemaPath)}`);
      const inputSchema = JSON.parse(fs.readFileSync(absoluteSchemaPath, 'utf-8'));

      // Validate
      console.log('\n✓ Validating form against schema...\n');
      const validation = validateFormSync(formSchema, inputSchema);

      // Generate report
      const report = generateValidationReport(
        validation,
        path.basename(formPath),
        path.basename(options.schema)
      );

      console.log(report);

      // Exit code
      if (!validation.isValid) {
        process.exit(1);
      }

      if (options.strict && validation.extraFields.length > 0) {
        console.log('\n❌ Strict mode: Form has extra fields not in schema');
        process.exit(1);
      }

      process.exit(0);

    } catch (error) {
      console.error('\n❌ Validation failed:');
      console.error(error.message);
      console.error(error.stack);
      process.exit(1);
    }
  });

program.parse();
