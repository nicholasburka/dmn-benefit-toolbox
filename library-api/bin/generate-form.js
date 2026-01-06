#!/usr/bin/env node

/**
 * Generate Form.js schema from input-schema.json
 */

const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const { generateFormSchema, addFieldDescriptions } = require('../lib/form-generator');

program
  .name('generate-form')
  .description('Generate Form.js schema from input-schema.json')
  .argument('[schema-path]', 'Path to input-schema.json file', 'schemas/input-schema.json')
  .option('-o, --output <path>', 'Output path for form JSON', 'schemas/generated-form.json')
  .option('--no-descriptions', 'Omit field descriptions')
  .action((schemaPath, options) => {
    console.log('Generating Form.js Schema\n');
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

      // Generate form schema
      console.log('\n✓ Generating Form.js schema...');
      let formSchema = generateFormSchema(inputSchema);

      // Add descriptions if requested
      if (options.descriptions !== false) {
        formSchema = addFieldDescriptions(formSchema);
        console.log('  Added field descriptions');
      }

      // Count components
      const countComponents = (components) => {
        let count = 0;
        for (const comp of components) {
          count++;
          if (comp.components) {
            count += countComponents(comp.components);
          }
        }
        return count;
      };

      const totalComponents = countComponents(formSchema.components);
      console.log(`  Generated ${totalComponents} form components`);

      // Write output
      const outputPath = path.resolve(options.output);
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(formSchema, null, 2));
      console.log(`\n✓ Form schema written to: ${path.relative(process.cwd(), outputPath)}`);

      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('✅ Form Generation Complete!\n');

      console.log('Form structure:');
      console.log(`  Title: ${formSchema.title}`);
      console.log(`  ID: ${formSchema.id}`);
      console.log(`  Total components: ${totalComponents}`);
      console.log(`  Top-level groups: ${formSchema.components.length}`);

      console.log('\nNext steps:');
      console.log('  - Review generated form');
      console.log('  - Import into Form.js editor');
      console.log('  - Customize labels and descriptions');
      console.log('  - Add validation rules as needed\n');

    } catch (error) {
      console.error('\n❌ Form generation failed:');
      console.error(error.message);
      console.error(error.stack);
      process.exit(1);
    }
  });

program.parse();
