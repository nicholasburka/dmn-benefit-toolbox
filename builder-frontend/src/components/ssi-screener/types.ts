// SSI Screener Types

export interface PersonaContext {
  // Parsed fields from user input
  dateOfBirth?: string;
  citizenshipStatus?: string;
  isBlindOrDisabled?: boolean;
  refugeeAdmissionDate?: string;
  asylumGrantDate?: string;
  withheldDeportationGrantDate?: string;
  cubanHaitianEntryDate?: string;
  amerasianAdmissionDate?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface EligibilityResult {
  isEligible?: boolean;
  checks?: {
    categoricalEligible?: boolean;
    citizenshipEligible?: boolean;
  };
  isComplete: boolean;
  missingFields: string[];
}
