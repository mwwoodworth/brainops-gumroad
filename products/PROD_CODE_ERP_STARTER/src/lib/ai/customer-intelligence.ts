/**
 * Customer Intelligence with AI
 * Week 10: Advanced AI Features
 * Churn prediction, lifetime value, and customer insights
 */

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
  total_revenue: number;
  total_jobs: number;
  last_job_date?: string;
  avg_job_value: number;
}

export interface CustomerIntelligence {
  customerId: string;
  churnRisk: number; // 0-100 (higher = more risk)
  churnRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  lifetimeValuePrediction: number;
  engagementLevel: 'high' | 'medium' | 'low';
  sentimentScore: number; // -1 to 1
  nextBestAction: string;
  recommendedActions: Action[];
  insights: string[];
  riskFactors: RiskFactor[];
  opportunityScore: number; // 0-100 (upsell potential)
}

export interface Action {
  type: 'email' | 'call' | 'offer' | 'visit' | 'survey';
  priority: 'high' | 'medium' | 'low';
  description: string;
  expectedImpact: number; // percentage reduction in churn risk
}

export interface RiskFactor {
  factor: string;
  impact: number; // 0-100
  description: string;
}

/**
 * Calculate customer churn risk score
 */
export function calculateChurnRisk(customer: Customer): number {
  let riskScore = 0;

  // Factor 1: Days since last job (40 points)
  if (customer.last_job_date) {
    const daysSinceLastJob = Math.floor(
      (Date.now() - new Date(customer.last_job_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastJob > 365) {
      riskScore += 40; // Very high risk
    } else if (daysSinceLastJob > 180) {
      riskScore += 30; // High risk
    } else if (daysSinceLastJob > 90) {
      riskScore += 15; // Medium risk
    } else {
      riskScore += 5; // Low risk
    }
  } else {
    riskScore += 40; // No job history = high risk
  }

  // Factor 2: Job frequency (30 points)
  const accountAge = Math.floor(
    (Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365)
  );
  const jobsPerYear = accountAge > 0 ? customer.total_jobs / accountAge : customer.total_jobs;

  if (jobsPerYear < 0.5) {
    riskScore += 30; // Very low frequency
  } else if (jobsPerYear < 1) {
    riskScore += 20; // Low frequency
  } else if (jobsPerYear < 2) {
    riskScore += 10; // Medium frequency
  } else {
    riskScore += 0; // Good frequency
  }

  // Factor 3: Average job value (20 points)
  if (customer.avg_job_value < 5000) {
    riskScore += 20; // Small jobs
  } else if (customer.avg_job_value < 10000) {
    riskScore += 10; // Medium jobs
  } else {
    riskScore += 0; // Large jobs (less churn risk)
  }

  // Factor 4: Total revenue (10 points)
  if (customer.total_revenue < 10000) {
    riskScore += 10; // Low lifetime value
  } else if (customer.total_revenue < 50000) {
    riskScore += 5; // Medium lifetime value
  } else {
    riskScore += 0; // High lifetime value (loyal customer)
  }

  return Math.min(riskScore, 100);
}

/**
 * Get churn risk level from score
 */
export function getChurnRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

/**
 * Predict customer lifetime value
 */
export function predictLifetimeValue(customer: Customer): number {
  // Current LTV
  const currentLTV = customer.total_revenue;

  // Calculate projected future value based on patterns
  const accountAge = Math.floor(
    (Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365)
  );

  // Average revenue per year
  const avgRevenuePerYear = accountAge > 0 ? currentLTV / accountAge : currentLTV;

  // Project 5 years into future with 10% annual growth
  const projectedYears = 5;
  const growthRate = 1.10; // 10% annual growth

  let futureValue = currentLTV;
  for (let i = 0; i < projectedYears; i++) {
    futureValue += avgRevenuePerYear * Math.pow(growthRate, i);
  }

  return Math.round(futureValue);
}

/**
 * Calculate customer engagement level
 */
export function calculateEngagementLevel(customer: Customer): 'high' | 'medium' | 'low' {
  const daysSinceLastJob = customer.last_job_date
    ? Math.floor((Date.now() - new Date(customer.last_job_date).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const accountAge = Math.floor(
    (Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365)
  );
  const jobsPerYear = accountAge > 0 ? customer.total_jobs / accountAge : customer.total_jobs;

  // High engagement: recent job + good frequency
  if (daysSinceLastJob < 90 && jobsPerYear >= 2) {
    return 'high';
  }

  // Low engagement: old job or low frequency
  if (daysSinceLastJob > 180 || jobsPerYear < 0.5) {
    return 'low';
  }

  return 'medium';
}

/**
 * Calculate sentiment score (mock - in production, analyze communications)
 */
export function calculateSentimentScore(customer: Customer): number {
  // In production: analyze emails, messages, reviews, etc.
  // For now, use job value and frequency as proxy

  const avgJobValue = customer.avg_job_value;
  const totalJobs = customer.total_jobs;

  // Higher job value + more jobs = positive sentiment
  let sentiment = 0;

  if (avgJobValue > 15000 && totalJobs > 5) {
    sentiment = 0.8; // Very positive
  } else if (avgJobValue > 10000 && totalJobs > 3) {
    sentiment = 0.5; // Positive
  } else if (avgJobValue > 5000 && totalJobs > 1) {
    sentiment = 0.2; // Neutral
  } else {
    sentiment = -0.2; // Slightly negative
  }

  return Math.max(-1, Math.min(1, sentiment));
}

/**
 * Identify risk factors contributing to churn
 */
export function identifyRiskFactors(customer: Customer): RiskFactor[] {
  const factors: RiskFactor[] = [];

  // Check days since last job
  if (customer.last_job_date) {
    const daysSinceLastJob = Math.floor(
      (Date.now() - new Date(customer.last_job_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastJob > 180) {
      factors.push({
        factor: 'Inactive Customer',
        impact: 40,
        description: `No jobs in ${daysSinceLastJob} days - customer may have switched providers`,
      });
    } else if (daysSinceLastJob > 90) {
      factors.push({
        factor: 'Low Activity',
        impact: 20,
        description: `${daysSinceLastJob} days since last job - consider reaching out`,
      });
    }
  }

  // Check job frequency
  const accountAge = Math.floor(
    (Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365)
  );
  const jobsPerYear = accountAge > 0 ? customer.total_jobs / accountAge : customer.total_jobs;

  if (jobsPerYear < 1) {
    factors.push({
      factor: 'Low Job Frequency',
      impact: 30,
      description: `Only ${jobsPerYear.toFixed(1)} jobs per year - may not see us as preferred vendor`,
    });
  }

  // Check average job value
  if (customer.avg_job_value < 5000) {
    factors.push({
      factor: 'Small Job Values',
      impact: 15,
      description: `Average job only $${customer.avg_job_value.toLocaleString()} - limited engagement`,
    });
  }

  return factors;
}

/**
 * Generate recommended actions to reduce churn
 */
export function generateRecommendedActions(customer: Customer, churnRisk: number): Action[] {
  const actions: Action[] = [];

  // High churn risk customers
  if (churnRisk >= 75) {
    actions.push({
      type: 'call',
      priority: 'high',
      description: 'Personal call from account manager to check satisfaction and needs',
      expectedImpact: 30,
    });
    actions.push({
      type: 'offer',
      priority: 'high',
      description: 'Special loyalty discount (15% off next job) to re-engage',
      expectedImpact: 25,
    });
  }

  // Medium-high churn risk
  if (churnRisk >= 50) {
    actions.push({
      type: 'email',
      priority: 'high',
      description: 'Personalized email with seasonal maintenance reminder',
      expectedImpact: 20,
    });
    actions.push({
      type: 'survey',
      priority: 'medium',
      description: 'Send satisfaction survey to understand pain points',
      expectedImpact: 15,
    });
  }

  // All at-risk customers
  if (churnRisk >= 25) {
    actions.push({
      type: 'email',
      priority: 'medium',
      description: 'Share helpful roofing maintenance tips and industry updates',
      expectedImpact: 10,
    });
  }

  // Low churn risk - maintain relationship
  if (churnRisk < 25 && customer.total_revenue > 50000) {
    actions.push({
      type: 'visit',
      priority: 'low',
      description: 'Schedule quarterly check-in to maintain strong relationship',
      expectedImpact: 5,
    });
  }

  return actions;
}

/**
 * Calculate upsell opportunity score
 */
export function calculateOpportunityScore(customer: Customer): number {
  let score = 0;

  // Good customers with growth potential
  if (customer.total_jobs >= 3 && customer.avg_job_value > 8000) {
    score += 40; // High potential
  } else if (customer.total_jobs >= 2 && customer.avg_job_value > 5000) {
    score += 25; // Medium potential
  }

  // Recent activity = more likely to buy
  if (customer.last_job_date) {
    const daysSinceLastJob = Math.floor(
      (Date.now() - new Date(customer.last_job_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastJob < 90) {
      score += 30; // Recent customer
    } else if (daysSinceLastJob < 180) {
      score += 15; // Moderately recent
    }
  }

  // High lifetime value = more opportunity
  if (customer.total_revenue > 100000) {
    score += 30; // Very high value
  } else if (customer.total_revenue > 50000) {
    score += 20; // High value
  } else if (customer.total_revenue > 25000) {
    score += 10; // Medium value
  }

  return Math.min(score, 100);
}

/**
 * Get complete customer intelligence analysis
 */
export function analyzeCustomer(customer: Customer): CustomerIntelligence {
  const churnRisk = calculateChurnRisk(customer);
  const churnRiskLevel = getChurnRiskLevel(churnRisk);
  const lifetimeValuePrediction = predictLifetimeValue(customer);
  const engagementLevel = calculateEngagementLevel(customer);
  const sentimentScore = calculateSentimentScore(customer);
  const riskFactors = identifyRiskFactors(customer);
  const recommendedActions = generateRecommendedActions(customer, churnRisk);
  const opportunityScore = calculateOpportunityScore(customer);

  // Generate insights
  const insights: string[] = [];

  if (churnRisk >= 75) {
    insights.push('⚠️ Critical churn risk - immediate action required');
  } else if (churnRisk >= 50) {
    insights.push('⚠️ High churn risk - proactive outreach recommended');
  } else if (churnRisk < 25) {
    insights.push('✅ Low churn risk - healthy customer relationship');
  }

  if (opportunityScore >= 70) {
    insights.push('💰 High upsell potential - great expansion opportunity');
  }

  if (engagementLevel === 'high') {
    insights.push('🔥 Highly engaged customer - maintain strong relationship');
  }

  if (lifetimeValuePrediction > customer.total_revenue * 2) {
    insights.push(
      `📈 Strong growth potential - projected LTV ${((lifetimeValuePrediction / customer.total_revenue - 1) * 100).toFixed(0)}% higher`
    );
  }

  // Determine next best action
  const nextBestAction =
    recommendedActions.length > 0
      ? recommendedActions[0].description
      : 'Continue monitoring customer activity';

  return {
    customerId: customer.id,
    churnRisk,
    churnRiskLevel,
    lifetimeValuePrediction,
    engagementLevel,
    sentimentScore,
    nextBestAction,
    recommendedActions,
    insights,
    riskFactors,
    opportunityScore,
  };
}

/**
 * Batch analyze multiple customers
 */
export function analyzeCustomerBatch(customers: Customer[]): CustomerIntelligence[] {
  return customers.map((customer) => analyzeCustomer(customer));
}

/**
 * Get at-risk customers sorted by churn risk
 */
export function getAtRiskCustomers(
  customers: Customer[],
  minRisk: number = 50
): CustomerIntelligence[] {
  return analyzeCustomerBatch(customers)
    .filter((intel) => intel.churnRisk >= minRisk)
    .sort((a, b) => b.churnRisk - a.churnRisk);
}

/**
 * Get upsell opportunities sorted by opportunity score
 */
export function getUpsellOpportunities(
  customers: Customer[],
  minScore: number = 60
): CustomerIntelligence[] {
  return analyzeCustomerBatch(customers)
    .filter((intel) => intel.opportunityScore >= minScore)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}
