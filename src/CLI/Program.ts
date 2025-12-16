/**
 * @since 1.0.0
 */
import * as Effect from 'effect/Effect'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as ApiGenerator from '../Generator/ApiGenerator.js'
import * as CodeEmitter from '../Generator/CodeEmitter.js'
import * as OpenApiParser from '../Parser/OpenApiParser.js'

/**
 * Generate API code from OpenAPI spec file
 *
 * @since 1.0.0
 * @category CLI
 */
export const generate = (specPath: string, outputPath: string,): Effect.Effect<void> =>
  Effect.gen(function*() {
    // Resolve paths
    const resolvedSpecPath = path.resolve(specPath,)
    const resolvedOutputPath = path.resolve(outputPath,)

    console.log(`📄 Reading OpenAPI spec from: ${resolvedSpecPath}`,)

    // Read the spec file
    const specContent = fs.readFileSync(resolvedSpecPath, 'utf-8',)

    console.log('🔍 Parsing OpenAPI specification...',)

    // Parse the spec
    const spec = yield* OpenApiParser.parse(specContent,)

    console.log(`✅ Parsed: ${spec.info.title} v${spec.info.version}`,)
    console.log(`   Paths: ${Object.keys(spec.paths,).length}`,)

    console.log('🔧 Generating Effect HttpServer code...',)

    // Generate the API code
    const apiCode = yield* ApiGenerator.generateApi(spec,)

    // Emit the final code
    const finalCode = yield* CodeEmitter.emit(apiCode,)

    console.log(`💾 Writing generated code to: ${resolvedOutputPath}`,)

    // Write the output file
    fs.writeFileSync(resolvedOutputPath, finalCode, 'utf-8',)

    console.log('✨ Generation complete!',)
  },).pipe(
    Effect.catchAll((error,) =>
      Effect.sync(() => {
        console.error('❌ Error:', error,)
        process.exit(1,)
      },)
    ),
  )

/**
 * Main CLI program
 *
 * @since 1.0.0
 * @category CLI
 */
export const main = (args: ReadonlyArray<string>,): Effect.Effect<void> => {
  if (args.length < 2) {
    return Effect.sync(() => {
      console.log('Usage: openapi-gen <spec-file> <output-file>',)
      console.log('',)
      console.log('Example:',)
      console.log('  openapi-gen ./api-spec.yaml ./generated/api.ts',)
      process.exit(1,)
    },)
  }

  const [specPath, outputPath,] = args

  return generate(specPath, outputPath,)
}

// Run the CLI if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  Effect.runPromise(main(process.argv.slice(2,),),).catch((error,) => {
    console.error('❌ Unexpected error:', error,)
    process.exit(1,)
  },)
}
