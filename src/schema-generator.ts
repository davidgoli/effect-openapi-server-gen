import { Effect } from "effect"
import type { OpenAPIV3_1 } from "openapi-types"
import { generateSchemaCode } from "./schema-utils.js"
import { createSchemaGenerationError } from "./error-utils.js"

export type SchemaGenerationError = ReturnType<typeof createSchemaGenerationError>

export const generateEffectSchema = (
  schema: OpenAPIV3_1.SchemaObject,
  name?: string
): Effect.Effect<string, SchemaGenerationError> =>
  Effect.sync(() => {
    const schemaCode = generateSchemaCode(schema, { isOptional: false })

    if (name) {
      return `export const ${name} = ${schemaCode}`
    }

    return schemaCode
  })

export const generateSchemasFromComponents = (
  components?: OpenAPIV3_1.ComponentsObject
): Effect.Effect<string, SchemaGenerationError> =>
  Effect.sync(() => {
    if (!components?.schemas) {
      return ""
    }

    const imports = 'import { Schema } from "@effect/schema"'

    const schemas = Object.entries(components.schemas).map(([name, schema]) => {
      const schemaCode = generateSchemaCode(schema, { isOptional: false })
      return `export const ${name} = ${schemaCode}`
    })

    return [imports, "", ...schemas].join("\n")
  })