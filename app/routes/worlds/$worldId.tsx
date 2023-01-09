import { type LoaderArgs, type MetaFunction } from "@remix-run/node"
import {
  NavLink,
  Outlet,
  useLoaderData,
  type ShouldReloadFunction,
} from "@remix-run/react"
import {
  Dialog,
  DialogDismiss,
  Tab,
  TabList,
  TabPanel,
  useDialogState,
  useTabState,
  type DisclosureState,
} from "ariakit"
import clsx from "clsx"
import {
  Clock,
  Dices,
  Gamepad2,
  Globe,
  Image,
  List,
  Plus,
  SidebarClose,
  SidebarOpen,
  Users,
} from "lucide-react"
import { findSessionUser, getSession } from "~/auth.server"
import { DeleteCharacterAction } from "~/characters/delete-character"
import { db } from "~/db.server"
import { raise } from "~/helpers/errors"
import { forbidden, unauthorized } from "~/helpers/responses.server"
import { getAppMeta } from "~/meta"
import { serverAction } from "~/server-actions"
import { LoadingSpinner } from "~/ui/loading"
import { PageHeader } from "~/ui/page-header"
import { buttonStyle, panelStyle } from "~/ui/styles"
import {
  loadWorldState,
  sendWorldPatch,
  useWorldState,
  WorldStateProvider,
} from "~/world-state"

export async function loader({ request, params }: LoaderArgs) {
  const user = await findSessionUser(request)
  const world = await loadWorldState(params.worldId!, user)
  return { user, world }
}

export const unstable_shouldReload: ShouldReloadFunction = () => false

export const meta: MetaFunction<typeof loader> = ({ data }) =>
  getAppMeta({ title: data.world.name })

export default function WorldPage() {
  const data = useLoaderData<typeof loader>()
  return (
    <WorldStateProvider initialState={data.world}>
      <div className="flex flex-1 flex-col gap-4">
        <PageHeader
          title={data.world.name}
          user={data.user}
          breadcrumbs={[{ title: "Worlds", href: "/" }]}
        />

        <div className="flex flex-1 gap-4">
          <div className="sticky top-8 hidden h-[calc(100vh-12rem)] w-80 lg:block [&>*]:h-full">
            <div className={panelStyle()}>
              <WorldMenu />
            </div>
          </div>
          <div className="max-w-screen-md flex-1">
            <Outlet />
          </div>
        </div>

        <div className="sticky bottom-4 lg:hidden">
          <WorldMenuDialogButton />
        </div>
      </div>
    </WorldStateProvider>
  )
}

function WorldMenuDialogButton() {
  const dialog = useDialogState({ animated: true })
  return (
    <>
      <button
        title="Open World Menu"
        className={buttonStyle({ rounding: "full", size: 14, square: true })}
        onClick={dialog.toggle}
      >
        <SidebarOpen className="s-6" />
      </button>
      <Dialog
        state={dialog}
        aria-label="World Menu"
        className="fixed inset-y-0 left-0 w-full max-w-xs transition duration-200 data-[enter]:translate-x-0 data-[leave]:-translate-x-full data-[enter]:ease-out data-[leave]:ease-in [&>*]:h-full"
      >
        <div className={panelStyle({ rounding: "none", borders: "right" })}>
          <WorldMenu dialogState={dialog} />
        </div>
      </Dialog>
    </>
  )
}

function WorldMenu(props: { dialogState?: DisclosureState }) {
  type TabInfo = {
    title: string
    tabContent: React.ReactNode
    panelContent: React.ReactNode
    headerAction?: React.ReactNode
  }

  const tabs: [TabInfo, ...TabInfo[]] = [
    {
      title: "Characters",
      tabContent: <Users />,
      headerAction: <AddCharacterButton />,
      panelContent: (
        <WorldCharacterList onItemClick={props.dialogState?.hide} />
      ),
    },
    {
      title: "Dice Rolls",
      tabContent: <Dices />,
      panelContent: "dice rolls",
    },
    {
      title: "Clocks",
      tabContent: <Clock />,
      panelContent: "clocks",
    },
    {
      title: "Gallery",
      tabContent: <Image />,
      panelContent: "gallery",
    },
    {
      title: "World Details",
      tabContent: <Globe />,
      panelContent: "world details",
    },
    {
      title: "Players",
      tabContent: <Gamepad2 />,
      panelContent: "players",
    },
    {
      title: "Character Fields",
      tabContent: <List />,
      panelContent: "character fields",
    },
  ]

  const tabState = useTabState({ defaultSelectedId: tabs[0].title })

  return (
    <section className="flex h-full overflow-y-hidden" aria-label="World Menu">
      <nav className="flex flex-col bg-black">
        <TabList state={tabState} className="flex flex-col ">
          {tabs.map((tab) => (
            <Tab
              key={tab.title}
              title={tab.title}
              id={tab.title}
              className={buttonStyle({
                active: tab.title === tabState.activeId,
                borders: "left",
                rounding: "none",
                inactiveBorderColor: "transparent",
                background: "none",
              })}
            >
              {tab.tabContent}
            </Tab>
          ))}
        </TabList>
        <div className="flex-1" />
        {props.dialogState && (
          <DialogDismiss
            state={props.dialogState}
            className={buttonStyle({
              inactiveBorderColor: "transparent",
              background: "none",
            })}
            title="Close World Menu"
          >
            <SidebarClose className="s-6" />
          </DialogDismiss>
        )}
      </nav>
      <main className="flex-1">
        {tabs.map((tab) => (
          <TabPanel
            as="section"
            key={tab.title}
            state={tabState}
            id={tab.title}
            className="flex h-full min-h-0 flex-col"
          >
            <div className="flex items-center">
              <h2 className="flex-1 p-3 text-2xl font-light leading-tight">
                {tab.title}
              </h2>
              {tab.headerAction}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {tab.panelContent}
            </div>
          </TabPanel>
        ))}
      </main>
    </section>
  )
}

function WorldCharacterList(props: { onItemClick?: undefined | (() => void) }) {
  const world = useWorldState()
  const deletedCharacters = DeleteCharacterAction.useSubmissions()
  return (
    <nav aria-label="Characters" className="flex flex-col">
      {world.characters.map((character) => {
        const isDeleted = deletedCharacters.some(
          (submission) => submission.id === character.id,
        )
        return (
          <NavLink
            key={character.id}
            to={`characters/${character.id}`}
            className={clsx(
              buttonStyle({
                borders: "left",
                rounding: "none",
                active: character.id === world.currentCharacter?.id,
                justify: "start",
                size: 10,
                inactiveBorderColor: "transparent",
                background: "none",
              }),
              isDeleted && "pointer-events-none opacity-50",
            )}
            onClick={props.onItemClick}
            prefetch="intent"
          >
            {character.name} {isDeleted && <LoadingSpinner size={6} />}
          </NavLink>
        )
      })}
    </nav>
  )
}

function AddCharacterButton() {
  const world = useWorldState()
  const submit = addCharacter.useSubmit()
  const isSubmitting = addCharacter.useSubmissions().length > 0

  return (
    <button
      type="button"
      title="Add character"
      className={buttonStyle({
        background: "none",
        inactiveBorderColor: "transparent",
      })}
      disabled={isSubmitting}
      onClick={() => submit({ worldId: world.id })}
    >
      {isSubmitting ? <LoadingSpinner size={6} /> : <Plus />}
    </button>
  )
}

const addCharacter = serverAction(
  "add-character",
  async (input: { worldId: string }, request) => {
    const { sessionId } = (await getSession(request)) ?? raise(unauthorized())

    const user = await db.user.findUnique({
      where: { sessionId },
      select: {
        id: true,
        memberships: {
          where: { worldId: input.worldId },
        },
      },
    })

    if (!user?.memberships.length) {
      throw forbidden()
    }

    const character = await db.$transaction(async (tx) => {
      const count = await tx.character.count({
        where: { worldId: input.worldId },
      })
      return await db.character.create({
        data: {
          name: `New Character ${count + 1}`,
          worldId: input.worldId,
          ownerId: user.id,
        },
      })
    })

    await sendWorldPatch(input.worldId, {
      characters: {
        $append: [character],
      },
    })

    const { redirect } = await import("@remix-run/node")
    return redirect(`/worlds/${input.worldId}/characters/${character.id}`)
  },
)
