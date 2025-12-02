import { parseISO } from 'date-fns';
import type {
  InstallabilityResult,
  SchedulePlan,
  UUID,
} from './types';

export interface SchedulingInput {
  tenantId: UUID;
  itbId: UUID;
  estimateId: UUID;
  laborHours: number;
  installability: InstallabilityResult;
  hourlyRevenueRate?: number;
}

export interface SchedulingComputationResult {
  suggestedStart: string;
  suggestedEnd: string;
  confidence: number;
  usableHoursPerDay: Record<string, number>;
  revenueProjection: Record<string, number>;
}

export const computeSchedulePlan = (input: SchedulingInput): SchedulingComputationResult => {
  const usableHoursPerDay: Record<string, number> = {};

  input.installability.windows.forEach(window => {
    const usableMinutes = window.windows.reduce((sum, block) => sum + block.minutes, 0);
    usableHoursPerDay[window.date] = Math.round((usableMinutes / 60) * 100) / 100;
  });

  const orderedDates = Object.keys(usableHoursPerDay).sort();
  if (orderedDates.length === 0) {
    throw new Error('No installability data available to compute schedule plan');
  }

  let remainingHours = input.laborHours;
  let startDate: string | null = null;
  let endDate: string | null = null;
  const revenueProjection: Record<string, number> = {};
  const hourlyRate = input.hourlyRevenueRate ?? 350; // default blended rate

  for (const date of orderedDates) {
    const usableHours = usableHoursPerDay[date];
    if (usableHours <= 0) {
      continue;
    }

    if (!startDate) {
      startDate = date;
    }

    const hoursForDay = Math.min(usableHours, remainingHours);
    remainingHours = Math.max(0, remainingHours - hoursForDay);
    revenueProjection[date] = Math.round(hoursForDay * hourlyRate * 100) / 100;
    endDate = date;

    if (remainingHours <= 0) {
      break;
    }
  }

  if (!startDate) {
    throw new Error('No feasible start date identified from installability windows');
  }

  if (!endDate) {
    endDate = startDate;
  }

  const totalDays = differenceInDaysInclusive(startDate, endDate);
  const confidence = computeConfidence(input.installability, totalDays, remainingHours);

  return {
    suggestedStart: startDate,
    suggestedEnd: endDate,
    confidence,
    usableHoursPerDay,
    revenueProjection,
  };
};

const differenceInDaysInclusive = (startIso: string, endIso: string): number => {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  const diff = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return diff + 1;
};

const computeConfidence = (
  installability: InstallabilityResult,
  plannedDurationDays: number,
  remainingHours: number
): number => {
  const feasibleDays = installability.totalFeasibleDays;
  if (feasibleDays === 0) {
    return 0;
  }

  const capacityScore = Math.min(1, feasibleDays / plannedDurationDays);
  const slackScore = remainingHours <= 0 ? 1 : Math.max(0, 1 - remainingHours / 24);
  const forecastPenalty = installability.flagged.includes('FORECAST_DATA_GAP') ? 0.7 : 1;

  const composite = capacityScore * 0.6 + slackScore * 0.4;
  return Math.round(composite * forecastPenalty * 100) / 100;
};
