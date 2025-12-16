/**
 * @since 1.0.0
 */
import * as Effect from 'effect/Effect'
import type * as OpenApiParser from './OpenApiParser.js'

/**
 * Registry of schema definitions from components/schemas
 *
 * @since 1.0.0
 * @category Models
 */
export interface SchemaRegistry {
  readonly schemas: ReadonlyMap<string, OpenApiParser.SchemaObject>
}

/**
 * Parse components/schemas section and build schema registry
 *
 * @since 1.0.0
 * @category Parsing
 */
export const parseComponents = (spec: OpenApiParser.OpenApiSpec): Effect.Effect<SchemaRegistry> =>
  Effect.sync(() => {
    const schemas = new Map<string, OpenApiParser.SchemaObject>()

    // Check if spec has components and schemas
    if (spec.components?.schemas) {
      for (const [name, schema] of Object.entries(spec.components.schemas)) {
        schemas.set(name, schema)
      }
    }

    return { schemas }
  })
