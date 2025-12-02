export type TemplateCategory = 'proposal' | 'contract' | 'invoice' | 'report' | 'change_order' | 'closeout'

export interface TemplateSection {
  title: string
  description?: string
  bullets?: string[]
  tableHeaders?: string[]
  tableRows?: string[][]
  body?: string
}

export interface DocumentTemplateDefinition {
  slug: string
  name: string
  category: TemplateCategory
  templateType: 'document' | 'estimate' | 'invoice' | 'contract' | 'report'
  summary: string
  variables: string[]
  sections: TemplateSection[]
  recommendedAttachments?: string[]
  automationHooks?: string[]
}

export const DOCUMENT_TEMPLATE_LIBRARY: DocumentTemplateDefinition[] = [
  {
    slug: 'premium-roofing-proposal',
    name: 'Premium Roofing Proposal',
    category: 'proposal',
    templateType: 'document',
    summary:
      'A high-impact proposal format that pairs scope clarity with risk disclosures, value differentiators, and milestone-based pricing.',
    variables: [
      'customer_name',
      'project_address',
      'proposal_date',
      'estimator_name',
      'project_scope',
      'base_price',
      'allowance_summary',
      'lead_time_weeks',
      'warranty_years',
      'acceptance_deadline',
    ],
    sections: [
      {
        title: 'Executive Overview',
        body:
          'Weathercraft proposes to deliver a comprehensive roofing solution for {{customer_name}} at {{project_address}}. Our team combines AI-driven analysis with certified crews to eliminate change-order surprises and accelerate closeout.',
      },
      {
        title: 'Scope of Work',
        description: 'Core deliverables aligned to CSI divisions.',
        bullets: [
          '{{project_scope}}',
          'Protection of landscaping, hardscape, and adjacent structures',
          'Daily production reporting with photo documentation',
          'Final QA walkthrough with client sign-off',
        ],
      },
      {
        title: 'Investment Breakdown',
        tableHeaders: ['Phase', 'Description', 'Value'],
        tableRows: [
          ['Base Contract', 'Primary scope inclusive of all labor and materials', '${{base_price}}'],
          ['Allowances', 'Budgetary items subject to field verification', '{{allowance_summary}}'],
          ['Optional Enhancements', 'Strategic upgrades to extend lifecycle', 'Available upon request'],
        ],
      },
      {
        title: 'Risk + Compliance Controls',
        description: 'Weathercraft’s integrated platform actively monitors:',
        bullets: [
          'Weather delays and re-sequencing using AI-driven forecasts',
          'Permit milestones, inspections, and sign-offs',
          'Safety compliance, daily toolbox talks, and incident tracking',
          'Warranty traceability with serialized materials and photos',
        ],
      },
      {
        title: 'Project Timeline',
        tableHeaders: ['Milestone', 'Forecasted Date'],
        tableRows: [
          ['Material Procurement + QA', 'Project kickoff + 5 business days'],
          ['Mobilization + Tear-off', 'Week 1'],
          ['Installation Complete', 'Week 2'],
          ['Final Inspection + Turnover', 'Week 3'],
        ],
      },
      {
        title: 'Commercial Terms',
        bullets: [
          `Proposal valid until {{acceptance_deadline}}`,
          'Progress billing: 30% mobilization / 40% mid-project / 30% at acceptance',
          'Standard {{warranty_years}}-year workmanship warranty with optional extended coverage',
          'Weathercraft maintains $10M aggregate insurance and provides additional insured certificates on request',
        ],
      },
      {
        title: 'Authorization',
        body:
          'To authorize this project, sign electronically via the Weathercraft portal or reply “APPROVED” to this proposal. A formal contract will route automatically with DocuSign compliance.',
      },
    ],
    recommendedAttachments: [
      'Detailed estimate with alternates',
      'Photo log or drone capture',
      'Insurance certificates',
      'Warranty brochure',
    ],
    automationHooks: [
      'crm.opportunity_stage=Proposal Delivered',
      'projects.auto_create_on_accept',
      'documents.request_signature',
    ],
  },
  {
    slug: 'master-service-agreement',
    name: 'Master Service Agreement',
    category: 'contract',
    templateType: 'contract',
    summary:
      'Standardized umbrella MSA that pairs risk allocation, service levels, and escalation pathways for repeat work.',
    variables: [
      'client_legal_name',
      'effective_date',
      'term_months',
      'primary_contact',
      'service_categories',
      'response_time_hours',
      'insurance_limits',
      'jurisdiction',
    ],
    sections: [
      {
        title: 'Parties',
        body:
          'This Master Service Agreement (“Agreement”) is entered into as of {{effective_date}} between Weathercraft, LLC (“Contractor”) and {{client_legal_name}} (“Client”).',
      },
      {
        title: 'Scope + Service Levels',
        bullets: [
          'Services covered: {{service_categories}}',
          'Priority matrix with {{response_time_hours}} hour emergency response SLA',
          'All tasks executed through Weathercraft ERP with timestamped audit trail',
        ],
      },
      {
        title: 'Commercial Framework',
        bullets: [
          'Rate schedule and escalation matrix attached as Exhibit A',
          'Annual adjustment tied to ENR Construction Cost Index cap of 4%',
          'Invoices due Net 30 with ACH preference (portal autopay supported)',
        ],
      },
      {
        title: 'Insurance + Risk',
        bullets: [
          'Contractor maintains insurance coverage of {{insurance_limits}}',
          'Client named as additional insured for ongoing and completed operations',
          'Subcontractors subject to identical compliance via digital onboarding',
        ],
      },
      {
        title: 'Term + Termination',
        bullets: [
          'Initial term {{term_months}} months with auto-renewal unless notice provided 30 days prior',
          'Termination for cause upon written notice and cure opportunity',
          'Convenience termination subject to demobilization reimbursement',
        ],
      },
      {
        title: 'Dispute Resolution',
        body:
          'Any dispute arising from this Agreement shall be resolved through escalation to executive sponsors, followed by mediation, and if unresolved, binding arbitration in {{jurisdiction}}.',
      },
      {
        title: 'Signatures',
        body:
          'Authorized representatives of both parties agree to the terms of this Agreement. Digital execution via DocuSign maintains full legal effect.',
      },
    ],
    recommendedAttachments: [
      'Exhibit A – Rate Schedule',
      'Exhibit B – Service Level Matrix',
      'Certificate of Insurance',
      'W-9 and vendor onboarding package',
    ],
    automationHooks: [
      'contracts.generate_docu_sign',
      'vendors.sync_to_ap',
      'projects.enable_callout_template',
    ],
  },
  {
    slug: 'progress-invoice',
    name: 'Progress Billing Invoice',
    category: 'invoice',
    templateType: 'invoice',
    summary:
      'Milestone-based invoice format with AI-powered variance tracking and lien compliance reminders.',
    variables: [
      'invoice_number',
      'invoice_date',
      'project_name',
      'project_address',
      'po_number',
      'billing_period_start',
      'billing_period_end',
      'current_amount',
      'previous_billed',
      'retainage_percent',
      'retainage_hold',
      'total_due',
    ],
    sections: [
      {
        title: 'Project Summary',
        tableHeaders: ['Project', 'Location', 'PO / Reference'],
        tableRows: [
          ['{{project_name}}', '{{project_address}}', '{{po_number}}'],
        ],
      },
      {
        title: 'Billing Summary',
        tableHeaders: ['Description', 'Amount'],
        tableRows: [
          ['Current billing period {{billing_period_start}} – {{billing_period_end}}', '${{current_amount}}'],
          ['Previously billed', '${{previous_billed}}'],
          ['Current retainage {{retainage_percent}}%', '${{retainage_hold}}'],
          ['Total due this invoice', '${{total_due}}'],
        ],
      },
      {
        title: 'Supporting Detail',
        bullets: [
          'Progress photographs and daily production logs attached',
          'Certified payroll and lien waivers generated automatically upon payment',
          'Variance analysis available in Weathercraft project dashboard',
        ],
      },
      {
        title: 'Payment Instructions',
        bullets: [
          'ACH routing included in attached remittance form',
          'Credit card payments accepted via secure portal (3% fee)',
          'Please email remittance to ar@weathercraft.net',
        ],
      },
    ],
    recommendedAttachments: [
      'Schedule of values export',
      'Daily reports and photos',
      'Conditional lien waiver template',
    ],
    automationHooks: [
      'finance.sync_to_gl',
      'documents.generate_lien_waiver',
      'notifications.route_to_project_manager',
    ],
  },
  {
    slug: 'closeout-report',
    name: 'Project Closeout Report',
    category: 'closeout',
    templateType: 'report',
    summary:
      'Client-facing wrap-up that captures warranties, punch list resolution, and lifecycle maintenance recommendations.',
    variables: [
      'project_name',
      'project_address',
      'project_manager',
      'substantial_completion_date',
      'final_completion_date',
      'warranty_expiration',
      'maintenance_schedule',
    ],
    sections: [
      {
        title: 'Project Snapshot',
        tableHeaders: ['Project', 'Location', 'PM'],
        tableRows: [
          ['{{project_name}}', '{{project_address}}', '{{project_manager}}'],
        ],
      },
      {
        title: 'Milestones',
        tableHeaders: ['Milestone', 'Date'],
        tableRows: [
          ['Substantial Completion', '{{substantial_completion_date}}'],
          ['Final Completion', '{{final_completion_date}}'],
          ['Warranty Expiration', '{{warranty_expiration}}'],
        ],
      },
      {
        title: 'Deliverables Provided',
        bullets: [
          'As-built drawings and installation photos (digital archive)',
          'Warranty certificates and manufacturer registration confirmations',
          'Maintenance playbook: {{maintenance_schedule}}',
          'Emergency contact tree with escalation paths',
        ],
      },
      {
        title: 'AI Recommendations',
        description:
          'Weathercraft AI reviewed the project dataset and recommends the following proactive measures:',
        bullets: [
          'Schedule infrared moisture scan at 12 months to benchmark performance',
          'Implement quarterly drain inspections to maintain warranty coverage',
          'Activate Weathercraft Pulse monitoring for live leak detection',
        ],
      },
      {
        title: 'Acceptance',
        body:
          'Please review and acknowledge receipt via the Weathercraft portal. Our team remains available for seasonal inspections, emergency service, and future capital planning.',
      },
    ],
    recommendedAttachments: [
      'Warranty documentation bundle',
      'Training sign-off sheets',
      'Final inspection reports',
      'O&M manual',
    ],
    automationHooks: [
      'documents.publish_to_client_portal',
      'maintenance.schedule_recurring_visits',
      'crm.create_referral_campaign',
    ],
  },
  {
    slug: 'bid-log-report',
    name: 'Bid Log + Ranking Report',
    category: 'report',
    templateType: 'report',
    summary:
      'Executive dashboard-ready format summarizing inbound bid invites, probability of award, and required actions.',
    variables: [
      'report_date',
      'total_bids',
      'high_priority_count',
      'avg_win_probability',
      'team_lead',
    ],
    sections: [
      {
        title: 'Portfolio Snapshot',
        tableHeaders: ['Metric', 'Value'],
        tableRows: [
          ['Report Date', '{{report_date}}'],
          ['Active Bids', '{{total_bids}}'],
          ['High Priority', '{{high_priority_count}}'],
          ['Average Win Probability', '{{avg_win_probability}}%'],
        ],
      },
      {
        title: 'Action Required',
        description: 'Prioritized bids that require executive review:',
        bullets: [
          'See attached AI triage for risk, margin, and resource impact',
          'Assignments auto-synced to estimating Kanban with due reminders',
        ],
      },
      {
        title: 'Next Steps',
        bullets: [
          'Confirm team capacity for top-ranked bids',
          'Trigger clarifications or RFI from centralized communications hub',
          'Escalate sponsorship strategy for strategic accounts',
        ],
      },
    ],
    recommendedAttachments: [
      'Bid intake register (CSV)',
      'AI variance + risk notes',
      'Resource plan snapshot',
    ],
    automationHooks: [
      'analytics.publish_to_command_center',
      'notifications.alert_estimating_lead',
      'crm.sync_bid_status',
    ],
  },
]

export function composeTemplateContent(template: DocumentTemplateDefinition): string {
  const parts: string[] = []

  template.sections.forEach(section => {
    parts.push(`# ${section.title}`)
    if (section.description) {
      parts.push(section.description)
    }
    if (section.body) {
      parts.push(section.body)
    }
    if (section.bullets && section.bullets.length > 0) {
      parts.push('')
      section.bullets.forEach(item => {
        parts.push(`- ${item}`)
      })
    }
    if (section.tableHeaders && section.tableRows) {
      parts.push('')
      const headerRow = `| ${section.tableHeaders.join(' | ')} |`
      const dividerRow = `| ${section.tableHeaders.map(() => '---').join(' | ')} |`
      parts.push(headerRow)
      parts.push(dividerRow)
      section.tableRows.forEach(row => {
        parts.push(`| ${row.join(' | ')} |`)
      })
    }
    parts.push('\n')
  })

  parts.push('---')

  if (template.recommendedAttachments?.length) {
    parts.push('## Recommended Attachments')
    template.recommendedAttachments.forEach(item => parts.push(`- ${item}`))
    parts.push('\n')
  }

  if (template.automationHooks?.length) {
    parts.push('## Automation Hooks')
    template.automationHooks.forEach(item => parts.push(`- ${item}`))
    parts.push('\n')
  }

  return parts.join('\n').trim()
}

export function findTemplateBySlug(slug: string): DocumentTemplateDefinition | undefined {
  return DOCUMENT_TEMPLATE_LIBRARY.find(template => template.slug === slug)
}
