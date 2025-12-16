/**
 * @since 1.0.0
 */
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import type * as OpenApiParser from '../Parser/OpenApiParser.js'

/**
 * @since 1.0.0
 * @category Errors
 */
export class SchemaGenerationError extends Data.TaggedError('SchemaGenerationError')<{
  readonly message: string
}> {}

/**
 * Generate Effect Schema code from an OpenAPI Schema Object
 *
 * @since 1.0.0
 * @category Generation
 */
export const generateSchemaCode = (schema: OpenApiParser.SchemaObject): Effect.Effect<string, SchemaGenerationError> =>
  Effect.gen(function* () {
    // Handle $ref by using the schema name
    if (schema.$ref) {
      const schemaName = extractSchemaName(schema.$ref)
      return `${schemaName}Schema`
    }

    // Handle allOf (schema composition)
    if (schema.allOf) {
      const schemas = schema.allOf
      if (schemas.length === 0) {
        return yield* new SchemaGenerationError({ message: 'allOf must have at least one schema' })
      }

      // Generate code for all schemas in allOf
      const schemaCodes: Array<string> = []
      for (const subSchema of schemas) {
        const code = yield* generateSchemaCode(subSchema)
        schemaCodes.push(code)
      }

      // Use Schema.extend for composition
      if (schemaCodes.length === 1) {
        return schemaCodes[0]
      }

      // Extend the first schema with the rest
      let result = schemaCodes[0]
      for (let i = 1; i < schemaCodes.length; i++) {
        result = `Schema.extend(${result}, ${schemaCodes[i]})`
      }
      return result
    }

    // Handle oneOf (union types)
    if (schema.oneOf) {
      const schemas = schema.oneOf
      if (schemas.length === 0) {
        return yield* new SchemaGenerationError({ message: 'oneOf must have at least one schema' })
      }

      const schemaCodes: Array<string> = []
      for (const subSchema of schemas) {
        const code = yield* generateSchemaCode(subSchema)
        schemaCodes.push(code)
      }

      return `Schema.Union(${schemaCodes.join(', ')})`
    }

    // Handle anyOf (union types, similar to oneOf)
    if (schema.anyOf) {
      const schemas = schema.anyOf
      if (schemas.length === 0) {
        return yield* new SchemaGenerationError({ message: 'anyOf must have at least one schema' })
      }

      const schemaCodes: Array<string> = []
      for (const subSchema of schemas) {
        const code = yield* generateSchemaCode(subSchema)
        schemaCodes.push(code)
      }

      return `Schema.Union(${schemaCodes.join(', ')})`
    }

    // Handle const keyword (OpenAPI 3.1)
    if ('const' in schema) {
      const value = schema.const
      return typeof value === 'string' ? `Schema.Literal('${value}')` : `Schema.Literal(${value})`
    }

    // Handle enum keyword
    if (schema.enum) {
      const literals = schema.enum.map((val) =>
        typeof val === 'string' ? `Schema.Literal('${val}')` : `Schema.Literal(${val})`
      )
      return `Schema.Union(${literals.join(', ')})`
    }

    // Handle nullable types (OpenAPI 3.0 style)
    if (schema.nullable === true) {
      // Remove nullable flag and generate base schema
      const baseSchema = { ...schema }
      delete (baseSchema as any).nullable
      const baseCode = yield* generateSchemaCode(baseSchema)
      return `Schema.Union(${baseCode}, Schema.Null)`
    }

    // Handle type array with null (OpenAPI 3.1 style)
    if (Array.isArray(schema.type)) {
      const types = schema.type
      if (types.includes('null')) {
        // Generate schema for non-null type
        const nonNullTypes = types.filter((t) => t !== 'null')
        if (nonNullTypes.length === 1) {
          const baseSchema = { ...schema, type: nonNullTypes[0] }
          const baseCode = yield* generateSchemaCode(baseSchema as OpenApiParser.SchemaObject)
          return `Schema.Union(${baseCode}, Schema.Null)`
        }
      }
    }

    // Handle primitive types with validation
    if (schema.type === 'string') {
      let code = 'Schema.String'

      // Apply validation filters
      const filters: Array<string> = []

      if (schema.minLength !== undefined) {
        filters.push(`Schema.minLength(${schema.minLength})`)
      }
      if (schema.maxLength !== undefined) {
        filters.push(`Schema.maxLength(${schema.maxLength})`)
      }
      if (schema.pattern !== undefined) {
        const escapedPattern = schema.pattern.replace(/\\/g, '\\\\')
        filters.push(`Schema.pattern(new RegExp('${escapedPattern}'))`)
      }

      if (filters.length > 0) {
        code = `${code}.pipe(${filters.join(', ')})`
      }

      return addAnnotations(code, schema)
    }

    if (schema.type === 'number' || schema.type === 'integer') {
      let code = 'Schema.Number'

      // Apply validation filters
      const filters: Array<string> = []

      if (schema.minimum !== undefined) {
        if (schema.exclusiveMinimum === true) {
          filters.push(`Schema.greaterThan(${schema.minimum})`)
        } else {
          filters.push(`Schema.greaterThanOrEqualTo(${schema.minimum})`)
        }
      }

      if (schema.maximum !== undefined) {
        if (schema.exclusiveMaximum === true) {
          filters.push(`Schema.lessThan(${schema.maximum})`)
        } else {
          filters.push(`Schema.lessThanOrEqualTo(${schema.maximum})`)
        }
      }

      if (schema.multipleOf !== undefined) {
        filters.push(`Schema.multipleOf(${schema.multipleOf})`)
      }

      if (filters.length > 0) {
        code = `${code}.pipe(${filters.join(', ')})`
      }

      return addAnnotations(code, schema)
    }

    if (schema.type === 'boolean') {
      return addAnnotations('Schema.Boolean', schema)
    }

    // Handle array type
    if (schema.type === 'array') {
      if (!schema.items) {
        return yield* new SchemaGenerationError({ message: "Array type must have 'items' property" })
      }

      const itemsCode = yield* generateSchemaCode(schema.items)
      return addAnnotations(`Schema.Array(${itemsCode})`, schema)
    }

    // Handle object type
    if (schema.type === 'object' || schema.properties !== undefined) {
      const properties = schema.properties || {}
      const required = schema.required || []
      const circularProps = (schema as any)['x-circular'] || []

      if (Object.keys(properties).length === 0) {
        return addAnnotations('Schema.Struct({})', schema)
      }

      const propertyEntries: Array<string> = []

      for (const [name, propSchema] of Object.entries(properties)) {
        const isRequired = required.includes(name)
        const isCircular = circularProps.includes(name)

        let propCode = yield* generateSchemaCode(propSchema)

        // Wrap circular references with Schema.suspend
        if (isCircular && propSchema.$ref) {
          const schemaName = extractSchemaName(propSchema.$ref)
          propCode = `Schema.suspend(() => ${schemaName}Schema)`
        } else if (isCircular && propSchema.type === 'array' && propSchema.items?.$ref) {
          const schemaName = extractSchemaName(propSchema.items.$ref)
          propCode = `Schema.Array(Schema.suspend(() => ${schemaName}Schema))`
        }

        if (!isRequired) {
          propCode = `Schema.optional(${propCode})`
        }

        // Quote property name if it contains special characters or is a reserved word
        const propertyName = needsQuoting(name) ? `'${name}'` : name

        // Add JSDoc comment if property has a description
        let propertyEntry = ''
        if (propSchema.description) {
          const escapedDescription = propSchema.description.replace(/\*\//g, '*\\/') // Escape closing comment
          propertyEntry = `/** ${escapedDescription} */\n  ${propertyName}: ${propCode}`
        } else {
          propertyEntry = `${propertyName}: ${propCode}`
        }

        propertyEntries.push(propertyEntry)
      }

      const structCode = `Schema.Struct({\n  ${propertyEntries.join(',\n  ')}\n})`
      return addAnnotations(structCode, schema)
    }

    return yield* new SchemaGenerationError({ message: `Unsupported schema type: ${schema.type || 'undefined'}` })
  })

/**
 * Sanitize a string to be a valid JavaScript identifier (PascalCase for schema names)
 * Handles kebab-case, snake_case, dots, and special characters
 */
const sanitizeIdentifier = (name: string): string => {
  // Replace non-alphanumeric characters with spaces, then split
  const parts = name
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)

  // Convert to PascalCase
  const sanitized = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')

  // Warn if the name was altered
  if (sanitized !== name) {
    console.warn(`⚠️  Schema name sanitized: "${name}" → "${sanitized}"`)
  }

  return sanitized
}

/**
 * Generate a named schema definition
 *
 * @since 1.0.0
 * @category Generation
 */
export const generateNamedSchema = (
  name: string,
  schema: OpenApiParser.SchemaObject
): Effect.Effect<string, SchemaGenerationError> =>
  Effect.gen(function* () {
    const schemaCode = yield* generateSchemaCode(schema)
    const sanitizedName = sanitizeIdentifier(name)

    // Generate JSDoc if schema has a description or is deprecated
    const lines: Array<string> = []
    const isDeprecated = (schema as any).deprecated === true

    if (schema.description || isDeprecated) {
      lines.push('/**')
      if (schema.description) {
        lines.push(` * ${schema.description}`)
      }
      if (isDeprecated) {
        if (schema.description) lines.push(' *')
        lines.push(' * @deprecated This schema is deprecated and may be removed in a future version.')
      }
      lines.push(' */')
    }

    lines.push(`export const ${sanitizedName}Schema = ${schemaCode}`)
    return lines.join('\n')
  })

/**
 * Extract and sanitize schema name from $ref string
 * e.g., "#/components/schemas/User" -> "User"
 * e.g., "#/components/schemas/schemas-Error" -> "SchemasError"
 */
const extractSchemaName = (ref: string): string => {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/)
  const rawName = match ? match[1] : ref
  return sanitizeIdentifier(rawName)
}

/**
 * Generate Effect Schema code specifically for query/path parameters
 * Query parameters are always strings in URLs, so we need NumberFromString, BooleanFromString, etc.
 *
 * @since 1.0.0
 * @category Generation
 */
export const generateQueryParamSchemaCode = (
  schema: OpenApiParser.SchemaObject
): Effect.Effect<string, SchemaGenerationError> =>
  Effect.gen(function* () {
    // Handle basic types that need string conversion
    if (!schema.type || typeof schema.type === 'string') {
      const type = schema.type || 'string'

      if (type === 'integer' || type === 'number') {
        // Use NumberFromString for query parameters
        let code = 'Schema.NumberFromString'

        // Apply validation filters
        const filters: Array<string> = []

        if (schema.minimum !== undefined) {
          if (schema.exclusiveMinimum === true) {
            filters.push(`Schema.greaterThan(${schema.minimum})`)
          } else {
            filters.push(`Schema.greaterThanOrEqualTo(${schema.minimum})`)
          }
        }

        if (schema.maximum !== undefined) {
          if (schema.exclusiveMaximum === true) {
            filters.push(`Schema.lessThan(${schema.maximum})`)
          } else {
            filters.push(`Schema.lessThanOrEqualTo(${schema.maximum})`)
          }
        }

        if (schema.multipleOf !== undefined) {
          filters.push(`Schema.multipleOf(${schema.multipleOf})`)
        }

        if (filters.length > 0) {
          code = `${code}.pipe(${filters.join(', ')})`
        }

        return code
      }

      if (type === 'boolean') {
        // Use BooleanFromString for query parameters
        return 'Schema.BooleanFromString'
      }
    }

    // For everything else, use the regular schema generation
    // (strings, arrays, enums, etc. work the same way)
    return yield* generateSchemaCode(schema)
  })

/**
 * Add annotations to schema code if description is present
 */
const addAnnotations = (code: string, schema: OpenApiParser.SchemaObject): string => {
  if (schema.description) {
    // Escape special characters for JSON string
    const escapedDescription = schema.description
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/'/g, "\\'") // Escape single quotes
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t') // Escape tabs
    return `${code}.annotations({ description: '${escapedDescription}' })`
  }
  return code
}

/**
 * Check if a property name needs to be quoted in object literal
 * JavaScript identifiers can only contain letters, digits, $, _ and cannot start with a digit
 */
const needsQuoting = (name: string): boolean => {
  // Check for reserved keywords
  const reserved = new Set([
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'new',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
    'let',
    'static',
    'enum',
    'await',
    'implements',
    'interface',
    'package',
    'private',
    'protected',
    'public',
  ])

  if (reserved.has(name)) {
    return true
  }

  // Check if it's a valid identifier
  // Must start with letter, $, or _
  // Can contain letters, digits, $, _
  const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/
  return !validIdentifier.test(name)
}
