# SSI Eligibility Screener - Implementation Progress

## Overview

Implementing a complete SSI (Supplemental Security Income) eligibility screener following POMS SI 00501.000 and related policy sections.

**Current Status**: ✅ ALL 5 OF 5 CORE ELIGIBILITY REQUIREMENTS IMPLEMENTED!

---

## Implementation Status

### ✅ COMPLETED

#### 1. Categorical Eligibility (POMS SI 00501.010)
- **Status**: ✅ Implemented
- **Location**: `library-api/src/main/resources/checks/categorical/categorical-eligibility.dmn`
- **Logic**: Age 65+ OR Blind OR Disabled
- **Tests**: Bruno tests in `test/bdt/checks/categorical/`
- **Form Field**: `isBlindOrDisabled` (yes/no), `dateOfBirth` (date)

#### 2. Citizenship Eligibility (POMS SI 00501.400)
- **Status**: ✅ Implemented
- **Location**: `library-api/src/main/resources/checks/citizenship/citizenship-eligibility.dmn`
- **Logic**:
  - U.S. Citizen OR
  - Qualified Alien (Lawful Permanent Resident, Refugee, Asylee, etc.)
  - Special handling for 7-year time limits on certain statuses
- **Tests**: Bruno tests in `test/bdt/checks/citizenship/`
- **Form Fields**:
  - `citizenshipStatus` (dropdown)
  - Conditional date fields based on status (refugeeAdmissionDate, asylumGrantDate, etc.)

#### 3. Residence Requirement (POMS SI 00501.410)
- **Status**: ✅ Implemented
- **Location**: `library-api/src/main/resources/checks/residence/ssi-residence-requirement.dmn`
- **Logic**: Must reside in 50 states, DC, or Northern Mariana Islands
- **Tests**: Bruno tests in `test/bdt/checks/residence/SsiResidenceRequirement/`
- **Form Field**: `residenceState` (dropdown of valid states)

#### 4. Resource Limits (POMS SI 01110.000 - SI 01150.000)
- **Status**: ✅ Implemented (Simplified Version) - **Full implementation planned**
- **Location**: `library-api/src/main/resources/checks/resources/ssi-resource-limit.dmn`
- **Current Logic**: Countable resources < $2,000 for individuals (couple limit $3,000 deferred to future enhancement)
- **Tests**: Bruno tests in `test/bdt/checks/resources/SsiResourceLimit/` (Pass, Fail, Edge Case - Null)
- **Form Field**: `countableResources` (number)
- **Current Implementation Notes**:
  - Added `countableResources` field to `tPerson` type in BDT.dmn
  - **SIMPLIFIED**: Accepts pre-calculated countable resources from user
  - **LIMITATION**: User must manually calculate exclusions
  - Null handling: Returns null if countableResources is not provided
  - Individual limit only ($2,000)
- **POMS References**:
  - SI 01110.200 - Countable Resources
  - SI 01110.210 - Resource Limits
- **⚠️ Important Limitation**: Current implementation does NOT automatically apply POMS exclusion rules
  - User must know to exclude: primary residence, one vehicle, household goods ($2K), life insurance ($1.5K face value), burial funds ($1.5K), ABLE accounts ($100K), self-support property ($6K)
  - This works for screening/awareness but not for accurate eligibility determination
  - **See SSI-RESOURCE-LIMITS-PLAN.md for full implementation plan**

#### 5. Income Limits (POMS SI 00810.000 - SI 00830.000)
- **Status**: ✅ Implemented
- **Location**: `library-api/src/main/resources/checks/income/`
- **Files**:
  - `Income.dmn` - Base module with shared BKMs
  - `calculate-countable-income.dmn` - Core POMS-compliant calculation logic
  - `ssi-income-limit.dmn` - Wrapper check (returns boolean)
- **Logic**:
  - Earned vs. unearned income tracking
  - $20 general exclusion applied to unearned first
  - Spillover of unused $20 general exclusion to earned income
  - $65 earned income exclusion
  - 50% of remaining earned income excluded
  - Compares total countable income to FBR ($967 individual, $1,450 couple)
- **Tests**: Bruno tests in `test/bdt/checks/income/SsiIncomeLimit/`
- **Form Fields**: `incomeSources` (list of tIncomeSource with type, category, monthlyAmount, etc.)
- **POMS References**:
  - SI 00810.000 - Overview of Income
  - SI 00810.420 - $20 General Income Exclusion
  - SI 00820.500 - Earned Income Exclusions
  - SI 00830.000 - Unearned Income
- **Implementation Notes**:
  - Uses tIncomeSource, tIncomeSourceList, tIncomeCalculation types in BDT.dmn
  - Exclusions applied in correct POMS order
  - Returns detailed tIncomeCalculation with all intermediary values
  - FBR configurable via parameters (defaults to $967 individual)
- **Current Limitations**:
  - Does not yet implement advanced exclusions (SEIE, PASS, IRWE, etc.)
  - Individual limit only (couple logic can be added via parameters)
  - See deferred enhancements below for future work

---

### 🚧 NOT YET IMPLEMENTED (Future Enhancements)

---

## Current Architecture

### DMN Files
```
library-api/src/main/resources/
├── BDT.dmn (base types including tSituation, tPerson with countableResources)
├── Benefits.dmn (tBenefitResponse type)
├── benefits/federal/
│   └── ssi-eligibility.dmn (main benefit composition)
└── checks/
    ├── categorical/
    │   ├── categorical-eligibility.dmn
    │   ├── person-age-65-or-older.dmn
    │   └── blind-or-disabled.dmn
    ├── citizenship/
    │   ├── citizenship-eligibility.dmn
    │   ├── us-citizen.dmn
    │   ├── qualified-alien.dmn
    │   └── refugee-asylee-within-seven-years.dmn
    ├── residence/
    │   └── ssi-residence-requirement.dmn
    └── resources/
        └── ssi-resource-limit.dmn
```

### Frontend Components
```
builder-frontend/src/components/ssi-screener/
├── SSIScreener.tsx (main screener component)
├── ssiFormSchema.json (Form.js schema)
└── ssiUtils.ts (data transformation utilities)
```

### Data Model
- **tSituation**: Container for all household data
- **tPerson**: Individual person data including:
  - dateOfBirth
  - citizenshipStatus
  - residenceState
  - isBlindOrDisabled
  - countableResources (number)
  - Various citizenship date fields

---

## Next Steps - Recommended Implementation Order

### Final Core Requirement: Income Limits
**Reasoning**: Most complex requirement due to earned/unearned distinction, multiple deduction rules, and FBR comparison

**Implementation Tasks**:
1. Research POMS SI 00810.000 - SI 00830.000, SI 01110.000 - SI 01120.000 using POMS API
2. Define tIncomeSource and tIncomeList types in BDT.dmn
3. Create earned income calculation DMN (includes $65 + $20 + 50% exclusion)
4. Create unearned income calculation DMN (includes $20 exclusion)
5. Create total countable income DMN
6. Create income limit check DMN (compare to FBR)
7. Update ssi-eligibility.dmn to include income check
8. Update SSI screener form to collect income data
9. Create Bruno tests

**Estimated Complexity**: High (4-8 hours)

**Once completed**: All 5 core SSI eligibility requirements will be implemented!

---

## Additional Enhancements (Future)

### High Priority

- **⭐ Full Resource Exclusions Implementation** (POMS SI 01130.000):
  - Automatically apply POMS exclusion rules instead of accepting pre-calculated countable resources
  - Resource type modeling (bank accounts, vehicles, real property, life insurance, etc.)
  - Individual exclusion checks (home, vehicle, household goods, life insurance, burial funds, ABLE accounts, self-support property)
  - **See SSI-RESOURCE-LIMITS-PLAN.md for detailed implementation plan**
  - **Estimated effort**: 7.5-12 hours

### Medium Priority

- **⭐ Full Income Exclusions Implementation** (POMS SI 00810.000 - SI 00830.000):
  - Automatically apply POMS income exclusion rules
  - Earned vs. unearned income modeling
  - $20 general exclusion + $65 earned + 50% calculation
  - **See SSI-INCOME-LIMITS-PLAN.md for detailed implementation plan**
  - **Estimated effort**: 7.5-11 hours
- **Couple Resource Limit** (POMS SI 01110.210): Apply $3,000 limit for married couples
- **Couple FBR** (POMS SI 00835.000): Apply couple FBR ($1,450) instead of individual ($967)
- **Deeming Rules** (POMS SI 01320.000): Income/resources deemed from ineligible spouse/parent
- **Student Earned Income Exclusion (SEIE)** (POMS SI 00820.510): Up to $2,290/month, $9,230/year for students
- **Plan to Achieve Self-Support (PASS)** (POMS SI 00870.000): Income/resource exclusions for approved plans
- **Impairment-Related Work Expenses (IRWE)** (POMS SI 00820.540): Deduct disability-related work costs from earned income
- **In-Kind Support and Maintenance (ISM)** (POMS SI 00835.000): Value of food/shelter provided by others reduces FBR
- **Infrequent or Irregular Income Exclusion** (POMS SI 00810.410): Up to $30/month unearned, $65/month earned if infrequent
- **Living Arrangements** (POMS SI 00835.000): Affects FBR calculation based on living situation

### Lower Priority

- **State Supplements**: Vary by state, optional to implement
- **Transfer of Resources Penalties** (POMS SI 01150.000): 36-month lookback, period of ineligibility calculation

---

## Testing Strategy

### Unit Tests (Bruno)
- Individual check tests in `test/bdt/checks/`
- Benefit composition tests in `test/bdt/benefits/federal/`

### Integration Tests
- End-to-end screener testing via builder-frontend
- Test scenarios covering all combinations of eligibility factors

### Test Coverage Goals
- Each check should have:
  - ✅ Pass scenario (eligible)
  - ✅ Fail scenario (ineligible)
  - ✅ Edge case - Null/missing data (unable to determine)

---

## Known Issues & Technical Debt

1. **Refugee/Asylee 7-Year Check**: Date calculation has some edge cases that need refinement
2. **Form Validation**: Could add client-side validation for better UX
3. **Error Messages**: Could provide more specific feedback when checks fail
4. **POMS Updates**: Need to track POMS policy changes and update logic accordingly

---

## Resources

- **POMS (Program Operations Manual System)**: https://secure.ssa.gov/poms.nsf/
- **SSI Overview**: POMS SI 00501.000
- **DMN Specification**: https://www.omg.org/spec/DMN/
- **Form.js Documentation**: https://bpmn.io/toolkit/form-js/

---

**Last Updated**: 2026-01-05
**Current Sprint**: ✅ COMPLETED! All 5 core eligibility requirements implemented
**Next Steps**: Consider implementing full resource exclusions OR enhanced income exclusions (SEIE, PASS, etc.)
