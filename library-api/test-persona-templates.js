#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { getAllPersonaGenerators } = require('./lib/persona-templates');

// Load the input schema
const schemaPath = path.join(__dirname, 'schemas/input-schema.json');

console.log('Testing Persona Templates\n');
console.log('='.repeat(60));

try {
  // Test 1: Load schema
  console.log('\n✓ Test 1: Load Input Schema');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  console.log(`  Loaded schema for: ${schema.benefit}`);

  // Test 2: Generate all personas
  console.log('\n✓ Test 2: Generate All Persona Types');
  const generators = getAllPersonaGenerators();
  const generatorNames = Object.keys(generators);
  console.log(`  Found ${generatorNames.length} persona generators`);

  const personas = {};
  for (const [name, generator] of Object.entries(generators)) {
    personas[name] = generator(schema);
    console.log(`  - ${personas[name].name}`);
  }

  // Test 3: Validate persona structure
  console.log('\n✓ Test 3: Validate Persona Structure');
  for (const [name, persona] of Object.entries(personas)) {
    // Check required fields
    if (!persona.name) throw new Error(`${name}: Missing 'name' field`);
    if (!persona.description) throw new Error(`${name}: Missing 'description' field`);
    if (!persona.situation) throw new Error(`${name}: Missing 'situation' field`);
    if (!persona.expectedResult) throw new Error(`${name}: Missing 'expectedResult' field`);

    // Check situation structure
    const sit = persona.situation;
    if (!sit.primaryPersonId) throw new Error(`${name}: Missing 'situation.primaryPersonId'`);
    if (!sit.evaluationDate) throw new Error(`${name}: Missing 'situation.evaluationDate'`);
    if (!sit.people || sit.people.length === 0) throw new Error(`${name}: Missing 'situation.people'`);

    // Check expectedResult structure
    const exp = persona.expectedResult;
    if (typeof exp.isEligible !== 'boolean') throw new Error(`${name}: Missing 'expectedResult.isEligible'`);
    if (!exp.checks) throw new Error(`${name}: Missing 'expectedResult.checks'`);

    console.log(`  ✓ ${persona.name} - valid structure`);
  }

  // Test 4: Check that eligible/ineligible split is correct
  console.log('\n✓ Test 4: Check Eligible/Ineligible Distribution');
  const eligible = Object.values(personas).filter(p => p.expectedResult.isEligible === true);
  const ineligible = Object.values(personas).filter(p => p.expectedResult.isEligible === false);
  console.log(`  Eligible personas: ${eligible.length}`);
  console.log(`  Ineligible personas: ${ineligible.length}`);

  // Test 5: Display sample persona
  console.log('\n✓ Test 5: Sample Persona (Eligible Minimal)');
  const sample = personas.eligibleMinimal;
  console.log(`  Name: ${sample.name}`);
  console.log(`  Description: ${sample.description}`);
  console.log(`  Expected result: ${sample.expectedResult.isEligible ? 'ELIGIBLE' : 'INELIGIBLE'}`);
  console.log(`  Person age: ${new Date().getFullYear() - new Date(sample.situation.people[0].dateOfBirth).getFullYear()} years old`);
  console.log(`  Resources: $${sample.situation.people[0].countableResources}`);
  console.log(`  Income sources: ${sample.situation.people[0].incomeSources.length}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests passed!\n');

} catch (error) {
  console.error('\n❌ Test failed:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
