import { redirect, type ActionArgs, type LoaderArgs } from "@remix-run/node"
import {
  Link,
  useFetcher,
  useLoaderData,
  useTransition,
} from "@remix-run/react"
import { type CatchBoundaryComponent } from "@remix-run/react/dist/routeModules"
import clsx from "clsx"
import { Wand2 } from "lucide-react"
import { findSessionUser } from "~/auth.server"
import { db } from "~/db.server"
import { raise } from "~/helpers/errors"
import { plural } from "~/helpers/plural"
import { unauthorized } from "~/helpers/responses.server"
import { getAppMeta } from "~/meta"
import { CatchBoundaryMessage } from "~/ui/catch-boundary-message"
import { LoadingSpinner } from "~/ui/loading"
import { PageHeader } from "~/ui/page-header"
import { RelativeTimestamp } from "~/ui/relative-timestamp"
import { buttonStyle, interactivePanelStyle } from "~/ui/styles"

export async function loader({ request }: LoaderArgs) {
  const user = (await findSessionUser(request)) ?? raise(unauthorized())

  const worlds = await db.world.findMany({
    where: {
      memberships: {
        some: {
          userDiscordId: user.discordId,
        },
      },
    },
    include: {
      memberships: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return {
    user: user && { ...user, avatarUrl: user.avatarUrl ?? undefined },
    worlds: worlds.map((world) => ({
      ...world,
      createdAt: world.createdAt.valueOf(),
    })),
  }
}

export async function action({ request }: ActionArgs) {
  const user = (await findSessionUser(request)) ?? raise(unauthorized())

  const world = await db.world.create({
    data: {
      name: `${user.name}'s New World`,
      memberships: {
        create: { userDiscordId: user.discordId, role: "OWNER" },
      },
    },
  })

  return redirect(`worlds/${world.id}`, 303)
}

export const meta = () => getAppMeta({ title: "Your Worlds" })

export default function WorldListPage() {
  const { user, worlds } = useLoaderData<typeof loader>()
  return (
    <>
      <PageHeader title="Your Worlds" user={user} />
      <main>
        <div className="mt-8 flex w-full max-w-screen-xl flex-col justify-start gap-4 sm:flex-row sm:flex-wrap sm:[&>*]:basis-64">
          {worlds.map((world) => (
            <WorldCard
              key={world.id}
              {...world}
              playerCount={world.memberships.length}
            />
          ))}
        </div>
        <div className="mt-4">
          <CreateWorldButton />
        </div>
      </main>
    </>
  )
}

function WorldCard(props: {
  id: string
  name: string
  createdAt: number
  playerCount: number
}) {
  const transition = useTransition()

  const pending =
    transition.state === "loading" &&
    transition.location.pathname.endsWith(props.id)

  return (
    <Link
      to={`worlds/${props.id}`}
      className={interactivePanelStyle()}
      prefetch="intent"
    >
      <div className="relative flex h-full flex-col gap-3 p-4">
        <h2 className="text-3xl font-light leading-none">{props.name}</h2>
        <p className="mt-auto text-sm leading-tight opacity-75">
          {plural(props.playerCount, "Player")}
          <br />
          Created{" "}
          <RelativeTimestamp date={new Date(props.createdAt)} addSuffix />
        </p>
      </div>
      <div
        aria-hidden
        className={clsx(
          "absolute right-0 bottom-0 p-4",
          pending ? "opacity-100" : "opacity-0",
        )}
      >
        <LoadingSpinner size={6} />
      </div>
    </Link>
  )
}

function CreateWorldButton() {
  const fetcher = useFetcher()
  const pending = fetcher.state !== "idle"

  return (
    <fetcher.Form method="post">
      <button className={buttonStyle()} disabled={pending}>
        {pending ? <LoadingSpinner size={6} /> : <Wand2 className="s-6" />}
        Create a New World
      </button>
    </fetcher.Form>
  )
}

export const CatchBoundary: CatchBoundaryComponent = () => {
  return (
    <>
      <PageHeader title="Your Worlds" user={undefined} />
      <CatchBoundaryMessage />
    </>
  )
}
