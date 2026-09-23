import { describe, expect, it } from "vitest";
import { applyProgressionExp, type ProgressionRule, type ProgressionState } from "./index";

const rule: ProgressionRule = {
  maxLevel: 4,
  expRequiredForLevel: (level) => level * 10
};
const base: ProgressionState = { level: 1, exp: 0, gold: 5 };

describe("CP-21 growth/progression contract", () => {
  it("applies EXP deterministically without changing gold", () => {
    const first = applyProgressionExp(base, 7, rule);
    const second = applyProgressionExp(base, 7, rule);
    expect(second).toEqual(first);
    expect(first.next).toEqual({ level: 1, exp: 7, gold: 5 });
  });

  it("carries excess EXP across multiple levels", () => {
    expect(applyProgressionExp(base, 35, rule).next).toEqual({
      level: 3,
      exp: 5,
      gold: 5
    });
  });

  it("caps at max level and discards further EXP", () => {
    expect(applyProgressionExp({ level: 3, exp: 29, gold: 0 }, 100, rule).next)
      .toEqual({ level: 4, exp: 0, gold: 0 });
  });

  it("rejects negative, unsafe and overflow inputs", () => {
    expect(() => applyProgressionExp(base, -1, rule)).toThrow(RangeError);
    expect(() =>
      applyProgressionExp({ ...base, exp: Number.MAX_SAFE_INTEGER }, 1, rule)
    ).toThrow(RangeError);
  });
});
