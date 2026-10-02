import { applyProgressionExp } from "./progression";
import { calculateProductionLossPolicyExpectation, INITIAL_PRODUCTION_LOSS_POLICY } from "./production-loss-policy-calibration";
import { INITIAL_PRODUCTION_ZONE_CONTENT_MAP } from "./production-zone-content-map";
import { getProductionZoneExpReward } from "./production-zone-exp-reward";
import { calculateRiskFailureProbability } from "./risk-failure-probability";
import {
  INITIAL_PRODUCTION_PROGRESSION_RULE,
  estimateRunsToNextLevel
} from "./production-progression-curve";
import type { DurationClass } from "./formation-economy-model";

export interface ProductionProgressionScenarioRow {
  readonly zoneId: string;
  readonly zoneName: string;
  readonly durationClass: DurationClass;
  readonly generatedExp: number;
  readonly expectedExp: number;
  readonly expectedExpPerHour: number;
  readonly expectedRunsToLevelTwo: number;
  readonly successLevelsGainedFromLevelOne: number;
  readonly failureLevelsGainedFromLevelOne: number;
}

export interface ProductionProgressionScenarioReport {
  readonly rows: readonly ProductionProgressionScenarioRow[];
  readonly starterShortExpectedRunsToLevelTwo: number;
  readonly maximumSuccessLevelsGainedFromLevelOne: number;
  readonly maximumFailureLevelsGainedFromLevelOne: number;
}

const DURATIONS: readonly DurationClass[] = ["Short", "Medium", "Long"];

export function buildProductionProgressionScenarioReport(): ProductionProgressionScenarioReport {
  const rows: ProductionProgressionScenarioRow[] = [];

  for (const zone of INITIAL_PRODUCTION_ZONE_CONTENT_MAP) {
    for (const durationClass of DURATIONS) {
      const expReward = getProductionZoneExpReward(zone.zoneId, durationClass);
      const risk = calculateRiskFailureProbability({
        riskIndex: zone.riskIndex,
        durationClass
      });
      const expectation = calculateProductionLossPolicyExpectation({
        failureProbability: risk.failureProbability,
        generatedGold: 0,
        generatedExp: expReward.generatedExp
      });
      const retainedFailureExp = Math.floor(
        expReward.generatedExp * INITIAL_PRODUCTION_LOSS_POLICY.retainedExpRatio
      );
      const success = applyProgressionExp(
        { level: 1, exp: 0, gold: 0 },
        expReward.generatedExp,
        INITIAL_PRODUCTION_PROGRESSION_RULE
      );
      const failure = applyProgressionExp(
        { level: 1, exp: 0, gold: 0 },
        retainedFailureExp,
        INITIAL_PRODUCTION_PROGRESSION_RULE
      );

      rows.push({
        zoneId: zone.zoneId,
        zoneName: zone.displayName,
        durationClass,
        generatedExp: expReward.generatedExp,
        expectedExp: expectation.expectedExp,
        expectedExpPerHour: expectation.expectedExp / expReward.durationHours,
        expectedRunsToLevelTwo: estimateRunsToNextLevel({
          level: 1,
          expectedExpPerRun: expectation.expectedExp
        }),
        successLevelsGainedFromLevelOne: success.gainedLevels,
        failureLevelsGainedFromLevelOne: failure.gainedLevels
      });
    }
  }

  const starterShort = rows.find(
    (row) => row.zoneId === INITIAL_PRODUCTION_ZONE_CONTENT_MAP[0]!.zoneId && row.durationClass === "Short"
  )!;

  return {
    rows,
    starterShortExpectedRunsToLevelTwo: starterShort.expectedRunsToLevelTwo,
    maximumSuccessLevelsGainedFromLevelOne: Math.max(
      ...rows.map((row) => row.successLevelsGainedFromLevelOne)
    ),
    maximumFailureLevelsGainedFromLevelOne: Math.max(
      ...rows.map((row) => row.failureLevelsGainedFromLevelOne)
    )
  };
}
