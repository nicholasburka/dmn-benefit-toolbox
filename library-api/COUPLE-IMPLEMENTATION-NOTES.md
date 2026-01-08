# SSI Couple Eligibility Implementation Notes

**Date**: 2026-01-07
**Status**: Research Complete, Ready for Implementation
**POMS API**: Successfully used for authoritative policy research

---

## POMS Research Findings

### Eligible Couple Definition (from POMS API Search)

**Primary Definition**:
> "A pair consisting of an eligible individual and an eligible spouse who both meet SSI criteria, affecting benefit calculations such as the Federal Benefit Rate."

**Key Requirements**:
1. Both members must meet **categorical eligibility** (age 65+ OR blind OR disabled)
2. Both members must meet **citizenship requirements**
3. Must be married and living together (spouse relationship)
4. Different benefit rates and resource limits apply

### Couple vs Individual Limits

| Type | Individual | Couple |
|------|-----------|--------|
| **Federal Benefit Rate (FBR)** | $967/month | $1,450/month |
| **Resource Limit** | $2,000 | $3,000 |

**POMS Sections Referenced**:
- SI 00501.010 - Eligible Couple Definition
- SI 00810.010 - Couple FBR
- SI 01110.003 - Couple Resource Limits

---

## Implementation Plan

### Current Infrastructure (Already in Place)

✅ **BDT.dmn has spouse detection**:
- BKM: `spouse id` (lines 222-248)
- Input: `relationships: tRelationshipList`, `personId: string`
- Output: spouse's person ID (string) or null
- Logic: `relationships[item.personId = personId and item.type = "spouse"][1].relatedPersonId`

✅ **tRelationship type supports spouse**:
- Type: `tRelationship` (lines 148-161)
- Fields: `type` (enum: "spouse"), `personId`, `relatedPersonId`

✅ **All individual checks working**:
- Categorical eligibility ✅
- Citizenship eligibility ✅
- Resource limit ✅ (needs couple parameter)
- Income limit ✅ (needs couple FBR)
- Residence requirement ✅

### Implementation Tasks

**Task 1**: Add "has eligible spouse" BKM to BDT.dmn
```feel
// BKM: has eligible spouse
// Inputs: situation (tSituation), personId (string)
// Output: boolean
// Logic:
1. Get spouse ID using existing "spouse id" BKM
2. Return spouse ID is not null
```

**Task 2**: Update `ssi-resource-limit.dmn`
- Add `isCouple: boolean` parameter
- Update limit decision:
  ```feel
  if isCouple then 3000 else 2000
  ```
- POMS citation: SI 01110.003

**Task 3**: Update `ssi-income-limit.dmn`
- Add `isCouple: boolean` parameter
- Update FBR decision:
  ```feel
  if isCouple then 1450 else 967
  ```
- POMS citation: SI 00810.010

**Task 4**: Update `ssi-eligibility.dmn`
- Add decision to detect couple status using BKM
- Pass `isCouple` parameter to resource check
- Pass couple FBR to income check
- Both members must pass categorical and citizenship checks

**Task 5**: Create Bruno tests
- `Couple - Both Eligible.bru` - Both meet all requirements
- `Couple - One Fails Categorical.bru` - Only one meets age/disability
- `Couple - One Fails Citizenship.bru` - Only one is citizen
- `Couple - Resources Above Couple Limit.bru` - $3,500 resources
- `Couple - Income Above Couple FBR.bru` - Income > $1,450

**Task 6**: Integration testing
- Test with curl commands
- Verify couple vs individual scenarios
- Edge case: individual with spouse relationship but spouse not eligible

---

## Technical Details

### POMS API Usage (Rules as Code Research Skill)

**Search Endpoint**:
```bash
curl -X POST http://localhost:8000/api/poms/search \
  -H "Content-Type: application/json" \
  -d '{"query": "SSI eligible couple", "limit": 5}'
```

**Top Results** (similarity scores):
1. "Eligible Couple" (0.87) - Primary definition
2. "Eligible Couple Computations" (0.86) - Benefit calculations
3. "Both Members of Eligible Couple" (0.85) - Both must meet criteria
4. "SSI Marriages" (0.84) - Marriage requirements
5. "Couple Eligibility Rules" (0.83) - Detailed rules

**Page Retrieval**:
```bash
curl "http://localhost:8000/api/poms/page/Eligible%20Couple"
```

### Kogito DMN Import Fix (Discovered Today)

**Problem**: Imported Decision Services not resolving with `<dmn:invocation>` pattern

**Solution**: Two required elements:
1. Use FEEL function call syntax instead of invocation element:
   ```xml
   <dmn:literalExpression>
     <dmn:text>ImportedModel.ServiceName(param1: value1, param2: value2)</dmn:text>
   </dmn:literalExpression>
   ```

2. Add `knowledgeRequirement` element referencing the imported service:
   ```xml
   <dmn:knowledgeRequirement id="_unique_id">
     <dmn:requiredKnowledge href="namespace#service-id"/>
   </dmn:knowledgeRequirement>
   ```

**Applied to**: `ssi-income-limit.dmn` → Fixed income check invocation of `CalculateCountableIncomeService`

---

## Session Summary (2026-01-07)

### Completed
1. ✅ Fixed DMN import issue in `ssi-income-limit.dmn`
2. ✅ Created 10 comprehensive SSI eligibility Bruno tests
3. ✅ Validated all 5 SSI core checks working via curl
4. ✅ Documented Bruno CLI bug (v2.15.1 "seq" error)
5. ✅ Updated SSI-IMPLEMENTATION-STATUS.md
6. ✅ Researched couple eligibility via POMS API
7. ✅ Confirmed infrastructure ready for couple support

### Next Session Tasks
1. Implement "has eligible spouse" BKM in BDT.dmn
2. Update resource limit check for couples
3. Update income limit check for couple FBR
4. Update SSI eligibility to detect and use couple status
5. Create Bruno tests for couple scenarios
6. Test end-to-end couple eligibility

---

## References

**POMS API Skill**: `/Users/mac/Desktop/Claimant Meta/screener-working-dir/skills/rules-as-code-research/SKILL.md`

**BDT DMN Authoring**: `/Users/mac/Desktop/Claimant Meta/screener-working-dir/skills/bdt-dmn-authoring/SKILL.md`

**Key Files**:
- `src/main/resources/BDT.dmn` - Base types and BKMs
- `src/main/resources/checks/resources/ssi-resource-limit.dmn`
- `src/main/resources/checks/income/ssi-income-limit.dmn`
- `src/main/resources/benefits/federal/ssi-eligibility.dmn`
- `test/bdt/benefits/federal/SsiEligibility/*.bru` - Integration tests

**Server**: Quarkus dev server running on http://localhost:8083
