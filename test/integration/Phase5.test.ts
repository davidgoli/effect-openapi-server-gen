import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as ApiGenerator from '../../src/Generator/ApiGenerator.js'
import * as OpenApiParser from '../../src/Parser/OpenApiParser.js'
import * as PathParser from '../../src/Parser/PathParser.js'
import * as SecurityParser from '../../src/Parser/SecurityParser.js'

const fixturesDir = path.join(__dirname, 'fixtures', 'phase5')

const readFixture = (filename: string): string => {
  const fixturePath = path.join(fixturesDir, filename)
  return fs.readFileSync(fixturePath, 'utf-8')
}

describe('Phase 5 - Security & Authentication', () => {
  describe('apikey-security.yaml', () => {
    it('should parse API key security schemes', () =>
      Effect.gen(function* () {
        const specContent = readFixture('apikey-security.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const security = yield* SecurityParser.parseSecurity(spec)

        // Should have all three apiKey schemes
        expect(security.schemes.size).toBe(3)

        const headerScheme = security.schemes.get('apiKeyHeader') as SecurityParser.ApiKeySecurityScheme
        expect(headerScheme.type).toBe('apiKey')
        expect(headerScheme.name).toBe('X-API-Key')
        expect(headerScheme.in).toBe('header')

        const queryScheme = security.schemes.get('apiKeyQuery') as SecurityParser.ApiKeySecurityScheme
        expect(queryScheme.type).toBe('apiKey')
        expect(queryScheme.in).toBe('query')

        const cookieScheme = security.schemes.get('apiKeyCookie') as SecurityParser.ApiKeySecurityScheme
        expect(cookieScheme.type).toBe('apiKey')
        expect(cookieScheme.in).toBe('cookie')
      }))

    it('should parse global security requirements', () =>
      Effect.gen(function* () {
        const specContent = readFixture('apikey-security.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const security = yield* SecurityParser.parseSecurity(spec)

        // Should have global security requirement
        expect(security.globalRequirements.length).toBe(1)
        expect(security.globalRequirements[0]).toEqual({ apiKeyHeader: [] })
      }))

    it('should parse operation-level security overrides', () =>
      Effect.gen(function* () {
        const specContent = readFixture('apikey-security.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const operations = yield* PathParser.extractOperations(spec)

        // Find the admin endpoint
        const adminOp = operations.find((op) => op.operationId === 'listAdminUsers')
        expect(adminOp?.security).toEqual([{ apiKeyQuery: [] }])

        // Find the public endpoint (should override to empty)
        const publicOp = operations.find((op) => op.operationId === 'getPublicStatus')
        expect(publicOp?.security).toEqual([])
      }))
  })

  describe('http-security.yaml', () => {
    it('should parse HTTP bearer authentication', () =>
      Effect.gen(function* () {
        const specContent = readFixture('http-security.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const security = yield* SecurityParser.parseSecurity(spec)

        const bearerScheme = security.schemes.get('bearerAuth') as SecurityParser.HttpSecurityScheme
        expect(bearerScheme.type).toBe('http')
        expect(bearerScheme.scheme).toBe('bearer')
        expect(bearerScheme.bearerFormat).toBe('JWT')
      }))

    it('should parse HTTP basic authentication', () =>
      Effect.gen(function* () {
        const specContent = readFixture('http-security.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const security = yield* SecurityParser.parseSecurity(spec)

        const basicScheme = security.schemes.get('basicAuth') as SecurityParser.HttpSecurityScheme
        expect(basicScheme.type).toBe('http')
        expect(basicScheme.scheme).toBe('basic')
      }))
  })

  describe('oauth2-security.yaml', () => {
    it('should parse OAuth2 authorization code flow', () =>
      Effect.gen(function* () {
        const specContent = readFixture('oauth2-security.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const security = yield* SecurityParser.parseSecurity(spec)

        const oauth2Scheme = security.schemes.get('oauth2AuthCode') as SecurityParser.OAuth2SecurityScheme
        expect(oauth2Scheme.type).toBe('oauth2')
        expect(oauth2Scheme.flows.authorizationCode).toBeDefined()
        expect(oauth2Scheme.flows.authorizationCode?.authorizationUrl).toBe('https://example.com/oauth/authorize')
        expect(oauth2Scheme.flows.authorizationCode?.tokenUrl).toBe('https://example.com/oauth/token')
        expect(oauth2Scheme.flows.authorizationCode?.scopes).toEqual({
          'read:users': 'Read user information',
          'write:users': 'Modify user information',
          admin: 'Administrative access',
        })
      }))

    it('should parse OAuth2 client credentials flow', () =>
      Effect.gen(function* () {
        const specContent = readFixture('oauth2-security.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const security = yield* SecurityParser.parseSecurity(spec)

        const oauth2Scheme = security.schemes.get('oauth2ClientCredentials') as SecurityParser.OAuth2SecurityScheme
        expect(oauth2Scheme.type).toBe('oauth2')
        expect(oauth2Scheme.flows.clientCredentials).toBeDefined()
      }))

    it('should extract OAuth2 scopes from operations', () =>
      Effect.gen(function* () {
        const specContent = readFixture('oauth2-security.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const operations = yield* PathParser.extractOperations(spec)

        const listOp = operations.find((op) => op.operationId === 'listUsers')
        expect(listOp?.security).toEqual([{ oauth2AuthCode: ['read:users'] }])

        const updateOp = operations.find((op) => op.operationId === 'updateUser')
        expect(updateOp?.security).toEqual([{ oauth2AuthCode: ['write:users', 'read:users'] }])
      }))
  })

  describe('multiple-schemes.yaml', () => {
    it('should parse multiple alternative security schemes (OR)', () =>
      Effect.gen(function* () {
        const specContent = readFixture('multiple-schemes.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const operations = yield* PathParser.extractOperations(spec)

        const listOp = operations.find((op) => op.operationId === 'listUsers')
        // Two separate objects = OR (either apiKey OR bearer)
        expect(listOp?.security).toEqual([{ apiKeyAuth: [] }, { bearerAuth: [] }])
      }))

    it('should parse combined security schemes (AND)', () =>
      Effect.gen(function* () {
        const specContent = readFixture('multiple-schemes.yaml')
        const spec = yield* OpenApiParser.parse(specContent)
        const operations = yield* PathParser.extractOperations(spec)

        const createOp = operations.find((op) => op.operationId === 'createAdminUser')
        // Single object with both = AND (both apiKey AND bearer required)
        expect(createOp?.security).toEqual([{ apiKeyAuth: [], bearerAuth: [] }])
      }))
  })

  describe('Complete generation pipeline', () => {
    it('should generate code without errors for all Phase 5 fixtures', () =>
      Effect.gen(function* () {
        const fixtures = ['apikey-security.yaml', 'http-security.yaml', 'oauth2-security.yaml', 'multiple-schemes.yaml']

        for (const fixture of fixtures) {
          const specContent = readFixture(fixture)
          const spec = yield* OpenApiParser.parse(specContent)

          // Should not throw
          const apiCode = yield* ApiGenerator.generateApi(spec)

          // Should contain basic structure
          expect(apiCode).toContain('HttpApi')
          expect(apiCode).toContain('HttpApiEndpoint')
        }
      }))
  })
})
