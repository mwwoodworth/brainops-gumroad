import { addHours, differenceInMinutes, parseISO } from 'date-fns';
import {
  EstimateFlagCode,
  HourlyForecastPoint,
  InstallabilityComputationInput,
  InstallabilityResult,
  MaterialConstraint,
} from './types';

const RISING_EPSILON_F = 0.2;

interface HourEvaluation {
  ts: string;
  tempF: number;
  windMph: number;
  precipProb: number;
  meetsAll: boolean;
  blockers: string[];
}

interface NormalizedConstraints {
  minTempF: number | null;
  requiresRising: boolean;
  minimumWindowMinutes: number;
  maxWindMph: number | null;
  maxPrecipProb: number | null;
}

interface DailyEvaluation {
  date: string;
  hours: HourEvaluation[];
}

interface WindowBlock {
  start: string;
  end: string;
  minutes: number;
}

export const computeInstallability = (
  input: InstallabilityComputationInput
): InstallabilityResult => {
  const constraints = normalizeConstraints(input.constraints);
  const evaluatedHours = evaluateForecast(input.forecast, constraints);
  const grouped = groupByDay(evaluatedHours);

  const requiredPerDayMinutes = Math.max(
    constraints.minimumWindowMinutes,
    input.requiredDailyHours * 60
  );

  const windows = grouped.map(day => {
    const blocks = buildWindowsForDay(day.hours, constraints.minimumWindowMinutes);
    const totalMinutes = blocks.reduce((sum, block) => sum + block.minutes, 0);
    const limitingFactors = collectLimitingFactors(day.hours);

    return {
      date: day.date,
      windows: blocks.map(block => ({
        start: block.start,
        end: block.end,
        minutes: block.minutes,
      })),
      feasible: totalMinutes >= requiredPerDayMinutes,
      limitingFactors,
    };
  });

  const flagged: EstimateFlagCode[] = [];
  const totalFeasibleDays = windows.filter(w => w.feasible).length;

  if (totalFeasibleDays === 0) {
    flagged.push('WEATHER_INFEASIBLE');
  }

  const insufficientRising = grouped.some(day =>
    day.hours.some(hour => hour.blockers.includes('temperature_rising'))
  );
  if (constraints.requiresRising && insufficientRising) {
    flagged.push('RISING_WINDOW_TOO_SHORT');
  }

  if (evaluatedHours.some(hour => hour.blockers.includes('forecast_gap'))) {
    flagged.push('FORECAST_DATA_GAP');
  }

  return {
    windows,
    totalFeasibleDays,
    flagged,
  };
};

const normalizeConstraints = (constraints: MaterialConstraint[]): NormalizedConstraints => {
  let minTempF: number | null = null;
  let requiresRising = false;
  let minimumWindowMinutes = 0;
  let maxWindMph: number | null = null;
  let maxPrecipProb: number | null = null;

  constraints.forEach(constraint => {
    if (constraint.min_temp_f !== null && !Number.isNaN(constraint.min_temp_f)) {
      minTempF =
        minTempF === null ? constraint.min_temp_f : Math.max(minTempF, constraint.min_temp_f);
    }
    if (constraint.requires_rising) {
      requiresRising = true;
    }
    if (constraint.min_continuous_window_minutes > minimumWindowMinutes) {
      minimumWindowMinutes = constraint.min_continuous_window_minutes;
    }
    if (constraint.max_wind_mph !== null && !Number.isNaN(constraint.max_wind_mph)) {
      maxWindMph =
        maxWindMph === null ? constraint.max_wind_mph : Math.min(maxWindMph, constraint.max_wind_mph);
    }
    if (constraint.max_precip_prob !== null && !Number.isNaN(constraint.max_precip_prob)) {
      maxPrecipProb =
        maxPrecipProb === null
          ? constraint.max_precip_prob
          : Math.min(maxPrecipProb, constraint.max_precip_prob);
    }
  });

  if (minimumWindowMinutes === 0) {
    minimumWindowMinutes = 120;
  }

  return {
    minTempF,
    requiresRising,
    minimumWindowMinutes,
    maxWindMph,
    maxPrecipProb,
  };
};

const evaluateForecast = (
  forecast: HourlyForecastPoint[],
  constraints: NormalizedConstraints
): HourEvaluation[] => {
  const sorted = [...forecast].sort(
    (a, b) => parseISO(a.ts).getTime() - parseISO(b.ts).getTime()
  );

  const evaluations: HourEvaluation[] = [];
  let previousTemp: number | null = null;
  let previousTimestamp: Date | null = null;

  sorted.forEach(point => {
    const ts = parseISO(point.ts);
    const blockers: string[] = [];

    if (previousTimestamp) {
      const gap = Math.abs(differenceInMinutes(ts, previousTimestamp));
      if (gap > 60) {
        blockers.push('forecast_gap');
      }
    }

    if (constraints.minTempF !== null && point.temp_f < constraints.minTempF) {
      blockers.push('temperature');
    }

    if (
      constraints.requiresRising &&
      (previousTemp === null ||
        point.temp_f < (constraints.minTempF ?? point.temp_f) ||
        point.temp_f <= previousTemp + RISING_EPSILON_F)
    ) {
      blockers.push('temperature_rising');
    }

    if (constraints.maxWindMph !== null && point.wind_mph > constraints.maxWindMph) {
      blockers.push('wind');
    }

    if (constraints.maxPrecipProb !== null && point.precip_prob > constraints.maxPrecipProb) {
      blockers.push('precipitation');
    }

    evaluations.push({
      ts: point.ts,
      tempF: point.temp_f,
      windMph: point.wind_mph,
      precipProb: point.precip_prob,
      meetsAll: blockers.length === 0,
      blockers,
    });

    previousTemp = point.temp_f;
    previousTimestamp = ts;
  });

  return evaluations;
};

const groupByDay = (hours: HourEvaluation[]): DailyEvaluation[] => {
  const grouped = new Map<string, HourEvaluation[]>();

  hours.forEach(hour => {
    const dateKey = hour.ts.split('T')[0];
    const existing = grouped.get(dateKey);
    if (existing) {
      existing.push(hour);
    } else {
      grouped.set(dateKey, [hour]);
    }
  });

  return Array.from(grouped.entries()).map(([date, dayHours]) => ({
    date,
    hours: dayHours,
  }));
};

const buildWindowsForDay = (
  hours: HourEvaluation[],
  minimumWindowMinutes: number
): WindowBlock[] => {
  const windows: WindowBlock[] = [];
  let currentStart: HourEvaluation | null = null;

  for (let index = 0; index < hours.length; index += 1) {
    const hour = hours[index];
    if (hour.meetsAll) {
      if (!currentStart) {
        currentStart = hour;
      }
    } else if (currentStart) {
      finalizeWindow(currentStart, hours[index - 1], minimumWindowMinutes, windows);
      currentStart = null;
    }
  }

  if (currentStart) {
    finalizeWindow(currentStart, hours[hours.length - 1], minimumWindowMinutes, windows);
  }

  return windows;
};

const finalizeWindow = (
  startHour: HourEvaluation,
  endHour: HourEvaluation,
  minimumWindowMinutes: number,
  windows: WindowBlock[]
) => {
  const windowEnd = addHours(parseISO(endHour.ts), 1);
  const minutes = differenceInMinutes(windowEnd, parseISO(startHour.ts));
  if (minutes >= minimumWindowMinutes) {
    windows.push({
      start: startHour.ts,
      end: windowEnd.toISOString(),
      minutes,
    });
  }
};

const collectLimitingFactors = (hours: HourEvaluation[]): string[] => {
  const factors = new Set<string>();
  hours.forEach(hour => {
    if (!hour.meetsAll) {
      hour.blockers.forEach(blocker => {
        if (blocker !== 'forecast_gap') {
          factors.add(blocker);
        }
      });
    }
  });
  return Array.from(factors);
};
