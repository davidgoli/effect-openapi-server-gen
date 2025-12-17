import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as OpenApiParser from '../../../src/Parser/OpenApiParser.js'

describe('OpenApiParser', () => {
  describe('parse', () => {
    it('should parse a minimal valid OpenAPI 3.1 spec', () =>
      Effect.gen(function* () {
        const spec = {
          openapi: '3.1.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          paths: {},
        }

        const result = yield* OpenApiParser.parse(JSON.stringify(spec))

        expect(result.openapi).toBe('3.1.0')
        expect(result.info.title).toBe('Test API')
        expect(result.info.version).toBe('1.0.0')
        expect(result.paths).toEqual({})
      }))

    it('should parse OpenAPI spec from YAML string', () =>
      Effect.gen(function* () {
        const yaml = `
openapi: 3.1.0
info:
  title: Test API
  version: 1.0.0
paths: {}
`

        const result = yield* OpenApiParser.parse(yaml)

        expect(result.openapi).toBe('3.1.0')
        expect(result.info.title).toBe('Test API')
      }))

    it('should fail if openapi version is missing', () =>
      Effect.gen(function* () {
        const spec = {
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          paths: {},
        }

        const result = yield* Effect.flip(OpenApiParser.parse(JSON.stringify(spec)))

        expect(result.message).toContain('openapi')
      }))

    it('should fail if openapi version is not 3.1.x', () =>
      Effect.gen(function* () {
        const spec = {
          openapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          paths: {},
        }

        const result = yield* Effect.flip(OpenApiParser.parse(JSON.stringify(spec)))

        expect(result.message).toContain('3.1')
      }))

    it('should fail if info section is missing', () =>
      Effect.gen(function* () {
        const spec = {
          openapi: '3.1.0',
          paths: {},
        }

        const result = yield* Effect.flip(OpenApiParser.parse(JSON.stringify(spec)))

        expect(result.message).toContain('info')
      }))

    it('should fail if paths section is missing', () =>
      Effect.gen(function* () {
        const spec = {
          openapi: '3.1.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
        }

        const result = yield* Effect.flip(OpenApiParser.parse(JSON.stringify(spec)))

        expect(result.message).toContain('paths')
      }))

    it('should fail for invalid JSON', () =>
      Effect.gen(function* () {
        const invalidJson = '{invalid json'

        const result = yield* Effect.flip(OpenApiParser.parse(invalidJson))

        expect(result.message).toBeDefined()
      }))

    it('should parse spec with paths and operations', () =>
      Effect.gen(function* () {
        const spec = {
          openapi: '3.1.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          paths: {
            '/users': {
              get: {
                operationId: 'getUsers',
                responses: {
                  '200': {
                    description: 'Success',
                  },
                },
              },
            },
          },
        }

        const result = yield* OpenApiParser.parse(JSON.stringify(spec))

        expect(result.paths['/users']).toBeDefined()
        expect(result.paths['/users'].get).toBeDefined()
        expect(result.paths['/users'].get!.operationId).toBe('getUsers')
      }))

    it('should fail if an operation is missing operationId', () =>
      Effect.gen(function* () {
        const spec = {
          openapi: '3.1.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          paths: {
            '/users': {
              get: {
                responses: {
                  '200': {
                    description: 'Success',
                  },
                },
              },
            },
          },
        }

        const result = yield* Effect.flip(OpenApiParser.parse(JSON.stringify(spec)))

        expect(result.message).toContain('operationId')
        expect(result.message).toContain('/users')
        expect(result.message).toContain('get')
      }))

    it('should fail if operationIds are duplicated across different operations', () =>
      Effect.gen(function* () {
        const spec = {
          openapi: '3.1.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          paths: {
            '/users': {
              get: {
                operationId: 'getItems',
                responses: {
                  '200': {
                    description: 'Success',
                  },
                },
              },
            },
            '/posts': {
              get: {
                operationId: 'getItems',
                responses: {
                  '200': {
                    description: 'Success',
                  },
                },
              },
            },
          },
        }

        const result = yield* Effect.flip(OpenApiParser.parse(JSON.stringify(spec)))

        expect(result.message).toContain('operationId')
        expect(result.message).toContain('getItems')
        expect(result.message).toContain('duplicate')
      }))

    it('should fail when operationId is duplicated in same path but different method', () =>
      Effect.gen(function* () {
        const spec = {
          openapi: '3.1.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
          paths: {
            '/users': {
              get: {
                operationId: 'userOperation',
                responses: {
                  '200': {
                    description: 'Success',
                  },
                },
              },
              post: {
                operationId: 'userOperation',
                responses: {
                  '200': {
                    description: 'Success',
                  },
                },
              },
            },
          },
        }

        const result = yield* Effect.flip(OpenApiParser.parse(JSON.stringify(spec)))

        expect(result.message).toContain('operationId')
        expect(result.message).toContain('userOperation')
        expect(result.message).toContain('duplicate')
      }))
  })
})
