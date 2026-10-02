import { describe, expect, it } from "vitest";
import {
  INITIAL_PRODUCTION_MAX_LEVEL,
  resolvePlayerLevelRoleEffects
} from "./index";

describe("player level role contract", () => {
  it("keeps level progression-only at level one", () => {
    expect(resolvePlayerLevelRoleEffects(1)).toEqual({
      level: 1,
      statModifiers: {},
      failureProbabilityMultiplier: 1,
      goldRewardMultiplier: 1,
      zoneRankBonus: 0
    });
  });

  it("keeps level progression-only at the production max level", () => {
    const effects = resolvePlayerLevelRoleEffects(INITIAL_PRODUCTION_MAX_LEVEL);
    expect(effects.statModifiers).toEqual({});
    expect(effects.failureProbabilityMultiplier).toBe(1);
    expect(effects.goldRewardMultiplier).toBe(1);
    expect(effects.zoneRankBonus).toBe(0);
  });

  it("does not create hidden combat stat growth across levels", () => {
    const low = resolvePlayerLevelRoleEffects(1);
    const high = resolvePlayerLevelRoleEffects(INITIAL_PRODUCTION_MAX_LEVEL);
    expect(high.statModifiers).toEqual(low.statModifiers);
  });

  it("does not change failure or Gold economics across levels", () => {
    for (let level = 1; level <= INITIAL_PRODUCTION_MAX_LEVEL; level += 1) {
      const effects = resolvePlayerLevelRoleEffects(level);
      expect(effects.failureProbabilityMultiplier).toBe(1);
      expect(effects.goldRewardMultiplier).toBe(1);
    }
  });

  it("does not bypass Zone Rank gating", () => {
    for (let level = 1; level <= INITIAL_PRODUCTION_MAX_LEVEL; level += 1) {
      expect(resolvePlayerLevelRoleEffects(level).zoneRankBonus).toBe(0);
    }
  });

  it("rejects levels outside the production curve", () => {
    expect(() => resolvePlayerLevelRoleEffects(0)).toThrow(RangeError);
    expect(() => resolvePlayerLevelRoleEffects(INITIAL_PRODUCTION_MAX_LEVEL + 1)).toThrow(RangeError);
    expect(() => resolvePlayerLevelRoleEffects(1.5)).toThrow(RangeError);
  });
});
