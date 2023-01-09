import { type ErrorBoundaryComponent, type MetaFunction } from "@remix-run/node"
import {
  type CatchBoundaryComponent,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  type ShouldReloadFunction,
  useLoaderData,
} from "@remix-run/react"
import backgroundImage from "./assets/bg_flipped.png"
import favicon from "./assets/favicon.svg"
import { env } from "./env.server"
import tailwind from "./generated/tailwind.css"
import { toError } from "./helpers/errors"
import { PusherProvider } from "./pusher-context"
import { CatchBoundaryMessage } from "./ui/catch-boundary-message"
import { EmptyState } from "./ui/empty-state"
import { linkStyle } from "./ui/styles"

export const loader = () => ({
  pusherKey: env.PUSHER_KEY,
  pusherCluster: env.PUSHER_CLUSTER,
})

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "Charge Worlds",
  viewport: "width=device-width,initial-scale=1",
})

export const links = () => [
  { rel: "stylesheet", href: tailwind },
  { rel: "stylesheet", href: "/fonts/rubik/variable.css" },
  { rel: "icon", href: favicon },
]

export const unstable_shouldReload: ShouldReloadFunction = () => false

function Document({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="break-words bg-black bg-cover bg-fixed bg-right-top bg-no-repeat text-gray-50 [word-break:break-word]"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <div className="fixed inset-0 -z-10 bg-black/70" />
        <div className="flex min-h-screen flex-col p-4 lg:p-8">{children}</div>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  )
}

export default function App() {
  const data = useLoaderData<typeof loader>()
  return (
    <Document>
      <PusherProvider
        pusherKey={data.pusherKey}
        pusherCluster={data.pusherCluster}
      >
        <Outlet />
      </PusherProvider>
    </Document>
  )
}

export const ErrorBoundary: ErrorBoundaryComponent = ({
  error,
}: {
  error: Error
}) => {
  const { stack, message } = toError(error)
  return (
    <Document>
      <EmptyState title="oops, something went wrong">
        <pre className="mt-8 block overflow-x-auto rounded bg-black/75 p-4 text-left">
          {stack || message}
        </pre>
        <p className="mt-8">
          <a href="/" className={linkStyle()}>
            Go back home
          </a>
        </p>
      </EmptyState>
    </Document>
  )
}

export const CatchBoundary: CatchBoundaryComponent = () => {
  return (
    <Document>
      <CatchBoundaryMessage />
    </Document>
  )
}
