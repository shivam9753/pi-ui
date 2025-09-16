export interface WritingProgram {
  _id: string;
  title: string;
  description: string;
  imageUrl?: string;
  status: 'draft' | 'active' | 'closed' | 'archived';
  criteria: WritingProgramCriteria;
  applicationDeadline: string;
  maxApplications: number;
  applicationsReceived: number;
  createdBy: string;
  slug?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Computed properties
  isActive?: boolean;
  isExpired?: boolean;
  spotsRemaining?: number;
}

export interface WritingProgramCriteria {
  questions: CriteriaQuestion[];
  requiresWritingSamples: boolean;
  minWritingSamples: number;
  maxWritingSamples: number;
  maxWordCount: number;
}

export interface CriteriaQuestion {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number';
  question: string;
  required: boolean;
  options?: string[]; // For select/multiselect types
  validation?: {
    maxLength?: number;
    minLength?: number;
    pattern?: string;
  };
}

export interface WritingSample {
  title: string;
  content: string;
  wordCount?: number;
}

export interface ProgramApplication {
  programId: string;
  criteriaResponses: { [questionId: string]: any };
  writingSamples?: WritingSample[];
}

// For grievance submissions
export interface GrievanceSubmission {
  title: string;
  message: string;
}

// API Response interfaces
export interface WritingProgramListResponse {
  programs: WritingProgram[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ProgramApplicationsResponse {
  program: {
    _id: string;
    title: string;
    status: string;
  };
  applications: any[]; // Submission objects
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Form data interfaces
export interface WritingProgramForm {
  title: string;
  description: string;
  criteria: WritingProgramCriteria;
  applicationDeadline: string;
  maxApplications: number;
  isPublic: boolean;
}

export interface ProgramApplicationForm {
  criteriaResponses: { [questionId: string]: any };
  writingSamples: WritingSample[];
}

export interface GrievanceForm {
  title: string;
  message: string;
}

// Status and type enums
export type ProgramStatus = 'draft' | 'active' | 'closed' | 'archived';
export type QuestionType = 'text' | 'textarea' | 'select' | 'multiselect' | 'number';

// Utility type for form validation
export interface FormValidationError {
  field: string;
  message: string;
}

// Response collection types for admin
export type ResponseType = 'grievance' | 'writing_program_application';

export interface ResponseFilter {
  type?: ResponseType;
  status?: string;
  programId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}