/**
 * @since 1.0.0
 * @module Utils/Identifier
 */
import * as Effect from 'effect/Effect'

/**
 * Casing options for identifier sanitization
 *
 * @since 1.0.0
 * @category Types
 */
export type Casing = 'pascal' | 'camel'

/**
 * Sanitize a string to be a valid JavaScript identifier
 * Handles kebab-case, snake_case, spaces, and special characters
 *
 * @since 1.0.0
 * @category Sanitization
 */
export const sanitize = (name: string, casing: Casing): Effect.Effect<string> =>
  Effect.gen(function* () {
    // Replace non-alphanumeric characters with spaces, then split
    const parts = name
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)

    const sanitized =
      casing === 'pascal'
        ? // PascalCase: capitalize first letter of every part
          parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
        : // camelCase: first part lowercase, rest capitalized
          parts
            .map((part, index) => {
              if (index === 0) {
                return part.charAt(0).toLowerCase() + part.slice(1)
              }
              return part.charAt(0).toUpperCase() + part.slice(1)
            })
            .join('')

    // Warn if the name was altered
    if (sanitized !== name) {
      yield* Effect.logWarning(`Identifier sanitized: "${name}" → "${sanitized}"`)
    }

    return sanitized
  })

/**
 * Sanitize a string to PascalCase (for schema names, type names)
 *
 * @since 1.0.0
 * @category Sanitization
 */
export const sanitizePascal = (name: string): Effect.Effect<string> => sanitize(name, 'pascal')

/**
 * Sanitize a string to camelCase (for variable names)
 *
 * @since 1.0.0
 * @category Sanitization
 */
export const sanitizeCamel = (name: string): Effect.Effect<string> => sanitize(name, 'camel')
