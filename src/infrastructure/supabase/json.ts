export type JsonPrimitive = string | number | boolean | null;
export type Json = JsonPrimitive | Json[] | { [key: string]: Json };

export function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export function fromJson<TValue>(value: Json | null | undefined): TValue | null {
  if (value === null || value === undefined) return null;

  return value as TValue;
}
