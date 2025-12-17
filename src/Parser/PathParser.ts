/**
 * @since 1.0.0
 */
import * as Effect from 'effect/Effect'
import type * as OpenApiParser from './OpenApiParser.js'
import type * as SecurityParser from './SecurityParser.js'

/**
 * @since 1.0.0
 * @category Models
 */
export interface ParsedOperation {
  readonly operationId: string
  readonly method: 'get' | 'post' | 'put' | 'patch' | 'delete'
  readonly path: string
  readonly summary?: string | undefined
  readonly description?: string | undefined
  readonly deprecated?: boolean
  readonly tags: ReadonlyArray<string>
  readonly pathParameters: ReadonlyArray<OpenApiParser.ParameterObject>
  readonly queryParameters: ReadonlyArray<OpenApiParser.ParameterObject>
  readonly headerParameters: ReadonlyArray<OpenApiParser.ParameterObject>
  readonly cookieParameters: ReadonlyArray<OpenApiParser.ParameterObject>
  readonly requestBody?:
    | {
        readonly schema: OpenApiParser.SchemaObject
        readonly required: boolean
      }
    | undefined
  readonly responses: ReadonlyArray<{
    readonly statusCode: string
    readonly schema: OpenApiParser.SchemaObject
  }>
  readonly security?: ReadonlyArray<SecurityParser.SecurityRequirement>
}

/**
 * Extract all operations from an OpenAPI specification
 *
 * @since 1.0.0
 * @category Parsing
 */
export const extractOperations = (spec: OpenApiParser.OpenApiSpec): Effect.Effect<ReadonlyArray<ParsedOperation>> =>
  Effect.sync(() => {
    const operations: Array<ParsedOperation> = []

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const methods: Array<'get' | 'post' | 'put' | 'patch' | 'delete'> = ['get', 'post', 'put', 'patch', 'delete']

      for (const method of methods) {
        const operation = pathItem[method]
        if (!operation) continue

        const parameters = operation.parameters || []

        // Separate parameters by type
        const pathParameters = parameters.filter((p) => p.in === 'path')
        const queryParameters = parameters.filter((p) => p.in === 'query')
        const headerParameters = parameters.filter((p) => p.in === 'header')
        const cookieParameters = parameters.filter((p) => p.in === 'cookie')

        // Extract request body
        let requestBody: ParsedOperation['requestBody'] | undefined
        if (operation.requestBody?.content) {
          const contentTypes = Object.keys(operation.requestBody.content)
          const hasNonJson = contentTypes.some((ct) => ct !== 'application/json')

          if (hasNonJson) {
            console.warn(
              `⚠️  Operation '${operation.operationId}' (${method.toUpperCase()} ${path}) has non-JSON content types that will be ignored: ${contentTypes.filter((ct) => ct !== 'application/json').join(', ')}`
            )
          }

          const content = operation.requestBody.content['application/json']
          if (content?.schema) {
            requestBody = {
              schema: content.schema,
              required: operation.requestBody.required ?? false,
            }
          }
        }

        // Extract all responses with schemas
        const responses: Array<{ statusCode: string; schema: OpenApiParser.SchemaObject }> = []
        for (const [statusCode, response] of Object.entries(operation.responses)) {
          if (response.content) {
            const contentTypes = Object.keys(response.content)
            const hasNonJson = contentTypes.some((ct) => ct !== 'application/json')

            if (hasNonJson) {
              console.warn(
                `⚠️  Operation '${operation.operationId}' (${method.toUpperCase()} ${path}) response ${statusCode} has non-JSON content types that will be ignored: ${contentTypes.filter((ct) => ct !== 'application/json').join(', ')}`
              )
            }
          }

          const content = response.content?.['application/json']
          if (content?.schema) {
            responses.push({
              statusCode,
              schema: content.schema,
            })
          }
        }

        // Extract security requirements (if specified at operation level)
        const security = operation.security

        operations.push({
          operationId: operation.operationId,
          method,
          path,
          ...(operation.summary ? { summary: operation.summary } : {}),
          ...(operation.description ? { description: operation.description } : {}),
          ...(operation.deprecated ? { deprecated: operation.deprecated } : {}),
          tags: operation.tags || [],
          pathParameters,
          queryParameters,
          headerParameters,
          cookieParameters,
          requestBody,
          responses,
          ...(security ? { security } : {}),
        })
      }
    }

    return operations
  })
