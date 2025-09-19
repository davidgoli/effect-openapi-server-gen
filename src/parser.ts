import { Effect } from "effect"
import type { OpenAPIV3_1 } from "openapi-types"
import type { ParsedOpenAPISpec } from "./types.js"

export interface OpenAPIParseError {
  readonly _tag: "OpenAPIParseError"
  readonly message: string
  readonly cause?: unknown
}

const isValidOpenAPISpec = (spec: unknown): spec is OpenAPIV3_1.Document => {
  if (typeof spec !== "object" || spec === null) {
    return false
  }

  const obj = spec as Record<string, unknown>

  // Check required fields
  if (typeof obj.openapi !== "string" || !obj.openapi.startsWith("3.1")) {
    return false
  }

  if (typeof obj.info !== "object" || obj.info === null) {
    return false
  }

  const info = obj.info as Record<string, unknown>
  if (typeof info.title !== "string" || typeof info.version !== "string") {
    return false
  }

  // paths is required but can be empty
  if (typeof obj.paths !== "object" || obj.paths === null) {
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
      return yield* Effect.fail({
        _tag: "OpenAPIParseError" as const,
        message: "Failed to parse JSON input",
        cause: error
      })
    }

    if (!isValidOpenAPISpec(spec)) {
      return yield* Effect.fail({
        _tag: "OpenAPIParseError" as const,
        message: "Invalid OpenAPI 3.1 specification"
      })
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