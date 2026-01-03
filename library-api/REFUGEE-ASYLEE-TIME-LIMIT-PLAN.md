# Refugee/Asylee 7-Year Time Limit Implementation Plan

**Date**: January 2, 2026
**POMS References**: SI 00502.106, SI 00502.301, SI 00604.023
**Target**: Deep, substantive SSI eligibility rules for paralegal review

---

## Executive Summary

This plan implements the **7-year SSI eligibility time limit** for refugees and asylees per POMS SI 00502.106. This transforms the current shallow citizenship status checks into complex, date-based eligibility calculations that require:
- Date tracking (admission/grant dates)
- Time period calculations
- Extension eligibility logic
- Exception condition handling

**Why This Is Substantive**: Paralegals with SSI expertise routinely handle these time-limit calculations, extension applications, and exception determinations. This implementation provides real policy depth for meaningful review.

---

## POMS Research Summary

### Core 7-Year Rule (SI 00502.106A)

**Effective**: 8/22/96

**Qualified aliens subject to 7-year limit**:
1. **Refugee** under INA §207
2. **Asylee** under INA §208
3. **Alien whose deportation/removal withheld** under INA §243(h) or §241(b)(3)
4. **Cuban/Haitian entrant** under REA 1980 §501(e)
5. **Amerasian immigrant** under FOEA 1988 §584
6. **Iraqi/Afghan special immigrant** (mentioned in summary)
7. **Trafficking victim immigrant** (mentioned in summary)

**Eligibility Requirements**:
- Must file for SSI **within 7 years** of acquiring the status
- Must **not meet** an exception condition that permits unlimited eligibility
- 7-year period **begins on the date the status was acquired**, not filing date

**Start Dates by Status**:
- **Refugees**: Date of admission to U.S. under INA §207
- **Asylees**: Date asylum was granted under INA §208
- **Withheld deportation/removal**: Date withholding was granted
- **Cuban/Haitian entrants**: Date of entry/status grant
- **Amerasians**: Date admitted as LAPR (qualified aliens by definition)

**End of Eligibility**:
- Eligibility ends **the month after the 7th anniversary** of acquiring status
- Example: Status acquired 3/15/2020 → Eligibility ends 4/30/2027 (month after 3/15/2027)

**Critical Note**: If alien adjusts to LAPR status during the 7-year period, the 7-year clock **does NOT restart**. The original status acquisition date continues to apply.

### Exception Conditions (Unlimited Eligibility)

Per SI 00502.100A.3.a through A.3.d, the 7-year limit **does not apply** if the alien meets:

1. **LAPR with 40 qualifying quarters** (SI 00502.135)
   - Excludes quarters earned after 12/31/96 while receiving certain federal benefits
   - Includes credited quarters from spouse/parents
   - Subject to 5-year bar if entry after 8/22/96

2. **Veteran or active duty military** (SI 00502.140)
   - Honorable discharge from U.S. Armed Forces
   - Active duty status
   - Spouse or dependent child of veteran/active duty member

3. **Blind or disabled and lawfully residing in U.S. on 8/22/96** (SI 00502.142)
   - Must have been lawfully residing (not just present) on 8/22/96
   - Must meet SSI disability or blindness criteria

4. **Receiving SSI on 8/22/96** (SI 00502.150, SI 00502.153)
   - "Grandfathered" status
   - Continues indefinitely if otherwise eligible

### Extensions (SI 00502.301)

**SSI Extension for Elderly and Disabled Refugees Act** (P.L. 110-328)
- **Sunset date**: September 30, 2011 (legislation expired)
- **Note**: This extension is no longer available as of 2026

**Historical Extensions Provided**:
1. **3-year extension**: For aliens pursuing citizenship (pending or approved application)
2. **2-year extension**: For aliens meeting specific criteria (age 70+, under 18, LPR <6 years, etc.)

**Current Status**: Extension legislation has sunset. Focus on core 7-year rule only.

---

## Implementation Design

### Phase 1: Data Model Extensions

#### Add to tPerson in bdt.dmn:

```xml
<dmn:itemComponent name="refugeeAdmissionDate" isCollection="false">
  <dmn:typeRef>date</dmn:typeRef>
</dmn:itemComponent>

<dmn:itemComponent name="asylumGrantDate" isCollection="false">
  <dmn:typeRef>date</dmn:typeRef>
</dmn:itemComponent>

<dmn:itemComponent name="withheldDeportationGrantDate" isCollection="false">
  <dmn:typeRef>date</dmn:typeRef>
</dmn:itemComponent>

<dmn:itemComponent name="cubanHaitianEntryDate" isCollection="false">
  <dmn:typeRef>date</dmn:typeRef>
</dmn:itemComponent>

<dmn:itemComponent name="amerasianAdmissionDate" isCollection="false">
  <dmn:typeRef>date</dmn:typeRef>
</dmn:itemComponent>
```

**Rationale**: Each status type has its own date field to support the rule that the earliest status acquisition date applies when an alien has multiple qualifying statuses.

#### Add to tSituation in bdt.dmn:

```xml
<dmn:itemComponent name="evaluationDate" isCollection="false">
  <dmn:typeRef>date</dmn:typeRef>
</dmn:itemComponent>
```

**Rationale**: Need a "as of" date to evaluate whether the 7-year period has expired. Typically this would be today's date, but parameterizing it allows testing different time scenarios.

### Phase 2: Core Check Implementation

#### Check 1: RefugeeAsyleeWithinSevenYears.dmn

**Location**: `checks/citizenship/refugee-asylee-within-seven-years.dmn`

**Decision Service**: `RefugeeAsyleeWithinSevenYearsService`

**Inputs**:
- `situation` (tSituation)
- `parameters` (context with personId: string)

**Output**:
- `checkResult` (boolean) - true if within 7-year eligibility window

**Logic Steps**:

1. **Get person from situation**
   ```feel
   situation.people[id = parameters.personId][1]
   ```

2. **Determine relevant status and acquisition date**
   ```feel
   if person.citizenshipStatus = "REFUGEE" then
     {status: "REFUGEE", acquisitionDate: person.refugeeAdmissionDate}
   else if person.citizenshipStatus = "ASYLEE" then
     {status: "ASYLEE", acquisitionDate: person.asylumGrantDate}
   else
     null
   ```

3. **Calculate years since acquisition**
   ```feel
   if statusInfo != null and statusInfo.acquisitionDate != null then
     years and months duration(statusInfo.acquisitionDate, situation.evaluationDate).years
   else
     null
   ```

4. **Check if within 7-year window**
   ```feel
   if yearsSinceAcquisition != null then
     yearsSinceAcquisition < 7
   else
     false
   ```

5. **Return result**
   ```feel
   withinSevenYears
   ```

**POMS Citations in DMN Description**:
```
POMS SI 00502.106A - Seven-Year Eligibility Limitation

Refugees (INA §207) and asylees (INA §208) are eligible for SSI for a maximum of 7 years from
the date status was acquired:
- Refugees: 7 years from date of admission
- Asylees: 7 years from date asylum was granted

The 7-year period begins on the date the status was acquired, not the SSI filing date.
Eligibility ends the month after the 7th anniversary.

This check verifies the person is within the 7-year eligibility window. It does NOT check for
exception conditions (veteran status, 40 QQ, blind/disabled on 8/22/96) which permit unlimited
eligibility.
```

**Edge Cases to Handle**:
- Person has refugee status but no admission date (return false - cannot calculate)
- Person has asylee status but no grant date (return false - cannot calculate)
- Evaluation date is before acquisition date (invalid, return false)
- Person is not refugee/asylee (return false)
- Null handling throughout

#### Check 2: WithheldDeportationWithinSevenYears.dmn

**Location**: `checks/citizenship/withheld-deportation-within-seven-years.dmn`

**Similar structure** to RefugeeAsyleeWithinSevenYears.dmn but for:
- `citizenshipStatus = "WITHHELD_DEPORTATION"`
- Uses `person.withheldDeportationGrantDate`

#### Check 3: CubanHaitianEntrantWithinSevenYears.dmn

**Location**: `checks/citizenship/cuban-haitian-entrant-within-seven-years.dmn`

**Similar structure** but for:
- `citizenshipStatus = "CUBAN_HAITIAN_ENTRANT"`
- Uses `person.cubanHaitianEntryDate`

#### Check 4: AmerasianWithinSevenYears.dmn

**Location**: `checks/citizenship/vietnamese-amerasian-within-seven-years.dmn`

**Note**: Amerasians are LAPR by definition, but subject to 7-year limit if they don't meet exception conditions.

**Similar structure** but for:
- `citizenshipStatus = "VIETNAMESE_AMERASIAN"`
- Uses `person.amerasianAdmissionDate`

### Phase 3: Enhanced Composition Check

#### Update: RefugeeAsyleeStatus.dmn → RefugeeAsyleeEligible.dmn

**Current behavior**: Simple status check (`citizenshipStatus = "REFUGEE" or "ASYLEE"`)

**Enhanced behavior**: Status check AND time limit check

**New Logic**:
```feel
// Step 1: Check status
hasStatus = person.citizenshipStatus = "REFUGEE" or person.citizenshipStatus = "ASYLEE"

// Step 2: Check time limit
withinTimeLimit = RefugeeAsyleeWithinSevenYears.RefugeeAsyleeWithinSevenYearsService(
  situation,
  {personId: parameters.personId}
).checkResult

// Step 3: Result
hasStatus and withinTimeLimit
```

**POMS Citation**:
```
POMS SI 00502.100A.2.a + SI 00502.106A

Person must be refugee (INA §207) or asylee (INA §208) AND within 7-year eligibility window
from date status was acquired.

Exception conditions that permit unlimited eligibility (veteran, 40 QQ, blind/disabled on
8/22/96) are NOT checked by this decision - those are separate eligibility paths.
```

### Phase 4: Test Design

#### Test Files Structure

**Location**: `test/bdt/checks/citizenship/RefugeeAsyleeWithinSevenYears/`

**Test Scenarios**:

1. **Pass - Refugee Within 7 Years.bru**
   ```json
   {
     "situation": {
       "primaryPersonId": "person-1",
       "people": [{
         "id": "person-1",
         "citizenshipStatus": "REFUGEE",
         "refugeeAdmissionDate": "2022-06-15"
       }],
       "evaluationDate": "2026-01-02"
     },
     "parameters": {"personId": "person-1"}
   }
   ```
   Expected: `checkResult = true` (3.5 years since admission)

2. **Fail - Refugee After 7 Years.bru**
   ```json
   {
     "situation": {
       "primaryPersonId": "person-1",
       "people": [{
         "id": "person-1",
         "citizenshipStatus": "REFUGEE",
         "refugeeAdmissionDate": "2018-06-15"
       }],
       "evaluationDate": "2026-01-02"
     },
     "parameters": {"personId": "person-1"}
   }
   ```
   Expected: `checkResult = false` (7.5 years since admission)

3. **Edge Case - Exactly 7 Years.bru**
   ```json
   {
     "situation": {
       "primaryPersonId": "person-1",
       "people": [{
         "id": "person-1",
         "citizenshipStatus": "REFUGEE",
         "refugeeAdmissionDate": "2019-01-02"
       }],
       "evaluationDate": "2026-01-02"
     },
     "parameters": {"personId": "person-1"}
   }
   ```
   Expected: `checkResult = false` (exactly 7 years, eligibility ends month after 7th anniversary)

4. **Edge Case - 6 Years 11 Months.bru**
   ```json
   {
     "situation": {
       "primaryPersonId": "person-1",
       "people": [{
         "id": "person-1",
         "citizenshipStatus": "REFUGEE",
         "refugeeAdmissionDate": "2019-02-02"
       }],
       "evaluationDate": "2026-01-02"
     },
     "parameters": {"personId": "person-1"}
   }
   ```
   Expected: `checkResult = true` (6 years 11 months, still within window)

5. **Edge Case - Missing Admission Date.bru**
   ```json
   {
     "situation": {
       "primaryPersonId": "person-1",
       "people": [{
         "id": "person-1",
         "citizenshipStatus": "REFUGEE",
         "refugeeAdmissionDate": null
       }],
       "evaluationDate": "2026-01-02"
     },
     "parameters": {"personId": "person-1"}
   }
   ```
   Expected: `checkResult = false` (cannot calculate without date)

6. **Pass - Asylee Within 7 Years.bru**
   ```json
   {
     "situation": {
       "primaryPersonId": "person-1",
       "people": [{
         "id": "person-1",
         "citizenshipStatus": "ASYLEE",
         "asylumGrantDate": "2020-03-10"
       }],
       "evaluationDate": "2026-01-02"
     },
     "parameters": {"personId": "person-1"}
   }
   ```
   Expected: `checkResult = true` (5.8 years since grant)

7. **Fail - Not Refugee or Asylee.bru**
   ```json
   {
     "situation": {
       "primaryPersonId": "person-1",
       "people": [{
         "id": "person-1",
         "citizenshipStatus": "US_CITIZEN"
       }],
       "evaluationDate": "2026-01-02"
     },
     "parameters": {"personId": "person-1"}
   }
   ```
   Expected: `checkResult = false` (not applicable status)

**Similar test files** for WithheldDeportationWithinSevenYears, CubanHaitianEntrantWithinSevenYears, AmerasianWithinSevenYears

---

## Complexity Assessment

### What Makes This Deep

1. **Date Arithmetic**: Calculating years between dates using FEEL duration functions
2. **Multi-Path Logic**: Different date fields for different statuses
3. **Edge Cases**:
   - Exactly 7 years (boundary condition)
   - Missing dates (data quality)
   - Future evaluation dates (testing scenarios)
4. **POMS Cross-References**: Multiple sections (SI 00502.106, SI 00502.100, SI 00502.301)
5. **Real-World Scenarios**: These are actual calculations SSA staff perform daily

### Paralegal Review Value

Elliot will be able to validate:
- Correct interpretation of "7 years from date acquired" vs "7 years from filing"
- Proper handling of end-of-eligibility timing (month after 7th anniversary)
- Edge case handling (exactly 7 years, missing dates)
- Correct status-to-date-field mappings
- Understanding that the 7-year clock doesn't restart when adjusting to LAPR

---

## Implementation Sequence

### Step 1: Extend Data Model (Est: 30 min)
- Update `bdt.dmn` to add date fields to tPerson
- Add `evaluationDate` to tSituation
- Test that BDT server reloads without errors

### Step 2: Implement RefugeeAsyleeWithinSevenYears (Est: 1.5 hours)
- Create DMN file with decision logic
- Add comprehensive POMS citations
- Create 7 Bruno test cases
- Verify all tests pass

### Step 3: Implement Other Time-Limited Checks (Est: 2 hours)
- WithheldDeportationWithinSevenYears.dmn
- CubanHaitianEntrantWithinSevenYears.dmn
- AmerasianWithinSevenYears.dmn
- Test cases for each

### Step 4: Update Composition Checks (Est: 1 hour)
- Enhance RefugeeAsyleeStatus → RefugeeAsyleeEligible
- Update other affected composition checks
- Update existing tests to include date fields

### Step 5: Documentation for Elliot (Est: 1 hour)
- Create review document explaining implementation
- Highlight POMS interpretation choices
- Flag any ambiguities discovered
- Provide test coverage matrix

**Total Estimated Time**: 6 hours

---

## Open Questions & Ambiguities

### Q1: How to handle "years" calculation precisely?

**POMS Text**: "7 years from date status was acquired"

**Options**:
- A) Use FEEL `years and months duration().years` (counts full years only)
- B) Use calendar years (7 * 365 days, accounting for leap years)
- C) Use anniversary dates (7th anniversary is the cutoff)

**Recommendation**: Option C (anniversary-based) aligns with POMS statement "eligibility ends the month after the 7th anniversary"

**Implementation**:
```feel
years and months duration(acquisitionDate, evaluationDate).years < 7
```

This returns true for 0-6 full years, false for 7+ years.

### Q2: What if person has both refugee and asylee dates?

**POMS Text**: SI 00502.106A.2 examples show that when an alien has multiple qualifying statuses, the **earliest** status acquisition date applies.

**Example from POMS**: Person was Cuban/Haitian entrant (10/1/2000), then became asylee (5/1/2001), then adjusted to LAPR (3/1/2003). The 7-year period is based on the Cuban/Haitian entrant date (10/1/2000), not the asylee or LAPR dates.

**Implementation**: Check logic should use the **earliest non-null date** among all applicable status dates.

### Q3: Extension Act sunset date

**POMS Text**: Extension legislation (P.L. 110-328) sunset on September 30, 2011.

**Current Date**: January 2, 2026 - Extension is no longer available.

**Decision**: Do NOT implement extension logic. Focus on core 7-year rule only. If future legislation reinstates extensions, that will be a separate enhancement.

---

## Success Criteria

1. ✅ Data model extended with all necessary date fields
2. ✅ All DMN files compile without validation errors
3. ✅ All Bruno tests pass (expect 20+ new tests)
4. ✅ POMS citations included in all decision descriptions
5. ✅ Edge cases documented and tested
6. ✅ Review document prepared for Elliot with:
   - POMS interpretation choices
   - Implementation logic explanation
   - Known limitations/gaps
   - Test coverage matrix

---

## Next Steps

Ready to proceed with implementation? The recommended approach:

1. **Start with Step 1** (extend data model) - this is the foundation
2. **Then Step 2** (RefugeeAsyleeWithinSevenYears) - proves the pattern works
3. **Validate with you** before proceeding to Steps 3-5

Would you like me to begin with Step 1: Extending the data model in bdt.dmn?
