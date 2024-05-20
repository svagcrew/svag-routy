/* eslint-disable func-style */
type Stringable = string | number

type PumpedRouteGetterInputBase = {
  baseUrl?: string
  abs?: boolean
  searchParams?: Record<string, any>
  anchor?: string
}

const normalizeCreateRouteInput = (routeParamsOrGetRoute: any, maybeGetRoute: any) => {
  const routeParamsDefinition: string[] | undefined =
    typeof routeParamsOrGetRoute === 'function'
      ? {}
      : 'getter' in routeParamsOrGetRoute
        ? routeParamsOrGetRoute.params
        : routeParamsOrGetRoute
  const routeGetter: ((routeParams: Record<string, Stringable>) => string) | (() => string) =
    typeof routeParamsOrGetRoute === 'function'
      ? routeParamsOrGetRoute
      : 'getter' in routeParamsOrGetRoute
        ? routeParamsOrGetRoute.getter
        : maybeGetRoute
  const defaultBaseUrl: string = 'getter' in routeParamsOrGetRoute ? routeParamsOrGetRoute.baseUrl : undefined
  const defaultDefinitionParamsPrefix: string =
    'getter' in routeParamsOrGetRoute ? routeParamsOrGetRoute.definitionParamsPrefix : undefined
  return {
    routeParamsDefinition,
    routeGetter,
    defaultBaseUrl,
    defaultDefinitionParamsPrefix,
  }
}

function createRoute<T extends string>(props: {
  params?: T[]
  getter: (routeParams: Record<T, Stringable>) => string
  baseUrl?: string
  definitionParamsPrefix?: string
}): {
  get: (routeParams: Record<T, Stringable> & PumpedRouteGetterInputBase) => string
  placeholders: Record<T, string>
  getPlaceholders: (definitionParamsPrefix?: string) => Record<T, string>
  definition: string
  getDefinition: (definitionParamsPrefix?: string) => string
  validateRouteParams: (routeParams: any) => Record<T, string>
  normalizeRouteParams: (routeParams: any) => Partial<Record<T, string>>
}
function createRoute<T extends string>(
  routeParamsDefinition: T[],
  routeGetter: (routeParams: Record<T, Stringable>) => string
): {
  get: (routeParams: Record<T, Stringable> & PumpedRouteGetterInputBase) => string
  placeholders: Record<T, string>
  getPlaceholders: (definitionParamsPrefix?: string) => Record<T, string>
  definition: string
  getDefinition: (definitionParamsPrefix?: string) => string
  validateRouteParams: (routeParams: any) => Record<T, string>
  normalizeRouteParams: (routeParams: any) => Partial<Record<T, string>>
}
function createRoute(routeGetter: () => string): {
  get: (routeParams?: PumpedRouteGetterInputBase) => string
  placeholders: {}
  getPlaceholders: (definitionParamsPrefix?: string) => {}
  definition: string
  getDefinition: (definitionParamsPrefix?: string) => string
  validateRouteParams: (routeParams: any) => {}
  normalizeRouteParams: (routeParams: any) => {}
}
function createRoute(routeParamsOrGetRoute?: any, maybeGetRoute?: any) {
  const { routeParamsDefinition, routeGetter, defaultBaseUrl, defaultDefinitionParamsPrefix } =
    normalizeCreateRouteInput(routeParamsOrGetRoute, maybeGetRoute)
  const getPlaceholders = (definitionParamsPrefix: string = ':') => {
    return (
      routeParamsDefinition?.reduce(
        (acc, param) => {
          acc[param] = `${definitionParamsPrefix}${param}`
          return acc
        },
        {} as Record<string, string>
      ) || {}
    )
  }
  const placeholders = getPlaceholders(defaultDefinitionParamsPrefix)
  const getDefinition = (definitionParamsPrefix?: string) => {
    const placeholdersHere = getPlaceholders(definitionParamsPrefix)
    return routeGetter(placeholdersHere)
  }
  const definition = getDefinition(defaultDefinitionParamsPrefix)

  const validateRouteParams = (routeParams: any) => {
    const routeParamsKeys = Object.keys(routeParams)
    const routeParamsDefinitionKeys = routeParamsDefinition || []
    const missingKeys = routeParamsDefinitionKeys.filter((key) => !routeParamsKeys.includes(key))
    if (missingKeys.length) {
      throw new Error(`Missing route params: ${missingKeys.join(', ')}`)
    }
    return routeParams
  }
  const normalizeRouteParams = (routeParams: any) => {
    const routeParamsDefinitionKeys = routeParamsDefinition || []
    const normalizedRouteParams = routeParamsDefinitionKeys.reduce(
      (acc, key) => {
        acc[key] = routeParams[key]
        return acc
      },
      {} as Record<string, string>
    )
    return normalizedRouteParams
  }

  const pumpedRouteGetter = (routeParams?: PumpedRouteGetterInputBase) => {
    const route = routeGetter(routeParams as any)
    const searchParamsString = (() => {
      if (!routeParams?.searchParams) {
        return ''
      }
      const searchParams = new URLSearchParams(routeParams.searchParams)
      return `?${searchParams.toString()}`
    })()
    const anchorString = (() => {
      if (!routeParams?.anchor) {
        return ''
      }
      return `#${routeParams.anchor}`
    })()
    const relativePath = `${route}${searchParamsString}${anchorString}`
    if (routeParams?.abs) {
      return `${routeParams.baseUrl || defaultBaseUrl || ''}${relativePath}`
    } else {
      return relativePath
    }
  }
  pumpedRouteGetter.getPlaceholders = getPlaceholders
  pumpedRouteGetter.placeholders = placeholders
  pumpedRouteGetter.getDefinition = getDefinition
  pumpedRouteGetter.definition = definition
  pumpedRouteGetter.validateRouteParams = validateRouteParams
  pumpedRouteGetter.normalizeRouteParams = normalizeRouteParams
  pumpedRouteGetter.get = routeGetter as any
  return pumpedRouteGetter
}

export type Route = ReturnType<typeof createRoute>
export type RouteParams<T extends { placeholders: Record<string, string> }> = T['placeholders']

export const createRoutyThings = ({
  baseUrl = '/',
  definitionParamsPrefix = ':',
}: {
  baseUrl?: string
  definitionParamsPrefix?: string
} = {}) => {
  const createRouteHere = (routeParamsOrGetRoute: any, maybeGetRoute: any) => {
    const { routeParamsDefinition, routeGetter, defaultBaseUrl, defaultDefinitionParamsPrefix } =
      normalizeCreateRouteInput(routeParamsOrGetRoute, maybeGetRoute)
    return createRoute({
      params: routeParamsDefinition,
      getter: routeGetter,
      baseUrl: defaultBaseUrl || baseUrl,
      definitionParamsPrefix: defaultDefinitionParamsPrefix || definitionParamsPrefix,
    })
  }
  return {
    createRoute: createRouteHere as typeof createRoute,
  }
}
