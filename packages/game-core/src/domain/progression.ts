import type { ProgressionState } from "./core-snapshot";

export interface ProgressionRule {
  readonly maxLevel: number;
  readonly expRequiredForLevel: (level: number) => number;
}

export interface ProgressionApplication {
  readonly previous: ProgressionState;
  readonly next: ProgressionState;
  readonly gainedExp: number;
  readonly gainedLevels: number;
}

function assertNonNegativeSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
}

export function applyProgressionExp(
  current: ProgressionState,
  gainedExp: number,
  rule: ProgressionRule
): ProgressionApplication {
  assertNonNegativeSafeInteger(current.level, "level");
  assertNonNegativeSafeInteger(current.exp, "exp");
  assertNonNegativeSafeInteger(current.gold, "gold");
  assertNonNegativeSafeInteger(gainedExp, "gainedExp");
  if (!Number.isSafeInteger(rule.maxLevel) || rule.maxLevel < 1) {
    throw new RangeError("maxLevel must be a positive safe integer");
  }
  if (current.level < 1 || current.level > rule.maxLevel) {
    throw new RangeError("level must be within the progression rule bounds");
  }
  if (current.exp > Number.MAX_SAFE_INTEGER - gainedExp) {
    throw new RangeError("exp overflow");
  }

  let level = current.level;
  let exp = current.exp + gainedExp;

  while (level < rule.maxLevel) {
    const required = rule.expRequiredForLevel(level);
    if (!Number.isSafeInteger(required) || required <= 0) {
      throw new RangeError("expRequiredForLevel must return a positive safe integer");
    }
    if (exp < required) break;
    exp -= required;
    level += 1;
  }

  if (level === rule.maxLevel) {
    exp = 0;
  }

  return {
    previous: current,
    next: { ...current, level, exp },
    gainedExp,
    gainedLevels: level - current.level
  };
}
