import { describe, expect, it } from "vitest";

import {
  createExpeditionRiskPreview,
  resolveExpeditionRewards,
  type GeneratedDrop,
  type ItemDefinitionId,
  type LossPolicy
} from "./index";

const drops: readonly GeneratedDrop[] = [
  { itemDefinitionId: "cp20-drop" as ItemDefinitionId }
];

const lossPolicy: LossPolicy = {
  retainedGoldRatio: 0.5,
  retainedExpRatio: 0.25,
  retainGeneratedDrops: false
};

describe("CP-20 failure/drop-loss contract", () => {
  it("keeps the M1 success path lossless", () => {
    expect(
      resolveExpeditionRewards({
        outcome: "success",
        generatedGold: 6,
        generatedExp: 10,
        generatedDrops: drops,
        lossPolicy
      })
    ).toEqual({
      outcome: "success",
      retainedGold: 6,
      retainedExp: 10,
      retainedDrops: drops,
      lostGold: 0,
      lostExp: 0,
      lostDrops: []
    });
  });

  it("separates failure consequence from failure probability", () => {
    expect(createExpeditionRiskPreview(0.2, lossPolicy)).toEqual({
      failureProbability: 0.2,
      lossPolicy
    });

    expect(
      resolveExpeditionRewards({
        outcome: "failure",
        generatedGold: 11,
        generatedExp: 10,
        generatedDrops: drops,
        lossPolicy
      })
    ).toEqual({
      outcome: "failure",
      retainedGold: 5,
      retainedExp: 2,
      retainedDrops: [],
      lostGold: 6,
      lostExp: 8,
      lostDrops: drops
    });
  });

  it("does not put existing inventory/equipment in the loss contract", () => {
    const result = resolveExpeditionRewards({
      outcome: "failure",
      generatedGold: 0,
      generatedExp: 0,
      generatedDrops: drops,
      lossPolicy
    });
    expect(result.lostDrops).toEqual(drops);
    expect(Object.keys(result)).not.toContain("equipment");
    expect(Object.keys(result)).not.toContain("inventory");
  });

  it("rejects invalid probability and retention ratios", () => {
    expect(() => createExpeditionRiskPreview(1.01, lossPolicy)).toThrow(RangeError);
    expect(() =>
      resolveExpeditionRewards({
        outcome: "failure",
        generatedGold: 1,
        generatedExp: 1,
        generatedDrops: [],
        lossPolicy: { ...lossPolicy, retainedGoldRatio: -0.1 }
      })
    ).toThrow(RangeError);
  });
});
