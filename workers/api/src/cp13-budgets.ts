export const CP13_PAYLOAD_BUDGET_BYTES = {
  zoneCatalog: 2 * 1024,
  state: 4 * 1024,
  inventory: 8 * 1024,
  claim: 16 * 1024
} as const;

export const CP13_SNAPSHOT_BUDGET_BYTES = {
  core: 4 * 1024,
  inventory: 8 * 1024,
  archiveEntry: 8 * 1024
} as const;
