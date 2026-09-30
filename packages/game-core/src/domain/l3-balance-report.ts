import {
  calculateFormationEconomy,
  type DurationClass,
  type FormationClass,
  type FormationEconomyMetrics,
  type FormationEconomyParameters,
  INITIAL_FORMATION_ECONOMY_PARAMETERS
} from "./formation-economy-model";
import {
  buildDurationRarityDistribution,
  calculateRarityOpportunityMetrics,
  INITIAL_DURATION_RARITY_DF,
  INITIAL_MEDIUM_T_THRESHOLDS,
  type DurationRarityThresholds,
  type RarityOpportunityMetrics
} from "./duration-rarity-model";
import type { ItemRarity } from "./rarity-zone-rewards";

export interface L3BalanceScenarioRow {
  readonly formation: FormationEconomyMetrics;
  readonly rarity: RarityOpportunityMetrics;
}

export interface L3BalanceAcceptance {
  readonly totalOutputOrdering: boolean;
  readonly shortSoloCompetitiveness: boolean;
  readonly mediumSoloEfficiency: boolean;
  readonly longSoloEfficiency: boolean;
  readonly groupGrossAdvantageShrinksWithDuration: boolean;
  readonly expectedRarityScoreImprovesWithDuration: boolean;
  readonly epicOrBetterImprovesWithDuration: boolean;
  readonly legendOrBetterImprovesWithDuration: boolean;
  readonly mythicOrBetterImprovesWithDuration: boolean;
  readonly phantasmImprovesWithDuration: boolean;
  readonly passed: boolean;
}

export interface L3BalanceReport {
  readonly rows: readonly L3BalanceScenarioRow[];
  readonly acceptance: L3BalanceAcceptance;
}

export interface L3BalanceReportInput {
  readonly participantCounts?: Partial<Record<FormationClass, number>>;
  readonly economyParameters?: FormationEconomyParameters;
  readonly rarityThresholds?: DurationRarityThresholds;
  readonly rarityDegreesOfFreedom?: Partial<Record<DurationClass, number>>;
  readonly reachableRarities?: readonly ItemRarity[];
}

const FORMATIONS: readonly FormationClass[] = ["Solo", "Party", "Caravan"];
const DURATIONS: readonly DurationClass[] = ["Short", "Medium", "Long"];

const DEFAULT_PARTICIPANTS: Readonly<Record<FormationClass, number>> = {
  Solo: 1,
  Party: 2,
  Caravan: 5
};

function dfForDuration(
  duration: DurationClass,
  overrides?: Partial<Record<DurationClass, number>>
): number {
  const override = overrides?.[duration];
  if (override !== undefined) return override;
  if (duration === "Short") return INITIAL_DURATION_RARITY_DF.short;
  if (duration === "Medium") return INITIAL_DURATION_RARITY_DF.medium;
  return INITIAL_DURATION_RARITY_DF.long;
}

function rarityForDuration(
  duration: DurationClass,
  input: L3BalanceReportInput
): RarityOpportunityMetrics {
  const probabilityByRarity = buildDurationRarityDistribution({
    degreesOfFreedom: dfForDuration(duration, input.rarityDegreesOfFreedom),
    thresholds: input.rarityThresholds ?? INITIAL_MEDIUM_T_THRESHOLDS,
    reachableRarities: input.reachableRarities
  });
  return calculateRarityOpportunityMetrics(probabilityByRarity);
}

function rowFor(
  formationClass: FormationClass,
  durationClass: DurationClass,
  input: L3BalanceReportInput,
  rarity: RarityOpportunityMetrics
): L3BalanceScenarioRow {
  return {
    formation: calculateFormationEconomy({
      formationClass,
      participantCount: input.participantCounts?.[formationClass] ?? DEFAULT_PARTICIPANTS[formationClass],
      durationClass,
      parameters: input.economyParameters ?? INITIAL_FORMATION_ECONOMY_PARAMETERS
    }),
    rarity
  };
}

function byScenario(
  rows: readonly L3BalanceScenarioRow[],
  formation: FormationClass,
  duration: DurationClass
): L3BalanceScenarioRow {
  const row = rows.find(
    (candidate) =>
      candidate.formation.formationClass === formation && candidate.formation.durationClass === duration
  );
  if (!row) throw new RangeError("missing L3 balance scenario row");
  return row;
}

function bestGroupPerParticipant(rows: readonly L3BalanceScenarioRow[], duration: DurationClass): number {
  return Math.max(
    byScenario(rows, "Party", duration).formation.netRewardPerParticipant,
    byScenario(rows, "Caravan", duration).formation.netRewardPerParticipant
  );
}

function bestGroupPerParticipantPerHour(
  rows: readonly L3BalanceScenarioRow[],
  duration: DurationClass
): number {
  return Math.max(
    byScenario(rows, "Party", duration).formation.netRewardPerParticipantPerHour,
    byScenario(rows, "Caravan", duration).formation.netRewardPerParticipantPerHour
  );
}

function ratio(rows: readonly L3BalanceScenarioRow[], formation: FormationClass, duration: DurationClass): number {
  return (
    byScenario(rows, formation, duration).formation.grossReward /
    byScenario(rows, "Solo", duration).formation.grossReward
  );
}

function monotonicNonDecreasing(a: number, b: number, c: number): boolean {
  return a <= b && b <= c;
}

export function buildInitialL3BalanceReport(input: L3BalanceReportInput = {}): L3BalanceReport {
  const rarityByDuration = new Map<DurationClass, RarityOpportunityMetrics>(
    DURATIONS.map((duration) => [duration, rarityForDuration(duration, input)])
  );

  const rows = FORMATIONS.flatMap((formation) =>
    DURATIONS.map((duration) => rowFor(formation, duration, input, rarityByDuration.get(duration)!))
  );

  const totalOutputOrdering = DURATIONS.every((duration) => {
    const solo = byScenario(rows, "Solo", duration).formation.netReward;
    const party = byScenario(rows, "Party", duration).formation.netReward;
    const caravan = byScenario(rows, "Caravan", duration).formation.netReward;
    return solo < party && party < caravan;
  });

  const shortSolo = byScenario(rows, "Solo", "Short").formation;
  const shortSoloCompetitiveness =
    shortSolo.netRewardPerParticipant >= 0.9 * bestGroupPerParticipant(rows, "Short") &&
    shortSolo.netRewardPerParticipantPerHour >=
      0.9 * bestGroupPerParticipantPerHour(rows, "Short");

  const mediumSolo = byScenario(rows, "Solo", "Medium").formation;
  const mediumSoloEfficiency =
    mediumSolo.netRewardPerParticipant >= bestGroupPerParticipant(rows, "Medium") &&
    mediumSolo.netRewardPerParticipantPerHour >= bestGroupPerParticipantPerHour(rows, "Medium");

  const longSolo = byScenario(rows, "Solo", "Long").formation;
  const longSoloEfficiency =
    longSolo.netRewardPerParticipant > bestGroupPerParticipant(rows, "Long") &&
    longSolo.netRewardPerParticipantPerHour > bestGroupPerParticipantPerHour(rows, "Long");

  const groupGrossAdvantageShrinksWithDuration = (["Party", "Caravan"] as const).every(
    (formation) =>
      ratio(rows, formation, "Short") >= ratio(rows, formation, "Medium") &&
      ratio(rows, formation, "Medium") >= ratio(rows, formation, "Long")
  );

  const shortRarity = rarityByDuration.get("Short")!;
  const mediumRarity = rarityByDuration.get("Medium")!;
  const longRarity = rarityByDuration.get("Long")!;
  const expectedRarityScoreImprovesWithDuration = monotonicNonDecreasing(
    shortRarity.expectedRarityScore,
    mediumRarity.expectedRarityScore,
    longRarity.expectedRarityScore
  );
  const epicOrBetterImprovesWithDuration = monotonicNonDecreasing(
    shortRarity.epicOrBetterProbability,
    mediumRarity.epicOrBetterProbability,
    longRarity.epicOrBetterProbability
  );
  const legendOrBetterImprovesWithDuration = monotonicNonDecreasing(
    shortRarity.legendOrBetterProbability,
    mediumRarity.legendOrBetterProbability,
    longRarity.legendOrBetterProbability
  );
  const mythicOrBetterImprovesWithDuration = monotonicNonDecreasing(
    shortRarity.mythicOrBetterProbability,
    mediumRarity.mythicOrBetterProbability,
    longRarity.mythicOrBetterProbability
  );
  const phantasmImprovesWithDuration = monotonicNonDecreasing(
    shortRarity.phantasmProbability,
    mediumRarity.phantasmProbability,
    longRarity.phantasmProbability
  );

  const acceptanceWithoutPassed = {
    totalOutputOrdering,
    shortSoloCompetitiveness,
    mediumSoloEfficiency,
    longSoloEfficiency,
    groupGrossAdvantageShrinksWithDuration,
    expectedRarityScoreImprovesWithDuration,
    epicOrBetterImprovesWithDuration,
    legendOrBetterImprovesWithDuration,
    mythicOrBetterImprovesWithDuration,
    phantasmImprovesWithDuration
  };

  return {
    rows,
    acceptance: {
      ...acceptanceWithoutPassed,
      passed: Object.values(acceptanceWithoutPassed).every(Boolean)
    }
  };
}
