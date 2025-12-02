/**
 * State-Specific Invoice Compliance
 * Based on Perplexity research: Invoice legal requirements by state
 *
 * Research findings:
 * - Different states have different payment term requirements
 * - Retainage limits vary by state
 * - Lien rights disclosures required in many states
 * - Tax calculation varies
 */

export interface StateInvoiceRequirements {
  state: string;
  stateCode: string;
  defaultPaymentTerms: number; // days
  maxRetainage: number; // percentage (e.g., 10 = 10%)
  lienRightsRequired: boolean;
  lienRightsText?: string;
  preliminaryNoticeRequired: boolean;
  preliminaryNoticeDays?: number; // days before work starts
  taxRate: number; // percentage
  specialRequirements?: string[];
}

/**
 * State-specific invoice compliance rules
 * Source: Perplexity research on construction invoice standards
 */
export const STATE_INVOICE_REQUIREMENTS: Record<string, StateInvoiceRequirements> = {
  CO: {
    state: 'Colorado',
    stateCode: 'CO',
    defaultPaymentTerms: 10,
    maxRetainage: 5,
    lienRightsRequired: true,
    lienRightsText:
      'NOTICE: UNDER COLORADO LAW, LABORERS, MATERIAL SUPPLIERS, AND OTHER PERSONS WHO PROVIDE SERVICES OR MATERIALS FOR THE IMPROVEMENT OF REAL PROPERTY HAVE THE RIGHT TO RECORD A LIEN AGAINST THE PROPERTY IF THEY ARE NOT PAID. IF YOUR PROPERTY IS SUBJECT TO A LIEN, YOU MAY BE FORCED TO PAY THE LIEN AMOUNT BEFORE TITLE TO THE PROPERTY CAN PASS.',
    preliminaryNoticeRequired: false,
    taxRate: 2.9,
    specialRequirements: [
      'Retainage must be released within 60 days of substantial completion',
      'Invoice must include contractor license number',
    ],
  },

  CA: {
    state: 'California',
    stateCode: 'CA',
    defaultPaymentTerms: 20,
    maxRetainage: 10,
    lienRightsRequired: true,
    lienRightsText:
      "NOTICE TO PROPERTY OWNER: IF BILLS FOR LABOR, SERVICES, EQUIPMENT, OR MATERIALS REMAIN UNPAID, A MECHANIC'S LIEN LEADING TO THE LOSS, THROUGH COURT FORECLOSURE PROCEEDINGS, OF ALL OR PART OF YOUR PROPERTY BEING SO IMPROVED MAY BE PLACED AGAINST THE PROPERTY EVEN THOUGH YOU HAVE PAID YOUR CONTRACTOR IN FULL. To protect yourself, you may (1) require the general contractor to furnish a signed release by the person or firm supplying any services, labor, materials, or equipment; or (2) any other alternative for your protection.",
    preliminaryNoticeRequired: true,
    preliminaryNoticeDays: 20,
    taxRate: 7.25,
    specialRequirements: [
      'Contractor license number required on all invoices',
      'Stop payment notice may be filed',
      'Must provide preliminary 20-day notice to property owner',
    ],
  },

  TX: {
    state: 'Texas',
    stateCode: 'TX',
    defaultPaymentTerms: 15,
    maxRetainage: 10,
    lienRightsRequired: true,
    lienRightsText:
      'KNOW ALL PERSONS BY THESE PRESENTS: IF BILLS FOR LABOR, SERVICES, MATERIALS, OR EQUIPMENT PROVIDED FOR THIS PROJECT ARE NOT PAID IN FULL WHEN DUE, A LIEN MAY BE FILED AGAINST THE PROPERTY. IF THE LIEN IS PROPERLY PERFECTED, IT COULD RESULT IN THE LOSS OF THE PROPERTY THROUGH FORECLOSURE. This invoice includes a notice to the owner that if bills for labor or materials remain unpaid, a lien may be filed against the property.',
    preliminaryNoticeRequired: false,
    taxRate: 6.25,
    specialRequirements: [
      'Retainage must be paid within 30 days after substantial completion',
      'Invoice must be sent within 90 days of completion to preserve lien rights',
    ],
  },

  FL: {
    state: 'Florida',
    stateCode: 'FL',
    defaultPaymentTerms: 45,
    maxRetainage: 10,
    lienRightsRequired: true,
    lienRightsText:
      'A LIEN MAY BE FILED FOR THE VALUE OF LABOR, MATERIALS, OR SERVICES PROVIDED. IF YOU PAY YOUR CONTRACTOR IN FULL AND DO NOT RECEIVE A CONDITIONAL OR UNCONDITIONAL RELEASE OF LIEN FROM YOUR CONTRACTOR, ANY UNPAID SUBCONTRACTORS OR MATERIAL SUPPLIERS MAY FILE A LIEN AGAINST YOUR PROPERTY, AND YOU MAY BE FORCED TO PAY FOR THE SAME MATERIALS OR SERVICES TWICE.',
    preliminaryNoticeRequired: true,
    preliminaryNoticeDays: 45,
    taxRate: 6.0,
    specialRequirements: [
      'Notice to owner required within 45 days of first furnishing labor/materials',
      'Final payment affidavit required before final payment',
      'Contractor license number required',
    ],
  },

  WA: {
    state: 'Washington',
    stateCode: 'WA',
    defaultPaymentTerms: 30,
    maxRetainage: 5,
    lienRightsRequired: true,
    lienRightsText:
      'NOTICE TO PROPERTY OWNER: AS REQUIRED BY THE LIEN LAW OF THE STATE OF WASHINGTON, CHAPTER 60.04 RCW, THIS IS TO INFORM YOU THAT A LIEN MAY BE FILED AGAINST YOUR PROPERTY FOR LABOR, MATERIALS, OR EQUIPMENT PROVIDED FOR THE IMPROVEMENT OF YOUR PROPERTY. EVEN IF YOU PAY YOUR CONTRACTOR IN FULL, YOUR PROPERTY MAY BE SUBJECT TO A LIEN UNLESS YOU (1) REQUIRE THE CONTRACTOR TO PROVIDE A LIEN RELEASE WAIVER UPON PAYMENT, OR (2) OBTAIN A CONDITIONAL WAIVER OF LIEN UPON PROGRESS PAYMENT.',
    preliminaryNoticeRequired: false,
    taxRate: 6.5,
    specialRequirements: [
      'Retainage on public projects limited to 5%',
      'Contractor registration number required',
      'Prevailing wage may apply on public projects',
    ],
  },

  // Additional states can be added as needed
  DEFAULT: {
    state: 'Default',
    stateCode: 'DEFAULT',
    defaultPaymentTerms: 30,
    maxRetainage: 10,
    lienRightsRequired: false,
    preliminaryNoticeRequired: false,
    taxRate: 0,
    specialRequirements: [],
  },
};

/**
 * Get invoice requirements for a state
 */
export function getStateRequirements(stateCode: string): StateInvoiceRequirements {
  return STATE_INVOICE_REQUIREMENTS[stateCode.toUpperCase()] || STATE_INVOICE_REQUIREMENTS.DEFAULT;
}

/**
 * Validate invoice compliance
 */
export interface InvoiceComplianceValidation {
  compliant: boolean;
  issues: string[];
  warnings: string[];
  requiredFields: string[];
  lienNotice?: string;
}

export function validateInvoiceCompliance(
  invoice: {
    state: string;
    paymentTerms?: number;
    retainage?: number;
    taxRate?: number;
    licenseNumber?: string;
    noticeProvided?: boolean;
  }
): InvoiceComplianceValidation {
  const requirements = getStateRequirements(invoice.state);
  const issues: string[] = [];
  const warnings: string[] = [];
  const requiredFields: string[] = [];

  // Check payment terms
  if (invoice.paymentTerms && invoice.paymentTerms < requirements.defaultPaymentTerms) {
    warnings.push(
      `Payment terms of ${invoice.paymentTerms} days are less than state default of ${requirements.defaultPaymentTerms} days`
    );
  }

  // Check retainage
  if (invoice.retainage && invoice.retainage > requirements.maxRetainage) {
    issues.push(
      `Retainage of ${invoice.retainage}% exceeds state maximum of ${requirements.maxRetainage}%`
    );
  }

  // Check lien rights notice
  if (requirements.lienRightsRequired) {
    requiredFields.push('Lien Rights Notice');
  }

  // Check preliminary notice
  if (requirements.preliminaryNoticeRequired && !invoice.noticeProvided) {
    warnings.push(
      `${requirements.state} requires preliminary notice ${requirements.preliminaryNoticeDays} days before work starts`
    );
  }

  // Check license number
  if (requirements.specialRequirements?.some(req => req.includes('license number'))) {
    if (!invoice.licenseNumber) {
      issues.push(`${requirements.state} requires contractor license number on all invoices`);
      requiredFields.push('Contractor License Number');
    }
  }

  // Check tax rate
  if (invoice.taxRate !== undefined && invoice.taxRate !== requirements.taxRate) {
    warnings.push(
      `Tax rate of ${invoice.taxRate}% differs from ${requirements.state} rate of ${requirements.taxRate}%`
    );
  }

  return {
    compliant: issues.length === 0,
    issues,
    warnings,
    requiredFields,
    lienNotice: requirements.lienRightsText,
  };
}

/**
 * Calculate invoice totals with state tax
 */
export function calculateInvoiceTotals(
  stateCode: string,
  subtotal: number,
  retainage?: number
): {
  subtotal: number;
  retainageAmount: number;
  subtotalAfterRetainage: number;
  tax: number;
  total: number;
  taxRate: number;
} {
  const requirements = getStateRequirements(stateCode);

  const retainagePercent = retainage || 0;
  const retainageAmount = subtotal * (retainagePercent / 100);
  const subtotalAfterRetainage = subtotal - retainageAmount;
  const tax = subtotalAfterRetainage * (requirements.taxRate / 100);
  const total = subtotalAfterRetainage + tax;

  return {
    subtotal,
    retainageAmount,
    subtotalAfterRetainage,
    tax,
    total,
    taxRate: requirements.taxRate,
  };
}

/**
 * Generate compliant invoice footer text
 */
export function generateInvoiceFooter(stateCode: string): string {
  const requirements = getStateRequirements(stateCode);
  const parts: string[] = [];

  if (requirements.lienRightsText) {
    parts.push(requirements.lienRightsText);
  }

  if (requirements.specialRequirements && requirements.specialRequirements.length > 0) {
    parts.push('\n\nADDITIONAL REQUIREMENTS:');
    requirements.specialRequirements.forEach(req => {
      parts.push(`• ${req}`);
    });
  }

  return parts.join('\n');
}
