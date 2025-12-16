import { describe, expect, it, } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import type * as OpenApiParser from '../../../src/Parser/OpenApiParser.js'
import * as ReferenceResolver from '../../../src/Parser/ReferenceResolver.js'
import type * as SchemaParser from '../../../src/Parser/SchemaParser.js'

describe('ReferenceResolver', () => {
  describe('parseRefString', () => {
    it('should parse a components/schemas reference', () =>
      Effect.gen(function*() {
        const ref = '#/components/schemas/User'

        const result = yield* ReferenceResolver.parseRefString(ref,)

        expect(result.type,).toBe('component',)
        expect(result.schemaName,).toBe('User',)
      },))

    it('should fail on invalid reference format', () =>
      Effect.gen(function*() {
        const ref = '#/invalid/path'

        const result = yield* Effect.either(ReferenceResolver.parseRefString(ref,),)

        expect(result._tag,).toBe('Left',)
      },))
  })

  describe('resolveSchema', () => {
    it('should resolve a simple $ref', () =>
      Effect.gen(function*() {
        const registry: SchemaParser.SchemaRegistry = {
          schemas: new Map([
            [
              'User',
              {
                type: 'object',
                properties: {
                  id: { type: 'string', },
                  name: { type: 'string', },
                },
                required: ['id',],
              },
            ],
          ],),
        }

        const schema: OpenApiParser.SchemaObject = {
          $ref: '#/components/schemas/User',
        }

        const result = yield* ReferenceResolver.resolveSchema(schema, registry,)

        expect(result.type,).toBe('object',)
        expect(result.properties,).toBeDefined()
        expect(result.properties?.id,).toBeDefined()
      },))

    it('should return schema as-is if no $ref', () =>
      Effect.gen(function*() {
        const registry: SchemaParser.SchemaRegistry = {
          schemas: new Map(),
        }

        const schema: OpenApiParser.SchemaObject = {
          type: 'string',
        }

        const result = yield* ReferenceResolver.resolveSchema(schema, registry,)

        expect(result.type,).toBe('string',)
      },))

    it('should resolve nested $refs in properties', () =>
      Effect.gen(function*() {
        const registry: SchemaParser.SchemaRegistry = {
          schemas: new Map([
            [
              'User',
              {
                type: 'object',
                properties: {
                  id: { type: 'string', },
                },
                required: ['id',],
              },
            ],
            [
              'Post',
              {
                type: 'object',
                properties: {
                  id: { type: 'string', },
                  author: { $ref: '#/components/schemas/User', },
                },
                required: ['id',],
              },
            ],
          ],),
        }

        const schema: OpenApiParser.SchemaObject = {
          $ref: '#/components/schemas/Post',
        }

        const result = yield* ReferenceResolver.resolveSchema(schema, registry,)

        expect(result.type,).toBe('object',)
        expect(result.properties?.author,).toBeDefined()
        // Author should be resolved to the User schema
        expect(result.properties?.author.type,).toBe('object',)
        expect(result.properties?.author.properties?.id,).toBeDefined()
      },))

    it('should fail when $ref points to non-existent schema', () =>
      Effect.gen(function*() {
        const registry: SchemaParser.SchemaRegistry = {
          schemas: new Map(),
        }

        const schema: OpenApiParser.SchemaObject = {
          $ref: '#/components/schemas/NonExistent',
        }

        const result = yield* Effect.either(ReferenceResolver.resolveSchema(schema, registry,),)

        expect(result._tag,).toBe('Left',)
      },))

    it('should detect and handle circular references', () =>
      Effect.gen(function*() {
        const registry: SchemaParser.SchemaRegistry = {
          schemas: new Map([
            [
              'User',
              {
                type: 'object',
                properties: {
                  id: { type: 'string', },
                  friends: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/User', },
                  },
                },
                required: ['id',],
              },
            ],
          ],),
        }

        const schema: OpenApiParser.SchemaObject = {
          $ref: '#/components/schemas/User',
        }

        const result = yield* ReferenceResolver.resolveSchema(schema, registry,)

        // Should mark the schema as having circular references
        expect(result.type,).toBe('object',)
        expect(result.properties?.friends,).toBeDefined()
        // The circular ref should be preserved for later handling
        expect(result.properties?.friends.items?.$ref,).toBe('#/components/schemas/User',)
      },))

    it('should resolve arrays with $ref items', () =>
      Effect.gen(function*() {
        const registry: SchemaParser.SchemaRegistry = {
          schemas: new Map([
            [
              'User',
              {
                type: 'object',
                properties: {
                  id: { type: 'string', },
                },
                required: ['id',],
              },
            ],
          ],),
        }

        const schema: OpenApiParser.SchemaObject = {
          type: 'array',
          items: { $ref: '#/components/schemas/User', },
        }

        const result = yield* ReferenceResolver.resolveSchema(schema, registry,)

        expect(result.type,).toBe('array',)
        expect(result.items?.type,).toBe('object',)
        expect(result.items?.properties?.id,).toBeDefined()
      },))
  })
})
