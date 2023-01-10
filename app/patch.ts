import { type Nullish } from "./helpers/types"

export type Patch<T> = T extends ReadonlyArray<infer V>
  ? {
      $append?: V[]
      $prepend?: V[]
      $removeWhere?: V extends object ? Partial<V> : never
      $mergeWhere?: V extends object
        ? { match: Partial<V>; properties: Partial<V> }
        : never
      [index: number]: Patch<V>
    }
  : T extends object
  ? {
      [K in keyof T]?: Patch<T[K]>
    }
  : T

/** Returns a new object with the patch applied immutably */
export function applyPatch<T>(input: T, patch: Patch<Nullish<{}>>): T {
  if (Array.isArray(input)) {
    return applyArrayPatch(input, patch) as T
  }
  if (isObject(input)) {
    return applyObjectPatch(input, patch) as T
  }
  if (typeof patch === typeof input) {
    return patch as T
  }
  throw new Error(`Invalid patch: ${JSON.stringify(patch, undefined, 2)}`)
}

function applyArrayPatch<T>(input: T[], patch: Patch<Nullish<{}>>): T[] {
  if (patch == null) {
    throw new Error(`Invalid patch: ${JSON.stringify(patch, undefined, 2)}`)
  }

  let output = [...input]
  if ("$append" in patch && Array.isArray(patch.$append)) {
    output.push(...patch.$append)
  }
  if ("$prepend" in patch && Array.isArray(patch.$prepend)) {
    output.unshift(...patch.$prepend)
  }
  if ("$removeWhere" in patch && isObject(patch.$removeWhere)) {
    const removeWhere = patch.$removeWhere
    output = output.filter((item) => {
      for (const [key, value] of Object.entries(removeWhere)) {
        if (item[key as keyof T] !== value) {
          return true
        }
      }
      return false
    })
  }

  if (
    "$mergeWhere" in patch &&
    isObject(patch.$mergeWhere) &&
    "match" in patch.$mergeWhere &&
    isObject(patch.$mergeWhere.match) &&
    "properties" in patch.$mergeWhere &&
    isObject(patch.$mergeWhere.properties)
  ) {
    const { match, properties } = patch.$mergeWhere
    output = output.map((item) => {
      for (const [key, value] of Object.entries(match)) {
        if (item[key as keyof T] !== value) {
          return item
        }
      }
      return { ...item, ...properties }
    })
  }

  for (const [index, item] of Object.entries(patch)) {
    if (
      index === "$append" ||
      index === "$prepend" ||
      index === "$removeWhere" ||
      index === "$mergeWhere"
    ) {
      continue
    }
    const parsedIndex = Number(index)
    if (!Number.isInteger(parsedIndex)) {
      throw new Error(
        `Invalid array patch: ${JSON.stringify(patch, undefined, 2)}`,
      )
    }
    output[parsedIndex] = applyPatch(output[parsedIndex]!, item as any)
  }

  return output
}

function applyObjectPatch<T>(
  input: T,
  patch: Patch<Nullish<{}>>,
): T | undefined {
  if (patch == null) {
    return undefined
  }

  const output = { ...input }
  for (const [key, item] of Object.entries(patch)) {
    output[key as keyof T] = applyPatch(output[key as keyof T], item as any)
  }

  return output
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null
}
