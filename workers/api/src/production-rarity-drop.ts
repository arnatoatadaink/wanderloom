import {
  buildProductionZoneRarityStrategy,
  getProductionZoneContent,
  resolveSeededRarityDrops,
  type ActiveExploration,
  type ItemDefinitionId,
  type ItemRarity,
  type RarityGeneratedDrop,
  type ZoneRewardConfiguration
} from "@wanderloom/game-core";
import { resolveProductionDuration } from "./production-zone-catalog";

const ITEM_BY_RARITY: Readonly<Record<ItemRarity, ItemDefinitionId>> = {
  Common: "production-common-relic" as ItemDefinitionId,
  Uncommon: "production-uncommon-relic" as ItemDefinitionId,
  Rare: "production-rare-relic" as ItemDefinitionId,
  Epic: "production-epic-relic" as ItemDefinitionId,
  Legend: "production-legend-relic" as ItemDefinitionId,
  Mythic: "production-mythic-relic" as ItemDefinitionId,
  Phantasm: "production-phantasm-relic" as ItemDefinitionId
};

const RARITIES: readonly ItemRarity[] = [
  "Common",
  "Uncommon",
  "Rare",
  "Epic",
  "Legend",
  "Mythic",
  "Phantasm"
];

function buildProductionRewardConfiguration(
  exploration: ActiveExploration
): ZoneRewardConfiguration | null {
  const duration = resolveProductionDuration(
    exploration.zoneId,
    exploration.durationId
  );
  if (duration === null) return null;

  return {
    zoneId: exploration.zoneId,
    drops: RARITIES.map((rarity) => ({
      itemDefinitionId: ITEM_BY_RARITY[rarity],
      rarity,
      weight: 1
    })),
    durations: [
      {
        durationId: exploration.durationId,
        dropCount: 1
      }
    ]
  };
}

export function resolveProductionGeneratedDrops(
  exploration: ActiveExploration
): readonly RarityGeneratedDrop[] | null {
  const duration = resolveProductionDuration(
    exploration.zoneId,
    exploration.durationId
  );
  if (duration === null) return null;

  const zone = getProductionZoneContent(exploration.zoneId);
  const configuration = buildProductionRewardConfiguration(exploration);
  if (configuration === null) return null;

  return resolveSeededRarityDrops({
    seed: exploration.seed,
    zoneId: exploration.zoneId,
    durationId: exploration.durationId,
    configuration,
    strategy: buildProductionZoneRarityStrategy(
      zone.rarityTier,
      duration.durationClass
    )
  });
}
