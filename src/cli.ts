import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { FileSystem } from "@effect/platform"
import { Effect, pipe } from "effect"
import * as path from "path"
import * as yaml from "js-yaml"
import { parseOpenAPI } from "./parser.js"
import { generateSchemasFromComponents } from "./schema-generator.js"
import { generateHttpApiGroup, generateFullHttpApi } from "./endpoint-generator.js"

interface CliError {
  readonly _tag: "CliError"
  readonly message: string
  readonly cause?: unknown
}

const specArg = Args.text({ name: "spec" })

const outputOption = Options.text("output").pipe(
  Options.withDefault("./generated")
)

const formatOption = Options.choice("format", ["auto", "json", "yaml"]).pipe(
  Options.withDefault("auto")
)

const readSpecFile = (filePath: string): Effect.Effect<string, CliError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    const exists = yield* pipe(
      fs.exists(filePath),
      Effect.mapError((cause) => ({
        _tag: "CliError" as const,
        message: `Failed to check if file exists: ${filePath}`,
        cause
      }))
    )

    if (!exists) {
      return yield* Effect.fail({
        _tag: "CliError" as const,
        message: `OpenAPI specification file not found: ${filePath}`
      })
    }

    const content = yield* pipe(
      fs.readFileString(filePath),
      Effect.mapError((cause) => ({
        _tag: "CliError" as const,
        message: `Failed to read file: ${filePath}`,
        cause
      }))
    )

    return content
  })

const parseSpecContent = (content: string, filePath: string, format: string): Effect.Effect<Record<string, unknown>, CliError> =>
  Effect.gen(function* () {
    const ext = path.extname(filePath).toLowerCase()
    const isYaml = format === "yaml" || (format === "auto" && (ext === ".yml" || ext === ".yaml"))
    const isJson = format === "json" || (format === "auto" && ext === ".json")

    if (isYaml || (!isJson && !ext)) {
      try {
        const parsed = yaml.load(content)
        if (typeof parsed === "object" && parsed !== null) {
          return parsed as Record<string, unknown>
        }
        return yield* Effect.fail({
          _tag: "CliError" as const,
          message: "YAML content is not an object"
        })
      } catch (error) {
        return yield* Effect.fail({
          _tag: "CliError" as const,
          message: "Failed to parse YAML content",
          cause: error
        })
      }
    }

    try {
      return JSON.parse(content) as Record<string, unknown>
    } catch (error) {
      return yield* Effect.fail({
        _tag: "CliError" as const,
        message: "Failed to parse JSON content",
        cause: error
      })
    }
  })

const ensureOutputDirectory = (outputPath: string): Effect.Effect<void, CliError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    yield* pipe(
      fs.makeDirectory(outputPath, { recursive: true }),
      Effect.mapError((cause) => ({
        _tag: "CliError" as const,
        message: `Failed to create output directory: ${outputPath}`,
        cause
      }))
    )
  })

const writeGeneratedFile = (filePath: string, content: string): Effect.Effect<void, CliError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    yield* pipe(
      fs.writeFileString(filePath, content),
      Effect.mapError((cause) => ({
        _tag: "CliError" as const,
        message: `Failed to write file: ${filePath}`,
        cause
      }))
    )

    yield* Effect.logInfo(`Generated: ${filePath}`)
  })

const generateApiCode = (
  specPath: string,
  outputPath: string,
  format: string
): Effect.Effect<void, CliError, FileSystem.FileSystem> =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Reading OpenAPI specification from ${specPath}`)

    const specContent = yield* readSpecFile(specPath)
    const specObject = yield* parseSpecContent(specContent, specPath, format)

    yield* Effect.logInfo("Parsing OpenAPI specification...")
    const parsedSpec = yield* pipe(
      parseOpenAPI(specObject),
      Effect.mapError((cause) => ({
        _tag: "CliError" as const,
        message: "Failed to parse OpenAPI specification",
        cause
      }))
    )

    yield* Effect.logInfo("Creating output directory...")
    yield* ensureOutputDirectory(outputPath)

    // Generate schemas
    if (parsedSpec.components?.schemas) {
      yield* Effect.logInfo("Generating Effect Schema definitions...")
      const schemasCode = yield* pipe(
        generateSchemasFromComponents(parsedSpec.components),
        Effect.mapError((cause) => ({
          _tag: "CliError" as const,
          message: "Failed to generate schemas",
          cause
        }))
      )

      const schemasPath = path.join(outputPath, "schemas.ts")
      yield* writeGeneratedFile(schemasPath, schemasCode)
    }

    // Generate API endpoints
    yield* Effect.logInfo("Generating HttpApi endpoints...")
    const apiGroupCode = yield* pipe(
      generateHttpApiGroup(parsedSpec),
      Effect.mapError((cause) => ({
        _tag: "CliError" as const,
        message: "Failed to generate API group",
        cause
      }))
    )

    const endpointsPath = path.join(outputPath, "endpoints.ts")
    yield* writeGeneratedFile(endpointsPath, apiGroupCode)

    // Generate full API
    yield* Effect.logInfo("Generating complete HttpApi...")
    const fullApiCode = yield* pipe(
      generateFullHttpApi(parsedSpec),
      Effect.mapError((cause) => ({
        _tag: "CliError" as const,
        message: "Failed to generate full API",
        cause
      }))
    )

    const apiPath = path.join(outputPath, "api.ts")
    yield* writeGeneratedFile(apiPath, fullApiCode)

    // Generate index file
    const indexContent = `export * from "./schemas.js"
export * from "./endpoints.js"
export * from "./api.js"
`

    const indexPath = path.join(outputPath, "index.ts")
    yield* writeGeneratedFile(indexPath, indexContent)

    yield* Effect.logInfo("Code generation completed successfully!")
    yield* Effect.logInfo(`Generated files:`)
    yield* Effect.logInfo(`  - ${path.join(outputPath, "schemas.ts")}`)
    yield* Effect.logInfo(`  - ${path.join(outputPath, "endpoints.ts")}`)
    yield* Effect.logInfo(`  - ${path.join(outputPath, "api.ts")}`)
    yield* Effect.logInfo(`  - ${path.join(outputPath, "index.ts")}`)
  })

const generateCommand = Command.make("generate", {
  spec: specArg,
  output: outputOption,
  format: formatOption
}, ({ spec, output, format }) =>
  Effect.gen(function* () {
    yield* generateApiCode(spec, output, format)
  })
)

const cli = Command.run(generateCommand, {
  name: "effect-openapi-server-gen",
  version: "0.1.0"
})

pipe(
  cli(process.argv),
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
)