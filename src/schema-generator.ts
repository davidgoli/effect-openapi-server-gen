import { Effect } from "effect"
import type { OpenAPIV3_1 } from "openapi-types"

export interface SchemaGenerationError {
  readonly _tag: "SchemaGenerationError"
  readonly message: string
  readonly cause?: unknown
}

const generateSchemaCode = (schema: OpenAPIV3_1.SchemaObject, isOptional = false): string => {
  const wrapOptional = (code: string): string =>
    isOptional ? `Schema.optional(${code})` : code

  if (schema.enum) {
    const enumValues = schema.enum.map(value => `"${value}"`).join(", ")
    return wrapOptional(`Schema.Literal(${enumValues})`)
  }

  switch (schema.type) {
    case "string":
      return wrapOptional("Schema.String")
    case "integer":
    case "number":
      return wrapOptional("Schema.Number")
    case "boolean":
      return wrapOptional("Schema.Boolean")
    case "array":
      if (schema.items) {
        const itemsCode = generateSchemaCode(schema.items as OpenAPIV3_1.SchemaObject, false)
        return wrapOptional(`Schema.Array(${itemsCode})`)
      }
      return wrapOptional("Schema.Array(Schema.Unknown)")
    case "object":
      if (schema.properties) {
        const properties = Object.entries(schema.properties).map(([key, propSchema]) => {
          const isRequired = schema.required?.includes(key) ?? false
          const propCode = generateSchemaCode(propSchema as OpenAPIV3_1.SchemaObject, !isRequired)
          return `  ${key}: ${propCode}`
        }).join(",\n")
        return wrapOptional(`Schema.Struct({\n${properties}\n})`)
      }
      return wrapOptional("Schema.Record({ key: Schema.String, value: Schema.Unknown })")
    default:
      return wrapOptional("Schema.Unknown")
  }
}

export const generateEffectSchema = (
  schema: OpenAPIV3_1.SchemaObject,
  name?: string
): Effect.Effect<string, SchemaGenerationError> =>
  Effect.sync(() => {
    const schemaCode = generateSchemaCode(schema, false)

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
      const schemaCode = generateSchemaCode(schema, false)
      return `export const ${name} = ${schemaCode}`
    })

    return [imports, "", ...schemas].join("\n")
  })