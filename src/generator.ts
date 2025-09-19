import { Effect } from "effect"
import type { GeneratedCode, GenerationOptions, ParsedOpenAPISpec } from "./types.js"

export interface CodeGenerationError {
  readonly _tag: "CodeGenerationError"
  readonly message: string
  readonly cause?: unknown
}

export const generateCode = (
  _spec: ParsedOpenAPISpec,
  _options: GenerationOptions
): Effect.Effect<GeneratedCode, CodeGenerationError> =>
  Effect.fail({
    _tag: "CodeGenerationError" as const,
    message: "Not implemented yet"
  })