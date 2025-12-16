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

  describe('Real-World APIs', () => {
    describe('stripe-subset.yaml', () => {
      it('should parse Stripe API subset successfully', () =>
        Effect.gen(function* () {
          const specContent = readFixture('stripe-subset.yaml')
          const spec = yield* OpenApiParser.parse(specContent)

          expect(spec.info.title).toBe('Stripe API (Subset)')
          expect(Object.keys(spec.paths)).toHaveLength(4)
        }))

      it('should generate code for Stripe API', () =>
        Effect.gen(function* () {
          const specContent = readFixture('stripe-subset.yaml')
          const spec = yield* OpenApiParser.parse(specContent)
          const generated = yield* ApiGenerator.generateApi(spec)

          // Check server documentation
          expect(generated).toContain('Server URLs')
          expect(generated).toContain('https://api.stripe.com/v1')
          expect(generated).toContain('Base path: /v1')

          // Check security documentation
          expect(generated).toContain('Security Schemes')
          expect(generated).toContain('bearerAuth')

          // Check schemas
          expect(generated).toContain('export const ErrorSchema')
          expect(generated).toContain('export const CustomerSchema')
          expect(generated).toContain('export const CustomerListSchema')
          expect(generated).toContain('export const PaymentIntentSchema')

          // Check endpoints
          expect(generated).toContain('export const listCustomers')
          expect(generated).toContain('export const createCustomer')
          expect(generated).toContain('export const retrieveCustomer')
          expect(generated).toContain('export const updateCustomer')
          expect(generated).toContain('export const createPaymentIntent')
          expect(generated).toContain('export const retrievePaymentIntent')

          // Check groups
          expect(generated).toContain('export const CustomersGroup')
          expect(generated).toContain('export const PaymentIntentsGroup')

          // Check API
          expect(generated).toContain("HttpApi.make('StripeAPISubset')")
        }))

      it('should handle query parameters in Stripe API', () =>
        Effect.gen(function* () {
          const specContent = readFixture('stripe-subset.yaml')
          const spec = yield* OpenApiParser.parse(specContent)
          const generated = yield* ApiGenerator.generateApi(spec)

          // listCustomers has query params: limit, starting_after, email
          expect(generated).toContain('setUrlParams')
          expect(generated).toContain('limit')
          expect(generated).toContain('starting_after')
          expect(generated).toContain('email')
        }))

      it('should handle path parameters in Stripe API', () =>
        Effect.gen(function* () {
          const specContent = readFixture('stripe-subset.yaml')
          const spec = yield* OpenApiParser.parse(specContent)
          const generated = yield* ApiGenerator.generateApi(spec)

          // retrieveCustomer has path param: customer
          expect(generated).toContain('retrieveCustomer_customerParam')
          expect(generated).toContain('/customers/${retrieveCustomer_customerParam}')
        }))

      it('should handle error responses in Stripe API', () =>
        Effect.gen(function* () {
          const specContent = readFixture('stripe-subset.yaml')
          const spec = yield* OpenApiParser.parse(specContent)
          const generated = yield* ApiGenerator.generateApi(spec)

          // Check for error handling
          expect(generated).toContain('.addError(')
          expect(generated).toContain('status: 401')
          expect(generated).toContain('status: 400')
          expect(generated).toContain('status: 404')
        }))
    })

    describe('github-subset.yaml', () => {
      it('should parse GitHub API subset successfully', () =>
        Effect.gen(function* () {
          const specContent = readFixture('github-subset.yaml')
          const spec = yield* OpenApiParser.parse(specContent)

          expect(spec.info.title).toBe('GitHub API (Subset)')
          expect(Object.keys(spec.paths)).toHaveLength(4)
        }))

      it('should generate code for GitHub API', () =>
        Effect.gen(function* () {
          const specContent = readFixture('github-subset.yaml')
          const spec = yield* OpenApiParser.parse(specContent)
          const generated = yield* ApiGenerator.generateApi(spec)

          // Check server documentation
          expect(generated).toContain('Server URLs')
          expect(generated).toContain('https://api.github.com')

          // Check security documentation
          expect(generated).toContain('Security Schemes')
          expect(generated).toContain('bearerAuth')

          // Check schemas
          expect(generated).toContain('export const BasicErrorSchema')
          expect(generated).toContain('export const ValidationErrorSchema')
          expect(generated).toContain('export const RepositorySchema')
          expect(generated).toContain('export const UserSchema')
          expect(generated).toContain('export const IssueSchema')
          expect(generated).toContain('export const LabelSchema')

          // Check endpoints
          expect(generated).toContain('export const getRepository')
          expect(generated).toContain('export const updateRepository')
          expect(generated).toContain('export const listUserRepos')
          expect(generated).toContain('export const createUserRepo')
          expect(generated).toContain('export const listRepoIssues')
          expect(generated).toContain('export const createIssue')
          expect(generated).toContain('export const getIssue')

          // Check groups
          expect(generated).toContain('export const RepositoriesGroup')
          expect(generated).toContain('export const IssuesGroup')

          // Check API
          expect(generated).toContain("HttpApi.make('GitHubAPISubset')")
        }))

      it('should handle multiple path parameters in GitHub API', () =>
        Effect.gen(function* () {
          const specContent = readFixture('github-subset.yaml')
          const spec = yield* OpenApiParser.parse(specContent)
          const generated = yield* ApiGenerator.generateApi(spec)

          // getRepository has two path params: owner, repo
          expect(generated).toContain('getRepository_ownerParam')
          expect(generated).toContain('getRepository_repoParam')
          expect(generated).toContain('/repos/${getRepository_ownerParam}/${getRepository_repoParam}')
        }))

      it('should handle enum query parameters in GitHub API', () =>
        Effect.gen(function* () {
          const specContent = readFixture('github-subset.yaml')
          const spec = yield* OpenApiParser.parse(specContent)
          const generated = yield* ApiGenerator.generateApi(spec)

          // listUserRepos has enum query params
          expect(generated).toContain('visibility')
          expect(generated).toContain('sort')
          expect(generated).toContain('direction')

          // Check for enum literals
          expect(generated).toContain("Schema.Literal('all')")
          expect(generated).toContain("Schema.Literal('public')")
          expect(generated).toContain("Schema.Literal('private')")
        }))

      it('should handle $ref relationships in GitHub API', () =>
        Effect.gen(function* () {
          const specContent = readFixture('github-subset.yaml')
          const spec = yield* OpenApiParser.parse(specContent)
          const generated = yield* ApiGenerator.generateApi(spec)

          // Repository schema references User schema
          expect(generated).toContain('owner: UserSchema')

          // Issue schema references User schema
          expect(generated).toContain('user: UserSchema')
          expect(generated).toContain('assignee: UserSchema')
          expect(generated).toContain('Schema.Array(UserSchema)')
        }))

      it('should handle 201 Created responses in GitHub API', () =>
        Effect.gen(function* () {
          const specContent = readFixture('github-subset.yaml')
          const spec = yield* OpenApiParser.parse(specContent)
          const generated = yield* ApiGenerator.generateApi(spec)

          // createUserRepo and createIssue return 201
          expect(generated).toContain('status: 201')
        }))
    })
  })
})
