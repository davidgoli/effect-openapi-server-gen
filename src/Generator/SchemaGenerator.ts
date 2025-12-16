/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type * as OpenApiParser from "../Parser/OpenApiParser.js"

/**
 * @since 1.0.0
 * @category Errors
 */
export class SchemaGenerationError {
  readonly _tag = "SchemaGenerationError"
  constructor(readonly message: string) {}
}

/**
 * Generate Effect Schema code from an OpenAPI Schema Object
 *
 * @since 1.0.0
 * @category Generation
 */
export const generateSchemaCode = (
  schema: OpenApiParser.SchemaObject
): Effect.Effect<string, SchemaGenerationError> =>
  Effect.gen(function*() {
    // Handle $ref by using the schema name
    if (schema.$ref) {
      const schemaName = extractSchemaName(schema.$ref)
      return `${schemaName}Schema`
    }

    // Handle primitive types
    if (schema.type === "string") {
      return addAnnotations("Schema.String", schema)
    }

    if (schema.type === "number" || schema.type === "integer") {
      return addAnnotations("Schema.Number", schema)
    }

    if (schema.type === "boolean") {
      return addAnnotations("Schema.Boolean", schema)
    }

    // Handle array type
    if (schema.type === "array") {
      if (!schema.items) {
        return yield* Effect.fail(
          new SchemaGenerationError("Array type must have 'items' property")
        )
      }

      const itemsCode = yield* generateSchemaCode(schema.items)
      return addAnnotations(`Schema.Array(${itemsCode})`, schema)
    }

    // Handle object type
    if (schema.type === "object" || schema.properties !== undefined) {
      const properties = schema.properties || {}
      const required = schema.required || []
      const circularProps = (schema as any)["x-circular"] || []

      if (Object.keys(properties).length === 0) {
        return addAnnotations("Schema.Struct({})", schema)
      }

      const propertyEntries: Array<string> = []

      for (const [name, propSchema] of Object.entries(properties)) {
        const isRequired = required.includes(name)
        const isCircular = circularProps.includes(name)

        let propCode = yield* generateSchemaCode(propSchema)

        // Wrap circular references with Schema.suspend
        if (isCircular && propSchema.$ref) {
          const schemaName = extractSchemaName(propSchema.$ref)
          propCode = `Schema.suspend(() => ${schemaName}Schema)`
        } else if (isCircular && propSchema.type === "array" && propSchema.items?.$ref) {
          const schemaName = extractSchemaName(propSchema.items.$ref)
          propCode = `Schema.Array(Schema.suspend(() => ${schemaName}Schema))`
        }

        if (!isRequired) {
          propCode = `Schema.optional(${propCode})`
        }

        propertyEntries.push(`${name}: ${propCode}`)
      }

      const structCode = `Schema.Struct({\n  ${propertyEntries.join(",\n  ")}\n})`
      return addAnnotations(structCode, schema)
    }

    return yield* Effect.fail(
      new SchemaGenerationError(`Unsupported schema type: ${schema.type || "undefined"}`)
    )
  })

/**
 * Generate a named schema definition
 *
 * @since 1.0.0
 * @category Generation
 */
export const generateNamedSchema = (
  name: string,
  schema: OpenApiParser.SchemaObject
): Effect.Effect<string, SchemaGenerationError> =>
  Effect.gen(function*() {
    const schemaCode = yield* generateSchemaCode(schema)
    return `const ${name}Schema = ${schemaCode}`
  })

/**
 * Extract schema name from $ref string
 * e.g., "#/components/schemas/User" -> "User"
 */
const extractSchemaName = (ref: string): string => {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/)
  return match ? match[1] : ref
}

/**
 * Add annotations to schema code if description is present
 */
const addAnnotations = (code: string, schema: OpenApiParser.SchemaObject): string => {
  if (schema.description) {
    const escapedDescription = schema.description.replace(/"/g, "\\\"")
    return `${code}.annotations({ description: "${escapedDescription}" })`
  }
  return code
}
