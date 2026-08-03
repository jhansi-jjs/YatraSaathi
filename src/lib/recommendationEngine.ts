import type { BusListingWithRoute } from './types';

export interface ScoringWeights {
  price: number;
  rating: number;
  duration: number;
  operatorReliability: number;
  amenities: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  price: 0.35,
  rating: 0.25,
  duration: 0.15,
  operatorReliability: 0.15,
  amenities: 0.10,
};

export interface ScoredBusListing extends BusListingWithRoute {
  aiScore: number;
  isAiRecommended: boolean;
  scoreReasons: string[];
}

export function computeAiScore(
  listing: BusListingWithRoute,
  allListings: BusListingWithRoute[],
  weights: ScoringWeights = DEFAULT_WEIGHTS
): { aiScore: number; scoreReasons: string[] } {
  if (!allListings || allListings.length === 0) {
    return { aiScore: 85, scoreReasons: ['Balanced fare and comfort'] };
  }

  const prices = allListings.map((l) => l.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = Math.max(1, maxPrice - minPrice);

  // Price Score (0 - 100): Lower is better
  const priceScore = Math.round(100 - ((listing.price - minPrice) / priceRange) * 100);

  // Rating Score (0 - 100): 5.0 rating = 100
  const ratingScore = Math.round(((listing.rating || 4.0) / 5.0) * 100);

  // Duration Score (0 - 100)
  const durations = allListings.map((l) => l.duration_mins || 420);
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  const durationRange = Math.max(1, maxDuration - minDuration);
  const durationScore = Math.round(100 - (((listing.duration_mins || 420) - minDuration) / durationRange) * 100);

  // Operator Reliability Score
  const topOperators = ['APSRTC', 'TSRTC', 'VRL Travels', 'IntrCity SmartBus', 'Orange Tours', 'Morning Star', 'Zingbus'];
  const isTopOperator = topOperators.some((op) => listing.operator_name.toLowerCase().includes(op.toLowerCase()));
  const operatorScore = isTopOperator ? 95 : 75;

  // Amenities Score
  let amenitiesScore = 60;
  if (listing.ac_status === 'ac') amenitiesScore += 20;
  if (listing.bus_type === 'sleeper') amenitiesScore += 20;

  const totalScore = Math.round(
    priceScore * weights.price +
    ratingScore * weights.rating +
    durationScore * weights.duration +
    operatorScore * weights.operatorReliability +
    amenitiesScore * weights.amenities
  );

  const scoreReasons: string[] = [];
  if (listing.price === minPrice) scoreReasons.push('Lowest Fare Guarantee');
  if ((listing.rating || 0) >= 4.5) scoreReasons.push(`Top Rated (${listing.rating}★)`);
  if (listing.duration_mins === minDuration) scoreReasons.push('Fastest Journey Time');
  if (isTopOperator) scoreReasons.push('Verified Premier Operator');
  if (listing.ac_status === 'ac' && listing.bus_type === 'sleeper') scoreReasons.push('Luxury AC Sleeper');

  if (scoreReasons.length === 0) {
    scoreReasons.push('High value-for-money combination');
  }

  return { aiScore: Math.min(99, Math.max(60, totalScore)), scoreReasons };
}

export function rankAndScoreListings(
  listings: BusListingWithRoute[],
  customWeights: ScoringWeights = DEFAULT_WEIGHTS
): ScoredBusListing[] {
  if (!listings || listings.length === 0) return [];

  const scored = listings.map((listing) => {
    const { aiScore, scoreReasons } = computeAiScore(listing, listings, customWeights);
    return {
      ...listing,
      aiScore,
      isAiRecommended: false,
      scoreReasons,
    };
  });

  // Sort by AI score descending
  scored.sort((a, b) => b.aiScore - a.aiScore);

  // Mark top score as AI Recommended
  if (scored.length > 0) {
    scored[0].isAiRecommended = true;
  }

  return scored;
}
