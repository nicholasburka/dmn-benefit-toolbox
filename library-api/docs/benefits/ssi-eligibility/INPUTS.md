# Ssi Eligibility - Required Inputs

This document describes all required inputs for the eligibility screener.

> **Auto-generated** from DMN files - do not edit manually.
> Run `npm run derive-inputs` to regenerate.

## Overview

- **Benefit**: Ssi Eligibility
- **Total required inputs**: 10
- **Person fields**: 8
- **Situation fields**: 2

## Person Fields

Information about the individual being evaluated for eligibility.

| Field ID | Display Name | Type | Required | Description |
|----------|--------------|------|----------|-------------|
| dateOfBirth | Date Of Birth | date | No |  |
| isBlindOrDisabled | Is Blind Or Disabled | boolean | No |  |
| citizenshipStatus | Citizenship Status | string | No |  |
| refugeeAdmissionDate | Refugee Admission Date | date | No |  |
| asylumGrantDate | Asylum Grant Date | date | No |  |
| residenceState | Residence State | string | No |  |
| countableResources | Countable Resources | number | No |  |
| incomeSources | Income Sources | List of tIncomeSource | No |  |

## Situation Fields

Information about the household or circumstances.

| Field ID | Display Name | Type | Required | Description |
|----------|--------------|------|----------|-------------|
| primaryPersonId | Primary Person Id | string | No |  |
| evaluationDate | Evaluation Date | date | No |  |

## Example Request

```json
{
  "situation": {
    "people": [
      {
        "id": "person-1",
        "dateOfBirth": "2024-01-15",
        "isBlindOrDisabled": false,
        "citizenshipStatus": "US_CITIZEN",
        "refugeeAdmissionDate": "2024-01-15",
        "asylumGrantDate": "2024-01-15",
        "residenceState": "person-123",
        "countableResources": 0,
        "incomeSources": [
          {
            "id": "person-123",
            "type": "",
            "category": "",
            "monthlyAmount": 1500,
            "description": "",
            "isInfrequentOrIrregular": false
          }
        ]
      }
    ],
    "primaryPersonId": "person-123",
    "evaluationDate": "2024-01-15"
  }
}
```

---

*Generated: 2026-01-06*
