/**
 * @since 1.0.0
 */
import * as Effect from 'effect/Effect'
import type * as PathParser from '../Parser/PathParser.js'
import * as EndpointGenerator from './EndpointGenerator.js'
import type * as SchemaGenerator from './SchemaGenerator.js'

/**
 * @since 1.0.0
 * @category Models
 */
export interface OperationGroup {
  readonly name: string
  readonly varName: string
  readonly capitalizedName: string
  readonly operations: ReadonlyArray<PathParser.ParsedOperation>
}

/**
 * Sanitize a string to be a valid JavaScript identifier (camelCase)
 * Handles kebab-case, spaces, and special characters
 */
const sanitizeIdentifier = (name: string): string => {
  // Replace non-alphanumeric characters with spaces, then split
  const parts = name
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)

  // Convert to camelCase
  const sanitized = parts
    .map((part, index) => {
      if (index === 0) {
        // First part: lowercase
        return part.charAt(0).toLowerCase() + part.slice(1)
      } else {
        // Subsequent parts: capitalize first letter
        return part.charAt(0).toUpperCase() + part.slice(1)
      }
    })
    .join('')

  // Warn if the name was altered
  if (sanitized !== name) {
    console.warn(`⚠️  Group name sanitized: "${name}" → "${sanitized}"`)
  }

  return sanitized
}

/**
 * Capitalize group name (handle kebab-case)
 */
const capitalizeGroupName = (name: string): string => {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
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
      const groupName = operation.tags.length > 0 ? operation.tags[0] : 'default'

      if (!groupMap.has(groupName)) {
        groupMap.set(groupName, [])
      }

      groupMap.get(groupName)!.push(operation)
    }

    const groups: Array<OperationGroup> = []

    for (const [name, ops] of groupMap.entries()) {
      groups.push({
        name,
        varName: sanitizeIdentifier(name),
        capitalizedName: capitalizeGroupName(name),
        operations: ops,
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
  Effect.gen(function* () {
    const lines: Array<string> = []

    // Generate individual endpoint definitions
    const endpointVars: Array<string> = []
    const declaredParams = new Set<string>()

    for (const operation of group.operations) {
      const generated = yield* EndpointGenerator.generateEndpoint(operation)
      const varName = operation.operationId

      // Add path parameter declarations first (only if not already declared)
      for (const paramDecl of generated.pathParamDeclarations) {
        // Extract the parameter variable name from the declaration
        // e.g., "const userIdParam = ..." -> "userIdParam"
        const match = paramDecl.match(/^const\s+(\w+)\s+=/)
        if (match) {
          const paramVarName = match[1]
          if (!declaredParams.has(paramVarName)) {
            lines.push(paramDecl)
            lines.push('')
            declaredParams.add(paramVarName)
          }
        }
      }

      // Then add the endpoint definition (exported)
      if (generated.jsdocComment) {
        lines.push(generated.jsdocComment)
      }
      lines.push(`export const ${varName} = ${generated.endpointCode}`)
      lines.push('')
      endpointVars.push(varName)
    }

    // Generate the group definition (exported)
    // Use the sanitized variable name from the group
    let groupCode = `export const ${group.varName}Group = HttpApiGroup.make('${group.name}')`

    for (const varName of endpointVars) {
      groupCode += `\n  .add(${varName})`
    }

    lines.push(groupCode)

    return lines.join('\n')
  })
