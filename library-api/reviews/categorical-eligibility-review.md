# CategoricalEligibility Check - Implementation Review

**DMN File:** `src/main/resources/checks/categorical/categorical-eligibility.dmn`
**Implemented:** 2025-12-18
**Test Status:** ✅ All 3 tests passing

---

## POMS Reference

**POMS SI 00501.001.B.1** - SSI Categorical Eligibility

> An individual must meet at least one of the following categorical requirements for SSI eligibility:
> - Age 65 or older, OR
> - Blind, OR
> - Disabled

---

## Logic Implemented

```
CategoricalEligibility = Age65OrOlder OR BlindOrDisabled
```

This check composes two sub-checks:
1. **PersonAge65OrOlder** - Calculates age as of date and checks >= 65
2. **BlindOrDisabled** - Reads `isBlindOrDisabled` field from situation

Final result: Individual qualifies if **either** condition is true.

---

## Key Technical Pattern: DMN Decision Service Composition

### Challenge Encountered
Initially attempted to invoke decision services and access `.checkResult` manually, which returned `null` values.

### Solution: Automatic checkResult Extraction
When invoking a decision service that returns `BDT.tCheckResponse`, declare the variable with `typeRef="boolean"`. The DMN engine automatically extracts the `checkResult` field.

**Pattern (from homestead-exemption.dmn):**
```xml
<dmn:contextEntry>
  <dmn:variable name="age65OrOlder" typeRef="boolean"/>
  <dmn:invocation>
    <dmn:literalExpression>
      <dmn:text>PersonAge65OrOlder.PersonAge65OrOlderService</dmn:text>
    </dmn:literalExpression>
    <dmn:binding>
      <dmn:parameter name="situation" typeRef="PersonAge65OrOlder.tSituation"/>
      <dmn:literalExpression><dmn:text>situation</dmn:text></dmn:literalExpression>
    </dmn:binding>
    <dmn:binding>
      <dmn:parameter name="parameters" typeRef="PersonAge65OrOlder.tParameters"/>
      <dmn:literalExpression><dmn:text>parameters</dmn:text></dmn:literalExpression>
    </dmn:binding>
  </dmn:invocation>
</dmn:contextEntry>
```

Then use the variable directly in FEEL expressions:
```feel
age65OrOlder or blindOrDisabled
```

### Why This Works
- PersonAge65OrOlderService returns type: `BDT.tCheckResponse` (has `checkResult` field)
- Variable declares type: `boolean`
- DMN engine performs automatic type coercion, extracting `checkResult`

---

## Implementation Notes

### Parameters Handling
**BlindOrDisabled** only requires `personId`, while **PersonAge65OrOlder** requires both `personId` and `asOfDate`.

Solution: Construct parameter contexts inline:
```xml
<dmn:binding>
  <dmn:parameter name="parameters" typeRef="BlindOrDisabled.tParameters"/>
  <dmn:context>
    <dmn:contextEntry>
      <dmn:variable name="personId" typeRef="string"/>
      <dmn:literalExpression><dmn:text>parameters.personId</dmn:text></dmn:literalExpression>
    </dmn:contextEntry>
  </dmn:context>
</dmn:binding>
```

### Null Handling
Both sub-checks implement null-safe logic, so composition inherits this behavior.

---

## Test Coverage

| Scenario | Input | Expected | Result |
|----------|-------|----------|--------|
| Age 65+ | DOB: 1950-01-01 (75 years old), isBlindOrDisabled: false | true | ✅ true |
| Blind/Disabled | DOB: 1995-01-01 (30 years old), isBlindOrDisabled: true | true | ✅ true |
| Neither | DOB: 1995-01-01 (30 years old), isBlindOrDisabled: false | false | ✅ false |

---

## Lessons Learned

1. **Composition Pattern**: When composing check decision services, use `boolean` typeRef on variables to trigger automatic `checkResult` extraction
2. **Parameter Construction**: Build inline parameter contexts when sub-services have different parameter requirements
3. **Reference Pattern**: Study existing benefits (e.g., `homestead-exemption.dmn`) for composition patterns before implementing
4. **Type Coercion**: DMN engine performs intelligent type coercion when variable types don't match invocation return types

This pattern should be used for all future composition checks.
