import { Effect } from "effect"
import type { GeneratedCode, GenerationOptions, ParsedOpenAPISpec } from "./types.js"
import { createCodeGenerationError } from "./error-utils.js"

export type CodeGenerationError = ReturnType<typeof createCodeGenerationError>

export const generateCode = (
  _spec: ParsedOpenAPISpec,
  _options: GenerationOptions
): Effect.Effect<GeneratedCode, CodeGenerationError> =>
  Effect.fail(
    createCodeGenerationError("Not implemented yet")
  )