#!/usr/bin/env node

/**
 * Generate test personas from templates
 * Creates persona JSON files in test-personas/{benefit}/ directory
 */

const path = require('path');
const fs = require('fs');
const { program } = require('commander');
const { getAllPersonaGenerators } = require('../lib/persona-templates');

program
  .name('generate-personas')
  .description('Generate test personas for a benefit from input schema')
  .argument('[schema-path]', 'Path to input-schema.json file', 'schemas/input-schema.json')
  .option('-o, --output <dir>', 'Output directory for personas', 'test-personas')
  .action((schemaPath, options) => {
    console.log('Generating Test Personas\n');
    console.log('='.repeat(60));

    try {
      // Load the input schema
      const absoluteSchemaPath = path.resolve(schemaPath);
      if (!fs.existsSync(absoluteSchemaPath)) {
        console.error(`\n❌ Error: Schema file not found: ${schemaPath}`);
        console.error('   Run derive-inputs first to generate the schema.');
        process.exit(1);
      }

      console.log(`\n✓ Loading schema: ${path.relative(process.cwd(), absoluteSchemaPath)}`);
      const schema = JSON.parse(fs.readFileSync(absoluteSchemaPath, 'utf-8'));

      if (!schema.benefit) {
        console.error('\n❌ Error: Schema missing "benefit" field');
        process.exit(1);
      }

      const benefitName = schema.benefit;
      console.log(`  Benefit: ${benefitName}`);

      // Create output directory
      const outputDir = path.join(options.output, benefitName);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`\n✓ Created output directory: ${outputDir}`);
      } else {
        console.log(`\n✓ Using output directory: ${outputDir}`);
      }

      // Generate all personas
      console.log('\n✓ Generating personas...');
      const generators = getAllPersonaGenerators();
      const generatedFiles = [];

      for (const [key, generator] of Object.entries(generators)) {
        const persona = generator(schema);

        // Create filename from persona name (kebab-case)
        const fileName = key
          .replace(/([A-Z])/g, '-$1')
          .toLowerCase()
          .replace(/^-/, '') + '.json';

        const filePath = path.join(outputDir, fileName);
        fs.writeFileSync(filePath, JSON.stringify(persona, null, 2));

        generatedFiles.push({
          file: fileName,
          name: persona.name,
          eligible: persona.expectedResult.isEligible
        });

        console.log(`  - ${fileName}`);
      }

      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('✅ Persona Generation Complete!\n');
      console.log(`Generated ${generatedFiles.length} personas for ${benefitName}`);
      console.log(`Output directory: ${outputDir}\n`);

      const eligible = generatedFiles.filter(p => p.eligible).length;
      const ineligible = generatedFiles.filter(p => !p.eligible).length;
      console.log(`  Eligible personas: ${eligible}`);
      console.log(`  Ineligible personas: ${ineligible}`);

      console.log('\nNext steps:');
      console.log('  - Review generated personas');
      console.log('  - Run test-personas.js to validate against API');
      console.log('  - Customize personas as needed\n');

    } catch (error) {
      console.error('\n❌ Persona generation failed:');
      console.error(error.message);
      console.error(error.stack);
      process.exit(1);
    }
  });

program.parse();
