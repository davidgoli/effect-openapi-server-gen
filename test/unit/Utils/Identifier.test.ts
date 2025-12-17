import { describe, expect, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Logger from 'effect/Logger'
import * as Identifier from '../../../src/Utils/Identifier.js'

/**
 * Create a test logger that captures log messages to a mutable array
 */
const makeTestLogger = (logs: Array<{ level: string; message: string }>) =>
  Logger.make(({ logLevel, message }) => {
    const messageStr = typeof message === 'string' ? message : String(message)
    logs.push({ level: logLevel.label, message: messageStr })
  })

describe('Identifier', () => {
  describe('sanitizePascal', () => {
    it.effect('should convert kebab-case to PascalCase', () =>
      Effect.gen(function* () {
        const result = yield* Identifier.sanitizePascal('kebab-case-name')
        expect(result).toBe('KebabCaseName')
      })
    )

    it.effect('should convert snake_case to PascalCase', () =>
      Effect.gen(function* () {
        const result = yield* Identifier.sanitizePascal('snake_case_name')
        expect(result).toBe('SnakeCaseName')
      })
    )

    it.effect('should convert space-separated to PascalCase', () =>
      Effect.gen(function* () {
        const result = yield* Identifier.sanitizePascal('space separated name')
        expect(result).toBe('SpaceSeparatedName')
      })
    )

    it.effect('should handle mixed separators', () =>
      Effect.gen(function* () {
        const result = yield* Identifier.sanitizePascal('some-mixed_case name')
        expect(result).toBe('SomeMixedCaseName')
      })
    )

    it.effect('should preserve already PascalCase names', () =>
      Effect.gen(function* () {
        const result = yield* Identifier.sanitizePascal('AlreadyPascalCase')
        expect(result).toBe('AlreadyPascalCase')
      })
    )

    it.effect('should log warning when name is sanitized', () =>
      Effect.gen(function* () {
        const logs: Array<{ level: string; message: string }> = []
        const testLogger = makeTestLogger(logs)

        yield* Identifier.sanitizePascal('kebab-case').pipe(
          Effect.provide(Logger.replace(Logger.defaultLogger, testLogger))
        )

        const warnings = logs.filter((l) => l.level === 'WARN')
        expect(warnings.length).toBe(1)
        expect(warnings[0].message).toContain('kebab-case')
        expect(warnings[0].message).toContain('KebabCase')
      })
    )

    it.effect('should not log warning when name does not need sanitization', () =>
      Effect.gen(function* () {
        const logs: Array<{ level: string; message: string }> = []
        const testLogger = makeTestLogger(logs)

        yield* Identifier.sanitizePascal('ValidName').pipe(
          Effect.provide(Logger.replace(Logger.defaultLogger, testLogger))
        )

        const warnings = logs.filter((l) => l.level === 'WARN')
        expect(warnings.length).toBe(0)
      })
    )
  })

  describe('sanitizeCamel', () => {
    it.effect('should convert kebab-case to camelCase', () =>
      Effect.gen(function* () {
        const result = yield* Identifier.sanitizeCamel('kebab-case-name')
        expect(result).toBe('kebabCaseName')
      })
    )

    it.effect('should convert snake_case to camelCase', () =>
      Effect.gen(function* () {
        const result = yield* Identifier.sanitizeCamel('snake_case_name')
        expect(result).toBe('snakeCaseName')
      })
    )

    it.effect('should convert space-separated to camelCase', () =>
      Effect.gen(function* () {
        const result = yield* Identifier.sanitizeCamel('space separated name')
        expect(result).toBe('spaceSeparatedName')
      })
    )

    it.effect('should preserve already camelCase names', () =>
      Effect.gen(function* () {
        const result = yield* Identifier.sanitizeCamel('alreadyCamelCase')
        expect(result).toBe('alreadyCamelCase')
      })
    )

    it.effect('should log warning when name is sanitized', () =>
      Effect.gen(function* () {
        const logs: Array<{ level: string; message: string }> = []
        const testLogger = makeTestLogger(logs)

        yield* Identifier.sanitizeCamel('kebab-case').pipe(
          Effect.provide(Logger.replace(Logger.defaultLogger, testLogger))
        )

        const warnings = logs.filter((l) => l.level === 'WARN')
        expect(warnings.length).toBe(1)
        expect(warnings[0].message).toContain('kebab-case')
        expect(warnings[0].message).toContain('kebabCase')
      })
    )
  })

  describe('sanitize', () => {
    it.effect('should work with pascal casing option', () =>
      Effect.gen(function* () {
        const result = yield* Identifier.sanitize('test-name', 'pascal')
        expect(result).toBe('TestName')
      })
    )

    it.effect('should work with camel casing option', () =>
      Effect.gen(function* () {
        const result = yield* Identifier.sanitize('test-name', 'camel')
        expect(result).toBe('testName')
      })
    )
  })
})
