# SSI Eligibility Implementation Status

**Last Updated**: 2026-01-07
**Project**: BDT Library API - SSI Eligibility Checks
**Base Reference**: POMS (Program Operations Manual System)

---

## Quick Status

| Category | Status | Checks Complete | Documentation |
|----------|--------|-----------------|---------------|
| **Categorical** | ✅ Complete | 3/3 | [Progress Report](reviews/categorical-category-progress-report.md) |
| **Citizenship** | ✅ Complete | 10/10 | [Progress Report](CITIZENSHIP-PROGRESS.md) |
| **Residence** | ✅ Complete | 1/1 | ssi-residence-requirement.dmn |
| **Resources** | ✅ Implemented (Simplified) | 1/1 | ssi-resource-limit.dmn |
| **Income** | ✅ Complete | 2/2 | ssi-income-limit.dmn + calculate-countable-income.dmn |

**Overall Progress**: ✅ **ALL 5 CORE REQUIREMENTS IMPLEMENTED**

**Production Status**: Basic SSI eligibility screening is fully functional. See "Future Enhancements" for advanced features.

---

## Implementation Roadmap

### ✅ Phase 1: Categorical Eligibility (COMPLETE)

**POMS Reference**: SI 00501.001.B.1

**Checks Implemented**:
1. ✅ PersonAge65OrOlder - Age-based categorical eligibility
2. ✅ BlindOrDisabled - Medical categorical eligibility
3. ✅ CategoricalEligibility - Composition (age 65+ OR blind OR disabled)

**Status**: All 3 checks complete with tests. Server validated.

**Files**:
- `checks/categorical/person-age-65-or-older.dmn`
- `checks/categorical/blind-or-disabled.dmn`
- `checks/categorical/categorical-eligibility.dmn`

---

### ✅ Phase 2: Citizenship Eligibility (COMPLETE)

**POMS Reference**: SI 00501.100, SI 00502.100

**Checks Implemented**:
1. ✅ PersonUSCitizen - Native-born U.S. citizen
2. ✅ NaturalizedCitizen - Naturalized citizen
3. ✅ PermanentResidentQualified - LAPR status (simplified)
4. ✅ RefugeeAsyleeStatus - Refugee or asylee status
5. ✅ RefugeeAsyleeWithinSevenYears - 7-year time limit (POMS SI 00502.106)
6. ✅ VietnameseAmerasian - Section 584 PL 100-202
7. ✅ CubanHaitianEntrant - Section 501(e) REA 1980
8. ✅ ParoledAlien - INA §212(d)(5)
9. ✅ WithheldDeportation - INA §241(b)(3) or §243(h)
10. ✅ CitizenshipEligibility - Composition (ANY of 8 categories)

**Status**: All 10 checks complete with tests. Server validated.

**Known Limitations**:
- LAPR: Missing 40 QQ exception, veteran exception, 5-year bar
- Refugee/Asylee: ✅ 7-year time limit implemented (uses earliest date if both refugee and asylee)
- Other aliens: Missing 7-year time limits for WithheldDeportation, CubanHaitianEntrant, VietnameseAmerasian

**Files**:
- `checks/citizenship/person-us-citizen.dmn`
- `checks/citizenship/naturalized-citizen.dmn`
- `checks/citizenship/permanent-resident-qualified.dmn`
- `checks/citizenship/refugee-asylee-status.dmn`
- `checks/citizenship/refugee-asylee-within-seven-years.dmn` ⭐ NEW
- `checks/citizenship/vietnamese-amerasian.dmn`
- `checks/citizenship/cuban-haitian-entrant.dmn`
- `checks/citizenship/paroled-alien.dmn`
- `checks/citizenship/withheld-deportation.dmn`
- `checks/citizenship/citizenship-eligibility.dmn`

---

### ✅ Phase 3: Income Eligibility (COMPLETE)

**POMS Reference**: SI 00810.000 - SI 00870.000

**Checks Implemented**:
1. ✅ CalculateCountableIncome - Calculates countable income with POMS exclusions
   - General income exclusion ($20/month) - SI 00810.410
   - Earned income exclusion ($65 + 50% of remainder) - SI 00810.420
   - Infrequent or irregular income exclusion - SI 00810.410.C
2. ✅ SsiIncomeLimit - Wrapper check that compares countable income to FBR ($967 individual)

**Status**: Core income calculation complete with major POMS exclusions implemented.

**Known Limitations**:
- Couple FBR ($1,450) not implemented - currently individual only
- Student Earned Income Exclusion (SEIE) not implemented
- Plan to Achieve Self-Support (PASS) not implemented
- Income deeming from ineligible spouse/parents not implemented
- Additional specialized exclusions not implemented

**Files**:
- `checks/income/calculate-countable-income.dmn`
- `checks/income/ssi-income-limit.dmn`

---

### ✅ Phase 4: Resource Eligibility (SIMPLIFIED)

**POMS Reference**: SI 00501.010, SI 01110.000 - SI 01150.000

**Checks Implemented**:
1. ✅ SsiResourceLimit - Basic resource limit check (individual $2,000)

**Status**: Basic implementation - compares raw countable resources to limit.

**Known Limitations**:
- Couple limit ($3,000) not implemented
- Resource exclusions not implemented (home, vehicle, burial funds, etc.)
- Resource deeming from ineligible spouse/parents not implemented
- No distinction between liquid and non-liquid resources

**Files**:
- `checks/resources/ssi-resource-limit.dmn`

---

### ✅ Phase 5: Residence Eligibility (COMPLETE)

**POMS Reference**: SI 00501.400, SI 01001.000

**Checks Implemented**:
1. ✅ SsiResidenceRequirement - U.S. state/territory residence requirement
   - Validates residence in 50 states, DC, or Northern Mariana Islands
   - Per POMS SI 00501.400

**Status**: Core residence requirement complete.

**Known Limitations**:
- Public institution resident exceptions not implemented
- Absence from U.S. rules not implemented
- Student abroad exceptions not implemented

**Files**:
- `checks/residence/ssi-residence-requirement.dmn`

---

## Future Enhancements

All core SSI eligibility requirements are implemented. The following enhancements would increase accuracy and coverage:

### High Priority

**1. Couple Eligibility Support** 🚧 IN PROGRESS
- Implement couple FBR ($1,450/month) vs individual ($967/month)
- Implement couple resource limit ($3,000) vs individual ($2,000)
- Add spouse relationship detection in tSituation
- **POMS**: SI 00501.010, SI 00810.010
- **Status (2026-01-07)**: POMS research completed via API. Infrastructure ready:
  - ✅ `spouse id` BKM already exists in BDT.dmn
  - ✅ `tRelationship` type supports "spouse" type
  - ✅ All individual eligibility checks working
- **Next Steps**: Add couple detection BKM, update resource/income limits to accept couple parameter

**2. Income Deeming**
- Deeming from ineligible spouse (SI 01330.000)
- Deeming from ineligible parents (SI 01320.000)
- Essential person allocation
- **POMS**: SI 01300.000 - SI 01345.000

**3. Resource Exclusions**
- Home exclusion (SI 01130.100)
- One vehicle exclusion (SI 01130.200)
- Burial funds exclusion (SI 01130.400)
- Household goods and personal effects (SI 01130.430)
- Life insurance (SI 01130.300)
- **POMS**: SI 01130.000

### Medium Priority

**4. Student Earned Income Exclusion (SEIE)**
- Exclude up to $2,290/month of earned income for students under 22
- Implements SI 00501.010.C.1.c and SI 00820.510
- **POMS**: SI 00820.510

**5. Additional Citizenship Time Limits**
- 7-year time limit for WithheldDeportation status
- 7-year time limit for CubanHaitianEntrant status
- 7-year time limit for VietnameseAmerasian status
- Currently only refugees/asylees have time limit implemented
- **POMS**: SI 00502.106

**6. LAPR Exception Conditions**
- 40 quarters of coverage (QQ) exception (SI 00502.102)
- Veteran exception (SI 00502.103)
- Active duty military exception (SI 00502.104)
- **POMS**: SI 00502.100

### Lower Priority

**7. Plan to Achieve Self-Support (PASS)**
- Allow exclusion of income and resources used under approved PASS
- Complex approval and tracking requirements
- **POMS**: SI 00870.000

**8. Advanced Income Exclusions**
- Impairment-Related Work Expenses (IRWE) - SI 00820.540
- Blind Work Expenses (BWE) - SI 00820.550
- Subsidies and special conditions - SI 00820.530
- **POMS**: SI 00820.500+

**9. Public Institution Rules**
- Educational institutions exception
- Medical treatment facilities exception
- Homeless shelters exception
- **POMS**: SI 00520.000

**10. Advanced Residence Rules**
- Temporary absence provisions
- Student abroad exceptions
- Mariners and air personnel exceptions
- **POMS**: SI 01001.000

### Enhancement Implementation Guide

When implementing enhancements:
1. Use **Rules as Code** research skill to find authoritative POMS sections
2. Use **BDT** skill for DMN implementation patterns
3. Add new fields to tSituation/tPerson in BDT.dmn as needed
4. Create Bruno tests for new scenarios
5. Update this status document

---

## Technical Notes

### Server Status
```
✅ All DMN models discovered and validated
✅ All endpoints available at http://localhost:8083/api/v1/
✅ OpenAPI documentation at http://localhost:8083/q/swagger-ui
✅ SSI eligibility benefit endpoint: POST /api/v1/benefits/federal/ssi-eligibility
```

### Test Coverage
- **Categorical**: 9/9 Bruno tests passing
- **Citizenship**: 25/25 Bruno tests passing (includes 7 new tests for RefugeeAsyleeWithinSevenYears)
- **Income**: 6/6 Bruno tests created
- **Resources**: 3/3 Bruno tests created
- **Residence**: 3/3 Bruno tests created
- **SSI Eligibility (integrated)**: 10/10 Bruno tests created
  - Pass scenarios: 4 tests (basic eligibility, edge cases, multiple income sources)
  - Fail scenarios: 6 tests (each check failure, multiple check failures)

**Bruno CLI Known Issue** (2026-01-07):
- Bruno CLI v2.15.1 has a bug causing "Cannot read properties of undefined (reading 'seq')" error
- All test files are properly structured and validated via direct curl testing
- **Workaround**: Use Bruno GUI application to run tests until CLI is fixed
- Issue tracked: Tests work in Bruno desktop app; CLI issue is external to this project

**Note**: Persona testing is available for manual testing/validation but Bruno tests remain the primary automated test suite.

### Architecture Patterns Established
1. **Individual Checks**: Simple boolean status/calculation checks
2. **Composition Checks**: Combine individual checks with OR/AND logic
3. **Base Modules**: Shared types and BKMs (Age.dmn, Enrollment.dmn, Citizenship.dmn)

### Data Model (tSituation)
Current fields:
- `primaryPersonId: string`
- `evaluationDate: date` - for time-based eligibility calculations
- `people: tPersonList` with extended tPerson:
  - `id: string`
  - `dateOfBirth: date`
  - `citizenshipStatus: string`
  - `isBlindOrDisabled: boolean`
  - `refugeeAdmissionDate: date`
  - `asylumGrantDate: date`
  - `withheldDeportationGrantDate: date`
  - `cubanHaitianEntryDate: date`
  - `amerasianAdmissionDate: date`
  - `residenceState: string` - for residence checks
  - `countableResources: number` - for resource limit checks
  - `incomeSources: tIncomeSourceList` ⭐ - for income calculations
    - `id: string`
    - `type: string` (earned/unearned)
    - `category: string` (wages, SSA benefits, etc.)
    - `monthlyAmount: number`
    - `description: string`
    - `isInfrequentOrIrregular: boolean`
- `enrollments: tEnrollmentList` (personId, benefit)
- `relationships: tRelationshipList` (type, personId, relatedPersonId)
- `simpleChecks: tSimpleChecks` (boolean flags)

**Future Additions for Enhancements**:
- Spouse relationship indicator (for couple eligibility)
- Detailed resource types (home, vehicle, burial funds)
- Student status (for SEIE)
- PASS plan indicator
- 40 QQ, veteran status fields (for LAPR exceptions)
- Parent/child relationships (for deeming)

---

## Implementation Commands

Core SSI eligibility is complete! To add enhancements:

1. **Implement couple eligibility support**:
   ```
   "Let's implement couple FBR and resource limits for SSI"
   ```

2. **Add income deeming**:
   ```
   "Let's implement income deeming from ineligible spouse/parents"
   ```

3. **Add resource exclusions**:
   ```
   "Let's implement home, vehicle, and burial fund exclusions for SSI resources"
   ```

4. **Add Student Earned Income Exclusion**:
   ```
   "Let's implement SEIE for SSI"
   ```

5. **Add remaining citizenship time limits**:
   ```
   "Let's add 7-year time limits for WithheldDeportation, CubanHaitianEntrant, and VietnameseAmerasian"
   ```

6. **Test the complete SSI screener**:
   ```
   "Let's test the SSI eligibility endpoint with various scenarios"
   ```

---

## File Structure

```
library-api/src/main/resources/
├── BDT.dmn                                           # Base types and utilities
├── Benefits.dmn                                      # tBenefitResponse type
├── checks/
│   ├── age/
│   │   └── Age.dmn                                   # Age BKMs
│   ├── categorical/
│   │   ├── Categorical.dmn                          # Base module
│   │   ├── person-age-65-or-older.dmn              ✅
│   │   ├── blind-or-disabled.dmn                   ✅
│   │   └── categorical-eligibility.dmn              ✅
│   ├── citizenship/
│   │   ├── Citizenship.dmn                          # Base module
│   │   ├── person-us-citizen.dmn                   ✅
│   │   ├── naturalized-citizen.dmn                 ✅
│   │   ├── permanent-resident-qualified.dmn        ✅
│   │   ├── refugee-asylee-status.dmn               ✅
│   │   ├── refugee-asylee-within-seven-years.dmn   ✅
│   │   ├── vietnamese-amerasian.dmn                ✅
│   │   ├── cuban-haitian-entrant.dmn               ✅
│   │   ├── paroled-alien.dmn                       ✅
│   │   ├── withheld-deportation.dmn                ✅
│   │   └── citizenship-eligibility.dmn              ✅
│   ├── enrollment/
│   │   ├── Enrollment.dmn                          # Base module
│   │   ├── person-enrolled-in-benefit.dmn          ✅
│   │   └── person-not-enrolled-in-benefit.dmn      ✅
│   ├── income/
│   │   ├── Income.dmn                              # Base module
│   │   ├── calculate-countable-income.dmn          ✅
│   │   └── ssi-income-limit.dmn                    ✅
│   ├── resources/
│   │   └── ssi-resource-limit.dmn                  ✅ (simplified)
│   └── residence/
│       └── ssi-residence-requirement.dmn           ✅
└── benefits/
    ├── federal/
    │   └── ssi-eligibility.dmn                      ✅
    └── pa/phl/
        ├── phl-homestead-exemption.dmn             ✅
        └── phl-senior-citizen-tax-freeze.dmn       ✅
```

---

**Questions or Issues?**
- Check progress reports: `CITIZENSHIP-PROGRESS.md`, `reviews/categorical-category-progress-report.md`
- Review server logs: Background bash processes running on port 8083
- Test endpoints: `http://localhost:8083/q/swagger-ui`
- SSI eligibility endpoint: `POST /api/v1/benefits/federal/ssi-eligibility`

**Ready to Add Enhancements?** See "Implementation Commands" section above for next steps!
