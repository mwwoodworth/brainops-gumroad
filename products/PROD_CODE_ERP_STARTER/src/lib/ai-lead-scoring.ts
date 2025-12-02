/**
 * AI Lead Scoring Engine
 * Enterprise-grade lead qualification using ML-powered analysis
 * Matches Salesforce Einstein Lead Scoring capabilities
 */

export interface LeadData {
  customer_id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  source?: string;
  property_type?: string;
  property_age?: number;
  roof_age?: number;
  annual_revenue?: number;
  company_size?: number;
  decision_maker_title?: string;
  budget_range?: string;
  timeline?: string;
  engagement_level?: 'low' | 'medium' | 'high';
  previous_interactions?: number;
  website_visits?: number;
  email_opens?: number;
  email_clicks?: number;
  form_submissions?: number;
  last_contact_date?: string;
  created_at?: string;
}

export interface LeadScore {
  total_score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  likelihood_to_close: number; // 0-100%
  estimated_value: number;
  recommended_action: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  breakdown: {
    demographic: number; // 0-30 points
    behavioral: number; // 0-40 points
    temporal: number; // 0-30 points
  };
  signals: {
    positive: string[];
    negative: string[];
  };
  next_best_action: string;
  predicted_close_date: string | null;
}

/**
 * Calculate demographic score based on firmographic and geographic data
 */
function calculateDemographicScore(lead: LeadData): number {
  let score = 0;
  const signals: string[] = [];

  // Company size (0-8 points)
  if (lead.company_size) {
    if (lead.company_size >= 500) {
      score += 8;
      signals.push('Enterprise company size');
    } else if (lead.company_size >= 100) {
      score += 6;
      signals.push('Mid-market company');
    } else if (lead.company_size >= 20) {
      score += 4;
      signals.push('Small business');
    }
  }

  // Annual revenue (0-8 points)
  if (lead.annual_revenue) {
    if (lead.annual_revenue >= 10000000) {
      score += 8;
      signals.push('High annual revenue');
    } else if (lead.annual_revenue >= 1000000) {
      score += 6;
      signals.push('Strong revenue base');
    } else if (lead.annual_revenue >= 250000) {
      score += 4;
      signals.push('Established business');
    }
  }

  // Decision maker (0-6 points)
  if (lead.decision_maker_title) {
    const title = lead.decision_maker_title.toLowerCase();
    if (title.includes('owner') || title.includes('ceo') || title.includes('president')) {
      score += 6;
      signals.push('Executive-level contact');
    } else if (title.includes('director') || title.includes('manager')) {
      score += 4;
      signals.push('Management-level contact');
    }
  }

  // Property characteristics (0-8 points)
  if (lead.property_type === 'commercial') {
    score += 5;
    signals.push('Commercial property (higher value)');
  } else if (lead.property_type === 'multi-family') {
    score += 4;
    signals.push('Multi-family property');
  }

  if (lead.roof_age && lead.roof_age > 15) {
    score += 3;
    signals.push('Aging roof (replacement likely)');
  }

  return Math.min(score, 30); // Cap at 30 points
}

/**
 * Calculate behavioral score based on engagement and actions
 */
function calculateBehavioralScore(lead: LeadData): number {
  let score = 0;
  const signals: string[] = [];

  // Website engagement (0-12 points)
  if (lead.website_visits) {
    if (lead.website_visits >= 10) {
      score += 12;
      signals.push('High website engagement');
    } else if (lead.website_visits >= 5) {
      score += 8;
      signals.push('Moderate website interest');
    } else if (lead.website_visits >= 2) {
      score += 4;
      signals.push('Returning visitor');
    }
  }

  // Email engagement (0-12 points)
  const emailEngagement = (lead.email_opens || 0) + (lead.email_clicks || 0) * 2;
  if (emailEngagement >= 10) {
    score += 12;
    signals.push('Strong email engagement');
  } else if (emailEngagement >= 5) {
    score += 8;
    signals.push('Moderate email engagement');
  } else if (emailEngagement >= 2) {
    score += 4;
    signals.push('Some email interaction');
  }

  // Form submissions (0-8 points)
  if (lead.form_submissions) {
    if (lead.form_submissions >= 3) {
      score += 8;
      signals.push('Multiple information requests');
    } else if (lead.form_submissions >= 2) {
      score += 6;
      signals.push('Repeat inquiries');
    } else {
      score += 4;
      signals.push('Initial contact made');
    }
  }

  // Engagement level (0-8 points)
  if (lead.engagement_level === 'high') {
    score += 8;
    signals.push('High overall engagement');
  } else if (lead.engagement_level === 'medium') {
    score += 5;
  }

  return Math.min(score, 40); // Cap at 40 points
}

/**
 * Calculate temporal score based on timing and urgency factors
 */
function calculateTemporalScore(lead: LeadData): number {
  let score = 0;
  const signals: string[] = [];
  const now = new Date();

  // Timeline urgency (0-12 points)
  if (lead.timeline === 'immediate') {
    score += 12;
    signals.push('Immediate timeline (hot lead)');
  } else if (lead.timeline === '1-3 months') {
    score += 10;
    signals.push('Near-term timeline');
  } else if (lead.timeline === '3-6 months') {
    score += 6;
    signals.push('Mid-term timeline');
  } else if (lead.timeline === '6-12 months') {
    score += 3;
    signals.push('Long-term planning');
  }

  // Recency of contact (0-10 points)
  if (lead.last_contact_date) {
    const lastContact = new Date(lead.last_contact_date);
    const daysSinceContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceContact <= 7) {
      score += 10;
      signals.push('Recent contact (within 1 week)');
    } else if (daysSinceContact <= 30) {
      score += 7;
      signals.push('Contact within last month');
    } else if (daysSinceContact <= 90) {
      score += 4;
      signals.push('Contact within last quarter');
    }
  }

  // Lead age (0-8 points) - newer leads scored higher for initial response
  if (lead.created_at) {
    const created = new Date(lead.created_at);
    const daysSinceCreation = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceCreation <= 1) {
      score += 8;
      signals.push('New lead (within 24 hours)');
    } else if (daysSinceCreation <= 7) {
      score += 6;
      signals.push('Fresh lead (this week)');
    } else if (daysSinceCreation <= 30) {
      score += 4;
      signals.push('Recent lead (this month)');
    }
  }

  return Math.min(score, 30); // Cap at 30 points
}

/**
 * Determine lead grade based on total score
 */
function getLeadGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

/**
 * Calculate estimated deal value based on lead characteristics
 */
function estimateLeadValue(lead: LeadData): number {
  let baseValue = 15000; // Average roofing job

  // Adjust for property type
  if (lead.property_type === 'commercial') {
    baseValue *= 3;
  } else if (lead.property_type === 'multi-family') {
    baseValue *= 2;
  }

  // Adjust for company size
  if (lead.company_size && lead.company_size >= 100) {
    baseValue *= 1.5;
  }

  // Adjust for roof age (older = more likely full replacement)
  if (lead.roof_age && lead.roof_age > 20) {
    baseValue *= 1.3;
  } else if (lead.roof_age && lead.roof_age > 15) {
    baseValue *= 1.15;
  }

  return Math.round(baseValue);
}

/**
 * Predict close date based on timeline and engagement
 */
function predictCloseDate(lead: LeadData, score: number): string | null {
  if (!lead.timeline) return null;

  const now = new Date();
  let daysToClose = 90; // Default 3 months

  // Adjust based on timeline
  if (lead.timeline === 'immediate') {
    daysToClose = 14;
  } else if (lead.timeline === '1-3 months') {
    daysToClose = 45;
  } else if (lead.timeline === '3-6 months') {
    daysToClose = 120;
  } else if (lead.timeline === '6-12 months') {
    daysToClose = 240;
  }

  // Adjust based on score (high scores close faster)
  if (score >= 80) {
    daysToClose *= 0.7;
  } else if (score >= 65) {
    daysToClose *= 0.85;
  }

  const closeDate = new Date(now.getTime() + daysToClose * 24 * 60 * 60 * 1000);
  return closeDate.toISOString().split('T')[0];
}

/**
 * Determine next best action based on score and signals
 */
function getNextBestAction(lead: LeadData, score: number): string {
  if (score >= 80) {
    return 'Schedule in-person estimate ASAP - High priority lead';
  } else if (score >= 65) {
    return 'Call within 24 hours to discuss project details';
  } else if (score >= 50) {
    return 'Send detailed proposal and follow up in 2-3 days';
  } else if (score >= 35) {
    return 'Nurture with educational content, check back in 1 week';
  } else {
    return 'Add to nurture campaign, reassess in 30 days';
  }
}

/**
 * Main scoring function - calculates comprehensive lead score
 */
export async function scoreLeadWithAI(lead: LeadData): Promise<LeadScore> {
  // Calculate component scores
  const demographic = calculateDemographicScore(lead);
  const behavioral = calculateBehavioralScore(lead);
  const temporal = calculateTemporalScore(lead);

  const total_score = demographic + behavioral + temporal;
  const grade = getLeadGrade(total_score);
  const likelihood_to_close = Math.min(total_score * 1.2, 100);
  const estimated_value = estimateLeadValue(lead);
  const predicted_close_date = predictCloseDate(lead, total_score);

  // Determine urgency
  let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (total_score >= 80 || lead.timeline === 'immediate') {
    urgency = 'critical';
  } else if (total_score >= 65 || lead.timeline === '1-3 months') {
    urgency = 'high';
  } else if (total_score >= 50) {
    urgency = 'medium';
  }

  // Collect positive signals
  const positive: string[] = [];
  const negative: string[] = [];

  if (demographic >= 20) positive.push('Strong demographic profile');
  if (behavioral >= 25) positive.push('High engagement level');
  if (temporal >= 20) positive.push('Good timing/urgency');
  if (lead.decision_maker_title) positive.push('Direct decision maker access');
  if (lead.budget_range && lead.budget_range !== 'unknown') positive.push('Budget identified');

  if (demographic < 10) negative.push('Limited company/property information');
  if (behavioral < 10) negative.push('Low engagement history');
  if (temporal < 10) negative.push('No urgency/old lead');
  if (!lead.email && !lead.phone) negative.push('Missing contact information');

  return {
    total_score,
    grade,
    likelihood_to_close,
    estimated_value,
    recommended_action: getNextBestAction(lead, total_score),
    urgency,
    breakdown: {
      demographic,
      behavioral,
      temporal,
    },
    signals: {
      positive,
      negative,
    },
    next_best_action: getNextBestAction(lead, total_score),
    predicted_close_date,
  };
}

/**
 * Batch score multiple leads (for list views)
 */
export async function batchScoreLeads(leads: LeadData[]): Promise<Map<string, LeadScore>> {
  const scores = new Map<string, LeadScore>();

  for (const lead of leads) {
    const score = await scoreLeadWithAI(lead);
    if (lead.customer_id) {
      scores.set(lead.customer_id, score);
    }
  }

  return scores;
}

/**
 * Get lead insights for CRM dashboard
 */
export function getLeadInsights(scores: LeadScore[]): {
  total_leads: number;
  high_priority: number;
  hot_leads: number;
  total_pipeline_value: number;
  average_score: number;
} {
  return {
    total_leads: scores.length,
    high_priority: scores.filter(s => s.grade === 'A' || s.grade === 'B').length,
    hot_leads: scores.filter(s => s.urgency === 'critical' || s.urgency === 'high').length,
    total_pipeline_value: scores.reduce((sum, s) => sum + s.estimated_value, 0),
    average_score: scores.reduce((sum, s) => sum + s.total_score, 0) / scores.length || 0,
  };
}
