import { describe, expect, it } from "vitest";

import {
  instantiateDrop,
  type GeneratedDrop,
  type ItemDefinitionId,
  type ItemInstanceId
} from "./index";

describe("M1 reward/drop contract", () => {
  it("materializes a generated drop into an inventory item instance", () => {
    const generatedDrop: GeneratedDrop = {
      itemDefinitionId: "item-m1-test" as ItemDefinitionId
    };

    expect(
      instantiateDrop({
        generatedDrop,
        itemInstanceId: "item-instance-1" as ItemInstanceId,
        createdAt: "2026-09-22T00:00:00.000Z"
      })
    ).toEqual({
      itemInstanceId: "item-instance-1",
      itemDefinitionId: "item-m1-test",
      createdAt: "2026-09-22T00:00:00.000Z"
    });
  });
});
