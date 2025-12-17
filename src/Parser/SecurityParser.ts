/**
 * @since 1.0.0
 */
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import type * as OpenApiParser from './OpenApiParser.js'

/**
 * Error when parsing security schemes
 *
 * @since 1.0.0
 * @category Errors
 */
export class SecurityParseError extends Data.TaggedError('SecurityParseError')<{
  readonly message: string
}> {}

/**
 * API Key security scheme
 *
 * @since 1.0.0
 * @category Models
 */
export interface ApiKeySecurityScheme {
  readonly type: 'apiKey'
  readonly name: string
  readonly in: 'header' | 'query' | 'cookie'
  readonly description?: string
}

/**
 * HTTP security scheme (basic, bearer, etc.)
 *
 * @since 1.0.0
 * @category Models
 */
export interface HttpSecurityScheme {
  readonly type: 'http'
  readonly scheme: string
  readonly bearerFormat?: string
  readonly description?: string
}

/**
 * OAuth2 flow configuration
 *
 * @since 1.0.0
 * @category Models
 */
export interface OAuth2Flow {
  readonly authorizationUrl?: string
  readonly tokenUrl?: string
  readonly refreshUrl?: string
  readonly scopes: Record<string, string>
}

/**
 * OAuth2 security scheme
 *
 * @since 1.0.0
 * @category Models
 */
export interface OAuth2SecurityScheme {
  readonly type: 'oauth2'
  readonly flows: {
    readonly authorizationCode?: OAuth2Flow
    readonly implicit?: OAuth2Flow
    readonly password?: OAuth2Flow
    readonly clientCredentials?: OAuth2Flow
  }
  readonly description?: string
}

/**
 * OpenID Connect security scheme
 *
 * @since 1.0.0
 * @category Models
 */
export interface OpenIdConnectSecurityScheme {
  readonly type: 'openIdConnect'
  readonly openIdConnectUrl: string
  readonly description?: string
}

/**
 * Union of all security scheme types
 *
 * @since 1.0.0
 * @category Models
 */
export type SecurityScheme =
  | ApiKeySecurityScheme
  | HttpSecurityScheme
  | OAuth2SecurityScheme
  | OpenIdConnectSecurityScheme

/**
 * Security requirement (scheme name + required scopes)
 *
 * @since 1.0.0
 * @category Models
 */
export interface SecurityRequirement {
  readonly [schemeName: string]: ReadonlyArray<string>
}

/**
 * Parsed security schemes from OpenAPI spec
 *
 * @since 1.0.0
 * @category Models
 */
export interface ParsedSecurity {
  readonly schemes: Map<string, SecurityScheme>
  readonly globalRequirements: ReadonlyArray<SecurityRequirement>
}

/**
 * Parse security schemes from OpenAPI components
 *
 * @since 1.0.0
 * @category Parsing
 */
export const parseSecuritySchemes = (
  components?: OpenApiParser.ComponentsObject
): Effect.Effect<Map<string, SecurityScheme>, SecurityParseError> =>
  Effect.gen(function* () {
    if (!components?.securitySchemes) {
      return new Map()
    }

    const schemes = new Map<string, SecurityScheme>()

    for (const [name, scheme] of Object.entries(components.securitySchemes)) {
      if (!scheme.type) {
        return yield* new SecurityParseError({ message: `Security scheme '${name}' missing type` })
      }

      switch (scheme.type) {
        case 'apiKey': {
          if (!scheme.name || !scheme.in) {
            return yield* new SecurityParseError({
              message: `apiKey scheme '${name}' missing required fields (name, in)`,
            })
          }

          schemes.set(name, {
            type: 'apiKey',
            name: scheme.name,
            in: scheme.in,
            ...(scheme.description ? { description: scheme.description } : {}),
          })
          break
        }

        case 'http': {
          if (!scheme.scheme) {
            return yield* new SecurityParseError({ message: `http scheme '${name}' missing 'scheme' field` })
          }

          schemes.set(name, {
            type: 'http',
            scheme: scheme.scheme,
            ...(scheme.bearerFormat ? { bearerFormat: scheme.bearerFormat } : {}),
            ...(scheme.description ? { description: scheme.description } : {}),
          })
          break
        }

        case 'oauth2': {
          if (!scheme.flows) {
            return yield* new SecurityParseError({ message: `oauth2 scheme '${name}' missing 'flows' field` })
          }

          const flows: {
            authorizationCode?: OAuth2Flow
            implicit?: OAuth2Flow
            password?: OAuth2Flow
            clientCredentials?: OAuth2Flow
          } = {}

          if (scheme.flows.authorizationCode) {
            flows.authorizationCode = {
              authorizationUrl: scheme.flows.authorizationCode.authorizationUrl,
              tokenUrl: scheme.flows.authorizationCode.tokenUrl,
              ...(scheme.flows.authorizationCode.refreshUrl
                ? { refreshUrl: scheme.flows.authorizationCode.refreshUrl }
                : {}),
              scopes: scheme.flows.authorizationCode.scopes || {},
            }
          }

          if (scheme.flows.implicit) {
            flows.implicit = {
              authorizationUrl: scheme.flows.implicit.authorizationUrl,
              ...(scheme.flows.implicit.refreshUrl ? { refreshUrl: scheme.flows.implicit.refreshUrl } : {}),
              scopes: scheme.flows.implicit.scopes || {},
            }
          }

          if (scheme.flows.password) {
            flows.password = {
              tokenUrl: scheme.flows.password.tokenUrl,
              ...(scheme.flows.password.refreshUrl ? { refreshUrl: scheme.flows.password.refreshUrl } : {}),
              scopes: scheme.flows.password.scopes || {},
            }
          }

          if (scheme.flows.clientCredentials) {
            flows.clientCredentials = {
              tokenUrl: scheme.flows.clientCredentials.tokenUrl,
              ...(scheme.flows.clientCredentials.refreshUrl
                ? { refreshUrl: scheme.flows.clientCredentials.refreshUrl }
                : {}),
              scopes: scheme.flows.clientCredentials.scopes || {},
            }
          }

          schemes.set(name, {
            type: 'oauth2',
            flows: flows as OAuth2SecurityScheme['flows'],
            ...(scheme.description ? { description: scheme.description } : {}),
          })
          break
        }

        case 'openIdConnect': {
          if (!scheme.openIdConnectUrl) {
            return yield* new SecurityParseError({
              message: `openIdConnect scheme '${name}' missing 'openIdConnectUrl' field`,
            })
          }

          schemes.set(name, {
            type: 'openIdConnect',
            openIdConnectUrl: scheme.openIdConnectUrl,
            ...(scheme.description ? { description: scheme.description } : {}),
          })
          break
        }

        default:
          return yield* new SecurityParseError({
            message: `Unknown security scheme type: ${(scheme as { type: string }).type}`,
          })
      }
    }

    return schemes
  })

/**
 * Parse security requirements from OpenAPI spec
 *
 * @since 1.0.0
 * @category Parsing
 */
export const parseSecurityRequirements = (
  security?: ReadonlyArray<Record<string, ReadonlyArray<string>>>
): ReadonlyArray<SecurityRequirement> => {
  if (!security) {
    return []
  }

  return security.map((req) => req as SecurityRequirement)
}

/**
 * Parse all security information from OpenAPI spec
 *
 * @since 1.0.0
 * @category Parsing
 */
export const parseSecurity = (spec: OpenApiParser.OpenApiSpec): Effect.Effect<ParsedSecurity, SecurityParseError> =>
  Effect.gen(function* () {
    const schemes = yield* parseSecuritySchemes(spec.components)
    const globalRequirements = parseSecurityRequirements(spec.security)

    return {
      schemes,
      globalRequirements,
    }
  })
