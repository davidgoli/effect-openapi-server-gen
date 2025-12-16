/**
 * @since 1.0.0
 */
import * as Effect from 'effect/Effect'
import type * as OpenApiParser from '../Parser/OpenApiParser.js'
import * as PathParser from '../Parser/PathParser.js'
import * as SchemaParser from '../Parser/SchemaParser.js'
import * as GroupGenerator from './GroupGenerator.js'
import * as SchemaGenerator from './SchemaGenerator.js'

/**
 * Extract $ref dependencies from a schema
 */
const extractDependencies = (schema: OpenApiParser.SchemaObject): Set<string> => {
  const deps = new Set<string>()

  const visit = (s: OpenApiParser.SchemaObject) => {
    if (s.$ref) {
      const match = s.$ref.match(/^#\/components\/schemas\/(.+)$/)
      if (match) {
        deps.add(match[1])
      }
    }

    // Check nested schemas
    if (s.properties) {
      for (const prop of Object.values(s.properties)) {
        visit(prop)
      }
    }
    if (s.items) {
      visit(s.items)
    }
    if (s.allOf) {
      for (const sub of s.allOf) {
        visit(sub)
      }
    }
    if (s.oneOf) {
      for (const sub of s.oneOf) {
        visit(sub)
      }
    }
    if (s.anyOf) {
      for (const sub of s.anyOf) {
        visit(sub)
      }
    }
  }

  visit(schema)
  return deps
}

/**
 * Topologically sort schemas based on their dependencies
 */
const topologicalSort = (
  schemas: ReadonlyMap<string, OpenApiParser.SchemaObject>
): Array<[string, OpenApiParser.SchemaObject]> => {
  const sorted: Array<[string, OpenApiParser.SchemaObject]> = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  const visit = (name: string) => {
    if (visited.has(name)) return
    if (visiting.has(name)) {
      // Circular dependency - just add it now
      return
    }

    visiting.add(name)
    const schema = schemas.get(name)
    if (schema) {
      const deps = extractDependencies(schema)
      for (const dep of deps) {
        if (schemas.has(dep)) {
          visit(dep)
        }
      }
      sorted.push([name, schema])
    }
    visiting.delete(name)
    visited.add(name)
  }

  for (const name of schemas.keys()) {
    visit(name)
  }

  return sorted
}

/**
 * Generate complete API code from an OpenAPI specification
 *
 * @since 1.0.0
 * @category Generation
 */
export const generateApi = (
  spec: OpenApiParser.OpenApiSpec
): Effect.Effect<string, SchemaGenerator.SchemaGenerationError> =>
  Effect.gen(function* () {
    const lines: Array<string> = []

    // Generate imports
    lines.push("import * as HttpApi from '@effect/platform/HttpApi'")
    lines.push("import * as HttpApiEndpoint from '@effect/platform/HttpApiEndpoint'")
    lines.push("import * as HttpApiGroup from '@effect/platform/HttpApiGroup'")
    lines.push("import * as HttpApiSchema from '@effect/platform/HttpApiSchema'")
    lines.push("import * as Schema from 'effect/Schema'")
    lines.push('')

    // Parse and generate schema definitions from components/schemas
    const registry = yield* SchemaParser.parseComponents(spec)

    if (registry.schemas.size > 0) {
      lines.push('// Schema definitions from components/schemas')
      lines.push('')

      // Sort schemas topologically to ensure dependencies are declared first
      const sortedSchemas = topologicalSort(registry.schemas)

      // Generate named schemas in dependency order (exported inline)
      for (const [name, schema] of sortedSchemas) {
        const schemaCode = yield* SchemaGenerator.generateNamedSchema(name, schema)
        lines.push(schemaCode)
        lines.push('')
      }
    }

    // Add API description as comment if present
    if (spec.info.description) {
      lines.push('/**')
      lines.push(` * ${spec.info.description}`)
      lines.push(' *')
      lines.push(` * @version ${spec.info.version}`)
      lines.push(' */')
    }

    // Extract operations and group them
    const operations = yield* PathParser.extractOperations(spec)
    const groups = yield* GroupGenerator.generateGroups(operations)

    // Generate group code (exported inline)
    for (const group of groups) {
      const groupCode = yield* GroupGenerator.generateGroupCode(group)
      lines.push(groupCode)
      lines.push('')
    }

    // Generate API name from title (remove spaces, keep alphanumeric)
    const apiName = spec.info.title.replace(/[^a-zA-Z0-9]/g, '')

    // Generate the top-level API (exported)
    let apiCode = `export const ${apiName} = HttpApi.make('${apiName}')`

    for (const group of groups) {
      apiCode += `\n  .add(${group.varName}Group)`
    }

    lines.push(apiCode)

    return lines.join('\n')
  })
