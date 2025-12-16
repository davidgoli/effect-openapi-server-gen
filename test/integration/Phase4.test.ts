import { describe, expect, it, } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as ApiGenerator from '../../src/Generator/ApiGenerator.js'
import * as CodeEmitter from '../../src/Generator/CodeEmitter.js'
import * as OpenApiParser from '../../src/Parser/OpenApiParser.js'

const fixturesDir = path.join(__dirname, 'fixtures', 'phase4',)

const readFixture = (filename: string,): string => {
  const fixturePath = path.join(fixturesDir, filename,)
  return fs.readFileSync(fixturePath, 'utf-8',)
}

describe('Phase 4 - Complete Request/Response Handling', () => {
  describe('query-params.yaml', () => {
    it('should generate setUrlParams with query parameters', () =>
      Effect.gen(function*() {
        const specContent = readFixture('query-params.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        expect(apiCode,).toContain('.setUrlParams(',)
        expect(apiCode,).toContain('Schema.Struct({',)
      },))

    it('should handle required and optional query parameters', () =>
      Effect.gen(function*() {
        const specContent = readFixture('query-params.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Required parameter (status)
        expect(apiCode,).toContain('status: Schema.Union',)

        // Optional parameters (limit, offset, search)
        expect(apiCode,).toContain('limit: Schema.optional(',)
        expect(apiCode,).toContain('offset: Schema.optional(',)
        expect(apiCode,).toContain('search: Schema.optional(',)
      },))

    it('should apply validation rules to query parameters', () =>
      Effect.gen(function*() {
        const specContent = readFixture('query-params.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Integer constraints
        expect(apiCode,).toContain('Schema.greaterThanOrEqualTo(1)',)
        expect(apiCode,).toContain('Schema.lessThanOrEqualTo(100)',)

        // String constraints
        expect(apiCode,).toContain('Schema.minLength(1)',)
      },))

    it('should handle array query parameters', () =>
      Effect.gen(function*() {
        const specContent = readFixture('query-params.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // tags parameter is an array
        expect(apiCode,).toContain('tags: Schema.optional(Schema.Array(Schema.String))',)
      },))
  })

  describe('headers.yaml', () => {
    it('should generate setHeaders with header parameters', () =>
      Effect.gen(function*() {
        const specContent = readFixture('headers.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        expect(apiCode,).toContain('.setHeaders(',)
        expect(apiCode,).toContain('Schema.Struct({',)
      },))

    it('should quote header names', () =>
      Effect.gen(function*() {
        const specContent = readFixture('headers.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Header names should be quoted strings
        expect(apiCode,).toContain('"X-API-Key":',)
        expect(apiCode,).toContain('"X-Request-ID":',)
        expect(apiCode,).toContain('"X-Client-Version":',)
      },))

    it('should handle required and optional headers', () =>
      Effect.gen(function*() {
        const specContent = readFixture('headers.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Required header (X-API-Key)
        expect(apiCode,).toContain('"X-API-Key": Schema.String',)

        // Optional headers
        expect(apiCode,).toContain('"X-Request-ID": Schema.optional(',)
        expect(apiCode,).toContain('"X-Client-Version": Schema.optional(',)
      },))

    it('should apply validation rules to headers', () =>
      Effect.gen(function*() {
        const specContent = readFixture('headers.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Pattern validation
        expect(apiCode,).toContain('Schema.pattern',)
      },))
  })

  describe('response-codes.yaml', () => {
    it('should generate multiple response status codes', () =>
      Effect.gen(function*() {
        const specContent = readFixture('response-codes.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        expect(apiCode,).toContain('.addSuccess(',)
        expect(apiCode,).toContain('.addError(',)
      },))

    it('should use custom status for non-200 success responses', () =>
      Effect.gen(function*() {
        const specContent = readFixture('response-codes.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // 201 Created should have custom status
        expect(apiCode,).toContain('{ status: 201 }',)

        // Error responses should have custom status
        expect(apiCode,).toContain('{ status: 400 }',)
        expect(apiCode,).toContain('{ status: 404 }',)
        expect(apiCode,).toContain('{ status: 409 }',)
      },))

    it('should handle 204 No Content response', () =>
      Effect.gen(function*() {
        const specContent = readFixture('response-codes.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // deleteUser has 204 response with no content
        // It should not generate a response schema for 204
        const deleteUserSection = apiCode.split('const deleteUser =',)[1]?.split('const ',)[0]
        expect(deleteUserSection,).toBeDefined()

        // 204 responses without content should still be handled
        // But they won't have a schema in our implementation
      },))

    it('should handle multiple error responses', () =>
      Effect.gen(function*() {
        const specContent = readFixture('response-codes.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // createUser has both 400 and 409 errors
        const lines = apiCode.split('\n',)
        const createUserStart = lines.findIndex((line,) => line.includes('const createUser =',))
        const createUserEnd = lines.findIndex((line, idx,) => idx > createUserStart && line.startsWith('const ',))
        const createUserSection = lines.slice(createUserStart, createUserEnd,).join('\n',)

        expect(createUserSection,).toContain('{ status: 400 }',)
        expect(createUserSection,).toContain('{ status: 409 }',)
      },))
  })

  describe('error-responses.yaml', () => {
    it('should generate error response schemas', () =>
      Effect.gen(function*() {
        const specContent = readFixture('error-responses.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Error schemas should be generated
        expect(apiCode,).toContain('const AuthenticationErrorSchema =',)
        expect(apiCode,).toContain('const RateLimitErrorSchema =',)
        expect(apiCode,).toContain('const NotFoundErrorSchema =',)
        expect(apiCode,).toContain('const ValidationErrorSchema =',)
      },))

    it('should include _tag field in error schemas', () =>
      Effect.gen(function*() {
        const specContent = readFixture('error-responses.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Error schemas should have _tag field with const value
        expect(apiCode,).toContain('_tag: Schema.Literal("AuthenticationError")',)
        expect(apiCode,).toContain('_tag: Schema.Literal("NotFoundError")',)
      },))

    it('should use error schemas in addError calls', () =>
      Effect.gen(function*() {
        const specContent = readFixture('error-responses.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Endpoints should reference error schemas
        expect(apiCode,).toContain('.addError(AuthenticationErrorSchema',)
        expect(apiCode,).toContain('.addError(RateLimitErrorSchema',)
        expect(apiCode,).toContain('.addError(NotFoundErrorSchema',)
        expect(apiCode,).toContain('.addError(ValidationErrorSchema',)
      },))
  })

  describe('Complete generation pipeline', () => {
    it('should generate complete valid code for all Phase 4 fixtures', () =>
      Effect.gen(function*() {
        const fixtures = [
          'query-params.yaml',
          'headers.yaml',
          'response-codes.yaml',
          'error-responses.yaml',
        ]

        for (const fixture of fixtures) {
          const specContent = readFixture(fixture,)
          const spec = yield* OpenApiParser.parse(specContent,)
          const apiCode = yield* ApiGenerator.generateApi(spec,)
          const finalCode = yield* CodeEmitter.emit(apiCode,)

          // Basic validity checks
          expect(finalCode,).toContain('import * as Schema from "effect/Schema"',)
          expect(finalCode,).toContain('export {',)
          expect(finalCode.length,).toBeGreaterThan(100,)

          // Should not have syntax errors
          expect(finalCode,).not.toContain('undefined',)
          expect(finalCode,).not.toContain('[object Object]',)
        }
      },))

    it('should handle endpoint with path, query, and header parameters', () =>
      Effect.gen(function*() {
        const specContent = readFixture('headers.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // getData endpoint has both query params and headers
        const lines = apiCode.split('\n',)
        const getDataLine = lines.findIndex((line,) => line.includes('const getData =',))
        const nextConstLine = lines.findIndex((line, idx,) => idx > getDataLine && line.startsWith('const ',))
        const getDataSection = lines.slice(getDataLine, nextConstLine,).join('\n',)

        expect(getDataSection,).toContain('.setHeaders(',)
        expect(getDataSection,).toContain('"X-API-Key":',)
      },))
  })

  describe('Phase 4 success criteria', () => {
    it('should support all parameter types (path, query, header)', () =>
      Effect.gen(function*() {
        const fixtures = [
          { file: 'query-params.yaml', feature: 'query parameters', },
          { file: 'headers.yaml', feature: 'header parameters', },
        ]

        for (const { file, } of fixtures) {
          const specContent = readFixture(file,)
          const spec = yield* OpenApiParser.parse(specContent,)

          // Should not throw
          const apiCode = yield* ApiGenerator.generateApi(spec,)
          expect(apiCode.length,).toBeGreaterThan(0,)
        }
      },))

    it('should handle multiple response codes with correct types', () =>
      Effect.gen(function*() {
        const specContent = readFixture('response-codes.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Should have both success and error responses
        expect(apiCode,).toContain('.addSuccess(',)
        expect(apiCode,).toContain('.addError(',)

        // Should use Schema combinators
        expect(apiCode,).toContain('Schema.Struct',)
      },))

    it('should properly generate error types', () =>
      Effect.gen(function*() {
        const specContent = readFixture('error-responses.yaml',)
        const spec = yield* OpenApiParser.parse(specContent,)
        const apiCode = yield* ApiGenerator.generateApi(spec,)

        // Error schemas should be generated as regular schemas
        // (They have _tag field which makes them compatible with TaggedError pattern)
        expect(apiCode,).toContain('_tag: Schema.Literal',)
      },))
  })
})
