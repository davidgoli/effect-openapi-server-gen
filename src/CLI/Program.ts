#!/usr/bin/env node
/**
 * @since 1.0.0
 */
import { FileSystem, Path } from '@effect/platform'
import type { PlatformError } from '@effect/platform/Error'
import * as Effect from 'effect/Effect'
import * as ApiGenerator from '../Generator/ApiGenerator.js'
import * as CodeEmitter from '../Generator/CodeEmitter.js'
import type * as SchemaGenerator from '../Generator/SchemaGenerator.js'
import * as OpenApiParser from '../Parser/OpenApiParser.js'
import type * as SecurityParser from '../Parser/SecurityParser.js'

/**
 * Generate API code from OpenAPI spec file
 *
 * @since 1.0.0
 * @category CLI
 */
type GenerationError =
  | OpenApiParser.ParseError
  | SchemaGenerator.SchemaGenerationError
  | SecurityParser.SecurityParseError
  | PlatformError

export const generate = (
  specPath: string,
  outputPath: string
): Effect.Effect<void, GenerationError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path

    // Resolve paths
    const resolvedSpecPath = path.resolve(specPath)
    const resolvedOutputPath = path.resolve(outputPath)

    yield* Effect.logInfo(`Reading OpenAPI spec from: ${resolvedSpecPath}`)

    // Read the spec file
    const specContent = yield* fs.readFileString(resolvedSpecPath)

    yield* Effect.logInfo('Parsing OpenAPI specification...')

    // Parse the spec
    const spec = yield* OpenApiParser.parse(specContent)

    yield* Effect.logInfo(`Parsed: ${spec.info.title} v${spec.info.version}`)
    yield* Effect.logInfo(`Paths: ${Object.keys(spec.paths).length}`)

    yield* Effect.logInfo('Generating Effect HttpServer code...')

    // Generate the API code
    const apiCode = yield* ApiGenerator.generateApi(spec)

    // Emit the final code
    const finalCode = yield* CodeEmitter.emit(apiCode)

    yield* Effect.logInfo(`Writing generated code to: ${resolvedOutputPath}`)

    // Write the output file
    yield* fs.writeFileString(resolvedOutputPath, finalCode)

    yield* Effect.logInfo('Generation complete!')
  })

/**
 * Main CLI program
 *
 * @since 1.0.0
 * @category CLI
 */
export const main = (
  args: ReadonlyArray<string>
): Effect.Effect<void, GenerationError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* () {
    if (args.length < 2) {
      yield* Effect.logInfo('Usage: openapi-gen <spec-file> <output-file>')
      yield* Effect.logInfo('')
      yield* Effect.logInfo('Example:')
      yield* Effect.logInfo('  openapi-gen ./api-spec.yaml ./generated/api.ts')
      return yield* Effect.fail(new OpenApiParser.ParseError({ message: 'Missing required arguments' }))
    }

    const [specPath, outputPath] = args

    yield* generate(specPath, outputPath)
  })

// Run the CLI if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  // Import platform-node layers for CLI execution
  import('@effect/platform-node').then(({ NodeFileSystem, NodePath }) => {
    const program = main(process.argv.slice(2)).pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.provide(NodePath.layer),
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          yield* Effect.logError(`Error: ${error}`)
          process.exit(1)
        })
      )
    )

    Effect.runPromise(program).catch((error) => {
      console.error('Unexpected error:', error)
      process.exit(1)
    })
  })
}
