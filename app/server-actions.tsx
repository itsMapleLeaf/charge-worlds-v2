import { type TypedResponse } from "@remix-run/node"
import {
  useFetcher,
  useFetchers,
  useSubmit,
  useTransition,
} from "@remix-run/react"
import { type MaybePromise } from "./helpers/types"

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
  const actionUrl = `/server-actions/${actionName}`

  return {
    useSubmit: function useServerActionSubmit() {
      const submit = useSubmit()
      return (data: Input) => {
        submit(
          { data: JSON.stringify(data) },
          { method: "post", action: actionUrl },
        )
      }
    },

    useFetcher: function useServerActionFetcher() {
      const fetcher = useFetcher<Return>()
      return {
        ...fetcher,
        Form: undefined,
        submit: (data: Input) => {
          fetcher.submit(
            { data: JSON.stringify(data) },
            { method: "post", action: actionUrl },
          )
        },
      }
    },

    useSubmissions: function useServerActionSubmissions() {
      const transition = useTransition()
      const fetchers = useFetchers()
      return [transition, ...fetchers].flatMap((state) => {
        if (state.submission?.action !== actionUrl) return []
        return JSON.parse(
          state.submission.formData.get("data") as string,
        ) as Input
      })
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
