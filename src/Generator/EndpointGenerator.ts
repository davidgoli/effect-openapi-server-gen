/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type * as PathParser from "../Parser/PathParser.js"
import * as SchemaGenerator from "./SchemaGenerator.js"

/**
 * Generate HttpApiEndpoint code from a parsed operation
 *
 * @since 1.0.0
 * @category Generation
 */
/**
 * Result of endpoint generation
 *
 * @since 1.0.0
 * @category Models
 */
export interface GeneratedEndpoint {
  readonly pathParamDeclarations: ReadonlyArray<string>
  readonly endpointCode: string
}

export const generateEndpoint = (
  operation: PathParser.ParsedOperation
): Effect.Effect<GeneratedEndpoint, SchemaGenerator.SchemaGenerationError> =>
  Effect.gen(function*() {
    const pathParamDeclarations: Array<string> = []

    // Generate path parameter definitions
    const pathParams: Array<{ name: string; varName: string }> = []
    for (const param of operation.pathParameters) {
      const varName = `${param.name}Param`
      const schemaCode = yield* SchemaGenerator.generateSchemaCode(param.schema!)
      pathParamDeclarations.push(`const ${varName} = HttpApiSchema.param("${param.name}", ${schemaCode})`)
      pathParams.push({ name: param.name, varName })
    }

    // Generate the endpoint definition
    const method = operation.method
    const methodCall = {
      get: "get",
      post: "post",
      put: "put",
      patch: "patch",
      delete: "del"
    }[method]

    // Build the path string
    let pathStr: string
    if (pathParams.length > 0) {
      // Use template string syntax for paths with parameters
      const pathTemplate = operation.path.replace(/\{(\w+)\}/g, (_, paramName) => {
        const param = pathParams.find((p) => p.name === paramName)
        return param ? `\${${param.varName}}` : `{${paramName}}`
      })
      pathStr = `\`${pathTemplate}\``
    } else {
      // Use simple string for paths without parameters
      pathStr = `"${operation.path}"`
    }

    // Start building the endpoint
    let endpointCode = `HttpApiEndpoint.${methodCall}("${operation.operationId}")${pathStr}`

    // Add URL parameters (query params)
    if (operation.queryParameters.length > 0) {
      const queryParamProps: Array<string> = []
      for (const param of operation.queryParameters) {
        const schemaCode = yield* SchemaGenerator.generateSchemaCode(param.schema!)
        const isRequired = param.required ?? false
        const propCode = isRequired
          ? `${param.name}: ${schemaCode}`
          : `${param.name}: Schema.optional(${schemaCode})`
        queryParamProps.push(propCode)
      }

      endpointCode += `\n  .setUrlParams(Schema.Struct({\n    ${queryParamProps.join(",\n    ")}\n  }))`
    }

    // Add request body (payload)
    if (operation.requestBody) {
      const payloadCode = yield* SchemaGenerator.generateSchemaCode(operation.requestBody.schema)
      endpointCode += `\n  .setPayload(${payloadCode})`
    }

    // Add success response
    if (operation.successResponse) {
      const responseCode = yield* SchemaGenerator.generateSchemaCode(operation.successResponse.schema)
      endpointCode += `\n  .addSuccess(${responseCode})`
    }

    return { pathParamDeclarations, endpointCode }
  })
