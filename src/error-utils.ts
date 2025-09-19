export interface BaseError {
  readonly _tag: string
  readonly message: string
  readonly cause?: unknown
}

export const createError = <T extends string>(tag: T) =>
  (message: string, cause?: unknown): BaseError & { _tag: T } => ({
    _tag: tag,
    message,
    cause
  })

// Pre-defined error creators for consistency
export const createOpenAPIParseError = createError("OpenAPIParseError")
export const createSchemaGenerationError = createError("SchemaGenerationError")
export const createEndpointGenerationError = createError("EndpointGenerationError")
export const createCodeGenerationError = createError("CodeGenerationError")
export const createValidationError = createError("ValidationError")
export const createCliError = createError("CliError")