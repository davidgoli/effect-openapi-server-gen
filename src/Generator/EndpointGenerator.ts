/**
 * @since 1.0.0
 */
import * as Effect from 'effect/Effect'
import type * as PathParser from '../Parser/PathParser.js'
import * as SchemaGenerator from './SchemaGenerator.js'

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
  readonly jsdocComment?: string
  readonly endpointCode: string
}

/**
 * Generate JSDoc comment for an endpoint
 */
const generateJSDoc = (operation: PathParser.ParsedOperation): string | undefined => {
  const lines: Array<string> = []

  // Add summary or description
  if (operation.summary || operation.description || operation.deprecated) {
    lines.push('/**')
    if (operation.summary) {
      lines.push(` * ${operation.summary}`)
    }
    if (operation.description && operation.description !== operation.summary) {
      if (operation.summary) lines.push(' *')
      lines.push(` * ${operation.description}`)
    }
    if (operation.deprecated) {
      if (operation.summary || operation.description) lines.push(' *')
      lines.push(' * @deprecated This endpoint is deprecated and may be removed in a future version.')
    }
    lines.push(' */')
    return lines.join('\n')
  }

  return undefined
}

export const generateEndpoint = (
  operation: PathParser.ParsedOperation
): Effect.Effect<GeneratedEndpoint, SchemaGenerator.SchemaGenerationError> =>
  Effect.gen(function* () {
    const pathParamDeclarations: Array<string> = []

    // Generate JSDoc comment
    const jsdocComment = generateJSDoc(operation)

    // Generate path parameter definitions
    // Make parameter names unique by prefixing with operation ID to avoid collisions
    const pathParams: Array<{ name: string; varName: string }> = []
    for (const param of operation.pathParameters) {
      const varName = `${operation.operationId}_${param.name}Param`
      // Path parameters are transmitted as strings in URLs, use generateQueryParamSchemaCode
      const schemaCode = yield* SchemaGenerator.generateQueryParamSchemaCode(param.schema!)
      pathParamDeclarations.push(`const ${varName} = HttpApiSchema.param('${param.name}', ${schemaCode})`)
      pathParams.push({ name: param.name, varName })
    }

    // Generate the endpoint definition
    const method = operation.method
    const methodCall = {
      get: 'get',
      post: 'post',
      put: 'put',
      patch: 'patch',
      delete: 'del',
    }[method]

    // Build the path string and endpoint definition
    let endpointCode: string
    if (pathParams.length > 0) {
      // Use template string syntax for paths with parameters
      const pathTemplate = operation.path.replace(/\{(\w+)\}/g, (_, paramName) => {
        const param = pathParams.find((p) => p.name === paramName)
        return param ? `\${${param.varName}}` : `{${paramName}}`
      })
      endpointCode = `HttpApiEndpoint.${methodCall}('${operation.operationId}')\`${pathTemplate}\``
    } else {
      // Use two-argument form for paths without parameters
      endpointCode = `HttpApiEndpoint.${methodCall}('${operation.operationId}', '${operation.path}')`
    }

    // Add URL parameters (query params)
    if (operation.queryParameters.length > 0) {
      const queryParamProps: Array<string> = []
      for (const param of operation.queryParameters) {
        // Use generateQueryParamSchemaCode for query parameters (NumberFromString, BooleanFromString, etc.)
        const schemaCode = yield* SchemaGenerator.generateQueryParamSchemaCode(param.schema!)
        const isRequired = param.required ?? false
        const propCode = isRequired ? `${param.name}: ${schemaCode}` : `${param.name}: Schema.optional(${schemaCode})`
        queryParamProps.push(propCode)
      }

      endpointCode += `\n  .setUrlParams(Schema.Struct({\n    ${queryParamProps.join(',\n    ')}\n  }))`
    }

    // Add header parameters
    if (operation.headerParameters.length > 0) {
      const headerProps: Array<string> = []
      for (const param of operation.headerParameters) {
        // Headers are transmitted as strings, so use generateQueryParamSchemaCode
        const schemaCode = yield* SchemaGenerator.generateQueryParamSchemaCode(param.schema!)
        const isRequired = param.required ?? false
        // Header names should be quoted strings (e.g., 'X-API-Key')
        const propCode = isRequired
          ? `'${param.name}': ${schemaCode}`
          : `'${param.name}': Schema.optional(${schemaCode})`
        headerProps.push(propCode)
      }

      endpointCode += `\n  .setHeaders(Schema.Struct({\n    ${headerProps.join(',\n    ')}\n  }))`
    }

    // Add cookie parameters
    if (operation.cookieParameters.length > 0) {
      const cookieProps: Array<string> = []
      for (const param of operation.cookieParameters) {
        // Cookies are transmitted as strings, so use generateQueryParamSchemaCode
        const schemaCode = yield* SchemaGenerator.generateQueryParamSchemaCode(param.schema!)
        const isRequired = param.required ?? false
        // Cookie names should be quoted strings
        const propCode = isRequired
          ? `'${param.name}': ${schemaCode}`
          : `'${param.name}': Schema.optional(${schemaCode})`
        cookieProps.push(propCode)
      }

      endpointCode += `\n  .setCookies(Schema.Struct({\n    ${cookieProps.join(',\n    ')}\n  }))`
    }

    // Add request body (payload)
    if (operation.requestBody) {
      const payloadCode = yield* SchemaGenerator.generateSchemaCode(operation.requestBody.schema)
      endpointCode += `\n  .setPayload(${payloadCode})`
    }

    // Add responses (success and error)
    for (const response of operation.responses) {
      const statusCode = response.statusCode

      // Skip wildcard status codes (e.g., '5XX', '4XX') - these are invalid in OpenAPI 3.1
      if (!/^\d+$/.test(statusCode)) {
        yield* Effect.logWarning(
          `Skipping wildcard status code '${statusCode}' for operation '${operation.operationId}' - wildcard status codes are not supported`
        )
        continue
      }

      const responseCode = yield* SchemaGenerator.generateSchemaCode(response.schema)
      const statusNum = parseInt(statusCode, 10)

      if (statusCode.startsWith('2')) {
        // Success responses (2xx)
        if (statusCode === '200') {
          endpointCode += `\n  .addSuccess(${responseCode})`
        } else {
          endpointCode += `\n  .addSuccess(${responseCode}, { status: ${statusNum} })`
        }
      } else {
        // Error responses (4xx, 5xx)
        endpointCode += `\n  .addError(${responseCode}, { status: ${statusNum} })`
      }
    }

    return {
      pathParamDeclarations,
      ...(jsdocComment ? { jsdocComment } : {}),
      endpointCode,
    }
  })
