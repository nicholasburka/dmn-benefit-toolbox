#!/usr/bin/env node

/**
 * Generate input documentation from input-schema.json
 */

const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const { generateDocumentation, getBenefitFolderName } = require('../lib/doc-generator');

program
  .name('generate-docs')
  .description('Generate markdown documentation from input-schema.json')
  .argument('[schema-path]', 'Path to input-schema.json file', 'schemas/input-schema.json')
  .option('-o, --output <path>', 'Output directory for docs (default: docs/benefits/{benefit})')
  .action((schemaPath, options) => {
    console.log('Generating Input Documentation\n');
    console.log('='.repeat(60));

    try {
      // Load input schema
      const absoluteSchemaPath = path.resolve(schemaPath);
      if (!fs.existsSync(absoluteSchemaPath)) {
        console.error(`\n❌ Error: Schema file not found: ${schemaPath}`);
        console.error('   Run derive-inputs first to generate the schema.');
        process.exit(1);
      }

      console.log(`\n✓ Loading input schema: ${path.relative(process.cwd(), absoluteSchemaPath)}`);
      const inputSchema = JSON.parse(fs.readFileSync(absoluteSchemaPath, 'utf-8'));

      if (!inputSchema.benefit) {
        console.error('\n❌ Error: Schema missing "benefit" field');
        process.exit(1);
      }

      console.log(`  Benefit: ${inputSchema.benefit}`);

      // Generate documentation
      console.log('\n✓ Generating markdown documentation...');
      const markdown = generateDocumentation(inputSchema);

      // Determine output path
      let outputPath;
      if (options.output) {
        outputPath = path.resolve(options.output);
      } else {
        const benefitFolder = getBenefitFolderName(inputSchema.benefit);
        outputPath = path.resolve(`docs/benefits/${benefitFolder}/INPUTS.md`);
      }

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`  Created directory: ${path.relative(process.cwd(), outputDir)}`);
      }

      // Write output
      fs.writeFileSync(outputPath, markdown);
      console.log(`\n✓ Documentation written to: ${path.relative(process.cwd(), outputPath)}`);

      // Count sections
      const sectionCount = (markdown.match(/^##/gm) || []).length;
      const tableCount = (markdown.match(/^\|/gm) || []).length;

      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('✅ Documentation Generation Complete!\n');

      console.log('Documentation structure:');
      console.log(`  Sections: ${sectionCount}`);
      console.log(`  Table rows: ${tableCount}`);
      console.log(`  File size: ${(markdown.length / 1024).toFixed(1)} KB`);

      console.log('\nNext steps:');
      console.log('  - Review generated documentation');
      console.log('  - Share with stakeholders');
      console.log('  - Add to screener UI help text\n');

    } catch (error) {
      console.error('\n❌ Documentation generation failed:');
      console.error(error.message);
      console.error(error.stack);
      process.exit(1);
    }
  });

program.parse();
