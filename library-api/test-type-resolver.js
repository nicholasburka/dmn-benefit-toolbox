#!/usr/bin/env node

const path = require('path');
const { parseDMNFile } = require('./lib/dmn-parser');
const { resolveType, resolveComplexType, getAllTypes } = require('./lib/type-resolver');

// Test with BDT.dmn
const bdtPath = path.join(__dirname, 'src/main/resources/BDT.dmn');

console.log('Testing Type Resolver\n');
console.log('='.repeat(60));

try {
  const bdtDoc = parseDMNFile(bdtPath);

  // Test 1: Resolve primitive types
  console.log('\n✓ Test 1: Resolve Primitive Types');
  const dateOfBirthType = resolveType('dateOfBirth', bdtDoc, 'tPerson');
  console.log(`  dateOfBirth: ${JSON.stringify(dateOfBirthType)}`);

  const isBlindOrDisabledType = resolveType('isBlindOrDisabled', bdtDoc, 'tPerson');
  console.log(`  isBlindOrDisabled: ${JSON.stringify(isBlindOrDisabledType)}`);

  // Test 2: Resolve complex types
  console.log('\n✓ Test 2: Resolve Complex Types');
  const incomeSourcesType = resolveType('incomeSources', bdtDoc, 'tPerson');
  console.log(`  incomeSources: ${JSON.stringify(incomeSourcesType, null, 2)}`);

  // Test 3: Resolve situation fields
  console.log('\n✓ Test 3: Resolve Situation Fields');
  const evaluationDateType = resolveType('evaluationDate', bdtDoc, 'tSituation');
  console.log(`  evaluationDate: ${JSON.stringify(evaluationDateType)}`);

  const primaryPersonIdType = resolveType('primaryPersonId', bdtDoc, 'tSituation');
  console.log(`  primaryPersonId: ${JSON.stringify(primaryPersonIdType)}`);

  // Test 4: Get all types
  console.log('\n✓ Test 4: Get All Type Definitions from BDT.dmn');
  const allTypes = getAllTypes(bdtDoc);
  const typeNames = Object.keys(allTypes).sort();
  console.log(`  Found ${typeNames.length} type definitions:`);
  typeNames.slice(0, 10).forEach(typeName => {
    console.log(`    - ${typeName}`);
  });
  if (typeNames.length > 10) {
    console.log(`    ... and ${typeNames.length - 10} more`);
  }

  // Test 5: Test all SSI person fields
  console.log('\n✓ Test 5: Resolve All SSI Person Fields');
  const ssiPersonFields = [
    'dateOfBirth',
    'isBlindOrDisabled',
    'citizenshipStatus',
    'refugeeAdmissionDate',
    'asylumGrantDate',
    'residenceState',
    'countableResources',
    'incomeSources'
  ];

  ssiPersonFields.forEach(fieldName => {
    const typeInfo = resolveType(fieldName, bdtDoc, 'tPerson');
    if (typeInfo) {
      console.log(`  ${fieldName}: ${typeInfo.primitive ? typeInfo.type : typeInfo.type + ' (complex)'}`);
    } else {
      console.log(`  ${fieldName}: NOT FOUND`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests passed!\n');

} catch (error) {
  console.error('\n❌ Test failed:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
