/**
 * Persona template generators for SSI eligibility testing
 * Each template generates a realistic test scenario with expected results
 */

/**
 * Generate a minimal eligible persona
 * Bare minimum to be eligible for SSI
 */
function generateEligibleMinimal(schema) {
  const benefit = schema.benefit || 'UnknownBenefit';

  return {
    name: `${benefit} - Eligible Minimal`,
    description: 'Bare minimum to be eligible: Age 65+, US citizen, low income/resources',
    situation: {
      primaryPersonId: 'p1',
      evaluationDate: '2026-01-05',
      people: [{
        id: 'p1',
        dateOfBirth: '1950-01-01',  // Age 76
        isBlindOrDisabled: false,
        citizenshipStatus: 'us_citizen',
        residenceState: 'PA',
        countableResources: 1500,  // Below $2,000 limit
        incomeSources: []  // No income
      }]
    },
    expectedResult: {
      isEligible: true,
      checks: {
        categoricalEligible: true,
        citizenshipEligible: true,
        residenceEligible: true,
        resourceEligible: true,
        incomeEligible: true
      }
    }
  };
}

/**
 * Generate an eligible persona with income
 * Person with some income but still eligible
 */
function generateEligibleWithIncome(schema) {
  const benefit = schema.benefit || 'UnknownBenefit';

  return {
    name: `${benefit} - Eligible With Income`,
    description: 'Eligible person with part-time wages, income below limit after exclusions',
    situation: {
      primaryPersonId: 'p1',
      evaluationDate: '2026-01-05',
      people: [{
        id: 'p1',
        dateOfBirth: '1955-06-15',  // Age 70
        isBlindOrDisabled: false,
        citizenshipStatus: 'us_citizen',
        residenceState: 'CA',
        countableResources: 800,
        incomeSources: [
          {
            id: 'income1',
            type: 'earned',
            category: 'wages',
            monthlyAmount: 500,
            description: 'Part-time work',
            isInfrequentOrIrregular: false
          },
          {
            id: 'income2',
            type: 'unearned',
            category: 'interest',
            monthlyAmount: 15,
            description: 'Bank interest',
            isInfrequentOrIrregular: false
          }
        ]
      }]
    },
    expectedResult: {
      isEligible: true,
      checks: {
        categoricalEligible: true,
        citizenshipEligible: true,
        residenceEligible: true,
        resourceEligible: true,
        incomeEligible: true  // After exclusions: ($500-$20-$65)/2 + ($15-$0) = $207.50 < $967
      }
    }
  };
}

/**
 * Generate an ineligible persona - income too high
 * Person with income above FBR after exclusions
 */
function generateIneligibleIncomeTooHigh(schema) {
  const benefit = schema.benefit || 'UnknownBenefit';

  return {
    name: `${benefit} - Ineligible Income Too High`,
    description: 'Fails income check: countable income exceeds FBR',
    situation: {
      primaryPersonId: 'p1',
      evaluationDate: '2026-01-05',
      people: [{
        id: 'p1',
        dateOfBirth: '1958-03-20',  // Age 67
        isBlindOrDisabled: false,
        citizenshipStatus: 'us_citizen',
        residenceState: 'NY',
        countableResources: 1200,
        incomeSources: [
          {
            id: 'income1',
            type: 'unearned',
            category: 'pension',
            monthlyAmount: 600,
            description: 'Pension',
            isInfrequentOrIrregular: false
          },
          {
            id: 'income2',
            type: 'earned',
            category: 'wages',
            monthlyAmount: 1500,
            description: 'Part-time consulting',
            isInfrequentOrIrregular: false
          }
        ]
      }]
    },
    expectedResult: {
      isEligible: false,
      checks: {
        categoricalEligible: true,
        citizenshipEligible: true,
        residenceEligible: true,
        resourceEligible: true,
        incomeEligible: false  // Countable income > $967
      }
    }
  };
}

/**
 * Generate an ineligible persona - resources too high
 * Person with countable resources above $2,000
 */
function generateIneligibleResourcesTooHigh(schema) {
  const benefit = schema.benefit || 'UnknownBenefit';

  return {
    name: `${benefit} - Ineligible Resources Too High`,
    description: 'Fails resource check: countable resources exceed $2,000',
    situation: {
      primaryPersonId: 'p1',
      evaluationDate: '2026-01-05',
      people: [{
        id: 'p1',
        dateOfBirth: '1953-11-10',  // Age 72
        isBlindOrDisabled: false,
        citizenshipStatus: 'us_citizen',
        residenceState: 'FL',
        countableResources: 5000,  // Above $2,000 limit
        incomeSources: []
      }]
    },
    expectedResult: {
      isEligible: false,
      checks: {
        categoricalEligible: true,
        citizenshipEligible: true,
        residenceEligible: true,
        resourceEligible: false,  // Resources too high
        incomeEligible: true
      }
    }
  };
}

/**
 * Generate an ineligible persona - citizenship
 * Person who doesn't meet citizenship requirements
 */
function generateIneligibleCitizenship(schema) {
  const benefit = schema.benefit || 'UnknownBenefit';

  return {
    name: `${benefit} - Ineligible Citizenship`,
    description: 'Fails citizenship check: not a US citizen or qualified alien',
    situation: {
      primaryPersonId: 'p1',
      evaluationDate: '2026-01-05',
      people: [{
        id: 'p1',
        dateOfBirth: '1951-07-25',  // Age 74
        isBlindOrDisabled: false,
        citizenshipStatus: 'temporary_visitor',  // Not qualified
        residenceState: 'TX',
        countableResources: 500,
        incomeSources: []
      }]
    },
    expectedResult: {
      isEligible: false,
      checks: {
        categoricalEligible: true,
        citizenshipEligible: false,  // Not qualified
        residenceEligible: true,
        resourceEligible: true,
        incomeEligible: true
      }
    }
  };
}

/**
 * Generate an ineligible persona - residence
 * Person who doesn't live in a qualifying state
 */
function generateIneligibleResidence(schema) {
  const benefit = schema.benefit || 'UnknownBenefit';

  return {
    name: `${benefit} - Ineligible Residence`,
    description: 'Fails residence check: lives in excluded territory',
    situation: {
      primaryPersonId: 'p1',
      evaluationDate: '2026-01-05',
      people: [{
        id: 'p1',
        dateOfBirth: '1952-09-14',  // Age 73
        isBlindOrDisabled: false,
        citizenshipStatus: 'us_citizen',
        residenceState: 'PR',  // Puerto Rico not eligible
        countableResources: 1000,
        incomeSources: []
      }]
    },
    expectedResult: {
      isEligible: false,
      checks: {
        categoricalEligible: true,
        citizenshipEligible: true,
        residenceEligible: false,  // Puerto Rico excluded
        resourceEligible: true,
        incomeEligible: true
      }
    }
  };
}

/**
 * Generate an ineligible persona - age
 * Person who is too young (under 65 and not blind/disabled)
 */
function generateIneligibleAge(schema) {
  const benefit = schema.benefit || 'UnknownBenefit';

  return {
    name: `${benefit} - Ineligible Age`,
    description: 'Fails categorical check: under 65 and not blind/disabled',
    situation: {
      primaryPersonId: 'p1',
      evaluationDate: '2026-01-05',
      people: [{
        id: 'p1',
        dateOfBirth: '1970-04-10',  // Age 55
        isBlindOrDisabled: false,
        citizenshipStatus: 'us_citizen',
        residenceState: 'WA',
        countableResources: 500,
        incomeSources: []
      }]
    },
    expectedResult: {
      isEligible: false,
      checks: {
        categoricalEligible: false,  // Too young
        citizenshipEligible: true,
        residenceEligible: true,
        resourceEligible: true,
        incomeEligible: true
      }
    }
  };
}

/**
 * Generate edge case - boundary age
 * Person who just turned 65
 */
function generateEdgeCaseBoundaryAge(schema) {
  const benefit = schema.benefit || 'UnknownBenefit';

  // Calculate date of birth for someone who just turned 65
  const evalDate = new Date('2026-01-05');
  const birthDate = new Date(evalDate);
  birthDate.setFullYear(birthDate.getFullYear() - 65);
  birthDate.setDate(birthDate.getDate() - 1);  // Just turned 65 yesterday

  return {
    name: `${benefit} - Edge Case Boundary Age`,
    description: 'Edge case: person just turned 65',
    situation: {
      primaryPersonId: 'p1',
      evaluationDate: evalDate.toISOString().split('T')[0],
      people: [{
        id: 'p1',
        dateOfBirth: birthDate.toISOString().split('T')[0],
        isBlindOrDisabled: false,
        citizenshipStatus: 'us_citizen',
        residenceState: 'MA',
        countableResources: 1000,
        incomeSources: []
      }]
    },
    expectedResult: {
      isEligible: true,
      checks: {
        categoricalEligible: true,  // Just turned 65
        citizenshipEligible: true,
        residenceEligible: true,
        resourceEligible: true,
        incomeEligible: true
      }
    }
  };
}

/**
 * Generate edge case - boundary resources
 * Person with resources exactly at the limit
 */
function generateEdgeCaseBoundaryResources(schema) {
  const benefit = schema.benefit || 'UnknownBenefit';

  return {
    name: `${benefit} - Edge Case Boundary Resources`,
    description: 'Edge case: resources exactly at $2,000 limit',
    situation: {
      primaryPersonId: 'p1',
      evaluationDate: '2026-01-05',
      people: [{
        id: 'p1',
        dateOfBirth: '1954-02-18',  // Age 71
        isBlindOrDisabled: false,
        citizenshipStatus: 'us_citizen',
        residenceState: 'OR',
        countableResources: 2000,  // Exactly at limit
        incomeSources: []
      }]
    },
    expectedResult: {
      isEligible: false,  // At limit = ineligible (must be < $2,000)
      checks: {
        categoricalEligible: true,
        citizenshipEligible: true,
        residenceEligible: true,
        resourceEligible: false,  // Not below limit
        incomeEligible: true
      }
    }
  };
}

/**
 * Generate edge case - blind/disabled under 65
 * Person under 65 but meets blind/disabled criteria
 */
function generateEdgeCaseBlindUnder65(schema) {
  const benefit = schema.benefit || 'UnknownBenefit';

  return {
    name: `${benefit} - Edge Case Blind Under 65`,
    description: 'Edge case: under 65 but blind/disabled',
    situation: {
      primaryPersonId: 'p1',
      evaluationDate: '2026-01-05',
      people: [{
        id: 'p1',
        dateOfBirth: '1980-08-30',  // Age 45
        isBlindOrDisabled: true,  // Meets categorical via disability
        citizenshipStatus: 'us_citizen',
        residenceState: 'CO',
        countableResources: 1200,
        incomeSources: []
      }]
    },
    expectedResult: {
      isEligible: true,
      checks: {
        categoricalEligible: true,  // Blind/disabled
        citizenshipEligible: true,
        residenceEligible: true,
        resourceEligible: true,
        incomeEligible: true
      }
    }
  };
}

/**
 * Get all persona generators
 */
function getAllPersonaGenerators() {
  return {
    eligibleMinimal: generateEligibleMinimal,
    eligibleWithIncome: generateEligibleWithIncome,
    ineligibleIncomeTooHigh: generateIneligibleIncomeTooHigh,
    ineligibleResourcesTooHigh: generateIneligibleResourcesTooHigh,
    ineligibleCitizenship: generateIneligibleCitizenship,
    ineligibleResidence: generateIneligibleResidence,
    ineligibleAge: generateIneligibleAge,
    edgeCaseBoundaryAge: generateEdgeCaseBoundaryAge,
    edgeCaseBoundaryResources: generateEdgeCaseBoundaryResources,
    edgeCaseBlindUnder65: generateEdgeCaseBlindUnder65
  };
}

module.exports = {
  generateEligibleMinimal,
  generateEligibleWithIncome,
  generateIneligibleIncomeTooHigh,
  generateIneligibleResourcesTooHigh,
  generateIneligibleCitizenship,
  generateIneligibleResidence,
  generateIneligibleAge,
  generateEdgeCaseBoundaryAge,
  generateEdgeCaseBoundaryResources,
  generateEdgeCaseBlindUnder65,
  getAllPersonaGenerators
};
