import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as ApiGenerator from '../../src/Generator/ApiGenerator.js'
import * as OpenApiParser from '../../src/Parser/OpenApiParser.js'
import * as ServerParser from '../../src/Parser/ServerParser.js'

const fixturesDir = path.join(__dirname, 'fixtures', 'phase6')

const readFixture = (filename: string): string => {
  const fixturePath = path.join(fixturesDir, filename)
  return fs.readFileSync(fixturePath, 'utf-8')
}

describe('Phase 6 - Advanced Features & Polish', () => {
  describe('servers-and-prefixes.yaml', () => {
    it('should parse server URLs', () =>
      Effect.gen(function* () {
        const specContent = readFixture('servers-and-prefixes.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const servers = yield* ServerParser.parseServers(spec)

        expect(servers.servers).toHaveLength(3)
        expect(servers.servers[0].url).toBe('https://api.example.com/v1')
        expect(servers.servers[0].description).toBe('Production server')
        expect(servers.servers[1].url).toBe('https://staging-api.example.com/v1')
        expect(servers.servers[1].description).toBe('Staging server')
        expect(servers.servers[2].url).toBe('http://localhost:3000/api/v1')
        expect(servers.servers[2].description).toBe('Local development')
      }))

    it('should extract path prefix from server URLs', () =>
      Effect.gen(function* () {
        const specContent = readFixture('servers-and-prefixes.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const servers = yield* ServerParser.parseServers(spec)

        // First server has /v1 prefix
        expect(servers.pathPrefix).toBe('/v1')
      }))

    it('should generate server documentation', () =>
      Effect.gen(function* () {
        const specContent = readFixture('servers-and-prefixes.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const servers = yield* ServerParser.parseServers(spec)
        const doc = ServerParser.generateServersDoc(servers)

        expect(doc).toBeDefined()
        expect(doc).toContain('Server URLs')
        expect(doc).toContain('https://api.example.com/v1 - Production server')
        expect(doc).toContain('https://staging-api.example.com/v1 - Staging server')
        expect(doc).toContain('http://localhost:3000/api/v1 - Local development')
        expect(doc).toContain('Base path: /v1')
      }))

    it('should include server documentation in generated code', () =>
      Effect.gen(function* () {
        const specContent = readFixture('servers-and-prefixes.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const generated = yield* ApiGenerator.generateApi(spec)

        expect(generated).toContain('Server URLs')
        expect(generated).toContain('https://api.example.com/v1 - Production server')
        expect(generated).toContain('Base path: /v1')
      }))

    it('should compile generated code', () =>
      Effect.gen(function* () {
        const specContent = readFixture('servers-and-prefixes.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const generated = yield* ApiGenerator.generateApi(spec)

        // Check that code is syntactically valid TypeScript
        expect(generated).toContain("import * as HttpApi from '@effect/platform/HttpApi'")
        expect(generated).toContain('export const listUsers')
        expect(generated).toContain('export const getUser')
        expect(generated).toContain('export const usersGroup')
        expect(generated).toContain(
          "export const ServerURLsAndPrefixesTest = HttpApi.make('ServerURLsAndPrefixesTest')"
        )
      }))
  })

  describe('cookie-params.yaml', () => {
    it('should include cookie parameters in generated endpoints', () =>
      Effect.gen(function* () {
        const specContent = readFixture('cookie-params.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const generated = yield* ApiGenerator.generateApi(spec)

        // Check for setCookies in generated code
        expect(generated).toContain('.setCookies(Schema.Struct({')
        expect(generated).toContain("'session_id': Schema.String")
        expect(generated).toContain("'preferences': Schema.optional(Schema.String)")
        expect(generated).toContain("'auth_token': Schema.String")
      }))
  })

  describe('deprecated-endpoints.yaml', () => {
    it('should include deprecation JSDoc for deprecated endpoints', () =>
      Effect.gen(function* () {
        const specContent = readFixture('deprecated-endpoints.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const generated = yield* ApiGenerator.generateApi(spec)

        // Check for @deprecated tags
        expect(generated).toContain('@deprecated This endpoint is deprecated and may be removed in a future version.')
        expect(generated).toContain('listUsersLegacy')
        expect(generated).toContain('createAdminUser')
      }))

    it('should include deprecation JSDoc for deprecated schemas', () =>
      Effect.gen(function* () {
        const specContent = readFixture('deprecated-endpoints.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const generated = yield* ApiGenerator.generateApi(spec)

        // Check for deprecated schema
        expect(generated).toContain('LegacyUserSchema')
        expect(generated).toContain('@deprecated This schema is deprecated and may be removed in a future version.')
      }))
  })
})
