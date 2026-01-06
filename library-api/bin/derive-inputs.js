#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { Command } = require('commander');
const { parseDMNFile, getAllImportedDMN, getModelName } = require('../lib/dmn-parser');
const { extractFieldReferencesFromMultiple } = require('../lib/feel-extractor');
const { resolveType } = require('../lib/type-resolver');

const program = new Command();

program
  .name('derive-inputs')
  .description('Derive required inputs from DMN benefit file')
  .argument('<benefit-dmn>', 'Path to benefit DMN file (e.g., ssi-eligibility.dmn)')
  .option('-o, --output <path>', 'Output path for schema JSON', 'schemas/input-schema.json')
  .action((benefitDmnPath, options) => {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('Deriving Inputs from DMN Files');
      console.log('='.repeat(60));

      // Step 1: Get all imported DMN files
      console.log(`\n📂 Scanning ${benefitDmnPath}...`);
      const allDmnFiles = getAllImportedDMN(benefitDmnPath);
      console.log(`   Found ${allDmnFiles.length} DMN files (including imports)`);

      // Step 2: Find BDT.dmn for type resolution
      const bdtPath = allDmnFiles.find(file => file.includes('BDT.dmn'));
      if (!bdtPath) {
        throw new Error('BDT.dmn not found in imported files. Cannot resolve types.');
      }

      const bdtDoc = parseDMNFile(bdtPath);
      console.log(`   Found BDT.dmn: ${path.relative(process.cwd(), bdtPath)}`);

      // Step 3: Extract field references from all DMN files
      console.log(`\n🔍 Extracting field references from FEEL expressions...`);
      const allDocs = allDmnFiles.map(file => parseDMNFile(file));
      const { person, situation } = extractFieldReferencesFromMultiple(allDocs);

      console.log(`   Found ${person.size} person fields`);
      console.log(`   Found ${situation.size} situation fields`);

      // Step 4: Resolve types for each field
      console.log(`\n🔧 Resolving types from BDT.dmn...`);

      const personFields = {};
      for (const fieldName of person) {
        // Skip nested paths - only process top-level fields
        if (fieldName.includes('[') || fieldName.includes('.')) {
          continue;
        }

        const typeInfo = resolveType(fieldName, bdtDoc, 'tPerson');
        if (typeInfo) {
          personFields[fieldName] = {
            type: typeInfo.type,
            required: false, // We can't determine required vs optional from DMN alone
            isCollection: typeInfo.isCollection,
            ...(typeInfo.primitive !== undefined && { primitive: typeInfo.primitive }),
            ...(typeInfo.itemType && { itemType: typeInfo.itemType }),
            ...(typeInfo.fields && { fields: typeInfo.fields })
          };
        }
      }

      const situationFields = {};
      for (const fieldName of situation) {
        const typeInfo = resolveType(fieldName, bdtDoc, 'tSituation');
        if (typeInfo) {
          situationFields[fieldName] = {
            type: typeInfo.type,
            required: false,
            isCollection: typeInfo.isCollection,
            ...(typeInfo.primitive !== undefined && { primitive: typeInfo.primitive }),
            ...(typeInfo.itemType && { itemType: typeInfo.itemType }),
            ...(typeInfo.fields && { fields: typeInfo.fields })
          };
        }
      }

      console.log(`   Resolved ${Object.keys(personFields).length} person field types`);
      console.log(`   Resolved ${Object.keys(situationFields).length} situation field types`);

      // Step 5: Build output schema
      const benefitDoc = parseDMNFile(benefitDmnPath);
      const benefitName = getModelName(benefitDoc);

      const schema = {
        benefit: benefitName,
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        sourceDmnFile: path.relative(process.cwd(), benefitDmnPath),
        requiredInputs: {
          person: personFields,
          situation: situationFields
        },
        _metadata: {
          totalDmnFiles: allDmnFiles.length,
          personFieldCount: Object.keys(personFields).length,
          situationFieldCount: Object.keys(situationFields).length
        }
      };

      // Step 6: Write output
      const outputPath = path.resolve(options.output);
      const outputDir = path.dirname(outputPath);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));

      console.log(`\n✅ Input schema generated successfully!`);
      console.log(`   Output: ${outputPath}`);
      console.log('\n' + '='.repeat(60) + '\n');

      // Summary
      console.log('Summary:');
      console.log(`  Benefit: ${benefitName}`);
      console.log(`  Person fields: ${Object.keys(personFields).join(', ')}`);
      console.log(`  Situation fields: ${Object.keys(situationFields).join(', ')}`);
      console.log('');

    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  });

program.parse();
