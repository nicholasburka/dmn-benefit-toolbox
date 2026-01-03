# SSI Eligibility Implementation Status

**Last Updated**: 2026-01-02
**Project**: BDT Library API - SSI Eligibility Checks
**Base Reference**: POMS (Program Operations Manual System)

---

## Quick Status

| Category | Status | Checks Complete | Documentation |
|----------|--------|-----------------|---------------|
| **Categorical** | ✅ Complete | 3/3 | [Progress Report](reviews/categorical-category-progress-report.md) |
| **Citizenship** | ✅ Complete | 10/10 | [Progress Report](CITIZENSHIP-PROGRESS.md) |
| **Income** | ⏸️ Not Started | 0/? | - |
| **Resources** | ⏸️ Not Started | 0/? | - |
| **Residence** | ⏸️ Not Started | 0/? | - |

**Overall Progress**: 13/13+ checks implemented (2/5+ categories complete)

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

### ⏸️ Phase 3: Income Eligibility (NOT STARTED)

**POMS Reference**: SI 00810.000 - SI 00870.000

**Required Checks** (estimated):
- [ ] TotalCountableIncome - Calculate total countable income
- [ ] EarnedIncome - Earned income calculation
- [ ] UnearnedIncome - Unearned income calculation
- [ ] IncomeExclusions - Apply income exclusions (SI 00830.000)
- [ ] IncomeDeeming - Deeming from ineligible spouse/parents
- [ ] FederalBenefitRate - FBR comparison
- [ ] IncomeEligibility - Composition check

**Complexity**: HIGH - Complex calculations, many exclusions, deeming rules

**Priority**: Medium - Required for full SSI eligibility

---

### ⏸️ Phase 4: Resource Eligibility (NOT STARTED)

**POMS Reference**: SI 00501.010, SI 01110.000 - SI 01150.000

**Required Checks** (estimated):
- [ ] TotalCountableResources - Calculate total countable resources
- [ ] ResourceExclusions - Apply resource exclusions
- [ ] ResourceDeeming - Deeming from ineligible spouse/parents
- [ ] ResourceLimit - Individual ($2,000) and couple ($3,000) limits
- [ ] ResourceEligibility - Composition check

**Complexity**: MEDIUM - Asset valuation, exclusions

**Priority**: Medium - Required for full SSI eligibility

---

### ⏸️ Phase 5: Residence Eligibility (NOT STARTED)

**POMS Reference**: SI 00501.400, SI 01001.000

**Required Checks** (estimated):
- [ ] USResidence - U.S. residency requirement
- [ ] StateResidence - State/territory residence
- [ ] PublicInstitution - Public institution resident exception
- [ ] Absence - Absence from U.S. rules
- [ ] ResidenceEligibility - Composition check

**Complexity**: LOW-MEDIUM - Geographic validation, institution checks

**Priority**: Low-Medium - Less common disqualifier

---

## Next Steps (When Resuming)

### Option A: Continue with Income Category
Start implementing income eligibility checks per POMS SI 00810.000+. This is the most complex category but crucial for full SSI screening.

**First Step**: Research POMS SI 00810.005 (income overview) and create implementation plan.

### Option B: Enhance Existing Categories (PARTIALLY COMPLETE)
Add missing time limit validations and exception conditions to citizenship checks:
1. ✅ Implement 7-year time limits for refugees/asylees (COMPLETE - RefugeeAsyleeWithinSevenYears)
2. Add 7-year time limits for other qualified aliens (WithheldDeportation, CubanHaitianEntrant, VietnameseAmerasian)
3. Add 40 QQ exception for LAPR
4. Add veteran exception for LAPR

**Completed**: Date fields added to tSituation/tPerson (evaluationDate, refugeeAdmissionDate, asylumGrantDate, etc.)

**Next Step**: Implement 7-year time limits for remaining qualified alien categories.

### Option C: Complete Resource Category
Implement resource eligibility checks per POMS SI 01110.000+.

**First Step**: Research POMS SI 01110.003 (resource overview) and create implementation plan.

---

## Technical Notes

### Server Status
```
✅ All 27 DMN models discovered and validated
✅ All endpoints available at http://localhost:8080/api/v1/
✅ OpenAPI documentation at http://localhost:8080/q/swagger-ui
```

### Test Coverage
- **Categorical**: 9/9 Bruno tests passing
- **Citizenship**: 25/25 Bruno tests passing (includes 7 new tests for RefugeeAsyleeWithinSevenYears)
- **Total**: 41/41 requests, 72/72 assertions ✓

### Architecture Patterns Established
1. **Individual Checks**: Simple boolean status/calculation checks
2. **Composition Checks**: Combine individual checks with OR/AND logic
3. **Base Modules**: Shared types and BKMs (Age.dmn, Enrollment.dmn, Citizenship.dmn)

### Data Model (tSituation)
Current fields:
- `primaryPersonId: string`
- `evaluationDate: date` ⭐ NEW - for time-based eligibility calculations
- `people: tPersonList` with extended tPerson:
  - `id: string`
  - `dateOfBirth: date`
  - `citizenshipStatus: string`
  - `isBlindOrDisabled: boolean`
  - `refugeeAdmissionDate: date` ⭐ NEW
  - `asylumGrantDate: date` ⭐ NEW
  - `withheldDeportationGrantDate: date` ⭐ NEW
  - `cubanHaitianEntryDate: date` ⭐ NEW
  - `amerasianAdmissionDate: date` ⭐ NEW
- `enrollments: tEnrollmentList` (personId, benefit)
- `relationships: tRelationshipList` (type, personId, relatedPersonId)
- `simpleChecks: tSimpleChecks` (boolean flags)

**Future Additions Needed**:
- Income sources and amounts (for income category)
- Resource types and values (for resource category)
- Address/location data (for residence category)
- Additional exception condition fields (40 QQ, veteran status, etc.)

---

## Command to Resume Work

When you're ready to continue, you can either:

1. **Continue from where we left off** (citizenship just completed):
   ```
   "Let's continue with option A - implement income eligibility checks"
   ```

2. **Enhance existing work**:
   ```
   "Let's add time limit validations to the citizenship checks"
   ```

3. **Review and fix issues**:
   ```
   "I found an issue with [check name] - can we fix it?"
   ```

---

## File Structure

```
library-api/src/main/resources/
├── bdt.dmn                                    # Base types and utilities
├── checks/
│   ├── age/
│   │   └── Age.dmn                           # Age BKMs
│   ├── categorical/
│   │   ├── Categorical.dmn                   # Base module
│   │   ├── person-age-65-or-older.dmn       ✅
│   │   ├── blind-or-disabled.dmn            ✅
│   │   └── categorical-eligibility.dmn       ✅
│   ├── citizenship/
│   │   ├── Citizenship.dmn                           # Base module
│   │   ├── person-us-citizen.dmn                    ✅
│   │   ├── naturalized-citizen.dmn                  ✅
│   │   ├── permanent-resident-qualified.dmn         ✅
│   │   ├── refugee-asylee-status.dmn                ✅
│   │   ├── refugee-asylee-within-seven-years.dmn    ✅ ⭐ NEW
│   │   ├── vietnamese-amerasian.dmn                 ✅
│   │   ├── cuban-haitian-entrant.dmn                ✅
│   │   ├── paroled-alien.dmn                        ✅
│   │   ├── withheld-deportation.dmn                 ✅
│   │   └── citizenship-eligibility.dmn               ✅
│   ├── enrollment/
│   │   ├── Enrollment.dmn                    # Base module
│   │   ├── person-enrolled-in-benefit.dmn
│   │   └── person-not-enrolled-in-benefit.dmn
│   └── income/                               # TODO: Create this category
│   └── resources/                            # TODO: Create this category
│   └── residence/                            # TODO: Create this category
└── benefits/
    └── pa/phl/
        ├── phl-homestead-exemption.dmn
        └── phl-senior-citizen-tax-freeze.dmn
```

---

**Questions or Issues?**
- Check progress reports: `CITIZENSHIP-PROGRESS.md`, `reviews/categorical-category-progress-report.md`
- Review server logs: Background bash processes running on port 8080
- Test endpoints: `http://localhost:8080/q/swagger-ui`

**Ready to Continue?** Just say which option (A, B, or C) or describe what you'd like to work on!
