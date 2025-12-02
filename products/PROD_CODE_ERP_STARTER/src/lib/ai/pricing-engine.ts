/**
 * Dynamic Pricing Engine with AI
 * Week 10: Advanced AI Features
 * Market-based pricing optimization for roofing jobs
 */

export interface PricingContext {
  jobType: 'residential' | 'commercial' | 'repair' | 'inspection';
  roofSquares: number;
  materialCost: number;
  laborHours: number;
  complexity: 'simple' | 'moderate' | 'complex';
  urgency: 'standard' | 'urgent' | 'emergency';
  customerHistory?: {
    totalJobs: number;
    totalRevenue: number;
    avgJobValue: number;
    lastJobDate?: string;
  };
  location?: {
    zipCode: string;
    marketDemand: number; // 0-1 (0 = low, 1 = high)
  };
  seasonalFactor?: number; // Calculated automatically if not provided
  competitorPrices?: number[];
}

export interface PriceRecommendation {
  recommendedPrice: number;
  basePrice: number;
  adjustments: PriceAdjustment[];
  priceRange: {
    minimum: number;
    optimal: number;
    maximum: number;
  };
  confidence: number; // 0-100
  reasoning: string[];
  profitMargin: number; // percentage
  marketPosition: 'low' | 'competitive' | 'premium';
  winProbability: number; // 0-100 (likelihood of winning the bid)
}

export interface PriceAdjustment {
  factor: string;
  amount: number; // dollar amount
  percentage: number; // percentage of base
  reasoning: string;
}

/**
 * Base pricing constants
 */
const LABOR_RATE_PER_HOUR = 75; // Base labor rate
const BASE_PROFIT_MARGIN = 0.35; // 35% profit margin target
const OVERHEAD_MULTIPLIER = 1.20; // 20% overhead

/**
 * Calculate base price before adjustments
 */
export function calculateBasePrice(context: PricingContext): number {
  // Material cost
  const materialTotal = context.materialCost;

  // Labor cost
  const laborTotal = context.laborHours * LABOR_RATE_PER_HOUR;

  // Base cost (materials + labor)
  const baseCost = materialTotal + laborTotal;

  // Add overhead
  const costWithOverhead = baseCost * OVERHEAD_MULTIPLIER;

  // Add profit margin
  const basePrice = costWithOverhead * (1 + BASE_PROFIT_MARGIN);

  return Math.round(basePrice);
}

/**
 * Get seasonal pricing factor
 */
function getSeasonalFactor(): number {
  const month = new Date().getMonth(); // 0-11

  // Roofing industry seasonal demand
  const seasonalFactors = {
    0: -0.15, // January (slow)
    1: -0.10, // February (slow)
    2: 0.0,   // March (picking up)
    3: 0.05,  // April (busy)
    4: 0.10,  // May (peak)
    5: 0.15,  // June (peak)
    6: 0.10,  // July (busy)
    7: 0.05,  // August (busy)
    8: 0.0,   // September (moderate)
    9: -0.05, // October (moderate)
    10: -0.10, // November (slowing)
    11: -0.15, // December (slow)
  };

  return seasonalFactors[month as keyof typeof seasonalFactors] || 0;
}

/**
 * Calculate urgency premium
 */
function getUrgencyMultiplier(urgency: string): number {
  switch (urgency) {
    case 'emergency':
      return 1.50; // 50% premium
    case 'urgent':
      return 1.25; // 25% premium
    default:
      return 1.00; // No premium
  }
}

/**
 * Calculate complexity multiplier
 */
function getComplexityMultiplier(complexity: string): number {
  switch (complexity) {
    case 'complex':
      return 1.25; // 25% more for complex jobs
    case 'moderate':
      return 1.10; // 10% more for moderate
    default:
      return 1.00; // No adjustment for simple
  }
}

/**
 * Calculate customer loyalty discount
 */
function calculateLoyaltyAdjustment(customerHistory?: PricingContext['customerHistory']): number {
  if (!customerHistory) return 0;

  const { totalJobs, totalRevenue } = customerHistory;

  // Loyalty tiers
  if (totalRevenue > 100000 && totalJobs > 10) {
    return -0.10; // 10% discount for VIP customers
  } else if (totalRevenue > 50000 && totalJobs > 5) {
    return -0.07; // 7% discount for loyal customers
  } else if (totalRevenue > 25000 && totalJobs > 3) {
    return -0.05; // 5% discount for repeat customers
  }

  return 0; // No discount for new/small customers
}

/**
 * Calculate market demand adjustment
 */
function getMarketDemandMultiplier(marketDemand?: number): number {
  if (!marketDemand) return 1.00;

  // High demand = can charge more
  // Low demand = should charge less to stay competitive
  if (marketDemand > 0.8) {
    return 1.15; // 15% premium in hot markets
  } else if (marketDemand > 0.6) {
    return 1.08; // 8% premium in good markets
  } else if (marketDemand < 0.3) {
    return 0.92; // 8% discount in slow markets
  } else if (marketDemand < 0.5) {
    return 0.96; // 4% discount in soft markets
  }

  return 1.00; // No adjustment for average markets
}

/**
 * Analyze competitor pricing
 */
function analyzeCompetitorPricing(
  ourPrice: number,
  competitorPrices?: number[]
): {
  position: 'low' | 'competitive' | 'premium';
  adjustment: number;
  reasoning: string;
} {
  if (!competitorPrices || competitorPrices.length === 0) {
    return {
      position: 'competitive',
      adjustment: 0,
      reasoning: 'No competitor data available',
    };
  }

  const avgCompetitorPrice =
    competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length;
  const minCompetitorPrice = Math.min(...competitorPrices);
  const maxCompetitorPrice = Math.max(...competitorPrices);

  const percentDiff = ((ourPrice - avgCompetitorPrice) / avgCompetitorPrice) * 100;

  if (ourPrice < minCompetitorPrice) {
    return {
      position: 'low',
      adjustment: (minCompetitorPrice - ourPrice) * 0.5, // Raise price halfway to min
      reasoning: `Below all competitors - can increase by $${Math.round((minCompetitorPrice - ourPrice) * 0.5)}`,
    };
  } else if (ourPrice > maxCompetitorPrice) {
    return {
      position: 'premium',
      adjustment: 0, // Keep premium if justified
      reasoning: `Above all competitors by ${percentDiff.toFixed(1)}% - justify with quality/service`,
    };
  } else if (percentDiff > 10) {
    return {
      position: 'premium',
      adjustment: -(ourPrice - avgCompetitorPrice) * 0.3, // Lower slightly
      reasoning: `${percentDiff.toFixed(1)}% above average - consider lowering to increase win rate`,
    };
  } else if (percentDiff < -10) {
    return {
      position: 'low',
      adjustment: (avgCompetitorPrice - ourPrice) * 0.3, // Raise slightly
      reasoning: `${Math.abs(percentDiff).toFixed(1)}% below average - can increase price`,
    };
  }

  return {
    position: 'competitive',
    adjustment: 0,
    reasoning: `Within ${Math.abs(percentDiff).toFixed(1)}% of market average - well positioned`,
  };
}

/**
 * Calculate win probability based on price positioning
 */
function calculateWinProbability(
  ourPrice: number,
  competitorPrices?: number[],
  customerHistory?: PricingContext['customerHistory']
): number {
  let probability = 50; // Base 50% win rate

  // Adjust based on competitor pricing
  if (competitorPrices && competitorPrices.length > 0) {
    const avgCompetitorPrice =
      competitorPrices.reduce((sum, p) => sum + p, 0) / competitorPrices.length;
    const percentDiff = ((ourPrice - avgCompetitorPrice) / avgCompetitorPrice) * 100;

    // Lower price = higher win probability
    if (percentDiff < -20) {
      probability += 30; // Much cheaper
    } else if (percentDiff < -10) {
      probability += 20; // Cheaper
    } else if (percentDiff < 0) {
      probability += 10; // Slightly cheaper
    } else if (percentDiff > 20) {
      probability -= 30; // Much more expensive
    } else if (percentDiff > 10) {
      probability -= 20; // More expensive
    } else if (percentDiff > 0) {
      probability -= 10; // Slightly more expensive
    }
  }

  // Adjust based on customer history
  if (customerHistory && customerHistory.totalJobs > 0) {
    probability += 20; // Existing customers more likely to choose us
  }

  return Math.max(10, Math.min(90, probability)); // Clamp between 10-90%
}

/**
 * Generate complete price recommendation
 */
export function generatePriceRecommendation(context: PricingContext): PriceRecommendation {
  // Calculate base price
  const basePrice = calculateBasePrice(context);
  const adjustments: PriceAdjustment[] = [];
  let currentPrice = basePrice;

  // Apply complexity adjustment
  const complexityMultiplier = getComplexityMultiplier(context.complexity);
  if (complexityMultiplier !== 1.0) {
    const adjustment = basePrice * (complexityMultiplier - 1);
    adjustments.push({
      factor: 'Job Complexity',
      amount: Math.round(adjustment),
      percentage: (complexityMultiplier - 1) * 100,
      reasoning: `${context.complexity.charAt(0).toUpperCase() + context.complexity.slice(1)} job requires additional expertise`,
    });
    currentPrice *= complexityMultiplier;
  }

  // Apply urgency premium
  const urgencyMultiplier = getUrgencyMultiplier(context.urgency);
  if (urgencyMultiplier !== 1.0) {
    const adjustment = basePrice * (urgencyMultiplier - 1);
    adjustments.push({
      factor: 'Urgency Premium',
      amount: Math.round(adjustment),
      percentage: (urgencyMultiplier - 1) * 100,
      reasoning: `${context.urgency.charAt(0).toUpperCase() + context.urgency.slice(1)} service requires immediate response`,
    });
    currentPrice *= urgencyMultiplier;
  }

  // Apply seasonal adjustment
  const seasonalFactor = context.seasonalFactor ?? getSeasonalFactor();
  if (seasonalFactor !== 0) {
    const adjustment = basePrice * seasonalFactor;
    adjustments.push({
      factor: 'Seasonal Demand',
      amount: Math.round(adjustment),
      percentage: seasonalFactor * 100,
      reasoning:
        seasonalFactor > 0
          ? 'Peak season - high demand allows premium pricing'
          : 'Off season - lower prices to maintain volume',
    });
    currentPrice += adjustment;
  }

  // Apply market demand adjustment
  if (context.location?.marketDemand !== undefined) {
    const marketMultiplier = getMarketDemandMultiplier(context.location.marketDemand);
    if (marketMultiplier !== 1.0) {
      const adjustment = basePrice * (marketMultiplier - 1);
      adjustments.push({
        factor: 'Market Demand',
        amount: Math.round(adjustment),
        percentage: (marketMultiplier - 1) * 100,
        reasoning: `Market demand is ${(context.location.marketDemand * 100).toFixed(0)}%`,
      });
      currentPrice *= marketMultiplier;
    }
  }

  // Apply loyalty discount
  const loyaltyAdjustment = calculateLoyaltyAdjustment(context.customerHistory);
  if (loyaltyAdjustment !== 0) {
    const adjustment = basePrice * loyaltyAdjustment;
    adjustments.push({
      factor: 'Customer Loyalty',
      amount: Math.round(adjustment),
      percentage: loyaltyAdjustment * 100,
      reasoning: `Valued customer with ${context.customerHistory!.totalJobs} previous jobs`,
    });
    currentPrice += adjustment;
  }

  // Analyze competitor pricing
  const competitorAnalysis = analyzeCompetitorPricing(currentPrice, context.competitorPrices);
  if (competitorAnalysis.adjustment !== 0) {
    adjustments.push({
      factor: 'Market Positioning',
      amount: Math.round(competitorAnalysis.adjustment),
      percentage: (competitorAnalysis.adjustment / basePrice) * 100,
      reasoning: competitorAnalysis.reasoning,
    });
    currentPrice += competitorAnalysis.adjustment;
  }

  const recommendedPrice = Math.round(currentPrice);

  // Calculate price range
  const priceRange = {
    minimum: Math.round(basePrice * 0.90), // Never go below 90% of base
    optimal: recommendedPrice,
    maximum: Math.round(recommendedPrice * 1.15), // Up to 15% higher
  };

  // Calculate profit margin
  const totalCost = context.materialCost + context.laborHours * LABOR_RATE_PER_HOUR;
  const profitMargin = ((recommendedPrice - totalCost) / recommendedPrice) * 100;

  // Calculate confidence (higher with more data)
  let confidence = 70; // Base confidence
  if (context.customerHistory) confidence += 10;
  if (context.competitorPrices && context.competitorPrices.length > 0) confidence += 15;
  if (context.location?.marketDemand !== undefined) confidence += 5;

  // Generate reasoning
  const reasoning: string[] = [];
  reasoning.push(`Base cost: $${totalCost.toLocaleString()} (materials + labor + overhead)`);
  reasoning.push(`Target margin: ${profitMargin.toFixed(1)}%`);
  reasoning.push(`Market position: ${competitorAnalysis.position}`);

  if (adjustments.length > 0) {
    const totalAdjustment = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
    reasoning.push(
      `Applied ${adjustments.length} pricing adjustments totaling ${totalAdjustment > 0 ? '+' : ''}$${totalAdjustment.toLocaleString()}`
    );
  }

  // Calculate win probability
  const winProbability = calculateWinProbability(
    recommendedPrice,
    context.competitorPrices,
    context.customerHistory
  );

  return {
    recommendedPrice,
    basePrice,
    adjustments,
    priceRange,
    confidence,
    reasoning,
    profitMargin: Math.round(profitMargin * 10) / 10,
    marketPosition: competitorAnalysis.position,
    winProbability,
  };
}

/**
 * Compare multiple pricing strategies
 */
export function comparePricingStrategies(
  context: PricingContext
): {
  aggressive: PriceRecommendation;
  recommended: PriceRecommendation;
  premium: PriceRecommendation;
} {
  const baseRecommendation = generatePriceRecommendation(context);

  // Aggressive pricing (lower to win)
  const aggressiveContext = { ...context };
  const aggressive = generatePriceRecommendation(aggressiveContext);
  aggressive.recommendedPrice = Math.round(aggressive.recommendedPrice * 0.92); // 8% lower
  aggressive.winProbability = Math.min(95, aggressive.winProbability + 15);

  // Premium pricing (higher margin)
  const premiumContext = { ...context };
  const premium = generatePriceRecommendation(premiumContext);
  premium.recommendedPrice = Math.round(premium.recommendedPrice * 1.12); // 12% higher
  premium.winProbability = Math.max(20, premium.winProbability - 15);
  premium.profitMargin = ((premium.recommendedPrice - (context.materialCost + context.laborHours * LABOR_RATE_PER_HOUR)) / premium.recommendedPrice) * 100;

  return {
    aggressive,
    recommended: baseRecommendation,
    premium,
  };
}
