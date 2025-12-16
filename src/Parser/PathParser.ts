/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type * as OpenApiParser from "./OpenApiParser.js"

/**
 * @since 1.0.0
 * @category Models
 */
export interface ParsedOperation {
  readonly operationId: string
  readonly method: "get" | "post" | "put" | "patch" | "delete"
  readonly path: string
  readonly summary?: string | undefined
  readonly description?: string | undefined
  readonly tags: ReadonlyArray<string>
  readonly pathParameters: ReadonlyArray<OpenApiParser.ParameterObject>
  readonly queryParameters: ReadonlyArray<OpenApiParser.ParameterObject>
  readonly headerParameters: ReadonlyArray<OpenApiParser.ParameterObject>
  readonly requestBody?:
    | {
        readonly schema: OpenApiParser.SchemaObject
        readonly required: boolean
      }
    | undefined
  readonly successResponse?:
    | {
        readonly statusCode: string
        readonly schema: OpenApiParser.SchemaObject
      }
    | undefined
}

/**
 * Extract all operations from an OpenAPI specification
 *
 * @since 1.0.0
 * @category Parsing
 */
export const extractOperations = (
  spec: OpenApiParser.OpenApiSpec
): Effect.Effect<ReadonlyArray<ParsedOperation>> =>
  Effect.sync(() => {
    const operations: Array<ParsedOperation> = []

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const methods: Array<"get" | "post" | "put" | "patch" | "delete"> = [
        "get",
        "post",
        "put",
        "patch",
        "delete"
      ]

      for (const method of methods) {
        const operation = pathItem[method]
        if (!operation) continue

        const parameters = operation.parameters || []

        // Separate parameters by type
        const pathParameters = parameters.filter((p) => p.in === "path")
        const queryParameters = parameters.filter((p) => p.in === "query")
        const headerParameters = parameters.filter((p) => p.in === "header")

        // Extract request body
        let requestBody: ParsedOperation["requestBody"] | undefined
        if (operation.requestBody) {
          const content = operation.requestBody.content["application/json"]
          if (content?.schema) {
            requestBody = {
              schema: content.schema,
              required: operation.requestBody.required ?? false
            }
          }
        }

        // Extract success response (first 2xx response)
        let successResponse: ParsedOperation["successResponse"] | undefined
        for (const [statusCode, response] of Object.entries(operation.responses)) {
          if (statusCode.startsWith("2")) {
            const content = response.content?.["application/json"]
            if (content?.schema) {
              successResponse = {
                statusCode,
                schema: content.schema
              }
              break
            }
          }
        }

        operations.push({
          operationId: operation.operationId,
          method,
          path,
          summary: operation.summary,
          description: operation.description,
          tags: operation.tags || [],
          pathParameters,
          queryParameters,
          headerParameters,
          requestBody,
          successResponse
        })
      }
    }

    return operations
  })
