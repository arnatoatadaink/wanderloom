import { INITIAL_DURATION_RARITY_DF } from "./duration-rarity-model";
import { buildRepresentativeZoneConfiguration } from "./representative-zone-shadow-report";
import {
  compareRarityResolutionStrategies,
  type RarityShadowComparisonReport
} from "./rarity-shadow-comparison";

export type FullProfileValidationDuration = "Short" | "Medium" | "Long";

export interface FullProfileValidationThresholds {
  readonly maxTotalVariationDistance: number;
  readonly maxAbsoluteTierDelta: number;
  readonly maxAbsoluteExpectedRarityScoreDelta: number;
}

export interface FullProfileValidationRow {
  readonly durationClass: FullProfileValidationDuration;
  readonly durationId: string;
  readonly degreesOfFreedom: number;
  readonly report: RarityShadowComparisonReport;
  readonly checks: {
    readonly totalVariationDistance: boolean;
    readonly maxAbsoluteTierDelta: boolean;
    readonly expectedRarityScoreDelta: boolean;
  };
  readonly accepted: boolean;
}

export interface FullProfileValidationReport {
  readonly iterationsPerDuration: number;
  readonly thresholds: FullProfileValidationThresholds;
  readonly rows: readonly FullProfileValidationRow[];
  readonly accepted: boolean;
}

export const INITIAL_FULL_PROFILE_VALIDATION_THRESHOLDS: FullProfileValidationThresholds = {
  maxTotalVariationDistance: 0.02,
  maxAbsoluteTierDelta: 0.015,
  maxAbsoluteExpectedRarityScoreDelta: 0.05
};

const DURATION_CONFIG: Readonly<Record<FullProfileValidationDuration, {
  readonly durationId: string;
  readonly degreesOfFreedom: number;
}>> = {
  Short: { durationId: "short", degreesOfFreedom: INITIAL_DURATION_RARITY_DF.short },
  Medium: { durationId: "medium", degreesOfFreedom: INITIAL_DURATION_RARITY_DF.medium },
  Long: { durationId: "long", degreesOfFreedom: INITIAL_DURATION_RARITY_DF.long }
};

function validateThreshold(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number`);
  }
}

export function buildFullProfileRarityValidationReport(input: {
  readonly iterationsPerDuration?: number;
  readonly seedPrefix?: string;
  readonly thresholds?: FullProfileValidationThresholds;
} = {}): FullProfileValidationReport {
  const iterationsPerDuration = input.iterationsPerDuration ?? 100_000;
  const seedPrefix = input.seedPrefix ?? "full-profile-rarity-validation";
  const thresholds = input.thresholds ?? INITIAL_FULL_PROFILE_VALIDATION_THRESHOLDS;

  if (!Number.isSafeInteger(iterationsPerDuration) || iterationsPerDuration <= 0) {
    throw new RangeError("iterationsPerDuration must be a positive safe integer");
  }
  validateThreshold("maxTotalVariationDistance", thresholds.maxTotalVariationDistance);
  validateThreshold("maxAbsoluteTierDelta", thresholds.maxAbsoluteTierDelta);
  validateThreshold(
    "maxAbsoluteExpectedRarityScoreDelta",
    thresholds.maxAbsoluteExpectedRarityScoreDelta
  );

  const configuration = buildRepresentativeZoneConfiguration("Full");
  const durations = ["Short", "Medium", "Long"] as const;
  const rows = durations.map((durationClass): FullProfileValidationRow => {
    const duration = DURATION_CONFIG[durationClass];
    const report = compareRarityResolutionStrategies({
      seedPrefix: `${seedPrefix}:${durationClass}`,
      iterations: iterationsPerDuration,
      zoneId: configuration.zoneId,
      durationId: duration.durationId,
      configuration,
      candidateStrategy: {
        kind: "student-t",
        degreesOfFreedom: duration.degreesOfFreedom
      }
    });

    const checks = {
      totalVariationDistance:
        report.distance.totalVariationDistance <= thresholds.maxTotalVariationDistance,
      maxAbsoluteTierDelta:
        report.distance.maxAbsoluteTierDelta <= thresholds.maxAbsoluteTierDelta,
      expectedRarityScoreDelta:
        Math.abs(report.expectedRarityScoreDelta) <= thresholds.maxAbsoluteExpectedRarityScoreDelta
    } as const;

    return {
      durationClass,
      durationId: duration.durationId,
      degreesOfFreedom: duration.degreesOfFreedom,
      report,
      checks,
      accepted: Object.values(checks).every(Boolean)
    };
  });

  return {
    iterationsPerDuration,
    thresholds,
    rows,
    accepted: rows.every((row) => row.accepted)
  };
}
