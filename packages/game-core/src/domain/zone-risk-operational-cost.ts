import type { FormationClass } from "./formation-economy-model";

export interface ZoneRiskOperationalCostParameters {
  readonly formationSensitivity: Readonly<Record<FormationClass, number>>;
}

export interface ZoneRiskOperationalCostInput {
  readonly formationClass: FormationClass;
  readonly riskIndex: number;
  readonly zoneRewardScale: number;
  readonly parameters?: ZoneRiskOperationalCostParameters;
}

export const INITIAL_ZONE_RISK_OPERATIONAL_COST_PARAMETERS: ZoneRiskOperationalCostParameters = {
  formationSensitivity: {
    Solo: 0,
    Party: 2.6,
    Caravan: 3.2
  }
};

function requireNonNegativeFinite(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite non-negative number`);
  }
  return value;
}

export function calculateZoneRiskOperationalCostMultiplier(
  input: ZoneRiskOperationalCostInput
): number {
  if (!Number.isFinite(input.riskIndex) || input.riskIndex < 0 || input.riskIndex > 1) {
    throw new RangeError("riskIndex must be between 0 and 1");
  }
  const zoneRewardScale = requireNonNegativeFinite(input.zoneRewardScale, "zoneRewardScale");
  const parameters = input.parameters ?? INITIAL_ZONE_RISK_OPERATIONAL_COST_PARAMETERS;
  const sensitivity = requireNonNegativeFinite(
    parameters.formationSensitivity[input.formationClass],
    "formationSensitivity"
  );

  return 1 + sensitivity * input.riskIndex * zoneRewardScale;
}
