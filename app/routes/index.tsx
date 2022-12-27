import { redirect, type ActionArgs, type LoaderArgs } from "@remix-run/node"
import {
  Link,
  useFetcher,
  useLoaderData,
  type CatchBoundaryComponent,
} from "@remix-run/react"
import { Wand2 } from "lucide-react"
import { findSessionUser } from "~/auth.server"
import { db } from "~/db.server"
import { raise } from "~/helpers/errors"
import { plural } from "~/helpers/plural"
import { unauthorized } from "~/helpers/responses"
import { getAppMeta } from "~/meta"
import { CatchBoundaryMessage } from "~/ui/catch-boundary-message"
import { LoadingSpinner } from "~/ui/loading"
import { PageHeader } from "~/ui/page-header"
import { RelativeTimestamp } from "~/ui/relative-timestamp"
import { buttonStyle, interactivePanelStyle } from "~/ui/styles"

export async function loader({ request }: LoaderArgs) {
  const user = await findSessionUser(request)
  if (!user) {
    throw new Response(undefined, { status: 401 })
  }

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
        <CreateWorldButton />
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
  return (
    <Link to={`worlds/${props.id}`} className={interactivePanelStyle()}>
      <div className="flex h-full flex-col gap-3 p-4">
        <h2 className="text-3xl font-light leading-none">{props.name}</h2>
        <p className="mt-auto text-sm leading-tight opacity-75">
          {plural(props.playerCount, "Player")}
          <br />
          Created{" "}
          <RelativeTimestamp date={new Date(props.createdAt)} addSuffix />
        </p>
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
