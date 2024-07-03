type Stringable = string | number

type PumpedRouteGetterInputBase = {
  baseUrl?: string
  abs?: boolean
  searchParams?: Record<string, any>
  anchor?: string
}

type CreateRoutyRoute = {
  <T extends string>(props: {
    params?: T[]
    getter: (routeParams: Record<T, Stringable>) => string | (() => string) | string
    baseUrl?: string
    definitionParamsPrefix?: string
  }): RoutyRouteWithParams<T>
  <T extends string, T2 extends string>(props: {
    parent?: RoutyRoute<T2>
    params?: T[]
    getter: (routeParams: Record<T, Stringable>) => string | (() => string) | string
    baseUrl?: string
    definitionParamsPrefix?: string
  }): RoutyRouteWithParams<T | T2>
  <T extends string>(
    routeParamsDefinition: T[],
    routeGetter: (routeParams: Record<T, Stringable>) => string
  ): RoutyRouteWithParams<T>
  (routeGetter: () => string): RoutyRouteWithoutParams
  (routeString: string): RoutyRouteWithoutParams
  (routeParamsOrGetRoute?: any, maybeGetRoute?: any): RoutyRoute
}

type CreateNestedRouteOnWithoutParams = {
  <T2 extends string>(props: {
    params?: T2[]
    getter: (routeParams: Record<T2, Stringable>) => string
    baseUrl?: string
    definitionParamsPrefix?: string
  }): T2 extends string ? RoutyRouteWithParams<T2> : RoutyRouteWithoutParams
  <T2 extends string>(
    routeParamsDefinition: T2[],
    routeGetter: (routeParams: Record<T2, Stringable>) => string
  ): RoutyRouteWithParams<T2>
  (routeGetter: () => string): RoutyRouteWithoutParams
  (routeString: string): RoutyRouteWithoutParams
}
type CreateNestedRouteOnWithParams<T extends string> = {
  <T2 extends string>(props: {
    params?: T2[]
    getter: (routeParams: Record<T2, Stringable>) => string
    baseUrl?: string
    definitionParamsPrefix?: string
  }): RoutyRouteWithParams<T extends string ? T | T2 : T2>
  <T2 extends string>(
    routeParamsDefinition: T2[],
    routeGetter: (routeParams: Record<T2, Stringable>) => string
  ): RoutyRouteWithParams<T extends string ? T | T2 : T2>
  (routeGetter: () => string): RoutyRouteWithParams<T>
  (routeString: string): RoutyRouteWithParams<T>
}

export type RoutyRouteWithoutParams = {
  get: (routeParams?: PumpedRouteGetterInputBase) => string
  placeholders: {}
  getPlaceholders: (definitionParamsPrefix?: string) => {}
  definition: string
  getDefinition: (definitionParamsPrefix?: string) => string
  parseParams: (routeParams: any) => {}
  parseParamsPartial: (routeParams: any) => {}
  createRoute: CreateNestedRouteOnWithoutParams
}
export type RoutyRouteWithParams<T extends string> = {
  get: (routeParams: Record<T, Stringable> & PumpedRouteGetterInputBase) => string
  placeholders: Record<T, string>
  getPlaceholders: (definitionParamsPrefix?: string) => Record<T, string>
  definition: string
  getDefinition: (definitionParamsPrefix?: string) => string
  parseParams: (routeParams: any) => Record<T, string>
  parseParamsPartial: (routeParams: any) => Partial<Record<T, string>>
  createRoute: CreateNestedRouteOnWithParams<T>
}
export type RoutyRoute<T extends string = string> = T extends string ? RoutyRouteWithParams<T> : RoutyRouteWithoutParams

const mergeRouteStrings = (...routeStrings: string[]) => {
  const routeStringsWithoutEndingSlashes = routeStrings.map((routeString) => routeString.replace(/^\/|\/$/g, ''))
  return routeStringsWithoutEndingSlashes.join('/')
}
const prependSlash = (route: string) => {
  if (!route.startsWith('/')) {
    return `/${route}`
  }
  return route
}
const prependSlashIfNoProtocol = (route: string) => {
  const hasProtocol = route.match(/^[a-z]+:\/\//)
  if (hasProtocol) {
    return route
  }
  return prependSlash(route)
}

const normalizeCreateRouteInput = (routeParamsOrGetRoute: any, maybeGetRoute: any) => {
  const routeParamsDefinitionSelf: string[] | undefined =
    typeof routeParamsOrGetRoute === 'function' || typeof routeParamsOrGetRoute === 'string'
      ? []
      : typeof routeParamsOrGetRoute === 'object' && 'getter' in routeParamsOrGetRoute
        ? routeParamsOrGetRoute.params
        : routeParamsOrGetRoute
  const routeParamsDefinitionParent: string[] | undefined =
    typeof routeParamsOrGetRoute === 'object' &&
    'getter' in routeParamsOrGetRoute &&
    routeParamsOrGetRoute.parent?.placeholders
      ? Object.keys(routeParamsOrGetRoute.parent?.placeholders)
      : []
  const routeParamsDefinition = [...(routeParamsDefinitionParent || []), ...(routeParamsDefinitionSelf || [])]
  const routeGetter: ((routeParams: Record<string, Stringable>) => string) | (() => string) =
    typeof routeParamsOrGetRoute === 'string'
      ? () => routeParamsOrGetRoute
      : typeof routeParamsOrGetRoute === 'function'
        ? routeParamsOrGetRoute
        : typeof routeParamsOrGetRoute === 'object' && 'getter' in routeParamsOrGetRoute
          ? typeof routeParamsOrGetRoute.getter === 'string'
            ? () => routeParamsOrGetRoute.getter
            : routeParamsOrGetRoute.getter
          : maybeGetRoute
  const defaultBaseUrl: string =
    typeof routeParamsOrGetRoute === 'object' && 'getter' in routeParamsOrGetRoute
      ? routeParamsOrGetRoute.baseUrl
      : undefined
  const defaultDefinitionParamsPrefix: string =
    typeof routeParamsOrGetRoute === 'object' && 'getter' in routeParamsOrGetRoute
      ? routeParamsOrGetRoute.definitionParamsPrefix
      : undefined
  const parentRoute: RoutyRoute | undefined =
    typeof routeParamsOrGetRoute === 'object' && 'getter' in routeParamsOrGetRoute
      ? routeParamsOrGetRoute.parent
      : undefined
  return {
    routeParamsDefinition,
    routeGetter,
    defaultBaseUrl,
    defaultDefinitionParamsPrefix,
    parentRoute,
  }
}

const createRoute: CreateRoutyRoute = (routeParamsOrGetRoute?: any, maybeGetRoute?: any) => {
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
    return prependSlashIfNoProtocol(mergeRouteStrings(parentRouteString, selfRouteString))
  }
  const definition = getDefinition(defaultDefinitionParamsPrefix)

  const parseParams = (routeParams: any) => {
    const routeParamsKeys = Object.keys(routeParams)
    const routeParamsDefinitionKeys = routeParamsDefinition || []
    const missingKeys = routeParamsDefinitionKeys.filter((key) => !routeParamsKeys.includes(key))
    if (missingKeys.length) {
      throw new Error(`Missing route params: ${missingKeys.join(', ')}`)
    }
    return routeParams
  }
  const parseParamsPartial = (routeParams: any) => {
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
    const result = routeParams?.abs
      ? mergeRouteStrings(routeParams.baseUrl || defaultBaseUrl || '/', relativePath)
      : relativePath
    return prependSlashIfNoProtocol(result)
  }

  const route = {
    getPlaceholders,
    placeholders,
    getDefinition,
    definition,
    parseParams,
    parseParamsPartial,
    get: pumpedRouteGetter,
  }

  const createNestedRoute = (routeParamsOrGetRoute: any, maybeGetRoute: any) => {
    const {
      routeParamsDefinition,
      routeGetter,
      defaultBaseUrl: nestedDefaultBaseUrl,
      defaultDefinitionParamsPrefix: nestedDefaultDefinitionParamsPrefix,
    } = normalizeCreateRouteInput(routeParamsOrGetRoute, maybeGetRoute)
    return (createRoute as any)({
      params: routeParamsDefinition,
      getter: routeGetter,
      baseUrl: nestedDefaultBaseUrl || defaultBaseUrl,
      definitionParamsPrefix: nestedDefaultDefinitionParamsPrefix || defaultDefinitionParamsPrefix,
      parent: route,
    })
  }

  return {
    ...route,
    createRoute: createNestedRoute as any,
  }
}

export type RoutyRouteParams<T extends { placeholders: Record<string, string> }> = T['placeholders']

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
