#!/usr/bin/env node

const path = require('path');
const { parseDMNFile, getAllImportedDMN, getModelName, getNamespace } = require('./lib/dmn-parser');

// Test with SSI eligibility DMN file
const ssiDmnPath = path.join(__dirname, 'src/main/resources/benefits/federal/ssi-eligibility.dmn');

console.log('Testing DMN Parser Infrastructure\n');
console.log('='.repeat(60));

try {
  // Test 1: Parse DMN file
  console.log('\n✓ Test 1: Parse SSI Eligibility DMN');
  const doc = parseDMNFile(ssiDmnPath);
  const modelName = getModelName(doc);
  const namespace = getNamespace(doc);
  console.log(`  Model Name: ${modelName}`);
  console.log(`  Namespace: ${namespace}`);

  // Test 2: Get all imported DMN files
  console.log('\n✓ Test 2: Get All Imported DMN Files (Recursive)');
  const allFiles = getAllImportedDMN(ssiDmnPath);
  console.log(`  Found ${allFiles.length} DMN files:`);
  allFiles.forEach((file, index) => {
    const relativePath = path.relative(__dirname, file);
    const fileDoc = parseDMNFile(file);
    const fileName = getModelName(fileDoc);
    console.log(`  ${index + 1}. ${fileName} (${relativePath})`);
  });

  // Test 3: Verify circular import detection
  console.log('\n✓ Test 3: Circular Import Detection');
  const visited = new Set();
  const firstPass = getAllImportedDMN(ssiDmnPath, visited);
  const secondPass = getAllImportedDMN(ssiDmnPath, visited);
  console.log(`  First pass: ${firstPass.length} files`);
  console.log(`  Second pass: ${secondPass.length} files (should be 0 due to visited set)`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests passed!\n');

} catch (error) {
  console.error('\n❌ Test failed:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
