// Branded type for better type safety
export type Brand<T, B> = T & { readonly __brand: B }

// Specific branded types for the application
export type ValidatedJSON = Brand<Record<string, unknown>, "ValidatedJSON">
export type ParsedQueryParams = Brand<Record<string, unknown>, "ParsedQueryParams">
export type ValidatedRequestParams = Brand<Record<string, unknown>, "ValidatedRequestParams">

// Type guards for better runtime safety
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const hasProperty = <K extends string>(
  obj: Record<string, unknown>,
  key: K
): obj is Record<string, unknown> & Record<K, unknown> =>
  key in obj

export const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every(v => typeof v === "string")

// Utility for safe property access
export const getProperty = <T>(
  obj: Record<string, unknown>,
  key: string,
  guard: (value: unknown) => value is T
): T | undefined => {
  if (!hasProperty(obj, key)) return undefined
  const value = obj[key]
  return guard(value) ? value : undefined
}