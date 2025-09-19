import { Effect } from "effect"
import type { OpenAPIV3_1 } from "openapi-types"
import type { ParsedOpenAPISpec } from "./types.js"
import { createOpenAPIParseError } from "./error-utils.js"
import { isRecord, getProperty } from "./type-utils.js"

export type OpenAPIParseError = ReturnType<typeof createOpenAPIParseError>

const isValidOpenAPISpec = (spec: unknown): spec is OpenAPIV3_1.Document => {
  if (!isRecord(spec)) {
    return false
  }

  // Check required fields using type-safe utilities
  const openapi = getProperty(spec, "openapi", (v): v is string => typeof v === "string")
  if (!openapi || !openapi.startsWith("3.1")) {
    return false
  }

  const info = getProperty(spec, "info", isRecord)
  if (!info) {
    return false
  }

  const title = getProperty(info, "title", (v): v is string => typeof v === "string")
  const version = getProperty(info, "version", (v): v is string => typeof v === "string")
  if (!title || !version) {
    return false
  }

  // paths is required but can be empty
  const paths = getProperty(spec, "paths", isRecord)
  if (!paths) {
    return false
  }

  return true
}

export const parseOpenAPI = (
  input: string | Record<string, unknown>
): Effect.Effect<ParsedOpenAPISpec, OpenAPIParseError> =>
  Effect.gen(function* () {
    let spec: unknown

    try {
      if (typeof input === "string") {
        spec = JSON.parse(input)
      } else {
        spec = input
      }
    } catch (error) {
      return yield* Effect.fail(
        createOpenAPIParseError("Failed to parse JSON input", error)
      )
    }

    if (!isValidOpenAPISpec(spec)) {
      return yield* Effect.fail(
        createOpenAPIParseError("Invalid OpenAPI 3.1 specification")
      )
    }

    return {
      openapi: spec.openapi,
      info: spec.info,
      paths: spec.paths ?? {},
      components: spec.components,
      servers: spec.servers,
      webhooks: spec.webhooks
    } satisfies ParsedOpenAPISpec
  })