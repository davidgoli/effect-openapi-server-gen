/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type * as OpenApiParser from "./OpenApiParser.js"
import type * as SchemaParser from "./SchemaParser.js"

/**
 * Error when resolving references
 *
 * @since 1.0.0
 * @category Errors
 */
export class ReferenceResolutionError {
  readonly _tag = "ReferenceResolutionError"
  constructor(readonly message: string) {}
}

/**
 * Parsed reference information
 *
 * @since 1.0.0
 * @category Models
 */
export interface ParsedRef {
  readonly type: "component"
  readonly schemaName: string
}

/**
 * Parse a $ref string to extract schema name
 *
 * @since 1.0.0
 * @category Parsing
 */
export const parseRefString = (ref: string): Effect.Effect<ParsedRef, ReferenceResolutionError> =>
  Effect.sync(() => {
    // Expected format: #/components/schemas/SchemaName
    const match = ref.match(/^#\/components\/schemas\/(.+)$/)

    if (!match) {
      throw new ReferenceResolutionError(`Invalid $ref format: ${ref}`)
    }

    return {
      type: "component" as const,
      schemaName: match[1]
    }
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(new ReferenceResolutionError(error instanceof Error ? error.message : String(error)))
    )
  )

/**
 * Resolve a schema, following $ref references
 *
 * @since 1.0.0
 * @category Resolution
 */
export const resolveSchema = (
  schema: OpenApiParser.SchemaObject,
  registry: SchemaParser.SchemaRegistry,
  visited: ReadonlySet<string> = new Set()
): Effect.Effect<OpenApiParser.SchemaObject, ReferenceResolutionError> =>
  Effect.gen(function*() {
    // If no $ref, check for nested $refs in properties and items
    if (!schema.$ref) {
      // Check if schema has properties with $refs
      if (schema.properties) {
        const resolvedProperties: Record<string, OpenApiParser.SchemaObject> = {}

        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (propSchema.$ref) {
            // Check if this would create a circular reference
            const parsed = yield* parseRefString(propSchema.$ref)
            if (visited.has(parsed.schemaName)) {
              // Preserve the $ref for circular references
              resolvedProperties[key] = propSchema
            } else {
              // Resolve the reference
              resolvedProperties[key] = yield* resolveSchema(
                propSchema,
                registry,
                visited
              )
            }
          } else {
            // Recursively resolve nested schemas
            resolvedProperties[key] = yield* resolveSchema(propSchema, registry, visited)
          }
        }

        return { ...schema, properties: resolvedProperties }
      }

      // Check if schema is an array with $ref items
      if (schema.type === "array" && schema.items?.$ref) {
        const parsed = yield* parseRefString(schema.items.$ref)

        if (visited.has(parsed.schemaName)) {
          // Preserve the $ref for circular references
          return schema
        }

        const resolvedItems = yield* resolveSchema(schema.items, registry, visited)
        return { ...schema, items: resolvedItems }
      }

      // Return schema as-is
      return schema
    }

    // Parse the $ref
    const parsed = yield* parseRefString(schema.$ref)

    // Check if we're in a circular reference
    if (visited.has(parsed.schemaName)) {
      // Return the schema with $ref preserved for later handling
      return schema
    }

    // Look up the schema in the registry
    const referencedSchema = registry.schemas.get(parsed.schemaName)

    if (!referencedSchema) {
      return yield* Effect.fail(
        new ReferenceResolutionError(`Schema not found: ${parsed.schemaName}`)
      )
    }

    // Add this schema to visited set
    const newVisited = new Set(visited).add(parsed.schemaName)

    // Recursively resolve the referenced schema
    return yield* resolveSchema(referencedSchema, registry, newVisited)
  })
