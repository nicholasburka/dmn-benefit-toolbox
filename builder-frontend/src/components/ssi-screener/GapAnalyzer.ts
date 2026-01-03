import type { PersonaContext, EligibilityResult } from "./types";

interface RequiredField {
  field: keyof PersonaContext;
  condition?: (ctx: PersonaContext) => boolean;
  description: string;
}

const SSI_REQUIRED_FIELDS: RequiredField[] = [
  {
    field: "dateOfBirth",
    description: "Date of birth (needed to check if you're 65 or older)"
  },
  {
    field: "isBlindOrDisabled",
    condition: (ctx) => {
      // Only ask if they're under 65
      if (!ctx.dateOfBirth) return true;
      const age = calculateAge(ctx.dateOfBirth);
      return age < 65;
    },
    description: "Whether you are blind or disabled (needed if under 65)"
  },
  {
    field: "citizenshipStatus",
    description: "Citizenship or immigration status"
  },
  {
    field: "refugeeAdmissionDate",
    condition: (ctx) => ctx.citizenshipStatus === "REFUGEE",
    description: "Date you were admitted as a refugee"
  },
  {
    field: "asylumGrantDate",
    condition: (ctx) => ctx.citizenshipStatus === "ASYLEE",
    description: "Date your asylum was granted"
  },
  {
    field: "withheldDeportationGrantDate",
    condition: (ctx) => ctx.citizenshipStatus === "WITHHOLDING_DEPORTATION",
    description: "Date deportation was withheld"
  },
  {
    field: "cubanHaitianEntryDate",
    condition: (ctx) => ctx.citizenshipStatus === "CUBAN_HAITIAN_ENTRANT",
    description: "Date of entry to the United States"
  },
  {
    field: "amerasianAdmissionDate",
    condition: (ctx) => ctx.citizenshipStatus === "VIETNAMESE_AMERASIAN",
    description: "Date you were admitted to the United States"
  }
];

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function analyzeGaps(context: PersonaContext): string[] {
  const missingFields: string[] = [];

  for (const requiredField of SSI_REQUIRED_FIELDS) {
    // Check if field is missing
    const value = context[requiredField.field];
    const isMissing = value === undefined || value === null || value === "";

    // If there's a condition, check if this field is actually required
    if (requiredField.condition && !requiredField.condition(context)) {
      continue; // Skip this field, not required in this context
    }

    if (isMissing) {
      missingFields.push(requiredField.field);
    }
  }

  return missingFields;
}

export function getFieldDescription(fieldName: string): string {
  const field = SSI_REQUIRED_FIELDS.find(f => f.field === fieldName);
  return field?.description || fieldName;
}

export function buildSituation(context: PersonaContext) {
  const today = new Date().toISOString().split('T')[0];

  return {
    situation: {
      evaluationDate: today,
      primaryPersonId: "p1",
      people: [
        {
          id: "p1",
          dateOfBirth: context.dateOfBirth || "",
          citizenshipStatus: context.citizenshipStatus || "",
          isBlindOrDisabled: context.isBlindOrDisabled || false,
          refugeeAdmissionDate: context.refugeeAdmissionDate,
          asylumGrantDate: context.asylumGrantDate,
          withheldDeportationGrantDate: context.withheldDeportationGrantDate,
          cubanHaitianEntryDate: context.cubanHaitianEntryDate,
          amerasianAdmissionDate: context.amerasianAdmissionDate,
        }
      ],
      enrollments: [],
      relationships: [],
      simpleChecks: {}
    }
  };
}
