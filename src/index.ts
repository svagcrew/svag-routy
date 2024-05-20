/* eslint-disable func-style */
type Stringable = string | number

type PumpedRouteGetterInputBase = {
  baseUrl?: string
  abs?: boolean
  searchParams?: Record<string, any>
  anchor?: string
}

const normalizeCreateRouteInput = (routeParamsOrGetRoute: any, maybeGetRoute: any) => {
  const routeParamsDefinition =
    typeof routeParamsOrGetRoute === 'function'
      ? {}
      : 'getter' in routeParamsOrGetRoute
        ? routeParamsOrGetRoute.params
        : routeParamsOrGetRoute
  const routeGetter =
    typeof routeParamsOrGetRoute === 'function'
      ? routeParamsOrGetRoute
      : 'getter' in routeParamsOrGetRoute
        ? routeParamsOrGetRoute.getter
        : maybeGetRoute
  const defaultBaseUrl = ('getter' in routeParamsOrGetRoute ? routeParamsOrGetRoute.baseUrl : undefined) || ''
  const defaultDefinitionParamsPrefix =
    ('getter' in routeParamsOrGetRoute ? routeParamsOrGetRoute.definitionParamsPrefix : undefined) || ':'
  return {
    routeParamsDefinition,
    routeGetter,
    defaultBaseUrl,
    defaultDefinitionParamsPrefix,
  }
}

function createRoute<T extends Record<string, boolean>>(props: {
  params?: T
  getter: (routeParams: Record<keyof T, Stringable>) => string
  baseUrl?: string
  definitionParamsPrefix?: string
}): {
  get: (routeParams: Record<keyof T, Stringable> & PumpedRouteGetterInputBase) => string
  placeholders: Record<keyof T, string>
  getPlaceholders: (definitionParamsPrefix?: string) => Record<keyof T, string>
  definition: string
  getDefinition: (definitionParamsPrefix?: string) => string
}
function createRoute<T extends Record<string, boolean>>(
  routeParamsDefinition: T,
  routeGetter: (routeParams: Record<keyof T, Stringable>) => string
): {
  get: (routeParams: Record<keyof T, Stringable> & PumpedRouteGetterInputBase) => string
  placeholders: Record<keyof T, string>
  getPlaceholders: (definitionParamsPrefix?: string) => Record<keyof T, string>
  definition: string
  getDefinition: (definitionParamsPrefix?: string) => string
}
function createRoute(routeGetter: () => string): {
  get: (routeParams?: PumpedRouteGetterInputBase) => string
  placeholders: {}
  getPlaceholders: (definitionParamsPrefix?: string) => {}
  definition: string
  getDefinition: (definitionParamsPrefix?: string) => string
}
function createRoute(routeParamsOrGetRoute?: any, maybeGetRoute?: any) {
  const { routeParamsDefinition, routeGetter, defaultBaseUrl, defaultDefinitionParamsPrefix } =
    normalizeCreateRouteInput(routeParamsOrGetRoute, maybeGetRoute)
  const getPlaceholders = (definitionParamsPrefix: string = defaultDefinitionParamsPrefix) => {
    return Object.fromEntries(Object.keys(routeParamsDefinition).map((key) => [key, `${definitionParamsPrefix}${key}`]))
  }
  const placeholders = getPlaceholders(defaultDefinitionParamsPrefix)
  const getDefinition = (definitionParamsPrefix?: string) => {
    const placeholdersHere = getPlaceholders(definitionParamsPrefix)
    return routeGetter(placeholdersHere)
  }
  const definition = getDefinition(defaultDefinitionParamsPrefix)

  const pumpedRouteGetter = (routeParams?: PumpedRouteGetterInputBase) => {
    const route = routeGetter(routeParams)
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
      return `${routeParams.baseUrl || defaultBaseUrl}${relativePath}`
    } else {
      return relativePath
    }
  }
  pumpedRouteGetter.getPlaceholders = getPlaceholders
  pumpedRouteGetter.placeholders = placeholders
  pumpedRouteGetter.getDefinition = getDefinition
  pumpedRouteGetter.definition = definition
  pumpedRouteGetter.get = routeGetter
  return pumpedRouteGetter
}

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
