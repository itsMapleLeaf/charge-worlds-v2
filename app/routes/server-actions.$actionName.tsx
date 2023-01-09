import { type ActionArgs } from "@remix-run/node"
import { handleServerAction } from "~/server-actions"

export async function action({ request, params }: ActionArgs) {
  return handleServerAction(request, params["actionName"]!)
}
