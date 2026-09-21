export interface JsonByteMeasurement {
  readonly bytes: number;
  readonly json: string;
}

export function measureJsonUtf8(value: unknown): JsonByteMeasurement {
  const json = JSON.stringify(value);
  return {
    bytes: new TextEncoder().encode(json).byteLength,
    json
  };
}
