import { describe, expect, it, } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import type * as OpenApiParser from '../../../src/Parser/OpenApiParser.js'
import * as SchemaParser from '../../../src/Parser/SchemaParser.js'

describe('SchemaParser', () => {
  describe('parseComponents', () => {
    it('should parse components/schemas into a registry', () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0', },
          paths: {},
          components: {
            schemas: {
              User: {
                type: 'object',
                properties: {
                  id: { type: 'string', },
                  name: { type: 'string', },
                },
                required: ['id', 'name',],
              },
              Post: {
                type: 'object',
                properties: {
                  id: { type: 'string', },
                  title: { type: 'string', },
                },
                required: ['id',],
              },
            },
          },
        }

        const registry = yield* SchemaParser.parseComponents(spec,)

        expect(registry.schemas.size,).toBe(2,)
        expect(registry.schemas.has('User',),).toBe(true,)
        expect(registry.schemas.has('Post',),).toBe(true,)

        const userSchema = registry.schemas.get('User',)
        expect(userSchema?.type,).toBe('object',)
        expect(userSchema?.properties,).toBeDefined()
      },))

    it('should handle spec without components section', () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0', },
          paths: {},
        }

        const registry = yield* SchemaParser.parseComponents(spec,)

        expect(registry.schemas.size,).toBe(0,)
      },))

    it('should handle spec with empty components/schemas', () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0', },
          paths: {},
          components: {
            schemas: {},
          },
        }

        const registry = yield* SchemaParser.parseComponents(spec,)

        expect(registry.schemas.size,).toBe(0,)
      },))

    it('should preserve schema properties correctly', () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0', },
          paths: {},
          components: {
            schemas: {
              Category: {
                type: 'object',
                description: 'A category',
                properties: {
                  id: { type: 'number', description: 'Category ID', },
                  name: { type: 'string', description: 'Category name', },
                },
                required: ['id', 'name',],
              },
            },
          },
        }

        const registry = yield* SchemaParser.parseComponents(spec,)

        const categorySchema = registry.schemas.get('Category',)
        expect(categorySchema?.description,).toBe('A category',)
        expect(categorySchema?.properties?.id,).toBeDefined()
        expect(categorySchema?.properties?.id.description,).toBe('Category ID',)
      },))

    it('should handle schemas with $ref references', () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0', },
          paths: {},
          components: {
            schemas: {
              User: {
                type: 'object',
                properties: {
                  id: { type: 'string', },
                },
                required: ['id',],
              },
              Post: {
                type: 'object',
                properties: {
                  id: { type: 'string', },
                  author: { $ref: '#/components/schemas/User', },
                },
                required: ['id',],
              },
            },
          },
        }

        const registry = yield* SchemaParser.parseComponents(spec,)

        expect(registry.schemas.size,).toBe(2,)
        const postSchema = registry.schemas.get('Post',)
        expect(postSchema?.properties?.author,).toBeDefined()
        expect(postSchema?.properties?.author.$ref,).toBe('#/components/schemas/User',)
      },))

    it('should handle schemas with arrays', () =>
      Effect.gen(function*() {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0', },
          paths: {},
          components: {
            schemas: {
              UserList: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', },
                  },
                },
              },
            },
          },
        }

        const registry = yield* SchemaParser.parseComponents(spec,)

        const listSchema = registry.schemas.get('UserList',)
        expect(listSchema?.type,).toBe('array',)
        expect(listSchema?.items,).toBeDefined()
      },))
  })
})
