export type FormationClass = "Solo" | "Party" | "Caravan";
export type DurationClass = "Short" | "Medium" | "Long";

export interface FormationEconomyParameters {
  readonly baseOperationalCost: Readonly<Record<FormationClass, number>>;
  readonly durationCostMultiplier: Readonly<Record<DurationClass, number>>;
  readonly durationHours: Readonly<Record<DurationClass, number>>;
  readonly grossReward: Readonly<Record<FormationClass, Readonly<Record<DurationClass, number>>>>;
}

export interface FormationEconomyInput {
  readonly formationClass: FormationClass;
  readonly participantCount: number;
  readonly durationClass: DurationClass;
  readonly operationalCostReduction?: number;
  readonly travelCost?: number;
  readonly explicitContentCost?: number;
  readonly parameters?: FormationEconomyParameters;
}

export interface FormationEconomyMetrics {
  readonly formationClass: FormationClass;
  readonly participantCount: number;
  readonly durationClass: DurationClass;
  readonly durationHours: number;
  readonly grossReward: number;
  readonly baseOperationalCost: number;
  readonly costReduction: number;
  readonly effectiveOperationalCost: number;
  readonly travelCost: number;
  readonly explicitContentCost: number;
  readonly finalGoldRequirement: number;
  readonly netReward: number;
  readonly netRewardPerParticipant: number;
  readonly netRewardPerHour: number;
  readonly netRewardPerParticipantPerHour: number;
  readonly operationalCostShare: number;
}

export const INITIAL_FORMATION_ECONOMY_PARAMETERS: FormationEconomyParameters = {
  baseOperationalCost: {
    Solo: 0,
    Party: 1,
    Caravan: 4
  },
  durationCostMultiplier: {
    Short: 1,
    Medium: 3,
    Long: 8
  },
  durationHours: {
    Short: 0.5,
    Medium: 2,
    Long: 8
  },
  grossReward: {
    Solo: { Short: 10, Medium: 40, Long: 120 },
    Party: { Short: 22, Medium: 70, Long: 180 },
    Caravan: { Short: 45, Medium: 120, Long: 260 }
  }
};

function requireNonNegativeFinite(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be a finite non-negative number`);
  return value;
}

function validateParticipantCount(formationClass: FormationClass, participantCount: number): void {
  if (!Number.isSafeInteger(participantCount) || participantCount <= 0) {
    throw new RangeError("participantCount must be a positive safe integer");
  }
  if (formationClass === "Solo" && participantCount !== 1) {
    throw new RangeError("Solo requires exactly one participant");
  }
  if (formationClass === "Party" && (participantCount < 2 || participantCount > 4)) {
    throw new RangeError("Party requires 2 to 4 participants in the initial model");
  }
  if (formationClass === "Caravan" && (participantCount < 5 || participantCount > 12)) {
    throw new RangeError("Caravan requires 5 to 12 participants in the initial model");
  }
}

export function calculateFormationEconomy(input: FormationEconomyInput): FormationEconomyMetrics {
  validateParticipantCount(input.formationClass, input.participantCount);
  const parameters = input.parameters ?? INITIAL_FORMATION_ECONOMY_PARAMETERS;
  const reduction = input.operationalCostReduction ?? 0;
  if (!Number.isFinite(reduction) || reduction < 0 || reduction > 1) {
    throw new RangeError("operationalCostReduction must be between 0 and 1");
  }
  const travelCost = requireNonNegativeFinite(input.travelCost ?? 0, "travelCost");
  const explicitContentCost = requireNonNegativeFinite(input.explicitContentCost ?? 0, "explicitContentCost");

  const baseCost = requireNonNegativeFinite(
    parameters.baseOperationalCost[input.formationClass],
    "baseOperationalCost"
  );
  const durationMultiplier = requireNonNegativeFinite(
    parameters.durationCostMultiplier[input.durationClass],
    "durationCostMultiplier"
  );
  const durationHours = parameters.durationHours[input.durationClass];
  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    throw new RangeError("durationHours must be a positive finite number");
  }
  const grossReward = requireNonNegativeFinite(
    parameters.grossReward[input.formationClass][input.durationClass],
    "grossReward"
  );

  const baseOperationalCost = baseCost * durationMultiplier;
  const effectiveOperationalCost = Math.max(0, baseOperationalCost * (1 - reduction));
  const finalGoldRequirement = effectiveOperationalCost + travelCost + explicitContentCost;
  const netReward = grossReward - finalGoldRequirement;

  return {
    formationClass: input.formationClass,
    participantCount: input.participantCount,
    durationClass: input.durationClass,
    durationHours,
    grossReward,
    baseOperationalCost,
    costReduction: reduction,
    effectiveOperationalCost,
    travelCost,
    explicitContentCost,
    finalGoldRequirement,
    netReward,
    netRewardPerParticipant: netReward / input.participantCount,
    netRewardPerHour: netReward / durationHours,
    netRewardPerParticipantPerHour: netReward / input.participantCount / durationHours,
    operationalCostShare: grossReward === 0 ? 0 : effectiveOperationalCost / grossReward
  };
}

/**
 * Extension seam for future parameter-driven operational cost formulas.
 * The initial model uses formation class and duration only; later models can
 * replace the supplied parameter tables without changing callers.
 */
export function calculateParameterizedOperationalCost(input: {
  readonly formationClass: FormationClass;
  readonly participantCount: number;
  readonly durationClass: DurationClass;
  readonly baseFormationCost: number;
  readonly durationMultiplier: number;
  readonly coordinationCost?: number;
  readonly logisticsCost?: number;
  readonly travelCost?: number;
  readonly otherCost?: number;
  readonly costReduction?: number;
}): number {
  validateParticipantCount(input.formationClass, input.participantCount);
  const reduction = input.costReduction ?? 0;
  if (!Number.isFinite(reduction) || reduction < 0 || reduction > 1) {
    throw new RangeError("costReduction must be between 0 and 1");
  }
  const base = requireNonNegativeFinite(input.baseFormationCost, "baseFormationCost");
  const duration = requireNonNegativeFinite(input.durationMultiplier, "durationMultiplier");
  const coordination = requireNonNegativeFinite(input.coordinationCost ?? 0, "coordinationCost");
  const logistics = requireNonNegativeFinite(input.logisticsCost ?? 0, "logisticsCost");
  const travel = requireNonNegativeFinite(input.travelCost ?? 0, "travelCost");
  const other = requireNonNegativeFinite(input.otherCost ?? 0, "otherCost");

  const reducibleOperationalSubtotal = base * duration + coordination + logistics;
  return Math.max(0, reducibleOperationalSubtotal * (1 - reduction)) + travel + other;
}
