# Auto Input Derivation & Testing System - Technical Specification

**Status:** Phase 1 Complete (Input Derivation)
**Author:** System
**Created:** 2026-01-05
**Last Updated:** 2026-01-05
**Implementation Progress:** 4/12 tickets complete (~33%)

## Overview

Automated tooling to derive required inputs from DMN files, generate forms, create test personas, and validate eligibility logic. This system ensures forms stay in sync with DMN business logic and enables rapid testing during development.

## Goals

1. **Automate input discovery** - Parse DMN files to extract all required inputs for a benefit
2. **Maintain schema sync** - Ensure forms always collect all data needed by DMN logic
3. **Enable rapid testing** - Generate realistic test personas for quick validation
4. **Improve documentation** - Auto-generate input requirements documentation
5. **Catch bugs early** - Detect missing form fields or DMN logic errors before deployment

## Non-Goals

- Full form UI generation (initially just schema, not styling/layout)
- Production form deployment automation (this is for development/testing)
- Replacing manual form design (SMEs still design UX)
- Supporting benefits beyond BDT DMN structure

## Background

### Current State
- Forms are manually designed in Form.js format
- No automated way to know if form collects all DMN-required inputs
- Testing requires manually crafting situation objects
- No validation that forms and DMN logic are in sync

### Problem
- As DMN logic evolves (e.g., adding income sources), forms can fall out of sync
- Creating test fixtures is tedious and error-prone
- No easy way to test edge cases across multiple personas
- Input requirements are implicit in DMN files, not documented

## Detailed Design

### Architecture

```
┌─────────────────┐
│  DMN Files      │
│  (Source of     │
│   Truth)        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  1. derive-inputs.js    │◄─── Parses DMN XML
│     Input Derivation    │      Extracts field refs
└──────────┬──────────────┘      Infers types
           │
           ▼
┌─────────────────────────┐
│  input-schema.json      │◄─── Structured schema
│  (Intermediate)         │      Field → Type → Check
└──────────┬──────────────┘
           │
           ├──────────┬──────────┬──────────┐
           ▼          ▼          ▼          ▼
  ┌────────────┐ ┌────────┐ ┌────────┐ ┌─────────┐
  │2. generate-│ │3. gen- │ │4. test-│ │5. docs- │
  │   form.js  │ │ persona│ │ persona│ │ gen.js  │
  └──────┬─────┘ └───┬────┘ └───┬────┘ └────┬────┘
         │           │          │           │
         ▼           ▼          ▼           ▼
  ┌──────────┐ ┌─────────┐ ┌────────┐ ┌─────────┐
  │Form.js   │ │Persona  │ │Test    │ │README   │
  │Schema    │ │Fixtures │ │Results │ │.md      │
  └──────────┘ └─────────┘ └────────┘ └─────────┘
```

### Component 1: Input Derivation

**Purpose:** Parse DMN files to extract all referenced inputs

**Input:** Root DMN file (e.g., `ssi-eligibility.dmn`)

**Output:** `input-schema.json`
```json
{
  "benefit": "ssi-eligibility",
  "version": "1.0.0",
  "generatedAt": "2026-01-05T12:00:00Z",
  "requiredInputs": {
    "person": {
      "dateOfBirth": {
        "type": "date",
        "required": true,
        "requiredBy": ["categorical-eligibility"],
        "description": "Person's date of birth",
        "example": "1950-01-01"
      },
      "incomeSources": {
        "type": "tIncomeSourceList",
        "required": false,
        "isCollection": true,
        "itemType": "tIncomeSource",
        "requiredBy": ["ssi-income-limit"],
        "fields": {
          "type": { "type": "string", "enum": ["earned", "unearned"] },
          "category": { "type": "string" },
          "monthlyAmount": { "type": "number" }
        }
      }
    },
    "situation": {
      "evaluationDate": {
        "type": "date",
        "required": true,
        "requiredBy": ["categorical-eligibility"],
        "default": "today()"
      }
    }
  },
  "checks": [
    {
      "name": "categorical-eligibility",
      "file": "checks/categorical/categorical-eligibility.dmn",
      "inputs": ["person.dateOfBirth", "person.isBlindOrDisabled"]
    }
  ]
}
```

**Algorithm:**
1. Parse root DMN file
2. Follow all `<dmn:import>` recursively (track visited to avoid cycles)
3. For each DMN file:
   - Extract all `<dmn:text>` FEEL expressions
   - Find matches: `person\.(\w+)`, `situation\.(\w+)`
   - Cross-reference with BDT.dmn `<dmn:itemDefinition>` to get types
4. Aggregate all unique fields
5. Track which check requires which field
6. Output structured JSON

**Edge Cases:**
- Circular imports (use visited set)
- Conditional fields (e.g., citizenship dates only if certain status)
- Nested objects (e.g., `person.incomeSources[].type`)
- Null safety (fields that might not exist)

### Component 2: Form Generator

**Purpose:** Transform input schema → Form.js JSON schema

**Input:** `input-schema.json`

**Output:** `generated-form.json` (Form.js compatible)

**Mapping Rules:**
| DMN Type | Form.js Component | Notes |
|----------|-------------------|-------|
| `date` | `{ type: "date" }` | |
| `boolean` | `{ type: "checkbox" }` | |
| `string` (enum) | `{ type: "select" }` | Extract values from type def |
| `number` | `{ type: "number" }` | |
| Collection | `{ type: "dynamiclist" }` | Nested components |
| Complex type | `{ type: "group" }` | Expand fields |

**Example Output:**
```json
{
  "type": "default",
  "components": [
    {
      "type": "date",
      "id": "dateOfBirth",
      "label": "Date of Birth",
      "description": "Your date of birth (used to determine age eligibility)",
      "validate": { "required": true }
    },
    {
      "type": "dynamiclist",
      "id": "incomeSources",
      "label": "Income Sources",
      "components": [
        {
          "type": "select",
          "id": "type",
          "label": "Income Type",
          "values": [
            { "label": "Earned (from work)", "value": "earned" },
            { "label": "Unearned (not from work)", "value": "unearned" }
          ],
          "validate": { "required": true }
        }
      ]
    }
  ]
}
```

### Component 3: Persona Generator

**Purpose:** Create realistic test fixtures for various eligibility scenarios

**Input:** `input-schema.json` + persona templates

**Output:** `test-personas/{benefit}/*.json`

**Persona Types:**
- `eligible-minimal.json` - Bare minimum to be eligible
- `eligible-with-income.json` - Eligible with some income
- `eligible-edge-case-age.json` - Just turned 65
- `ineligible-income-too-high.json` - Fails income check
- `ineligible-resources-too-high.json` - Fails resource check
- `ineligible-citizenship.json` - Fails citizenship check
- `ineligible-multiple-checks.json` - Fails multiple checks
- `edge-case-null-values.json` - Tests null handling
- `edge-case-boundary-values.json` - Tests boundary conditions

**Example Persona:**
```json
{
  "name": "Eligible - Basic SSI Case",
  "description": "Person over 65, US citizen, low income/resources",
  "situation": {
    "primaryPersonId": "p1",
    "evaluationDate": "2026-01-05",
    "people": [{
      "id": "p1",
      "dateOfBirth": "1950-01-01",
      "isBlindOrDisabled": false,
      "citizenshipStatus": "us_citizen",
      "residenceState": "PA",
      "countableResources": 1500,
      "incomeSources": []
    }]
  },
  "expectedResult": {
    "isEligible": true,
    "checks": {
      "categoricalEligible": true,
      "citizenshipEligible": true,
      "residenceEligible": true,
      "resourceEligible": true,
      "incomeEligible": true
    }
  }
}
```

### Component 4: Test Runner

**Purpose:** Execute personas against API and validate results

**Input:** `test-personas/{benefit}/*.json`

**Output:** Test report (console + optional JSON)

**Algorithm:**
1. Start dev server (or verify running)
2. For each persona:
   - POST situation to benefit endpoint
   - Compare actual vs expected result
   - Track pass/fail
   - Log differences
3. Generate summary report

**Output Format:**
```
SSI Eligibility Persona Tests
=============================

✅ PASS: Eligible - Basic SSI Case
✅ PASS: Eligible - With Income
✅ PASS: Ineligible - Income Too High
❌ FAIL: Ineligible - Resources Too High
   Expected: isEligible = false
   Actual:   isEligible = true

   Diff:
   - checks.resourceEligible: expected false, got true

Summary: 3/4 passed (75%)
```

### Component 5: Documentation Generator

**Purpose:** Generate human-readable docs from schema

**Input:** `input-schema.json`

**Output:** `docs/benefits/{benefit}/INPUTS.md`

**Example Output:**
```markdown
# SSI Eligibility - Required Inputs

## Person Fields

### dateOfBirth (required)
- **Type:** Date
- **Required by:** categorical-eligibility
- **Description:** Person's date of birth (used to determine age 65+ eligibility)
- **Example:** `1950-01-01`

### incomeSources (optional)
- **Type:** List of Income Sources
- **Required by:** ssi-income-limit
- **Description:** All sources of earned and unearned income

#### Income Source Fields
- **type** (required): "earned" or "unearned"
- **category** (required): Income category
- **monthlyAmount** (required): Monthly income amount in dollars
```

## Implementation Plan

### ✅ Phase 1: Input Derivation (Tickets 1-4) - COMPLETE
**Status**: ✅ Complete (2026-01-05)
**Deliverables**:
- `lib/dmn-parser.js` - Parse DMN files and handle imports
- `lib/feel-extractor.js` - Extract field references from FEEL expressions
- `lib/type-resolver.js` - Resolve types from BDT.dmn
- `bin/derive-inputs.js` - CLI tool to generate input-schema.json
- `npm run derive-inputs` - Convenient npm script
- Documentation in README.md

**Key Achievement**: Can automatically derive all required inputs (8 person fields, 2 situation fields) from SSI eligibility DMN files!

### Phase 2: Persona Testing (Tickets 5-7)
**Status**: ⏳ Not Started
Enable quick testing with personas

### Phase 3: Form Generation (Tickets 8-9)
**Status**: ⏳ Not Started
Auto-generate Form.js schemas

### Phase 4: Documentation (Ticket 10)
**Status**: ⏳ Not Started
Auto-generate input docs

### Phase 5: Integration (Tickets 11-12)
**Status**: ⏳ Not Started
CI/CD integration and validation

## Technology Choices

### Language: Node.js / JavaScript
**Rationale:**
- Native XML/JSON handling
- Easy to run in CI
- Team already uses JS (builder-frontend)
- Rich ecosystem (xmldom, xpath, etc.)

**Alternatives Considered:**
- Python: Great for scripting, but adds another language
- Java: Could use KIE DMN API, but heavier weight

### Dependencies
- `xmldom` - XML parsing
- `xpath` - XPath queries for DMN elements
- `commander` - CLI argument parsing
- `ajv` - JSON schema validation (optional)

### File Structure
```
library-api/
├── bin/
│   ├── derive-inputs.js        # Component 1
│   ├── generate-form.js        # Component 2
│   ├── generate-personas.js    # Component 3
│   ├── test-personas.js        # Component 4
│   └── generate-docs.js        # Component 5
├── lib/
│   ├── dmn-parser.js           # DMN XML parsing utils
│   ├── type-resolver.js        # BDT type resolution
│   ├── feel-extractor.js       # Extract field refs from FEEL
│   └── persona-templates.js    # Persona generation logic
├── schemas/
│   └── input-schema.schema.json # JSON schema for validation
├── test-personas/
│   └── ssi-eligibility/        # Generated personas
└── docs/
    └── benefits/               # Generated docs
```

## Acceptance Criteria

### Component 1: Input Derivation ✅
- [x] Successfully parses all SSI DMN files (22 DMN files including all checks and imports!)
- [x] Extracts all person.* and situation.* field references (8 person fields, 2 situation fields)
- [x] Correctly maps to types from BDT.dmn (all 8 person fields + 2 situation fields resolved)
- [x] Handles nested types (e.g., incomeSources → tIncomeSourceList → tIncomeSource with 6 fields)
- [x] Outputs valid JSON matching schema (schemas/input-schema.json)
- [x] Handles edge cases (flexible path resolution, circular import detection)
- ⚠️ Tracks which check requires which field (deferred to future enhancement)

### Component 2: Form Generator
- [ ] Generates valid Form.js JSON schema
- [ ] Maps all DMN types correctly
- [ ] Includes validation rules (required fields)
- [ ] Handles collections (dynamiclist)
- [ ] Handles nested objects (groups)
- [ ] Includes helpful descriptions

### Component 3: Persona Generator
- [ ] Generates 8+ personas covering key scenarios
- [ ] Each persona has valid situation object
- [ ] Each persona has expected result
- [ ] Personas test eligible and ineligible cases
- [ ] Personas test edge cases (boundaries, nulls)

### Component 4: Test Runner
- [ ] Executes all personas against API
- [ ] Compares actual vs expected results
- [ ] Provides clear pass/fail reporting
- [ ] Highlights differences on failure
- [ ] Generates summary statistics

### Component 5: Documentation Generator
- [ ] Generates readable Markdown docs
- [ ] Documents all required inputs
- [ ] Includes type information
- [ ] Includes descriptions and examples
- [ ] Documents which check requires which field

## Open Questions

1. **Conditional fields:** How to handle fields only required if another field has certain value?
   - **Proposal:** Mark as conditionally required in schema, document condition

2. **Field descriptions:** Where to source human-readable descriptions?
   - **Option A:** Extract from DMN `<dmn:description>` tags
   - **Option B:** Maintain separate mapping file
   - **Decision:** Start with Option B (mapping file), migrate to A later

3. **Form ordering:** How to determine logical order of fields in generated form?
   - **Proposal:** Use check order from benefit DMN, then alphabetical within check

4. **Persona maintenance:** Should personas be checked into git or generated on-demand?
   - **Decision:** Check in hand-crafted personas, generate additional edge cases

5. **CI integration:** Should this run on every commit or on-demand?
   - **Proposal:** Input derivation on every commit (fast), persona tests on PR

## Alternatives Considered

### Alternative 1: Use KIE DMN API directly
**Pros:** Official API, more robust parsing
**Cons:** Java dependency, harder to extend, slower
**Decision:** Use custom XML parsing for flexibility

### Alternative 2: Manual form sync checklist
**Pros:** Simple, no tooling needed
**Cons:** Error-prone, doesn't scale, manual labor
**Decision:** Automate to ensure reliability

### Alternative 3: Generate forms from OpenAPI schema
**Pros:** Use existing OpenAPI generation
**Cons:** OpenAPI is too late (after DMN compiled), less detail
**Decision:** Parse DMN directly for source of truth

## Future Enhancements

### Post-MVP
- TypeScript type generation from schema
- Integration with builder-frontend (auto-update forms)
- Visual diff tool for form vs schema comparison
- Persona fuzzing (random valid inputs)
- Coverage reporting (which personas exercise which checks)
- Multi-benefit persona (test SNAP + SSI + Housing together)

### Long-term
- Natural language persona description → situation object
- AI-assisted persona generation (GPT suggests edge cases)
- Integration with POMS API (validate against official rules)
- Performance testing (generate 1000s of personas, measure API speed)

## References

- [DMN 1.3 Specification](https://www.omg.org/spec/DMN/)
- [Form.js Documentation](https://bpmn.io/toolkit/form-js/)
- [BDT Architecture](../library-api/CLAUDE.md)
- [SSI Implementation Plan](../SSI-INCOME-LIMITS-PLAN.md)

## Approval

- [ ] Technical Lead Approval
- [ ] Product Owner Approval
- [x] Ready for Implementation (Phase 1 complete, subsequent phases ready to start)

---

**Change Log:**
- 2026-01-05: Initial draft
- 2026-01-05: Phase 1 (Input Derivation) complete - 4/12 tickets done
