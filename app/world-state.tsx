import { useParams } from "@remix-run/react"
import type PusherClient from "pusher-js"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { UpdateCharacterAction } from "./characters/update-character"
import { db } from "./db.server"
import { raise } from "./helpers/errors"
import { notFound } from "./helpers/responses.server"
import { applyPatch, type Patch } from "./patch"
import { usePusher } from "./pusher-context"
import { pusher } from "./pusher.server"

export type WorldState = Awaited<ReturnType<typeof loadWorldState>>

export async function loadWorldState(
  worldId: string,
  user: { discordId: string } | undefined,
) {
  let membership
  if (user) {
    membership = await db.membership.findUnique({
      where: {
        worldId_userDiscordId: { worldId, userDiscordId: user.discordId },
      },
    })
  }

  const isAdmin = membership?.role === "OWNER"

  const world = await db.world.findUnique({
    where: { id: worldId },
    select: {
      id: true,
      name: true,
      characters: {
        where: isAdmin ? {} : { hidden: true },
        select: {
          id: true,
          name: true,
          condition: true,
          imageUrl: true,
          stress: true,
        },
      },
    },
  })

  if (!world) {
    throw notFound()
  }

  return world
}

const worldChannel = (worldId: string) => {
  const channel = `world-${worldId}`
  return {
    async sendPatch(patch: Patch<WorldState>) {
      try {
        const response = await pusher.trigger(channel, "patch", patch)
        if (response.status !== 200) {
          console.error(
            "Pusher response error",
            response.status,
            response.statusText,
          )
        }
      } catch (error) {
        console.error("Pusher error", error)
      }
    },

    onPatch(
      client: PusherClient,
      callback: (patch: Patch<WorldState>) => void,
    ) {
      const subscription = client.subscribe(channel)
      subscription.bind("patch", callback)
      return () => {
        subscription.unsubscribe()
      }
    },
  }
}

export function sendWorldPatch(worldId: string, patch: Patch<WorldState>) {
  return worldChannel(worldId).sendPatch(patch)
}

function useWorldStateProvider(options: { initialState: WorldState }) {
  const [state, setState] = useState(options.initialState)
  const pusher = usePusher()
  const params = useParams()
  const updatingCharacters = UpdateCharacterAction.useSubmissions()

  useEffect(() => {
    if (!pusher) return
    return worldChannel(params.worldId!).onPatch(pusher, (patch) => {
      setState((state) => applyPatch(state, patch))
    })
  }, [pusher, params.worldId])

  return useMemo(() => {
    const updatingCharactersById = new Map(
      updatingCharacters.map((character) => [character.id, character.data]),
    )

    const characters = state.characters.map((character) => {
      const updateData = updatingCharactersById.get(character.id)
      return updateData ? { ...character, ...updateData } : character
    })

    const currentCharacter = params.characterId
      ? characters.find((character) => character.id === params.characterId)
      : characters[0]

    return {
      ...state,
      characters,
      currentCharacter,
    }
  }, [params.characterId, state, updatingCharacters])
}

const Context = createContext<
  ReturnType<typeof useWorldStateProvider> | undefined
>(undefined)

export function WorldStateProvider({
  children,
  ...options
}: Parameters<typeof useWorldStateProvider>[0] & {
  children: React.ReactNode
}) {
  return (
    <Context.Provider value={useWorldStateProvider(options)}>
      {children}
    </Context.Provider>
  )
}

export function useWorldState() {
  return useContext(Context) ?? raise("WorldStateProvider not found")
}
