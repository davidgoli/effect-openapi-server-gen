import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as GroupGenerator from '../../../src/Generator/GroupGenerator.js'
import type * as PathParser from '../../../src/Parser/PathParser.js'

describe('GroupGenerator', () => {
  describe('generateGroups', () => {
    it('should group operations by tag', () =>
      Effect.gen(function* () {
        const operations: ReadonlyArray<PathParser.ParsedOperation> = [
          {
            operationId: 'getUsers',
            method: 'get',
            path: '/users',
            tags: ['users'],
            pathParameters: [],
            queryParameters: [],
            headerParameters: [],
            responses: [],
          },
          {
            operationId: 'createUser',
            method: 'post',
            path: '/users',
            tags: ['users'],
            pathParameters: [],
            queryParameters: [],
            headerParameters: [],
            responses: [],
          },
        ]

        const groups = yield* GroupGenerator.generateGroups(operations)

        expect(groups).toHaveLength(1)
        expect(groups[0].name).toBe('users')
        expect(groups[0].operations).toHaveLength(2)
      }))

    it('should create separate groups for different tags', () =>
      Effect.gen(function* () {
        const operations: ReadonlyArray<PathParser.ParsedOperation> = [
          {
            operationId: 'getUsers',
            method: 'get',
            path: '/users',
            tags: ['users'],
            pathParameters: [],
            queryParameters: [],
            headerParameters: [],
            responses: [],
          },
          {
            operationId: 'getPosts',
            method: 'get',
            path: '/posts',
            tags: ['posts'],
            pathParameters: [],
            queryParameters: [],
            headerParameters: [],
            responses: [],
          },
        ]

        const groups = yield* GroupGenerator.generateGroups(operations)

        expect(groups).toHaveLength(2)
        expect(groups.map((g) => g.name)).toEqual(['users', 'posts'])
      }))

    it("should use 'default' group for untagged operations", () =>
      Effect.gen(function* () {
        const operations: ReadonlyArray<PathParser.ParsedOperation> = [
          {
            operationId: 'healthCheck',
            method: 'get',
            path: '/health',
            tags: [],
            pathParameters: [],
            queryParameters: [],
            headerParameters: [],
            responses: [],
          },
        ]

        const groups = yield* GroupGenerator.generateGroups(operations)

        expect(groups).toHaveLength(1)
        expect(groups[0].name).toBe('default')
      }))

    it('should use first tag when operation has multiple tags', () =>
      Effect.gen(function* () {
        const operations: ReadonlyArray<PathParser.ParsedOperation> = [
          {
            operationId: 'getUsers',
            method: 'get',
            path: '/users',
            tags: ['users', 'admin', 'public'],
            pathParameters: [],
            queryParameters: [],
            headerParameters: [],
            responses: [],
          },
        ]

        const groups = yield* GroupGenerator.generateGroups(operations)

        expect(groups).toHaveLength(1)
        expect(groups[0].name).toBe('users')
      }))

    it('should capitalize group names', () =>
      Effect.gen(function* () {
        const operations: ReadonlyArray<PathParser.ParsedOperation> = [
          {
            operationId: 'getUsers',
            method: 'get',
            path: '/users',
            tags: ['users'],
            pathParameters: [],
            queryParameters: [],
            headerParameters: [],
            responses: [],
          },
        ]

        const groups = yield* GroupGenerator.generateGroups(operations)

        expect(groups[0].capitalizedName).toBe('Users')
      }))

    it('should handle kebab-case tag names', () =>
      Effect.gen(function* () {
        const operations: ReadonlyArray<PathParser.ParsedOperation> = [
          {
            operationId: 'getUser',
            method: 'get',
            path: '/user-management/users',
            tags: ['user-management'],
            pathParameters: [],
            queryParameters: [],
            headerParameters: [],
            responses: [],
          },
        ]

        const groups = yield* GroupGenerator.generateGroups(operations)

        expect(groups[0].name).toBe('user-management')
        expect(groups[0].capitalizedName).toBe('UserManagement')
      }))
  })

  describe('generateGroupCode', () => {
    it('should generate HttpApiGroup code', () =>
      Effect.gen(function* () {
        const group: GroupGenerator.OperationGroup = {
          name: 'users',
          varName: 'users',
          capitalizedName: 'Users',
          operations: [
            {
              operationId: 'getUsers',
              method: 'get',
              path: '/users',
              tags: ['users'],
              pathParameters: [],
              queryParameters: [],
              headerParameters: [],
              responses: [],
            },
          ],
        }

        const code = yield* GroupGenerator.generateGroupCode(group)

        expect(code).toContain('HttpApiGroup.make("users")')
        expect(code).toContain('const usersGroup =')
      }))

    it('should add all operations to the group', () =>
      Effect.gen(function* () {
        const group: GroupGenerator.OperationGroup = {
          name: 'users',
          varName: 'users',
          capitalizedName: 'Users',
          operations: [
            {
              operationId: 'getUsers',
              method: 'get',
              path: '/users',
              tags: ['users'],
              pathParameters: [],
              queryParameters: [],
              headerParameters: [],
              responses: [],
            },
            {
              operationId: 'createUser',
              method: 'post',
              path: '/users',
              tags: ['users'],
              pathParameters: [],
              queryParameters: [],
              headerParameters: [],
              responses: [],
            },
          ],
        }

        const code = yield* GroupGenerator.generateGroupCode(group)

        expect(code).toContain('getUsers')
        expect(code).toContain('createUser')
      }))
  })
})
