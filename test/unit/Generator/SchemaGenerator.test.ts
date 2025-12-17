import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Logger from 'effect/Logger'
import * as SchemaGenerator from '../../../src/Generator/SchemaGenerator.js'
import type * as OpenApiParser from '../../../src/Parser/OpenApiParser.js'

/**
 * Create a test logger that captures log messages to a mutable array
 */
const makeTestLogger = (logs: Array<{ level: string; message: string }>) =>
  Logger.make(({ logLevel, message }) => {
    const messageStr = typeof message === 'string' ? message : String(message)
    logs.push({ level: logLevel.label, message: messageStr })
  })

describe('SchemaGenerator', () => {
  describe('generateSchemaCode', () => {
    it('should generate Schema.String for string type', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.String')
      }))

    it('should generate Schema.Number for number type', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'number',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.Number')
      }))

    it.effect('should generate Schema.Int for integer type', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'integer',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.Int')
      }))

    it.effect('should generate Schema.Int with constraints for integer type', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'integer',
          minimum: 1,
          maximum: 100,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.Int.pipe(Schema.greaterThanOrEqualTo(1), Schema.lessThanOrEqualTo(100))')
      }))

    it('should generate Schema.Boolean for boolean type', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'boolean',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.Boolean')
      }))

    it('should generate Schema.Struct for object type with properties', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name'],
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.Struct')
        expect(result).toContain('name: Schema.String')
        expect(result).toContain('age: Schema.optional(Schema.Number)')
      }))

    it('should generate Schema.Array for array type', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'array',
          items: { type: 'string' },
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.Array(Schema.String)')
      }))

    it('should fail when array type is missing items', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'array',
        }

        const result = yield* Effect.flip(SchemaGenerator.generateSchemaCode(schema))

        expect(result.message).toContain('array')
        expect(result.message).toContain('items')
      }))

    it('should generate Schema.optional for non-required properties', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'object',
          properties: {
            optional: { type: 'string' },
          },
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('optional: Schema.optional(Schema.String)')
      }))

    it('should handle nested objects', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
              required: ['name'],
            },
          },
          required: ['user'],
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.Struct')
        expect(result).toContain('user: Schema.Struct')
        expect(result).toContain('name: Schema.String')
      }))

    it('should handle object with no properties', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'object',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.Struct({})')
      }))

    it('should add description annotation when present', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          description: "User's name",
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('.annotations')
        expect(result).toContain('description')
        expect(result).toContain("User's name")
      }))

    it('should fail for unsupported type', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'unknown',
        }

        const result = yield* Effect.flip(SchemaGenerator.generateSchemaCode(schema))

        expect(result.message).toContain('Unsupported')
      }))

    it('should handle $ref by using schema name', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          $ref: '#/components/schemas/User',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('UserSchema')
      }))

    it('should handle $ref in object properties', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'object',
          properties: {
            id: { type: 'string' },
            author: { $ref: '#/components/schemas/User' },
          },
          required: ['id'],
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('author: UserSchema')
      }))

    it('should handle $ref in array items', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'array',
          items: { $ref: '#/components/schemas/User' },
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.Array(UserSchema)')
      }))

    it('should use Schema.suspend for circular $ref', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'object',
          properties: {
            id: { type: 'string' },
            friends: {
              type: 'array',
              items: { $ref: '#/components/schemas/User' },
            },
          },
          required: ['id'],
          'x-circular': ['friends'],
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('friends: Schema.optional(Schema.Array(Schema.suspend(() => UserSchema)))')
      }))
  })

  describe('generateNamedSchema', () => {
    it('should generate a named schema definition', () =>
      Effect.gen(function* () {
        const name = 'User'
        const schema: OpenApiParser.SchemaObject = {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
          required: ['id', 'name'],
        }

        const result = yield* SchemaGenerator.generateNamedSchema(name, schema)

        expect(result).toContain('const UserSchema = Schema.Struct')
        expect(result).toContain('id: Schema.String')
        expect(result).toContain('name: Schema.String')
      }))

    it('should handle schema with description', () =>
      Effect.gen(function* () {
        const name = 'User'
        const schema: OpenApiParser.SchemaObject = {
          type: 'object',
          description: 'A user entity',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        }

        const result = yield* SchemaGenerator.generateNamedSchema(name, schema)

        expect(result).toContain('const UserSchema =')
        expect(result).toContain('description')
        expect(result).toContain('A user entity')
      }))

    it('should handle schemas with $refs', () =>
      Effect.gen(function* () {
        const name = 'Post'
        const schema: OpenApiParser.SchemaObject = {
          type: 'object',
          properties: {
            id: { type: 'string' },
            author: { $ref: '#/components/schemas/User' },
          },
          required: ['id'],
        }

        const result = yield* SchemaGenerator.generateNamedSchema(name, schema)

        expect(result).toContain('const PostSchema = Schema.Struct')
        expect(result).toContain('author: UserSchema')
      }))
  })

  describe('enums and literals - Phase 3', () => {
    it('should handle string enum as Schema.Literal union', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          enum: ['active', 'inactive', 'pending'],
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.Literal')
        expect(result).toContain('"active"')
        expect(result).toContain('"inactive"')
        expect(result).toContain('"pending"')
      }))

    it('should handle numeric enum', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'number',
          enum: [1, 2, 3],
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.Literal')
      }))

    it('should handle const keyword as Schema.Literal', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          const: 'fixed-value',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.Literal("fixed-value")')
      }))
  })

  describe('string validation - Phase 3', () => {
    it('should handle minLength constraint', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          minLength: 3,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.String')
        expect(result).toContain('Schema.minLength')
        expect(result).toContain('3')
      }))

    it('should handle maxLength constraint', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          maxLength: 100,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.maxLength')
        expect(result).toContain('100')
      }))

    it('should handle pattern (regex) constraint', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          pattern: '^[a-zA-Z0-9]+$',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.pattern')
        expect(result).toContain('^[a-zA-Z0-9]+$')
      }))
  })

  describe('string format support - Phase 5', () => {
    it.effect('should generate Schema.UUID for uuid format', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          format: 'uuid',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.UUID')
      }))

    it.effect('should generate email validation for email format', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          format: 'email',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        // Should use pattern validation for email
        expect(result).toContain('Schema.String')
        expect(result).toContain('Schema.pattern')
      }))

    it.effect('should generate Schema.DateTimeUtc for date-time format', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          format: 'date-time',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.DateTimeUtc')
      }))

    it.effect('should generate Schema.DateFromString for date format', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          format: 'date',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.DateFromString')
      }))

    it.effect('should generate Schema.URL for uri format', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          format: 'uri',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.URL')
      }))

    it.effect('should generate Schema.URL for url format', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          format: 'url',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.URL')
      }))

    it.effect('should fall back to Schema.String for unknown formats', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          format: 'unknown-custom-format',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.String')
      }))

    it.effect('should combine format with other constraints when applicable', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          format: 'email',
          minLength: 5,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.String')
        expect(result).toContain('Schema.pattern')
        expect(result).toContain('Schema.minLength')
      }))

    it.effect('should add description annotation to format schemas', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          format: 'uuid',
          description: 'User unique identifier',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.UUID')
        expect(result).toContain('.annotations')
        expect(result).toContain('User unique identifier')
      }))
  })

  describe('array validation - Phase 6', () => {
    it.effect('should generate minItems constraint', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.Array(Schema.String).pipe(Schema.minItems(1))')
      }))

    it.effect('should generate maxItems constraint', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'array',
          items: { type: 'number' },
          maxItems: 10,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.Array(Schema.Number).pipe(Schema.maxItems(10))')
      }))

    it.effect('should combine minItems and maxItems', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 5,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.Array(Schema.String).pipe(Schema.minItems(1), Schema.maxItems(5))')
      }))

    it.effect('should handle uniqueItems constraint', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'array',
          items: { type: 'string' },
          uniqueItems: true,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        // Should filter to ensure all items are unique
        expect(result).toContain('Schema.Array(Schema.String)')
        expect(result).toContain('Schema.filter')
      }))

    it.effect('should combine all array constraints', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'array',
          items: { type: 'integer' },
          minItems: 2,
          maxItems: 10,
          uniqueItems: true,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.Array(Schema.Int)')
        expect(result).toContain('Schema.minItems(2)')
        expect(result).toContain('Schema.maxItems(10)')
        expect(result).toContain('Schema.filter')
      }))

    it.effect('should add description annotation to constrained arrays', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          description: 'A non-empty list of tags',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.minItems(1)')
        expect(result).toContain('.annotations')
        expect(result).toContain('A non-empty list of tags')
      }))
  })

  describe('additionalProperties support - Phase 7', () => {
    it.effect('should generate Schema.Record for additionalProperties: true', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'object',
          additionalProperties: true,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.Record({ key: Schema.String, value: Schema.Unknown })')
      }))

    it.effect('should generate typed Schema.Record for additionalProperties with schema', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.Record({ key: Schema.String, value: Schema.String })')
      }))

    it.effect('should not generate Record for additionalProperties: false', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'object',
          additionalProperties: false,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toBe('Schema.Struct({})')
      }))

    it.effect('should combine properties with additionalProperties', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
          additionalProperties: {
            type: 'number',
          },
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        // Should use Schema.extend to combine Struct with Record
        expect(result).toContain('Schema.extend')
        expect(result).toContain('name: Schema.String')
        expect(result).toContain('Schema.Record({ key: Schema.String, value: Schema.Number })')
      }))

    it.effect('should add description annotation to Record schema', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'object',
          additionalProperties: {
            type: 'string',
          },
          description: 'A string map',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.Record({ key: Schema.String, value: Schema.String })')
        expect(result).toContain('.annotations')
        expect(result).toContain('A string map')
      }))
  })

  describe('number validation - Phase 3', () => {
    it('should handle minimum constraint', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'number',
          minimum: 0,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.Number')
        expect(result).toContain('Schema.greaterThanOrEqualTo')
        expect(result).toContain('0')
      }))

    it('should handle maximum constraint', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'number',
          maximum: 100,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.lessThanOrEqualTo')
        expect(result).toContain('100')
      }))

    it('should handle multipleOf constraint', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'number',
          multipleOf: 0.5,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.multipleOf')
        expect(result).toContain('0.5')
      }))

    it('should handle exclusiveMinimum (OpenAPI 3.0 boolean style)', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'number',
          minimum: 0,
          exclusiveMinimum: true,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.greaterThan')
        expect(result).toContain('0')
      }))

    it('should handle exclusiveMinimum (OpenAPI 3.1 numeric style)', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'number',
          exclusiveMinimum: 5,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.greaterThan')
        expect(result).toContain('5')
      }))

    it('should handle exclusiveMaximum (OpenAPI 3.0 boolean style)', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'number',
          maximum: 100,
          exclusiveMaximum: true,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.lessThan')
        expect(result).toContain('100')
      }))

    it('should handle exclusiveMaximum (OpenAPI 3.1 numeric style)', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'number',
          exclusiveMaximum: 100,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.lessThan')
        expect(result).toContain('100')
      }))
  })

  describe('nullable types - Phase 3', () => {
    it('should handle nullable property (OpenAPI 3.0 style)', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          nullable: true,
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.Union')
        expect(result).toContain('Schema.String')
        expect(result).toContain('Schema.Null')
      }))

    it('should handle type array with null (OpenAPI 3.1 style)', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: ['string', 'null'],
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.Union')
        expect(result).toContain('Schema.String')
        expect(result).toContain('Schema.Null')
      }))
  })

  describe('schema combinators - Phase 3', () => {
    it('should handle allOf with $ref and inline schemas', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          allOf: [
            { $ref: '#/components/schemas/BaseEntity' },
            {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
              required: ['name'],
            },
          ],
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.extend')
        expect(result).toContain('BaseEntitySchema')
        expect(result).toContain('name: Schema.String')
      }))

    it('should handle oneOf as Schema.Union', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.Union')
        expect(result).toContain('Schema.String')
        expect(result).toContain('Schema.Number')
      }))

    it('should handle oneOf with $refs', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          oneOf: [{ $ref: '#/components/schemas/User' }, { $ref: '#/components/schemas/Product' }],
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.Union')
        expect(result).toContain('UserSchema')
        expect(result).toContain('ProductSchema')
      }))

    it('should handle anyOf as Schema.Union', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          anyOf: [
            { type: 'string', format: 'email' },
            { type: 'string', format: 'uri' },
          ],
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        expect(result).toContain('Schema.Union')
        expect(result).toContain('Schema.String')
      }))
  })

  describe('string escaping - edge cases', () => {
    it('should properly escape single quotes in regex patterns', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          pattern: "user's name",
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        // Should escape single quote to avoid breaking the regex string
        expect(result).toContain('Schema.pattern')
        // Single quote should be escaped
        expect(result).toContain("\\'")
        // The result should not contain unescaped single quote inside the pattern
        expect(result).toMatch(/new RegExp\('.*\\'.*'\)/)
      }))

    it('should escape template literal syntax in descriptions', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          description: 'Price: ${amount}',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        // Should not contain unescaped template literal
        expect(result).toContain('\\${')
        expect(result).not.toContain('${amount}')
      }))

    it('should escape backticks in descriptions', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          description: 'Use `code` blocks',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        // Should escape backticks
        expect(result).toContain('\\`')
        expect(result).not.toMatch(/[^\\]`/)
      }))

    it('should handle backslashes in patterns', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          pattern: '\\d+',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        // Should properly escape backslashes for regex
        expect(result).toContain('\\\\d')
      }))

    it('should handle complex regex with multiple escape scenarios', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          pattern: "user's \\w+ name",
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        // Should escape both single quote and backslash
        expect(result).toContain('Schema.pattern')
        // Should contain escaped single quote
        expect(result).toContain("\\'")
        // Should contain escaped backslash for the \w
        expect(result).toContain('\\\\w')
      }))

    it('should handle double quotes in descriptions', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          description: 'He said "hello"',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        // Single-quoted string should not need double quote escaping
        expect(result).toContain('He said "hello"')
      }))

    it('should handle newlines and tabs in descriptions', () =>
      Effect.gen(function* () {
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
          description: 'Line 1\nLine 2\tTabbed',
        }

        const result = yield* SchemaGenerator.generateSchemaCode(schema)

        // Should escape newlines and tabs
        expect(result).toContain('\\n')
        expect(result).toContain('\\t')
      }))
  })

  describe('logging warnings', () => {
    it.effect('should log warning when schema name is sanitized', () =>
      Effect.gen(function* () {
        const logs: Array<{ level: string; message: string }> = []
        const testLogger = makeTestLogger(logs)

        const name = 'kebab-case-name'
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
        }

        yield* SchemaGenerator.generateNamedSchema(name, schema).pipe(
          Effect.provide(Logger.replace(Logger.defaultLogger, testLogger))
        )

        const warnings = logs.filter((l) => l.level === 'WARN')

        expect(warnings.length).toBeGreaterThan(0)
        expect(warnings.some((w) => w.message.includes('kebab-case-name'))).toBe(true)
        expect(warnings.some((w) => w.message.includes('KebabCaseName'))).toBe(true)
      }))

    it.effect('should not log warning when schema name does not need sanitization', () =>
      Effect.gen(function* () {
        const logs: Array<{ level: string; message: string }> = []
        const testLogger = makeTestLogger(logs)

        const name = 'ValidName'
        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
        }

        yield* SchemaGenerator.generateNamedSchema(name, schema).pipe(
          Effect.provide(Logger.replace(Logger.defaultLogger, testLogger))
        )

        const warnings = logs.filter((l) => l.level === 'WARN')

        expect(warnings.length).toBe(0)
      }))
  })
})
