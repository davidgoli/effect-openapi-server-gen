/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type * as PathParser from "../Parser/PathParser.js"
import * as EndpointGenerator from "./EndpointGenerator.js"
import type * as SchemaGenerator from "./SchemaGenerator.js"

/**
 * @since 1.0.0
 * @category Models
 */
export interface OperationGroup {
  readonly name: string
  readonly capitalizedName: string
  readonly operations: ReadonlyArray<PathParser.ParsedOperation>
}

/**
 * Group operations by their first tag, or "default" if no tags
 *
 * @since 1.0.0
 * @category Grouping
 */
export const generateGroups = (
  operations: ReadonlyArray<PathParser.ParsedOperation>
): Effect.Effect<ReadonlyArray<OperationGroup>> =>
  Effect.sync(() => {
    const groupMap = new Map<string, Array<PathParser.ParsedOperation>>()

    for (const operation of operations) {
      const groupName = operation.tags.length > 0 ? operation.tags[0] : "default"

      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, [])
      }

      groupMap.get(groupName)!.push(operation)
    }

    const groups: Array<OperationGroup> = []

    for (const [name, ops] of groupMap.entries()) {
      groups.push({
        name,
        capitalizedName: capitalizeGroupName(name),
        operations: ops
      })
    }

    return groups
  })

/**
 * Generate HttpApiGroup code for a group of operations
 *
 * @since 1.0.0
 * @category Generation
 */
export const generateGroupCode = (
  group: OperationGroup
): Effect.Effect<string, SchemaGenerator.SchemaGenerationError> =>
  Effect.gen(function*() {
    const lines: Array<string> = []

    // Generate individual endpoint definitions
    const endpointVars: Array<string> = []

    for (const operation of group.operations) {
      const endpointCode = yield* EndpointGenerator.generateEndpoint(operation)
      const varName = operation.operationId
      lines.push(`const ${varName} = ${endpointCode}`)
      lines.push("")
      endpointVars.push(varName)
    }

    // Generate the group definition
    let groupCode = `const ${group.name}Group = HttpApiGroup.make("${group.name}")`

    for (const varName of endpointVars) {
      groupCode += `\n  .add(${varName})`
    }

    lines.push(groupCode)

    return lines.join("\n")
  })

/**
 * Capitalize group name (handle kebab-case)
 */
const capitalizeGroupName = (name: string): string => {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}
