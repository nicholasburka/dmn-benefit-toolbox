# Auto Input Derivation

Automated extraction and documentation of required inputs from DMN eligibility rules.

## Overview

The Auto Input Derivation system automatically analyzes DMN files to:
- Extract all required input fields
- Generate Form.js schemas for UI
- Validate form/schema synchronization
- Generate comprehensive documentation
- Create test personas for automated testing

## Quick Start

### Complete Workflow

Run the entire workflow with one command:

```bash
npm run workflow
```

This will:
1. Analyze DMN files and extract required inputs
2. Generate test personas
3. Test personas against the API
4. Generate Form.js schema
5. Validate form synchronization
6. Generate markdown documentation

### Quick Workflow (Skip Personas)

For faster iteration during development:

```bash
npm run workflow:quick
```

### Individual Tools

Run tools separately as needed:

```bash
# 1. Derive input schema from DMN
npm run derive-inputs [dmn-path]

# 2. Generate test personas
npm run generate-personas [schema-path]

# 3. Test personas against API
npm run test-personas [personas-path]

# 4. Generate Form.js schema
npm run generate-form [schema-path]

# 5. Validate form synchronization
npm run validate-form [form-path]

# 6. Generate documentation
npm run generate-docs [schema-path]
```

## Output Artifacts

All generated files are created in the following locations:

```
library-api/
├── schemas/
│   ├── input-schema.json       # DMN input requirements
│   ├── personas.json            # Test persona fixtures
│   └── generated-form.json      # Form.js schema
└── docs/
    └── benefits/
        └── {benefit-name}/
            └── INPUTS.md        # Markdown documentation
```

## Tool Details

### 1. Input Derivation (`derive-inputs`)

Analyzes DMN files to extract all required input fields.

**How it works:**
- Scans DMN file and all imports recursively
- Parses FEEL expressions to find field references
- Resolves types from BDT.dmn type definitions
- Generates `input-schema.json` with complete field metadata

**Example:**
```bash
npm run derive-inputs src/main/resources/benefits/federal/ssi-eligibility.dmn
```

**Output:** `schemas/input-schema.json`
```json
{
  "benefit": "SsiEligibility",
  "requiredInputs": {
    "person": {
      "dateOfBirth": { "type": "date", "primitive": true },
      "incomeSources": {
        "type": "tIncomeSource",
        "isCollection": true,
        "fields": { ... }
      }
    },
    "situation": {
      "primaryPersonId": { "type": "string", "primitive": true }
    }
  }
}
```

### 2. Persona Generation (`generate-personas`)

Creates diverse test personas based on input schema.

**Persona types:**
- Minimal: Bare minimum required fields
- Typical: Common scenario with moderate values
- Edge cases: Boundary conditions
- Complex: Maximum fields and nested data

**Example:**
```bash
npm run generate-personas
```

**Output:** `schemas/personas.json` (10 personas covering all scenarios)

### 3. Persona Testing (`test-personas`)

Tests all personas against the benefit API endpoint.

**Features:**
- Validates API responses
- Checks for runtime errors
- Reports eligibility results
- Identifies missing fields

**Example:**
```bash
npm run test-personas
```

**Requires:** Quarkus dev server running (`quarkus dev`)

### 4. Form Generation (`generate-form`)

Converts input schema to Form.js JSON format.

**Type mapping:**
- `date` → date picker component
- `boolean` → checkbox component
- `number` → number input component
- `string` → text field component
- Collections → dynamiclist components
- Complex types → group components

**Example:**
```bash
npm run generate-form
```

**Output:** `schemas/generated-form.json` (ready for Form.js editor)

### 5. Form Validation (`validate-form`)

Ensures forms collect all DMN-required inputs.

**Validation checks:**
- Missing required fields
- Extra fields not in schema
- Field type mismatches
- Nested field coverage

**Example:**
```bash
npm run validate-form schemas/generated-form.json

# Strict mode (fail on extra fields)
npm run validate-form schemas/generated-form.json --strict
```

**Output:**
```
✅ PASS: Form collects all required DMN inputs

  Form fields: 14
  Schema fields: 16
```

### 6. Documentation Generation (`generate-docs`)

Creates markdown documentation for stakeholders.

**Documentation includes:**
- Overview with field counts
- Person fields table
- Situation fields table
- DMN checks listing
- Example JSON request

**Example:**
```bash
npm run generate-docs
```

**Output:** `docs/benefits/{benefit-name}/INPUTS.md`

## CI/CD Integration

GitHub Actions workflow validates schemas stay in sync with DMN files.

**Workflow:** `.github/workflows/validate-auto-inputs.yml`

**Triggers:**
- Push to main branch
- Pull requests
- Changes to DMN files or schemas

**What it does:**
1. Runs `npm run workflow:quick`
2. Checks for schema changes
3. Fails if schemas differ from DMN
4. Uploads generated artifacts for review

**Fix out-of-sync schemas:**
```bash
npm run workflow
git add schemas/ docs/
git commit -m "Update schemas from DMN changes"
```

## Workflow Scripts

The `package.json` provides several workflow commands:

| Command | Description |
|---------|-------------|
| `npm run workflow` | Complete workflow (all steps) |
| `npm run workflow:quick` | Quick workflow (skip personas) |
| `npm run workflow:form` | Form generation + validation only |
| `npm run workflow:full` | Full workflow without personas testing |

## Best Practices

### When to Regenerate

Run the workflow when:
- ✅ Adding new DMN checks or benefits
- ✅ Modifying FEEL expressions that use new fields
- ✅ Changing input types in BDT.dmn
- ✅ Before creating or updating forms in builder-frontend

### Development Iteration

For rapid development:

1. Make DMN changes
2. Run `npm run workflow:quick` (fast, skips API tests)
3. Review generated schema and form
4. Import form into Form.js editor
5. Customize as needed

### Production Release

Before deploying:

1. Run `npm run workflow` (complete with persona tests)
2. Review all generated artifacts
3. Run `npm run validate-form -- --strict` (catch extra fields)
4. Commit schemas, forms, and docs
5. Push to trigger CI validation

## Customization

### Adding Custom Personas

Edit `lib/persona-templates.js` to add new persona generators:

```javascript
function customScenario(schema) {
  return {
    name: "Custom Scenario",
    description: "Description of scenario",
    situation: {
      // ... custom data
    }
  };
}
```

### Custom Field Descriptions

Edit `lib/form-generator.js` `addFieldDescriptions()` to customize help text:

```javascript
if (component.id === 'dateOfBirth') {
  component.description = 'Your custom help text';
}
```

### Extending Documentation

Edit `lib/doc-generator.js` `generateDocumentation()` to add custom sections.

## Troubleshooting

### "DMN file not found"

**Problem:** Wrong path to DMN file

**Solution:**
```bash
# Find your DMN file
find src/main/resources -name "*.dmn"

# Use correct path
npm run derive-inputs src/main/resources/benefits/federal/your-benefit.dmn
```

### "Schema file not found"

**Problem:** Haven't run `derive-inputs` yet

**Solution:**
```bash
npm run derive-inputs
```

### "Form is missing required DMN inputs"

**Problem:** Form out of sync with schema

**Solution:**
```bash
# Regenerate form from current schema
npm run generate-form

# Or run complete workflow
npm run workflow
```

### Persona tests failing

**Problem:** Quarkus dev server not running

**Solution:**
```bash
# In separate terminal
cd library-api
quarkus dev

# Then run tests
npm run test-personas
```

### CI/CD workflow failing

**Problem:** Committed schemas don't match DMN files

**Solution:**
```bash
# Regenerate and commit
npm run workflow
git add schemas/ docs/
git commit -m "Sync schemas with DMN changes"
git push
```

## Architecture

### File Structure

```
library-api/
├── bin/                          # CLI tools
│   ├── derive-inputs.js         # Input derivation
│   ├── generate-personas.js     # Persona generation
│   ├── test-personas.js         # Persona testing
│   ├── generate-form.js         # Form generation
│   ├── validate-form.js         # Form validation
│   ├── generate-docs.js         # Documentation generation
│   └── workflow-all.js          # Complete workflow
├── lib/                          # Core libraries
│   ├── dmn-parser.js            # DMN XML parsing
│   ├── feel-parser.js           # FEEL expression analysis
│   ├── type-resolver.js         # Type resolution from BDT.dmn
│   ├── persona-templates.js     # Persona generators
│   ├── form-generator.js        # Form.js schema generation
│   ├── form-validator.js        # Form sync validation
│   └── doc-generator.js         # Documentation generation
└── schemas/                      # Generated artifacts
    ├── input-schema.json
    ├── personas.json
    └── generated-form.json
```

### Data Flow

```
DMN Files
    ↓
[derive-inputs] → input-schema.json
    ↓
    ├─→ [generate-personas] → personas.json → [test-personas]
    ├─→ [generate-form] → generated-form.json → [validate-form]
    └─→ [generate-docs] → INPUTS.md
```

## Future Enhancements

Potential improvements:

- [ ] Support for conditional required fields
- [ ] Automatic API endpoint testing
- [ ] Form field validation rules from DMN constraints
- [ ] Multi-language documentation generation
- [ ] Visual DMN → Form.js mapping diagram
- [ ] Integration with builder-frontend auto-import

---

**Version:** 1.0.0
**Last Updated:** 2026-01-06
**Status:** Production Ready
