/**
 * Custom Fields System - Enterprise-Grade Flexibility
 * Allows unlimited custom fields on any module (matching QuickBooks 45+ field capacity)
 */

export type FieldType = 'text' | 'number' | 'date' | 'datetime' | 'dropdown' | 'checkbox' | 'email' | 'phone' | 'url' | 'textarea' | 'currency';

export type ModuleName =
  | 'customers'
  | 'jobs'
  | 'estimates'
  | 'invoices'
  | 'employees'
  | 'inventory'
  | 'equipment'
  | 'vendors'
  | 'projects'
  | 'properties';

export interface CustomField {
  id: string;
  tenant_id: string;
  module: ModuleName;
  field_name: string;          // Database column name (snake_case)
  field_label: string;          // Display label
  field_type: FieldType;
  is_required: boolean;
  is_searchable: boolean;
  is_reportable: boolean;
  dropdown_options?: string[];  // For dropdown type
  default_value?: any;
  validation_pattern?: string;  // Regex for validation
  help_text?: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CustomFieldValue {
  id: string;
  custom_field_id: string;
  record_id: string;           // ID of the customer/job/etc
  value: any;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

// Helper to validate custom field value
export function validateCustomFieldValue(field: CustomField, value: any): { valid: boolean; error?: string } {
  if (field.is_required && (value === null || value === undefined || value === '')) {
    return { valid: false, error: `${field.field_label} is required` };
  }

  if (!value) return { valid: true }; // Optional field, no value

  switch (field.field_type) {
    case 'number':
    case 'currency':
      if (isNaN(Number(value))) {
        return { valid: false, error: `${field.field_label} must be a number` };
      }
      break;

    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { valid: false, error: `${field.field_label} must be a valid email` };
      }
      break;

    case 'phone':
      const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
      if (!phoneRegex.test(value)) {
        return { valid: false, error: `${field.field_label} must be a valid phone number` };
      }
      break;

    case 'url':
      try {
        new URL(value);
      } catch {
        return { valid: false, error: `${field.field_label} must be a valid URL` };
      }
      break;

    case 'dropdown':
      if (field.dropdown_options && !field.dropdown_options.includes(value)) {
        return { valid: false, error: `${field.field_label} must be one of: ${field.dropdown_options.join(', ')}` };
      }
      break;
  }

  // Custom validation pattern
  if (field.validation_pattern) {
    const regex = new RegExp(field.validation_pattern);
    if (!regex.test(String(value))) {
      return { valid: false, error: `${field.field_label} format is invalid` };
    }
  }

  return { valid: true };
}

// Helper to format value for display
export function formatCustomFieldValue(field: CustomField, value: any): string {
  if (value === null || value === undefined) return '-';

  switch (field.field_type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

    case 'date':
      return new Date(value).toLocaleDateString();

    case 'datetime':
      return new Date(value).toLocaleString();

    case 'checkbox':
      return value ? 'Yes' : 'No';

    default:
      return String(value);
  }
}
