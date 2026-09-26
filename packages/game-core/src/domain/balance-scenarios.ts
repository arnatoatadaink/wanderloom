import {
  simulateBalance,
  type BalanceSimulationInput,
  type BalanceSimulationReport
} from "./balance-simulator";
import type { ItemRarity } from "./rarity-zone-rewards";

export interface BalanceScenarioInput {
  readonly scenarioId: string;
  readonly durationMs: number;
  readonly simulation: BalanceSimulationInput;
}

export interface BalanceScenarioReport {
  readonly scenarioId: string;
  readonly durationMs: number;
  readonly simulation: BalanceSimulationReport;
  readonly retainedGoldPerMinute: number;
  readonly retainedExpPerMinute: number;
  readonly generatedDropsPerMinute: number;
  readonly retainedDropsPerMinute: number;
  readonly rarityRates: Readonly<Partial<Record<ItemRarity, number>>>;
}

function perMinute(valuePerRun: number, durationMs: number): number {
  return valuePerRun * (60_000 / durationMs);
}

export function simulateBalanceScenario(
  input: BalanceScenarioInput
): BalanceScenarioReport {
  if (input.scenarioId.trim().length === 0) {
    throw new RangeError("scenarioId must not be empty");
  }
  if (!Number.isFinite(input.durationMs) || input.durationMs <= 0) {
    throw new RangeError("durationMs must be a positive finite number");
  }

  const simulation = simulateBalance(input.simulation);
  const generatedDropsPerRun =
    simulation.generatedDropCount / simulation.iterations;
  const retainedDropsPerRun =
    simulation.retainedDropCount / simulation.iterations;
  const rarityRates: Partial<Record<ItemRarity, number>> = {};

  if (simulation.generatedDropCount > 0) {
    for (const [rarity, count] of Object.entries(simulation.rarityCounts)) {
      if (count !== undefined) {
        rarityRates[rarity as ItemRarity] =
          count / simulation.generatedDropCount;
      }
    }
  }

  return {
    scenarioId: input.scenarioId,
    durationMs: input.durationMs,
    simulation,
    retainedGoldPerMinute: perMinute(
      simulation.retainedGoldPerRun,
      input.durationMs
    ),
    retainedExpPerMinute: perMinute(
      simulation.retainedExpPerRun,
      input.durationMs
    ),
    generatedDropsPerMinute: perMinute(
      generatedDropsPerRun,
      input.durationMs
    ),
    retainedDropsPerMinute: perMinute(
      retainedDropsPerRun,
      input.durationMs
    ),
    rarityRates
  };
}

export function simulateBalanceScenarios(
  inputs: readonly BalanceScenarioInput[]
): readonly BalanceScenarioReport[] {
  const seen = new Set<string>();

  return inputs.map((input) => {
    if (seen.has(input.scenarioId)) {
      throw new RangeError("scenarioId must be unique");
    }
    seen.add(input.scenarioId);
    return simulateBalanceScenario(input);
  });
}
