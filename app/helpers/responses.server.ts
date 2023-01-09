import { redirect } from "@remix-run/node"

export const notFound = () => new Response(undefined, { status: 404 })

export const unauthorized = () => new Response(undefined, { status: 401 })

export const forbidden = () => new Response(undefined, { status: 403 })

export const badRequest = () => new Response(undefined, { status: 400 })

export const internalServerError = () =>
  new Response(undefined, { status: 500 })

export const redirectBack = (
  request: Request,
  status = 303,
  fallbackUrl = "/",
) => redirect(request.headers.get("Referer") ?? fallbackUrl, status)
