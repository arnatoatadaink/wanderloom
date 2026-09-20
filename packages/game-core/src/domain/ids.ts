declare const idBrand: unique symbol;

type BrandedId<Name extends string> = string & {
  readonly [idBrand]: Name;
};

export type PlayerId = BrandedId<"PlayerId">;
export type ExplorationId = BrandedId<"ExplorationId">;
export type ItemInstanceId = BrandedId<"ItemInstanceId">;
export type ItemDefinitionId = BrandedId<"ItemDefinitionId">;
export type ZoneId = BrandedId<"ZoneId">;
