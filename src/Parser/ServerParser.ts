/**
 * @since 1.0.0
 */
import * as Effect from 'effect/Effect'
import type * as OpenApiParser from './OpenApiParser.js'

/**
 * Result of parsing server information
 *
 * @since 1.0.0
 * @category Models
 */
export interface ParsedServers {
  readonly servers: ReadonlyArray<OpenApiParser.ServerObject>
  readonly pathPrefix?: string
}

/**
 * Extract server information from OpenAPI spec
 *
 * @since 1.0.0
 * @category Parsing
 */
export const parseServers = (spec: OpenApiParser.OpenApiSpec): Effect.Effect<ParsedServers> =>
  Effect.sync(() => {
    const servers = spec.servers || []

    // Extract common path prefix from server URLs
    let pathPrefix: string | undefined

    if (servers.length > 0) {
      // Try to extract path from first server URL
      try {
        const url = new URL(servers[0].url)
        const path = url.pathname
        // Only use as prefix if it's not just '/'
        if (path && path !== '/') {
          pathPrefix = path
        }
      } catch {
        // If URL parsing fails, try to extract path manually
        // e.g., "/v1" or "/api/v1"
        const match = servers[0].url.match(/^(?:https?:\/\/[^/]+)?(\/.+)$/)
        if (match && match[1] !== '/') {
          pathPrefix = match[1]
        }
      }
    }

    return {
      servers,
      pathPrefix,
    }
  })

/**
 * Generate documentation comment for servers
 *
 * @since 1.0.0
 * @category Generation
 */
export const generateServersDoc = (parsed: ParsedServers): string | undefined => {
  if (parsed.servers.length === 0) {
    return undefined
  }

  const lines: Array<string> = []
  lines.push('/**')
  lines.push(' * Server URLs')
  lines.push(' *')

  for (const server of parsed.servers) {
    if (server.description) {
      lines.push(` * - ${server.url} - ${server.description}`)
    } else {
      lines.push(` * - ${server.url}`)
    }
  }

  if (parsed.pathPrefix) {
    lines.push(' *')
    lines.push(` * Base path: ${parsed.pathPrefix}`)
  }

  lines.push(' */')

  return lines.join('\n')
}
