/**
 * @since 1.0.0
 */
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as YAML from 'yaml'

/**
 * @since 1.0.0
 * @category Models
 */
export interface OpenApiSpec {
  readonly openapi: string
  readonly info: InfoObject
  readonly servers?: ReadonlyArray<ServerObject>
  readonly paths: PathsObject
  readonly components?: ComponentsObject
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface InfoObject {
  readonly title: string
  readonly version: string
  readonly description?: string
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface ServerObject {
  readonly url: string
  readonly description?: string
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface PathsObject {
  readonly [path: string]: PathItemObject
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface PathItemObject {
  readonly get?: OperationObject
  readonly post?: OperationObject
  readonly put?: OperationObject
  readonly patch?: OperationObject
  readonly delete?: OperationObject
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface OperationObject {
  readonly operationId: string
  readonly summary?: string
  readonly description?: string
  readonly tags?: ReadonlyArray<string>
  readonly parameters?: ReadonlyArray<ParameterObject>
  readonly requestBody?: RequestBodyObject
  readonly responses: ResponsesObject
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface ParameterObject {
  readonly name: string
  readonly in: 'query' | 'header' | 'path' | 'cookie'
  readonly required?: boolean
  readonly schema?: SchemaObject
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface RequestBodyObject {
  readonly content: Record<string, MediaTypeObject>
  readonly required?: boolean
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface MediaTypeObject {
  readonly schema?: SchemaObject
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface ResponsesObject {
  readonly [statusCode: string]: ResponseObject
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface ResponseObject {
  readonly description: string
  readonly content?: Record<string, MediaTypeObject>
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface SchemaObject {
  readonly type?: string | ReadonlyArray<string>
  readonly properties?: Record<string, SchemaObject>
  readonly required?: ReadonlyArray<string>
  readonly items?: SchemaObject
  readonly $ref?: string
  readonly description?: string
  readonly enum?: ReadonlyArray<unknown>
  readonly format?: string
  readonly nullable?: boolean
  readonly const?: unknown
  // String validation
  readonly minLength?: number
  readonly maxLength?: number
  readonly pattern?: string
  // Number validation
  readonly minimum?: number
  readonly maximum?: number
  readonly multipleOf?: number
  readonly exclusiveMinimum?: boolean | number
  readonly exclusiveMaximum?: boolean | number
  // Schema combinators
  readonly allOf?: ReadonlyArray<SchemaObject>
  readonly oneOf?: ReadonlyArray<SchemaObject>
  readonly anyOf?: ReadonlyArray<SchemaObject>
  // Custom extensions
  readonly 'x-circular'?: ReadonlyArray<string>
}

/**
 * @since 1.0.0
 * @category Models
 */
export interface ComponentsObject {
  readonly schemas?: Record<string, SchemaObject>
}

/**
 * @since 1.0.0
 * @category Errors
 */
export class ParseError extends Data.TaggedError('ParseError')<{
  readonly message: string
}> {}

/**
 * Parse an OpenAPI 3.1 specification from a JSON or YAML string
 *
 * @since 1.0.0
 * @category Parsing
 */
export const parse = (content: string): Effect.Effect<OpenApiSpec, ParseError> =>
  Effect.gen(function* () {
    // Try to parse as JSON or YAML
    const spec = yield* Effect.try({
      try: () => {
        try {
          return JSON.parse(content)
        } catch {
          return YAML.parse(content)
        }
      },
      catch: (error) => new ParseError({ message: `Failed to parse spec: ${String(error)}` }),
    })

    // Validate the spec structure
    if (typeof spec !== 'object' || spec === null) {
      return yield* new ParseError({ message: 'Spec must be an object' })
    }

    const obj = spec as Record<string, unknown>

    // Validate openapi version
    if (typeof obj.openapi !== 'string') {
      return yield* new ParseError({ message: 'Missing required field: openapi' })
    }

    if (!obj.openapi.startsWith('3.1')) {
      return yield* new ParseError({
        message: `Unsupported OpenAPI version: ${obj.openapi}. Only OpenAPI 3.1.x is supported.`,
      })
    }

    // Validate info object
    if (typeof obj.info !== 'object' || obj.info === null) {
      return yield* new ParseError({ message: 'Missing or invalid required field: info' })
    }

    const info = obj.info as Record<string, unknown>
    if (typeof info.title !== 'string') {
      return yield* new ParseError({ message: 'Missing required field: info.title' })
    }

    if (typeof info.version !== 'string') {
      return yield* new ParseError({ message: 'Missing required field: info.version' })
    }

    // Validate paths object
    if (typeof obj.paths !== 'object' || obj.paths === null) {
      return yield* new ParseError({ message: 'Missing or invalid required field: paths' })
    }

    // Validate operationId for all operations
    const paths = obj.paths as Record<string, unknown>
    for (const [path, pathItem] of Object.entries(paths)) {
      if (typeof pathItem !== 'object' || pathItem === null) {
        continue
      }

      const operations = pathItem as Record<string, unknown>
      const httpMethods = ['get', 'post', 'put', 'patch', 'delete']

      for (const method of httpMethods) {
        const operation = operations[method]
        if (typeof operation === 'object' && operation !== null) {
          const op = operation as Record<string, unknown>
          if (typeof op.operationId !== 'string') {
            return yield* new ParseError({
              message: `Missing required field operationId for operation: ${method.toUpperCase()} ${path}`,
            })
          }
        }
      }
    }

    return spec as OpenApiSpec
  })
