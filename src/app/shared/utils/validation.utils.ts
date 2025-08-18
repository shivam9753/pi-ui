/**
 * Development validation utilities to enforce constant usage
 * and prevent hardcoded values from creeping back into the codebase.
 */

import { 
  SUBMISSION_STATUS, 
  REVIEW_ACTIONS, 
  HTTP_STATUS, 
  API_ENDPOINTS,
  SubmissionStatus,
  ReviewAction 
} from '../constants/api.constants';

import { environment } from '../../../environments/environment';

/**
 * Development validation class
 * Only runs in development mode to check for proper constant usage
 */
export class DevValidation {
  private static readonly HARDCODED_STATUS_PATTERNS = [
    /['"`]pending_review['"`]/g,
    /['"`]in_progress['"`]/g,
    /['"`]approved['"`]/g,
    /['"`]accepted['"`]/g,
    /['"`]rejected['"`]/g,
    /['"`]published['"`]/g,
    /['"`]draft['"`]/g,
    /['"`]needs_revision['"`]/g,
    /['"`]shortlisted['"`]/g,
    /['"`]resubmitted['"`]/g
  ];

  private static readonly HARDCODED_HTTP_PATTERNS = [
    /status\s*===?\s*['"`]?200['"`]?/g,
    /status\s*===?\s*['"`]?400['"`]?/g,
    /status\s*===?\s*['"`]?401['"`]?/g,
    /status\s*===?\s*['"`]?403['"`]?/g,
    /status\s*===?\s*['"`]?404['"`]?/g,
    /status\s*===?\s*['"`]?500['"`]?/g,
    /status\s*===?\s*['"`]?503['"`]?/g
  ];

  private static readonly HARDCODED_API_PATTERNS = [
    /['"`]\/api\/submissions['"`]/g,
    /['"`]\/api\/reviews['"`]/g,
    /['"`]\/api\/users['"`]/g,
    /['"`]\/submissions\/['"`]/g,
    /['"`]\/reviews\/['"`]/g,
    /['"`]\/users\/['"`]/g
  ];

  /**
   * Validates that a status value uses constants instead of hardcoded strings
   */
  static validateStatusUsage(status: string, context?: string): void {
    if (!environment.production) {
      const validStatuses = Object.values(SUBMISSION_STATUS);
      if (!validStatuses.includes(status as SubmissionStatus)) {
        console.warn(`🚨 DEV WARNING: Invalid status "${status}" used${context ? ` in ${context}` : ''}. Use SUBMISSION_STATUS constants.`);
        console.warn('Valid statuses:', validStatuses);
      }
    }
  }

  /**
   * Validates that a review action uses constants
   */
  static validateReviewActionUsage(action: string, context?: string): void {
    if (!environment.production) {
      const validActions = Object.values(REVIEW_ACTIONS);
      if (!validActions.includes(action as ReviewAction)) {
        console.warn(`🚨 DEV WARNING: Invalid review action "${action}" used${context ? ` in ${context}` : ''}. Use REVIEW_ACTIONS constants.`);
        console.warn('Valid actions:', validActions);
      }
    }
  }

  /**
   * Validates that HTTP status codes use constants
   */
  static validateHttpStatusUsage(statusCode: number, context?: string): void {
    if (!environment.production) {
      const validStatuses = Object.values(HTTP_STATUS) as number[];
      if (!validStatuses.includes(statusCode)) {
        console.warn(`🚨 DEV WARNING: HTTP status ${statusCode} should use HTTP_STATUS constants${context ? ` in ${context}` : ''}.`);
      }
    }
  }

  /**
   * Validates that API endpoints use constants
   */
  static validateApiEndpointUsage(endpoint: string, context?: string): void {
    if (!environment.production) {
      // Check if endpoint uses hardcoded patterns
      const hasHardcodedPattern = this.HARDCODED_API_PATTERNS.some(pattern => 
        pattern.test(endpoint)
      );
      
      if (hasHardcodedPattern) {
        console.warn(`🚨 DEV WARNING: Hardcoded API endpoint "${endpoint}" detected${context ? ` in ${context}` : ''}. Use API_ENDPOINTS constants.`);
      }
    }
  }

  /**
   * Scans a code string for hardcoded values (useful for build-time validation)
   */
  static scanCodeForHardcodedValues(code: string, filename?: string): string[] {
    if (environment.production) return [];

    const violations: string[] = [];

    // Check for hardcoded statuses
    this.HARDCODED_STATUS_PATTERNS.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) {
        violations.push(`Hardcoded status values found in ${filename || 'code'}: ${matches.join(', ')}`);
      }
    });

    // Check for hardcoded HTTP statuses
    this.HARDCODED_HTTP_PATTERNS.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) {
        violations.push(`Hardcoded HTTP status codes found in ${filename || 'code'}: ${matches.join(', ')}`);
      }
    });

    // Check for hardcoded API endpoints
    this.HARDCODED_API_PATTERNS.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) {
        violations.push(`Hardcoded API endpoints found in ${filename || 'code'}: ${matches.join(', ')}`);
      }
    });

    return violations;
  }

  /**
   * Runtime validator for submission status arrays
   */
  static validateStatusArray(statuses: string[], context?: string): void {
    if (!environment.production) {
      const validStatuses = Object.values(SUBMISSION_STATUS);
      const invalidStatuses = statuses.filter(status => !validStatuses.includes(status as SubmissionStatus));
      
      if (invalidStatuses.length > 0) {
        console.warn(`🚨 DEV WARNING: Invalid statuses in array${context ? ` (${context})` : ''}: ${invalidStatuses.join(', ')}`);
        console.warn('Use SUBMISSION_STATUS constants instead of hardcoded strings');
      }
    }
  }

  /**
   * Global development checker - can be called on app initialization
   */
  static initializeDevelopmentChecks(): void {
    if (!environment.production) {
      console.log('🔍 Development validation enabled');
      
      // Override console.warn to catch constant violations
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        if (args[0]?.includes?.('🚨 DEV WARNING')) {
          // Log to a separate validation log if needed
          this.logValidationViolation(args.join(' '));
        }
        originalWarn.apply(console, args);
      };

      // You can add more global checks here
      this.checkEnvironmentConfiguration();
    }
  }

  /**
   * Check environment configuration for consistency
   */
  private static checkEnvironmentConfiguration(): void {
    if (!environment.apiBaseUrl) {
      console.warn('🚨 DEV WARNING: API base URL not configured in environment');
    }

    if (!environment.production && typeof environment.production !== 'boolean') {
      console.warn('🚨 DEV WARNING: Production flag should be a boolean');
    }
  }

  /**
   * Log validation violations for analysis
   */
  private static logValidationViolation(message: string): void {
    // In a real app, you might want to send this to a logging service
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] VALIDATION: ${message}`;
    
    // Store in localStorage for development analysis
    const existingLogs = localStorage.getItem('dev-validation-logs') || '[]';
    const logs = JSON.parse(existingLogs);
    logs.push(logEntry);
    
    // Keep only last 100 entries
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    localStorage.setItem('dev-validation-logs', JSON.stringify(logs));
  }

  /**
   * Get all validation logs for review
   */
  static getValidationLogs(): string[] {
    if (environment.production) return [];
    const logs = localStorage.getItem('dev-validation-logs');
    return logs ? JSON.parse(logs) : [];
  }

  /**
   * Clear validation logs
   */
  static clearValidationLogs(): void {
    localStorage.removeItem('dev-validation-logs');
  }
}

/**
 * Decorator for component methods to validate status usage
 */
export function ValidateStatus(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  if (environment.production) return descriptor;

  const method = descriptor.value;
  descriptor.value = function (...args: any[]) {
    // Check if any arguments are status strings
    args.forEach((arg, index) => {
      if (typeof arg === 'string' && Object.values(SUBMISSION_STATUS).includes(arg as SubmissionStatus)) {
        DevValidation.validateStatusUsage(arg, `${target.constructor.name}.${propertyName}() arg[${index}]`);
      }
    });
    
    return method.apply(this, args);
  };
  
  return descriptor;
}

/**
 * Type guard for submission status
 */
export function isValidSubmissionStatus(status: string): status is SubmissionStatus {
  return Object.values(SUBMISSION_STATUS).includes(status as SubmissionStatus);
}

/**
 * Type guard for review action
 */
export function isValidReviewAction(action: string): action is ReviewAction {
  return Object.values(REVIEW_ACTIONS).includes(action as ReviewAction);
}

/**
 * Helper to safely get status display name
 */
export function getStatusDisplayName(status: string): string {
  if (!isValidSubmissionStatus(status)) {
    DevValidation.validateStatusUsage(status, 'getStatusDisplayName');
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  const statusMap: Record<SubmissionStatus, string> = {
    [SUBMISSION_STATUS.PENDING_REVIEW]: 'Pending Review',
    [SUBMISSION_STATUS.IN_PROGRESS]: 'In Progress',
    [SUBMISSION_STATUS.SHORTLISTED]: 'Shortlisted',
    [SUBMISSION_STATUS.NEEDS_REVISION]: 'Needs Revision',
    [SUBMISSION_STATUS.NEEDS_CHANGES]: 'Needs Changes',
    [SUBMISSION_STATUS.APPROVED]: 'Approved',
    [SUBMISSION_STATUS.ACCEPTED]: 'Accepted',
    [SUBMISSION_STATUS.REJECTED]: 'Rejected',
    [SUBMISSION_STATUS.PUBLISHED]: 'Published',
    [SUBMISSION_STATUS.DRAFT]: 'Draft',
    [SUBMISSION_STATUS.SUBMITTED]: 'Submitted',
    [SUBMISSION_STATUS.RESUBMITTED]: 'Resubmitted',
    [SUBMISSION_STATUS.ARCHIVED]: 'Archived'
  };

  return statusMap[status as SubmissionStatus] || status;
}