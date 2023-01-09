import { type TypedResponse } from "@remix-run/node"
import { useFetcher } from "@remix-run/react"
import { useMemo } from "react"
import { type MaybePromise } from "./helpers/types"
import { useLatestRef } from "./helpers/use-latest-ref"

declare global {
  var __serverActionRegistry:
    | Map<
        string,
        (input: any, request: Request) => MaybePromise<TypedResponse<any>>
      >
    | undefined
}

const registry = (globalThis.__serverActionRegistry ??= new Map<
  string,
  (input: any, request: Request) => MaybePromise<TypedResponse<any>>
>())

export function serverAction<Input, Return>(
  actionName: string,
  callback: (
    input: Input,
    request: Request,
  ) => MaybePromise<TypedResponse<Return>>,
) {
  registry.set(actionName, callback)

  return {
    useFetcher: function useServerActionFetcher() {
      const fetcher = useFetcher<Return>()
      const fetcherRef = useLatestRef(fetcher)
      return useMemo(
        () => ({
          ...fetcher,
          submit: (data: Input) => {
            fetcherRef.current.submit(
              { data: JSON.stringify(data) },
              { method: "post", action: `/server-actions/${actionName}` },
            )
          },
          Form: undefined,
        }),
        [fetcher, fetcherRef],
      )
    },
  }
}

export async function handleServerAction(request: Request, actionName: string) {
  const action = registry.get(actionName)
  if (!action) {
    return new Response(undefined, {
      status: 404,
      statusText: `No action found for ${actionName}`,
    })
  }

  const formData = await request.formData()
  const input = JSON.parse(formData.get("data") as string)
  return await action(input, request)
}
