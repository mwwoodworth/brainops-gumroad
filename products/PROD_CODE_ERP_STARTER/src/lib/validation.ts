/**
 * Comprehensive Validation Library
 * Provides input validation for all forms across the application
 */

// Email validation
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
};

// Phone validation (US format)
export const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  const phoneRegex = /^\+?1?\d{10}$/;
  const formattedPhoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

  if (!phone) {
    return { valid: false, error: 'Phone number is required' };
  }

  const cleanPhone = phone.replace(/\D/g, '');

  if (cleanPhone.length < 10 || cleanPhone.length > 11) {
    return { valid: false, error: 'Please enter a valid 10-digit phone number' };
  }

  return { valid: true };
};

// ZIP code validation (US)
export const validateZipCode = (zip: string): { valid: boolean; error?: string } => {
  const zipRegex = /^\d{5}(-\d{4})?$/;

  if (!zip) {
    return { valid: false, error: 'ZIP code is required' };
  }

  if (!zipRegex.test(zip)) {
    return { valid: false, error: 'Please enter a valid ZIP code (12345 or 12345-6789)' };
  }

  return { valid: true };
};

// Currency validation
export const validateCurrency = (amount: string | number): { valid: boolean; error?: string } => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]/g, '')) : amount;

  if (isNaN(numAmount)) {
    return { valid: false, error: 'Please enter a valid amount' };
  }

  if (numAmount < 0) {
    return { valid: false, error: 'Amount cannot be negative' };
  }

  return { valid: true };
};

// Date validation
export const validateDate = (date: string, options?: {
  minDate?: Date;
  maxDate?: Date;
  allowPast?: boolean;
  allowFuture?: boolean;
}): { valid: boolean; error?: string } => {
  if (!date) {
    return { valid: false, error: 'Date is required' };
  }

  const dateObj = new Date(date);

  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: 'Please enter a valid date' };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (options?.minDate && dateObj < options.minDate) {
    return { valid: false, error: `Date must be after ${options.minDate.toLocaleDateString()}` };
  }

  if (options?.maxDate && dateObj > options.maxDate) {
    return { valid: false, error: `Date must be before ${options.maxDate.toLocaleDateString()}` };
  }

  if (options?.allowPast === false && dateObj < now) {
    return { valid: false, error: 'Date cannot be in the past' };
  }

  if (options?.allowFuture === false && dateObj > now) {
    return { valid: false, error: 'Date cannot be in the future' };
  }

  return { valid: true };
};

// Required field validation
export const validateRequired = (value: any, fieldName: string = 'Field'): { valid: boolean; error?: string } => {
  if (value === null || value === undefined || value === '' || (typeof value === 'string' && !value.trim())) {
    return { valid: false, error: `${fieldName} is required` };
  }

  return { valid: true };
};

// Length validation
export const validateLength = (value: string, options: {
  min?: number;
  max?: number;
  exact?: number;
  fieldName?: string;
}): { valid: boolean; error?: string } => {
  const fieldName = options.fieldName || 'Field';

  if (options.exact && value.length !== options.exact) {
    return { valid: false, error: `${fieldName} must be exactly ${options.exact} characters` };
  }

  if (options.min && value.length < options.min) {
    return { valid: false, error: `${fieldName} must be at least ${options.min} characters` };
  }

  if (options.max && value.length > options.max) {
    return { valid: false, error: `${fieldName} must be no more than ${options.max} characters` };
  }

  return { valid: true };
};

// Password validation
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  if (!/[!@#$%^&*]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*)' };
  }

  return { valid: true };
};

// URL validation
export const validateURL = (url: string): { valid: boolean; error?: string } => {
  if (!url) {
    return { valid: false, error: 'URL is required' };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Please enter a valid URL' };
  }
};

// Number range validation
export const validateNumberRange = (value: string | number, options: {
  min?: number;
  max?: number;
  integer?: boolean;
  fieldName?: string;
}): { valid: boolean; error?: string } => {
  const fieldName = options.fieldName || 'Value';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }

  if (options.integer && !Number.isInteger(numValue)) {
    return { valid: false, error: `${fieldName} must be a whole number` };
  }

  if (options.min !== undefined && numValue < options.min) {
    return { valid: false, error: `${fieldName} must be at least ${options.min}` };
  }

  if (options.max !== undefined && numValue > options.max) {
    return { valid: false, error: `${fieldName} must be no more than ${options.max}` };
  }

  return { valid: true };
};

// Form validation helper
export class FormValidator {
  private errors: Map<string, string> = new Map();

  clear() {
    this.errors.clear();
  }

  validateField(fieldName: string, value: any, validators: Array<(value: any) => { valid: boolean; error?: string }>) {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.valid) {
        this.errors.set(fieldName, result.error || 'Invalid value');
        return false;
      }
    }

    this.errors.delete(fieldName);
    return true;
  }

  getError(fieldName: string): string | undefined {
    return this.errors.get(fieldName);
  }

  hasErrors(): boolean {
    return this.errors.size > 0;
  }

  getAllErrors(): Record<string, string> {
    return Object.fromEntries(this.errors);
  }
}

// Customer form validation
export const validateCustomerForm = (data: any): { valid: boolean; errors: Record<string, string> } => {
  const validator = new FormValidator();

  validator.validateField('name', data.name, [
    (v) => validateRequired(v, 'Company name'),
    (v) => validateLength(v, { min: 2, max: 100, fieldName: 'Company name' })
  ]);

  validator.validateField('email', data.email, [
    (v) => validateRequired(v, 'Email'),
    validateEmail
  ]);

  validator.validateField('phone', data.phone, [
    (v) => validateRequired(v, 'Phone'),
    validatePhone
  ]);

  if (data.zip) {
    validator.validateField('zip', data.zip, [validateZipCode]);
  }

  return {
    valid: !validator.hasErrors(),
    errors: validator.getAllErrors()
  };
};

// Job form validation
export const validateJobForm = (data: any): { valid: boolean; errors: Record<string, string> } => {
  const validator = new FormValidator();

  validator.validateField('customer_id', data.customer_id, [
    (v) => validateRequired(v, 'Customer')
  ]);

  validator.validateField('job_type', data.job_type, [
    (v) => validateRequired(v, 'Job type')
  ]);

  validator.validateField('property_address', data.property_address, [
    (v) => validateRequired(v, 'Property address'),
    (v) => validateLength(v, { min: 5, max: 200, fieldName: 'Property address' })
  ]);

  if (data.scheduled_date) {
    validator.validateField('scheduled_date', data.scheduled_date, [
      (v) => validateDate(v, { allowPast: false })
    ]);
  }

  if (data.estimated_cost) {
    validator.validateField('estimated_cost', data.estimated_cost, [
      validateCurrency
    ]);
  }

  return {
    valid: !validator.hasErrors(),
    errors: validator.getAllErrors()
  };
};

// Invoice form validation
export const validateInvoiceForm = (data: any): { valid: boolean; errors: Record<string, string> } => {
  const validator = new FormValidator();

  validator.validateField('customer_id', data.customer_id, [
    (v) => validateRequired(v, 'Customer')
  ]);

  validator.validateField('invoice_date', data.invoice_date, [
    (v) => validateRequired(v, 'Invoice date'),
    (v) => validateDate(v)
  ]);

  validator.validateField('due_date', data.due_date, [
    (v) => validateRequired(v, 'Due date'),
    (v) => validateDate(v, { minDate: new Date(data.invoice_date) })
  ]);

  validator.validateField('amount', data.amount, [
    (v) => validateRequired(v, 'Amount'),
    validateCurrency,
    (v) => validateNumberRange(v, { min: 0.01, fieldName: 'Amount' })
  ]);

  return {
    valid: !validator.hasErrors(),
    errors: validator.getAllErrors()
  };
};

// Employee form validation
export const validateEmployeeForm = (data: any): { valid: boolean; errors: Record<string, string> } => {
  const validator = new FormValidator();

  validator.validateField('first_name', data.first_name, [
    (v) => validateRequired(v, 'First name'),
    (v) => validateLength(v, { min: 2, max: 50, fieldName: 'First name' })
  ]);

  validator.validateField('last_name', data.last_name, [
    (v) => validateRequired(v, 'Last name'),
    (v) => validateLength(v, { min: 2, max: 50, fieldName: 'Last name' })
  ]);

  validator.validateField('email', data.email, [
    (v) => validateRequired(v, 'Email'),
    validateEmail
  ]);

  validator.validateField('phone', data.phone, [
    (v) => validateRequired(v, 'Phone'),
    validatePhone
  ]);

  validator.validateField('hire_date', data.hire_date, [
    (v) => validateRequired(v, 'Hire date'),
    (v) => validateDate(v, { allowFuture: false })
  ]);

  if (data.hourly_rate) {
    validator.validateField('hourly_rate', data.hourly_rate, [
      validateCurrency,
      (v) => validateNumberRange(v, { min: 0, max: 1000, fieldName: 'Hourly rate' })
    ]);
  }

  return {
    valid: !validator.hasErrors(),
    errors: validator.getAllErrors()
  };
};

// Export all validators for easy import
export const Validators = {
  email: validateEmail,
  phone: validatePhone,
  zipCode: validateZipCode,
  currency: validateCurrency,
  date: validateDate,
  required: validateRequired,
  length: validateLength,
  password: validatePassword,
  url: validateURL,
  numberRange: validateNumberRange,
  forms: {
    customer: validateCustomerForm,
    job: validateJobForm,
    invoice: validateInvoiceForm,
    employee: validateEmployeeForm
  }
};

export default Validators;