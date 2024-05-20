/* eslint-disable func-style */
type Stringable = string | number

type PumpedRouteGetterInputBase = {
  baseUrl?: string
  abs?: boolean
  searchParams?: Record<string, any>
  anchor?: string
}

type CreateNestedRoute<T extends string | undefined = undefined> = {
  <T2 extends string>(props: {
    parent?: Route<any>
    params?: T2[]
    getter: (routeParams: Record<T2, Stringable>) => string
    baseUrl?: string
    definitionParamsPrefix?: string
  }): RouteWithParams<T extends string ? T | T2 : T2>
  <T2 extends string>(
    routeParamsDefinition: T2[],
    routeGetter: (routeParams: Record<T2, Stringable>) => string
  ): RouteWithParams<T extends string ? T | T2 : T2>
  (routeGetter: () => string): T extends string ? RouteWithParams<T> : RouteWithoutParams
}

export type RouteWithoutParams = {
  get: (routeParams?: PumpedRouteGetterInputBase) => string
  placeholders: {}
  getPlaceholders: (definitionParamsPrefix?: string) => {}
  definition: string
  getDefinition: (definitionParamsPrefix?: string) => string
  validateRouteParams: (routeParams: any) => {}
  normalizeRouteParams: (routeParams: any) => {}
  createRoute: CreateNestedRoute
}
export type RouteWithParams<T extends string> = {
  get: (routeParams: Record<T, Stringable> & PumpedRouteGetterInputBase) => string
  placeholders: Record<T, string>
  getPlaceholders: (definitionParamsPrefix?: string) => Record<T, string>
  definition: string
  getDefinition: (definitionParamsPrefix?: string) => string
  validateRouteParams: (routeParams: any) => Record<T, string>
  normalizeRouteParams: (routeParams: any) => Partial<Record<T, string>>
  createRoute: CreateNestedRoute<T>
}
export type Route<T extends string | undefined = string> = T extends string ? RouteWithParams<T> : RouteWithoutParams

const mergeRouteStrings = (...routeStrings: string[]) => {
  const routeStringsWithoutSlashes = routeStrings.map((routeString) => routeString.replace(/^\/|\/$/g, ''))
  return routeStringsWithoutSlashes.join('/')
}

const normalizeCreateRouteInput = (routeParamsOrGetRoute: any, maybeGetRoute: any) => {
  const routeParamsDefinitionSelf: string[] | undefined =
    typeof routeParamsOrGetRoute === 'function'
      ? []
      : 'getter' in routeParamsOrGetRoute
        ? routeParamsOrGetRoute.params
        : routeParamsOrGetRoute
  const routeParamsDefinitionParent: string[] | undefined =
    'getter' in routeParamsOrGetRoute && routeParamsOrGetRoute.parent?.placeholders
      ? Object.keys(routeParamsOrGetRoute.parent?.placeholders)
      : []
  const routeParamsDefinition = [...(routeParamsDefinitionParent || []), ...(routeParamsDefinitionSelf || [])]
  const routeGetter: ((routeParams: Record<string, Stringable>) => string) | (() => string) =
    typeof routeParamsOrGetRoute === 'function'
      ? routeParamsOrGetRoute
      : 'getter' in routeParamsOrGetRoute
        ? routeParamsOrGetRoute.getter
        : maybeGetRoute
  const defaultBaseUrl: string = 'getter' in routeParamsOrGetRoute ? routeParamsOrGetRoute.baseUrl : undefined
  const defaultDefinitionParamsPrefix: string =
    'getter' in routeParamsOrGetRoute ? routeParamsOrGetRoute.definitionParamsPrefix : undefined
  const parentRoute: Route | undefined = 'getter' in routeParamsOrGetRoute ? routeParamsOrGetRoute.parent : undefined
  return {
    routeParamsDefinition,
    routeGetter,
    defaultBaseUrl,
    defaultDefinitionParamsPrefix,
    parentRoute,
  }
}

function createRoute<T extends string>(props: {
  params?: T[]
  getter: (routeParams: Record<T, Stringable>) => string
  baseUrl?: string
  definitionParamsPrefix?: string
}): RouteWithParams<T>
function createRoute<T extends string, T2 extends string>(props: {
  parent?: Route<T2>
  params?: T[]
  getter: (routeParams: Record<T, Stringable>) => string
  baseUrl?: string
  definitionParamsPrefix?: string
}): RouteWithParams<T | T2>
function createRoute<T extends string>(
  routeParamsDefinition: T[],
  routeGetter: (routeParams: Record<T, Stringable>) => string
): RouteWithParams<T>
function createRoute(routeGetter: () => string): RouteWithoutParams
function createRoute(routeParamsOrGetRoute?: any, maybeGetRoute?: any) {
  const { routeParamsDefinition, routeGetter, defaultBaseUrl, defaultDefinitionParamsPrefix, parentRoute } =
    normalizeCreateRouteInput(routeParamsOrGetRoute, maybeGetRoute)
  const getPlaceholders = (definitionParamsPrefix: string = ':') => {
    const selfPlacehlders =
      routeParamsDefinition?.reduce(
        (acc, param) => {
          acc[param] = `${definitionParamsPrefix}${param}`
          return acc
        },
        {} as Record<string, string>
      ) || {}
    const parentPlaceholders = parentRoute?.getPlaceholders(definitionParamsPrefix) || {}
    return { ...parentPlaceholders, ...selfPlacehlders }
  }
  const placeholders = getPlaceholders(defaultDefinitionParamsPrefix)
  const getDefinition = (definitionParamsPrefix?: string) => {
    const placeholdersHere = getPlaceholders(definitionParamsPrefix)
    const selfRouteString = routeGetter(placeholdersHere)
    const parentRouteString = parentRoute?.getDefinition(definitionParamsPrefix) || ''
    return mergeRouteStrings(parentRouteString, selfRouteString)
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
    const parentRouteString = parentRoute?.get({ ...routeParams, abs: false } as any) || ''
    const relativePath = `${mergeRouteStrings(parentRouteString, route)}${searchParamsString}${anchorString}`
    if (routeParams?.abs) {
      return mergeRouteStrings(routeParams.baseUrl || defaultBaseUrl || '', relativePath)
    } else {
      return relativePath
    }
  }

  const route = {
    getPlaceholders,
    placeholders,
    getDefinition,
    definition,
    validateRouteParams,
    normalizeRouteParams,
    get: pumpedRouteGetter,
  }

  const createNestedRoute = (routeParamsOrGetRoute: any, maybeGetRoute: any) => {
    const { routeParamsDefinition, routeGetter, defaultBaseUrl, defaultDefinitionParamsPrefix } =
      normalizeCreateRouteInput(routeParamsOrGetRoute, maybeGetRoute)
    return (createRoute as any)({
      params: routeParamsDefinition,
      getter: routeGetter,
      baseUrl: defaultBaseUrl,
      definitionParamsPrefix: defaultDefinitionParamsPrefix,
      parent: route,
    })
  }

  return {
    ...route,
    createRoute: createNestedRoute as any,
  }
}

export type RouteParams<T extends { placeholders: Record<string, string> }> = T['placeholders']

export const createRoutyThings = ({
  baseUrl = '',
  definitionParamsPrefix = ':',
}: {
  baseUrl?: string
  definitionParamsPrefix?: string
} = {}) => {
  const createRouteHere = (routeParamsOrGetRoute: any, maybeGetRoute: any) => {
    const { routeParamsDefinition, routeGetter, defaultBaseUrl, defaultDefinitionParamsPrefix, parentRoute } =
      normalizeCreateRouteInput(routeParamsOrGetRoute, maybeGetRoute)
    return createRoute({
      params: routeParamsDefinition,
      getter: routeGetter,
      baseUrl: defaultBaseUrl || baseUrl,
      definitionParamsPrefix: defaultDefinitionParamsPrefix || definitionParamsPrefix,
      parent: parentRoute,
    })
  }
  return {
    createRoute: createRouteHere as typeof createRoute,
  }
}
