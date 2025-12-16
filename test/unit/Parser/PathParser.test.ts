import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import type * as OpenApiParser from '../../../src/Parser/OpenApiParser.js'
import * as PathParser from '../../../src/Parser/PathParser.js'

describe('PathParser', () => {
  describe('extractOperations', () => {
    it('should extract a single GET operation', () =>
      Effect.gen(function* () {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/users': {
              get: {
                operationId: 'getUsers',
                responses: { '200': { description: 'Success' } },
              },
            },
          },
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations).toHaveLength(1)
        expect(operations[0].operationId).toBe('getUsers')
        expect(operations[0].method).toBe('get')
        expect(operations[0].path).toBe('/users')
      }))

    it('should extract multiple operations from same path', () =>
      Effect.gen(function* () {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/users': {
              get: {
                operationId: 'getUsers',
                responses: { '200': { description: 'Success' } },
              },
              post: {
                operationId: 'createUser',
                responses: { '201': { description: 'Created' } },
              },
            },
          },
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations).toHaveLength(2)
        expect(operations.map((op) => op.operationId)).toEqual(['getUsers', 'createUser'])
        expect(operations.map((op) => op.method)).toEqual(['get', 'post'])
      }))

    it('should extract operations from multiple paths', () =>
      Effect.gen(function* () {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/users': {
              get: {
                operationId: 'getUsers',
                responses: { '200': { description: 'Success' } },
              },
            },
            '/posts': {
              get: {
                operationId: 'getPosts',
                responses: { '200': { description: 'Success' } },
              },
            },
          },
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations).toHaveLength(2)
        expect(operations.map((op) => op.path)).toEqual(['/users', '/posts'])
      }))

    it('should extract path parameters', () =>
      Effect.gen(function* () {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/users/{userId}': {
              get: {
                operationId: 'getUser',
                parameters: [
                  {
                    name: 'userId',
                    in: 'path',
                    required: true,
                    schema: { type: 'number' },
                  },
                ],
                responses: { '200': { description: 'Success' } },
              },
            },
          },
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].pathParameters).toHaveLength(1)
        expect(operations[0].pathParameters[0].name).toBe('userId')
        expect(operations[0].pathParameters[0].schema?.type).toBe('number')
      }))

    it('should extract query parameters', () =>
      Effect.gen(function* () {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/users': {
              get: {
                operationId: 'getUsers',
                parameters: [
                  {
                    name: 'page',
                    in: 'query',
                    schema: { type: 'number' },
                  },
                  {
                    name: 'limit',
                    in: 'query',
                    required: true,
                    schema: { type: 'number' },
                  },
                ],
                responses: { '200': { description: 'Success' } },
              },
            },
          },
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].queryParameters).toHaveLength(2)
        expect(operations[0].queryParameters.map((p) => p.name)).toEqual(['page', 'limit'])
      }))

    it('should extract request body schema', () =>
      Effect.gen(function* () {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/users': {
              post: {
                operationId: 'createUser',
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                        },
                      },
                    },
                  },
                },
                responses: { '201': { description: 'Created' } },
              },
            },
          },
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].requestBody).toBeDefined()
        expect(operations[0].requestBody?.schema.type).toBe('object')
        expect(operations[0].requestBody?.required).toBe(true)
      }))

    it('should extract response schema', () =>
      Effect.gen(function* () {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/users': {
              get: {
                operationId: 'getUsers',
                responses: {
                  '200': {
                    description: 'Success',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'array',
                          items: { type: 'object' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].responses).toHaveLength(1)
        expect(operations[0].responses[0].schema.type).toBe('array')
        expect(operations[0].responses[0].statusCode).toBe('200')
      }))

    it('should extract multiple response codes', () =>
      Effect.gen(function* () {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/users': {
              post: {
                operationId: 'createUser',
                responses: {
                  '201': {
                    description: 'Created',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                  '400': {
                    description: 'Bad Request',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            error: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                  '409': {
                    description: 'Conflict',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            message: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].responses).toHaveLength(3)
        expect(operations[0].responses.map((r) => r.statusCode)).toEqual(['201', '400', '409'])
      }))

    it('should extract tags', () =>
      Effect.gen(function* () {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/users': {
              get: {
                operationId: 'getUsers',
                tags: ['users', 'public'],
                responses: { '200': { description: 'Success' } },
              },
            },
          },
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].tags).toEqual(['users', 'public'])
      }))

    it('should handle operation with no parameters', () =>
      Effect.gen(function* () {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/health': {
              get: {
                operationId: 'healthCheck',
                responses: { '200': { description: 'OK' } },
              },
            },
          },
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].pathParameters).toEqual([])
        expect(operations[0].queryParameters).toEqual([])
        expect(operations[0].requestBody).toBeUndefined()
      }))

    it('should extract header parameters', () =>
      Effect.gen(function* () {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/api/data': {
              get: {
                operationId: 'getData',
                parameters: [
                  {
                    name: 'X-API-Key',
                    in: 'header',
                    required: true,
                    schema: { type: 'string' },
                  },
                  {
                    name: 'X-Request-ID',
                    in: 'header',
                    required: false,
                    schema: { type: 'string', format: 'uuid' },
                  },
                ],
                responses: { '200': { description: 'Success' } },
              },
            },
          },
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].headerParameters).toHaveLength(2)
        expect(operations[0].headerParameters.map((p) => p.name)).toEqual(['X-API-Key', 'X-Request-ID'])
        expect(operations[0].headerParameters[0].required).toBe(true)
        expect(operations[0].headerParameters[1].required).toBe(false)
      }))

    it('should separate path, query, and header parameters', () =>
      Effect.gen(function* () {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/users/{userId}': {
              get: {
                operationId: 'getUser',
                parameters: [
                  {
                    name: 'userId',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                  },
                  {
                    name: 'include',
                    in: 'query',
                    required: false,
                    schema: { type: 'string' },
                  },
                  {
                    name: 'Authorization',
                    in: 'header',
                    required: true,
                    schema: { type: 'string' },
                  },
                ],
                responses: { '200': { description: 'Success' } },
              },
            },
          },
        }

        const operations = yield* PathParser.extractOperations(spec)

        expect(operations[0].pathParameters).toHaveLength(1)
        expect(operations[0].pathParameters[0].name).toBe('userId')
        expect(operations[0].queryParameters).toHaveLength(1)
        expect(operations[0].queryParameters[0].name).toBe('include')
        expect(operations[0].headerParameters).toHaveLength(1)
        expect(operations[0].headerParameters[0].name).toBe('Authorization')
      }))

    it('should preserve parameter validation constraints', () =>
      Effect.gen(function* () {
        const spec: OpenApiParser.OpenApiSpec = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/users': {
              get: {
                operationId: 'getUsers',
                parameters: [
                  {
                    name: 'limit',
                    in: 'query',
                    required: false,
                    schema: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 100,
                    },
                  },
                  {
                    name: 'search',
                    in: 'query',
                    required: false,
                    schema: {
                      type: 'string',
                      minLength: 3,
                      maxLength: 50,
                    },
                  },
                ],
                responses: { '200': { description: 'Success' } },
              },
            },
          },
        }

        const operations = yield* PathParser.extractOperations(spec)

        const limitParam = operations[0].queryParameters.find((p) => p.name === 'limit')
        expect(limitParam?.schema?.minimum).toBe(1)
        expect(limitParam?.schema?.maximum).toBe(100)

        const searchParam = operations[0].queryParameters.find((p) => p.name === 'search')
        expect(searchParam?.schema?.minLength).toBe(3)
        expect(searchParam?.schema?.maxLength).toBe(50)
      }))
  })
})
