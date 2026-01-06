#!/usr/bin/env node

const path = require('path');
const { parseDMNFile, getAllImportedDMN } = require('./lib/dmn-parser');
const { extractFieldReferences, extractFieldReferencesFromMultiple, organizeFields } = require('./lib/feel-extractor');

// Test with SSI eligibility DMN file
const ssiDmnPath = path.join(__dirname, 'src/main/resources/benefits/federal/ssi-eligibility.dmn');

console.log('Testing FEEL Field Extractor\n');
console.log('='.repeat(60));

try {
  // Test 1: Extract fields from single DMN file
  console.log('\n✓ Test 1: Extract Fields from categorical-eligibility.dmn');
  const categoricalPath = path.join(__dirname, 'src/main/resources/checks/categorical/categorical-eligibility.dmn');
  const categoricalDoc = parseDMNFile(categoricalPath);
  const categoricalFields = extractFieldReferences(categoricalDoc);
  console.log(`  Person fields: ${Array.from(categoricalFields.person).join(', ')}`);
  console.log(`  Situation fields: ${Array.from(categoricalFields.situation).join(', ')}`);

  // Test 2: Extract fields from all SSI DMN files
  console.log('\n✓ Test 2: Extract Fields from All SSI DMN Files');
  const allFiles = getAllImportedDMN(ssiDmnPath);
  const allDocs = allFiles.map(file => parseDMNFile(file));
  const allFields = extractFieldReferencesFromMultiple(allDocs);

  console.log(`\n  Person fields (${allFields.person.size} total):`);
  const personFieldsArray = Array.from(allFields.person).sort();
  personFieldsArray.forEach(field => {
    console.log(`    - ${field}`);
  });

  console.log(`\n  Situation fields (${allFields.situation.size} total):`);
  const situationFieldsArray = Array.from(allFields.situation).sort();
  situationFieldsArray.forEach(field => {
    console.log(`    - ${field}`);
  });

  // Test 3: Organize fields hierarchically
  console.log('\n✓ Test 3: Organize Person Fields');
  const organized = organizeFields(allFields.person);
  console.log(`  Top-level person fields: ${Object.keys(organized).join(', ')}`);

  // Test 4: Test nested field detection
  console.log('\n✓ Test 4: Nested Field Detection');
  const incomePath = path.join(__dirname, 'src/main/resources/checks/income/calculate-countable-income.dmn');
  const incomeDoc = parseDMNFile(incomePath);
  const incomeFields = extractFieldReferences(incomeDoc);
  console.log(`  Person fields from income check: ${Array.from(incomeFields.person).join(', ')}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests passed!\n');

} catch (error) {
  console.error('\n❌ Test failed:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
