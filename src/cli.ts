#!/usr/bin/env node
import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Effect, pipe } from "effect"

const specArg = Args.text({ name: "spec" })

const nameOption = Options.text("name").pipe(
  Options.withDefault("Api")
)

const outputOption = Options.text("output").pipe(
  Options.withDefault("./generated")
)

const command = Command.make("generate", { spec: specArg, name: nameOption, output: outputOption }, ({ spec, name, output }) =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`Generating Effect HttpApi server code from ${spec}`)
    yield* Effect.logInfo(`Output will be written to ${output} with name ${name}`)

    // TODO: Implement actual generation logic
    yield* Effect.succeed("Generation completed successfully")
  })
)

const cli = Command.run(command, {
  name: "effect-openapi-server-gen",
  version: "0.1.0"
})

pipe(
  cli(process.argv),
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain
)