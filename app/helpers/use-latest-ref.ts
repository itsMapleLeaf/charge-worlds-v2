import { useInsertionEffect, useRef } from "react"

export function useLatestRef<T>(value: T): { readonly current: T } {
  const ref = useRef(value)
  useInsertionEffect(() => {
    ref.current = value
  })
  return ref
}
