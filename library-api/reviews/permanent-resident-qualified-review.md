# PermanentResidentQualified Check - Implementation Review

**DMN File:** `src/main/resources/checks/citizenship/permanent-resident-qualified.dmn`
**Implemented:** 2025-12-19
**Test Status:** ✅ All 3 tests passing

---

## POMS Reference

**Primary:** POMS SI 00502.100.A.2.a - Qualified Aliens Based on DHS Status
**Supporting:** POMS SI 00502.135 - LAPR with 40 Qualifying Quarters of Earnings

> An alien who is lawfully admitted for permanent residence (LAPR) in the U.S. under the Immigration and Nationality Act is one of seven qualified alien categories for SSI eligibility purposes.

**AR Codes:** "K," "S," or "Y" (Enter "3" for Amerasian immigrants)

---

## Logic Implemented

```
PermanentResidentQualified = citizenshipStatus = "LAPR"
```

**Simplified Implementation:** This check verifies LAPR status only.

**Full POMS Requirement:** Per POMS SI 00502.100 and SI 00502.135, LAPR aliens must ALSO meet an exception condition to be SSI-eligible:
- **40 Qualifying Quarters Exception** (with 5-year bar for entry after 8/22/96)
- **Veteran/Active Duty Military Exception**
- **Receiving SSI on 8/22/96** and lawfully residing in U.S.
- **Legally residing in U.S. on 8/22/96** and other conditions
- **Other exceptions** per SI 00502.100.A.3

---

## Implementation Details

### Input Schema
```xml
<dmn:itemDefinition name="tParameters">
  <dmn:itemComponent name="personId">
    <dmn:typeRef>string</dmn:typeRef>
  </dmn:itemComponent>
</dmn:itemDefinition>
```

### Decision Logic
```feel
person = situation.people[id = parameters.personId][1]
result = person.citizenshipStatus = "LAPR"
```

### Output
- **Type:** `BDT.tCheckResponse` (auto-generated wrapper for boolean checkResult)
- **checkResult:** `true` if LAPR, `false` otherwise

### Null Handling
- Missing `citizenshipStatus` field → treated as not equal to "LAPR" → returns `false`
- Missing person → returns `false` (FEEL list access returns null)

---

## Test Coverage

| Test Case | Input | Expected checkResult | Actual | Status |
|-----------|-------|---------------------|--------|--------|
| Pass - LAPR Status | `citizenshipStatus: "LAPR"` | true | ✅ true | PASS |
| Fail - Not LAPR | `citizenshipStatus: "OTHER"` | false | ✅ false | PASS |
| Edge - Null Status | No `citizenshipStatus` field | false | ✅ false | PASS |

**Test Pass Rate:** 100% (3/3)

**Endpoint:** `POST /api/v1/checks/citizenship/permanent-resident-qualified`

---

## POMS Research Summary

### Key POMS Pages Retrieved
1. **SI 00502.100** - Basic SSI Alien Eligibility Requirements
   - Defines 7 qualified alien categories based on DHS status
   - Requires qualified alien + exception condition for SSI eligibility

2. **SI 00502.135** - LAPR with 40 Qualifying Quarters of Earnings
   - Detailed rules for 40 QQ exception
   - 5-year bar for LAPRs entering after 8/22/96
   - QQs can be earned by alien, parent (while alien under 18), or spouse (during marriage)
   - Federal means-tested public benefits affect QQ counting

### Exception Conditions (Not Yet Implemented)

**From SI 00502.100.A.3** (inferred from research):
1. **40 Qualifying Quarters Exception**
   - Subject to 5-year bar if entered U.S. on/after 8/22/96
   - Can include quarters earned by parent or spouse
   - Exceptions to 5-year bar: refugees, asylees, veterans, certain tribes

2. **Veteran/Military Exception**
   - Active duty military
   - Veterans with honorable discharge
   - Spouses and children of veterans/active duty

3. **8/22/96 Grandfathering**
   - Receiving SSI on 8/22/96
   - Legally residing on 8/22/96

4. **7-Year Time Limit**
   - Certain qualified aliens subject to 7-year SSI eligibility limit
   - Extensions available under specific conditions

---

## Known Limitations

**Current Implementation Scope:**
- ✅ Verifies LAPR status from `person.citizenshipStatus` field
- ❌ Does NOT verify exception conditions (40 QQ, veteran, etc.)
- ❌ Does NOT enforce 5-year bar for post-8/22/96 entries
- ❌ Does NOT track 7-year eligibility limit
- ❌ Does NOT validate date of LAPR admission

**Impact:**
This check will return `true` for ANY person with LAPR status, even if they don't meet exception conditions. For production use, this check should be enhanced or composed with additional exception condition checks.

**Rationale for Simplified Implementation:**
1. SSI Eligibility DMN Spec v1 lists this as "permanent-resident-qualified" suggesting it checks qualified LAPR status
2. Exception conditions are complex and cross-cutting (affect multiple alien categories)
3. POMS Open Questions 3 & 5 in spec note that 7-year limit and exception conditions need research
4. Following existing pattern from `person-us-citizen.dmn` which checks status field only
5. Enables progress on citizenship category infrastructure

---

## Future Enhancements

### Phase 1: Data Model Extensions
Add to `BDT.tPerson`:
```xml
<dmn:itemComponent name="dateOfLAPRAdmission">
  <dmn:typeRef>date</dmn:typeRef>
</dmn:itemComponent>
<dmn:itemComponent name="qualifyingQuarters">
  <dmn:typeRef>number</dmn:typeRef>
</dmn:itemComponent>
<dmn:itemComponent name="isVeteran">
  <dmn:typeRef>boolean</dmn:typeRef>
</dmn:itemComponent>
```

### Phase 2: Exception Condition Checks
Create additional checks:
- `checks/citizenship/lapr-40-qualifying-quarters.dmn`
- `checks/citizenship/lapr-veteran-exception.dmn`
- `checks/citizenship/lapr-5-year-bar.dmn`
- `checks/citizenship/lapr-7-year-limit.dmn`

### Phase 3: Composition
Update `permanent-resident-qualified.dmn` to:
```feel
isLAPR and (
  qualifyingQuartersException or
  veteranException or
  grandfatheredException
) and
not(exceeds7YearLimit)
```

Or create a new check `lapr-ssi-eligible.dmn` that composes these.

---

## Files Created

1. `src/main/resources/checks/citizenship/permanent-resident-qualified.dmn`
2. `test/bdt/checks/citizenship/PermanentResidentQualified/Pass - LAPR Status.bru`
3. `test/bdt/checks/citizenship/PermanentResidentQualified/Fail - Not LAPR.bru`
4. `test/bdt/checks/citizenship/PermanentResidentQualified/Edge Case - Null Status.bru`
5. `reviews/permanent-resident-qualified-review.md` (this file)

---

## Integration Status

- ✅ Discoverable by ModelRegistry (19 models total)
- ✅ Auto-exposed as REST endpoint: `/api/v1/checks/citizenship/permanent-resident-qualified`
- ✅ Documented in OpenAPI/Swagger
- ✅ Ready for composition in `citizenship-eligibility.dmn`

---

## Key Takeaways

1. **POMS Complexity:** SSI alien eligibility is a two-part test (qualified alien + exception condition). This implementation addresses part 1 only.

2. **Specification Alignment:** Check name "permanent-resident-qualified" suggests checking both LAPR status and qualification. Current implementation checks status only, with qualification deferred.

3. **Iterative Development:** Starting with simplified status check allows:
   - Infrastructure development (tests, endpoints, composition patterns)
   - Gradual enhancement with exception conditions
   - Clear documentation of known limitations

4. **Data Model Implications:** Full implementation will require additional person fields for LAPR admission date, qualifying quarters, veteran status, etc.

5. **POMS Research Value:** Deep dive into SI 00502.100 and SI 00502.135 provides roadmap for future enhancements and identifies 5-year bar, 7-year limit, and multiple exception pathways.

---

**Reviewed By:** Claude Code
**Review Date:** 2025-12-19
