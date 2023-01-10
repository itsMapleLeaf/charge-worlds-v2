import { useCallback, useRef } from "react"
import { useLatestRef } from "./use-latest-ref"

export function useDebouncedCallback<Args extends readonly unknown[]>(
  period: number,
  callback: (...args: Args) => void,
) {
  const timeout = useRef<ReturnType<typeof setTimeout>>()
  const callbackRef = useLatestRef(callback)

  return useCallback(
    (...args: Args) => {
      if (timeout.current) clearTimeout(timeout.current)
      timeout.current = setTimeout(() => {
        timeout.current = undefined
        callbackRef.current(...args)
      }, period)
    },
    [period, callbackRef],
  )
}
