import { Effect, pipe, Schema } from "effect"
import type { OpenAPIV3_1 } from "openapi-types"

export interface ValidationError {
  readonly _tag: "ValidationError"
  readonly message: string
  readonly cause?: unknown
}

export interface ValidatedRequest {
  pathParams?: unknown
  queryParams?: unknown
  body?: unknown
}

export interface ValidatedResponse {
  status: number
  body?: unknown
}

export interface RequestValidationSchemas {
  path?: any
  query?: any
  body?: any
}

export interface ResponseValidationSchemas {
  [status: number]: any
}

const generateSchemaFromOpenAPI = (schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject): any => {
  if ("$ref" in schema) {
    return Schema.Unknown
  }

  const typedSchema = schema

  if (typedSchema.enum) {
    const enumValues = typedSchema.enum
    if (enumValues.length === 1) {
      return Schema.Literal(enumValues[0] as string | number | boolean)
    }
    return Schema.Union(...enumValues.map(val => Schema.Literal(val as string | number | boolean)))
  }

  switch (typedSchema.type) {
    case "string":
      return Schema.String
    case "integer":
    case "number":
      return Schema.Number
    case "boolean":
      return Schema.Boolean
    case "array":
      if (typedSchema.items) {
        const itemsSchema = generateSchemaFromOpenAPI(typedSchema.items)
        return Schema.Array(itemsSchema)
      }
      return Schema.Array(Schema.Unknown)
    case "object":
      if (typedSchema.properties) {
        const requiredFields = new Set(typedSchema.required || [])
        const properties: any = {}

        Object.entries(typedSchema.properties).forEach(([key, propSchema]) => {
          const propSchemaObj = generateSchemaFromOpenAPI(propSchema)
          if (requiredFields.has(key)) {
            properties[key] = propSchemaObj
          } else {
            properties[key] = Schema.optional(propSchemaObj)
          }
        })
        return Schema.Struct(properties)
      }
      return Schema.Record({ key: Schema.String, value: Schema.Unknown })
    default:
      return Schema.Unknown
  }
}

const parseQueryParameters = (query: Record<string, string | string[]>): Record<string, unknown> => {
  const parsed: Record<string, unknown> = {}

  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      parsed[key] = value
    } else if (value === "true") {
      parsed[key] = true
    } else if (value === "false") {
      parsed[key] = false
    } else if (!isNaN(Number(value)) && value !== "") {
      parsed[key] = Number(value)
    } else {
      parsed[key] = value
    }
  })

  return parsed
}

export const validateRequest = (
  request: { params: Record<string, unknown>; query: Record<string, unknown>; body?: unknown },
  schemas: RequestValidationSchemas
): Effect.Effect<ValidatedRequest, ValidationError> =>
  Effect.gen(function* () {
    const result: ValidatedRequest = {}

    if (schemas.path) {
      const pathResult = yield* pipe(
        Effect.try(() => Schema.decodeSync(schemas.path!)(request.params)),
        Effect.mapError((cause) => ({
          _tag: "ValidationError" as const,
          message: `Path parameter validation failed`,
          cause
        }))
      )
      result.pathParams = pathResult
    }

    if (schemas.query) {
      const parsedQuery = parseQueryParameters(request.query)
      const queryResult = yield* pipe(
        Effect.try(() => Schema.decodeSync(schemas.query!)(parsedQuery)),
        Effect.mapError((cause) => ({
          _tag: "ValidationError" as const,
          message: `Query parameter validation failed`,
          cause
        }))
      )
      result.queryParams = queryResult
    }

    if (schemas.body && request.body !== undefined) {
      const bodyResult = yield* pipe(
        Effect.try(() => Schema.decodeSync(schemas.body!)(request.body)),
        Effect.mapError((cause) => ({
          _tag: "ValidationError" as const,
          message: `Request body validation failed`,
          cause
        }))
      )
      result.body = bodyResult
    }

    return result
  })

export const validateResponse = (
  response: { status: number; body?: unknown },
  schemas: ResponseValidationSchemas
): Effect.Effect<ValidatedResponse, ValidationError> =>
  Effect.gen(function* () {
    const schema = schemas[response.status]

    if (!schema) {
      return yield* Effect.fail({
        _tag: "ValidationError" as const,
        message: `No validation schema found for status ${response.status}`
      })
    }

    if (response.body !== undefined) {
      const validatedBody = yield* pipe(
        Effect.try(() => Schema.decodeSync(schema)(response.body)),
        Effect.mapError((cause) => ({
          _tag: "ValidationError" as const,
          message: `Response body validation failed for status ${response.status}`,
          cause
        }))
      )

      return {
        status: response.status,
        body: validatedBody
      }
    }

    return {
      status: response.status,
      body: response.body
    }
  })

export const createRequestValidator = (
  operation: OpenAPIV3_1.OperationObject
): Effect.Effect<
  (request: { params: Record<string, unknown>; query: Record<string, unknown>; body?: unknown }) => Effect.Effect<ValidatedRequest, ValidationError>,
  ValidationError
> =>
  Effect.gen(function* () {
    const schemas: RequestValidationSchemas = {}

    if (operation.parameters) {
      const pathParams: any = {}
      const queryParams: any = {}

      operation.parameters.forEach(param => {
        if ("$ref" in param) return

        const typedParam = param
        const schema = typedParam.schema
        if (!schema) return

        const paramSchema = generateSchemaFromOpenAPI(schema)
        const finalSchema = typedParam.required ? paramSchema : Schema.optional(paramSchema)

        if (typedParam.in === "path") {
          pathParams[typedParam.name] = paramSchema // Path params are always required
        } else if (typedParam.in === "query") {
          queryParams[typedParam.name] = finalSchema
        }
      })

      if (Object.keys(pathParams).length > 0) {
        schemas.path = Schema.Struct(pathParams)
      }

      if (Object.keys(queryParams).length > 0) {
        schemas.query = Schema.Struct(queryParams)
      }
    }

    if (operation.requestBody && !("$ref" in operation.requestBody)) {
      const requestBody = operation.requestBody
      const content = requestBody.content?.["application/json"]

      if (content?.schema) {
        schemas.body = generateSchemaFromOpenAPI(content.schema)
      }
    }

    return (request: { params: Record<string, unknown>; query: Record<string, unknown>; body?: unknown }) =>
      validateRequest(request, schemas)
  })

export const createResponseValidator = (
  responses: OpenAPIV3_1.ResponsesObject
): Effect.Effect<
  (response: { status: number; body?: unknown }) => Effect.Effect<ValidatedResponse, ValidationError>,
  ValidationError
> =>
  Effect.gen(function* () {
    const schemas: ResponseValidationSchemas = {}

    Object.entries(responses).forEach(([statusCode, response]) => {
      if ("$ref" in response) return

      const content = response.content?.["application/json"]
      if (content?.schema) {
        const status = parseInt(statusCode)
        schemas[status] = generateSchemaFromOpenAPI(content.schema)
      }
    })

    return (response: { status: number; body?: unknown }) =>
      validateResponse(response, schemas)
  })