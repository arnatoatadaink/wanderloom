import {
  readPlayerZoneRank,
  type PlayerCoreSnapshot
} from "@wanderloom/game-core";
import { buildProductionZonePreview } from "./production-zone-preview";

export interface ProductionZoneApiResponse {
  readonly ok: true;
  readonly zones: ReturnType<typeof buildProductionZonePreview>;
}

export function buildProductionZoneApiResponse(
  core: PlayerCoreSnapshot
): ProductionZoneApiResponse {
  return {
    ok: true,
    zones: buildProductionZonePreview(readPlayerZoneRank(core))
  };
}
