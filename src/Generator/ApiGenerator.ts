/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type * as OpenApiParser from "../Parser/OpenApiParser.js"
import * as PathParser from "../Parser/PathParser.js"
import * as SchemaParser from "../Parser/SchemaParser.js"
import * as GroupGenerator from "./GroupGenerator.js"
import * as SchemaGenerator from "./SchemaGenerator.js"

/**
 * Generate complete API code from an OpenAPI specification
 *
 * @since 1.0.0
 * @category Generation
 */
export const generateApi = (
  spec: OpenApiParser.OpenApiSpec
): Effect.Effect<string, SchemaGenerator.SchemaGenerationError> =>
  Effect.gen(function*() {
    const lines: Array<string> = []

    // Generate imports
    lines.push("import * as HttpApi from \"@effect/platform/HttpApi\"")
    lines.push("import * as HttpApiEndpoint from \"@effect/platform/HttpApiEndpoint\"")
    lines.push("import * as HttpApiGroup from \"@effect/platform/HttpApiGroup\"")
    lines.push("import * as HttpApiSchema from \"@effect/platform/HttpApiSchema\"")
    lines.push("import * as Schema from \"effect/Schema\"")
    lines.push("")

    // Parse and generate schema definitions from components/schemas
    const registry = yield* SchemaParser.parseComponents(spec)

    if (registry.schemas.size > 0) {
      lines.push("// Schema definitions from components/schemas")

      // Generate named schemas in order
      for (const [name, schema] of registry.schemas.entries()) {
        const schemaCode = yield* SchemaGenerator.generateNamedSchema(name, schema)
        lines.push(schemaCode)
      }

      lines.push("")
    }

    // Add API description as comment if present
    if (spec.info.description) {
      lines.push("/**")
      lines.push(` * ${spec.info.description}`)
      lines.push(" *")
      lines.push(` * @version ${spec.info.version}`)
      lines.push(" */")
    }

    // Extract operations and group them
    const operations = yield* PathParser.extractOperations(spec)
    const groups = yield* GroupGenerator.generateGroups(operations)

    // Generate group code
    for (const group of groups) {
      const groupCode = yield* GroupGenerator.generateGroupCode(group)
      lines.push(groupCode)
      lines.push("")
    }

    // Generate API name from title (remove spaces, keep alphanumeric)
    const apiName = spec.info.title.replace(/[^a-zA-Z0-9]/g, "")

    // Generate the top-level API
    let apiCode = `const ${apiName} = HttpApi.make("${apiName}")`

    for (const group of groups) {
      apiCode += `\n  .add(${group.varName}Group)`
    }

    lines.push(apiCode)
    lines.push("")

    // Export the API
    lines.push(`export { ${apiName} }`)

    return lines.join("\n")
  })
