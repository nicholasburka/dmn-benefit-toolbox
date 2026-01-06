#!/usr/bin/env node

/**
 * Test runner for persona fixtures
 * Executes personas against API and validates results
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const { program } = require('commander');

/**
 * Check if dev server is running
 */
async function checkServerHealth(baseUrl) {
  return new Promise((resolve) => {
    const healthUrl = new URL('/q/health', baseUrl);
    const req = http.get(healthUrl, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Make HTTP POST request
 */
async function postRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Deep equality check for objects
 */
function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

/**
 * Find differences between expected and actual results
 */
function findDifferences(expected, actual, path = '') {
  const diffs = [];

  if (typeof expected !== typeof actual) {
    diffs.push(`${path || 'root'}: type mismatch (expected ${typeof expected}, got ${typeof actual})`);
    return diffs;
  }

  if (typeof expected !== 'object' || expected === null) {
    if (expected !== actual) {
      diffs.push(`${path || 'root'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
    return diffs;
  }

  const allKeys = new Set([...Object.keys(expected), ...Object.keys(actual)]);

  for (const key of allKeys) {
    const newPath = path ? `${path}.${key}` : key;

    if (!(key in expected)) {
      diffs.push(`${newPath}: unexpected field (value: ${JSON.stringify(actual[key])})`);
    } else if (!(key in actual)) {
      diffs.push(`${newPath}: missing field (expected: ${JSON.stringify(expected[key])})`);
    } else {
      diffs.push(...findDifferences(expected[key], actual[key], newPath));
    }
  }

  return diffs;
}

/**
 * Test a single persona
 */
async function testPersona(persona, apiUrl) {
  try {
    const response = await postRequest(apiUrl, persona.situation);

    if (response.status !== 200) {
      return {
        pass: false,
        error: `API returned status ${response.status}`,
        response: response.data
      };
    }

    const actual = response.data;
    const expected = persona.expectedResult;

    // Compare results
    const diffs = findDifferences(expected, actual);

    if (diffs.length === 0) {
      return { pass: true };
    } else {
      return {
        pass: false,
        differences: diffs,
        expected,
        actual
      };
    }
  } catch (error) {
    return {
      pass: false,
      error: error.message
    };
  }
}

program
  .name('test-personas')
  .description('Run persona tests against the API')
  .argument('[benefit]', 'Benefit name (default: auto-detect from schemas)')
  .option('-d, --dir <directory>', 'Personas directory', 'test-personas')
  .option('-u, --url <url>', 'API base URL', 'http://localhost:8083/api/v1')
  .option('--skip-health-check', 'Skip server health check', false)
  .action(async (benefitArg, options) => {
    console.log('Persona Test Runner\n');
    console.log('='.repeat(60));

    try {
      // Determine benefit name
      let benefit = benefitArg;
      if (!benefit) {
        // Auto-detect from input-schema.json
        const schemaPath = path.join('schemas', 'input-schema.json');
        if (fs.existsSync(schemaPath)) {
          const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
          benefit = schema.benefit;
          console.log(`\n✓ Auto-detected benefit: ${benefit}`);
        } else {
          console.error('\n❌ Error: No benefit specified and schemas/input-schema.json not found');
          process.exit(1);
        }
      }

      // Check server health
      if (!options.skipHealthCheck) {
        console.log(`\n✓ Checking server health...`);
        const isHealthy = await checkServerHealth(options.url);
        if (!isHealthy) {
          console.error(`\n❌ Error: API server not responding at ${options.url}`);
          console.error('   Make sure the dev server is running (bin/dev or quarkus dev)');
          process.exit(1);
        }
        console.log(`  Server is healthy`);
      }

      // Load personas
      const personaDir = path.join(options.dir, benefit);
      if (!fs.existsSync(personaDir)) {
        console.error(`\n❌ Error: Persona directory not found: ${personaDir}`);
        console.error('   Run generate-personas first');
        process.exit(1);
      }

      const files = fs.readdirSync(personaDir)
        .filter(f => f.endsWith('.json'))
        .sort();

      if (files.length === 0) {
        console.error(`\n❌ Error: No persona files found in ${personaDir}`);
        process.exit(1);
      }

      console.log(`\n✓ Found ${files.length} persona(s) to test`);

      // Determine API endpoint
      // Convert benefit name from PascalCase to kebab-case for URL
      const benefitPath = benefit
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');

      // For SSI, it's a federal benefit at /benefits/federal/ssi-eligibility
      // We'll construct the path based on the schema's sourceDmnFile if available
      const schemaPath = path.join('schemas', 'input-schema.json');
      let apiPath = '';
      if (fs.existsSync(schemaPath)) {
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
        if (schema.sourceDmnFile) {
          // Extract path from source DMN file
          // e.g., "src/main/resources/benefits/federal/ssi-eligibility.dmn" -> "benefits/federal/ssi-eligibility"
          const match = schema.sourceDmnFile.match(/src\/main\/resources\/(.+)\.dmn$/);
          if (match) {
            apiPath = match[1];
          }
        }
      }

      if (!apiPath) {
        console.error(`\n❌ Error: Could not determine API path for ${benefit}`);
        console.error('   Make sure input-schema.json has sourceDmnFile field');
        process.exit(1);
      }

      const apiUrl = `${options.url}/${apiPath}`;
      console.log(`  API endpoint: ${apiUrl}`);

      // Run tests
      console.log('\n' + '='.repeat(60));
      console.log(`Testing ${benefit}\n`);

      const results = [];

      for (const file of files) {
        const filePath = path.join(personaDir, file);
        const persona = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        const result = await testPersona(persona, apiUrl);
        results.push({ file, persona, result });

        if (result.pass) {
          console.log(`✅ PASS: ${persona.name}`);
        } else {
          console.log(`❌ FAIL: ${persona.name}`);

          if (result.error) {
            console.log(`   Error: ${result.error}`);
          }

          if (result.differences) {
            console.log(`   Differences:`);
            for (const diff of result.differences) {
              console.log(`   - ${diff}`);
            }
          }

          console.log('');
        }
      }

      // Summary
      console.log('='.repeat(60));
      const passed = results.filter(r => r.result.pass).length;
      const failed = results.filter(r => !r.result.pass).length;
      const passRate = ((passed / results.length) * 100).toFixed(1);

      console.log(`\nSummary: ${passed}/${results.length} passed (${passRate}%)`);

      if (failed > 0) {
        console.log(`\nFailed tests:`);
        results
          .filter(r => !r.result.pass)
          .forEach(r => console.log(`  - ${r.file}`));

        console.log('\nReview failures above for details.\n');
        process.exit(1);
      } else {
        console.log('\n✅ All tests passed!\n');
      }

    } catch (error) {
      console.error('\n❌ Test runner failed:');
      console.error(error.message);
      console.error(error.stack);
      process.exit(1);
    }
  });

program.parse();
