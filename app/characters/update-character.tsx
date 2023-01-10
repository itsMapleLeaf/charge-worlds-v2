import { findSessionUser } from "~/auth.server"
import { db } from "~/db.server"
import { forbidden, notFound, unauthorized } from "~/helpers/responses.server"
import { serverAction } from "~/server-actions"
import { sendWorldPatch, type WorldState } from "~/world-state"

export type UpdateCharacterData = Omit<
  Partial<WorldState["characters"][0]>,
  "id"
>

export const UpdateCharacterAction = serverAction(
  "update-character",
  async (input: { id: string; data: UpdateCharacterData }, request) => {
    const [user, character] = await Promise.all([
      findSessionUser(request),
      db.character.findUnique({
        where: { id: input.id },
      }),
    ])

    if (!user) throw unauthorized()
    if (!character) throw notFound()
    if (character.ownerId !== user.id) throw forbidden()

    await db.character.update({
      where: { id: input.id },
      data: input.data,
    })

    await sendWorldPatch(character.worldId, {
      characters: {
        $mergeWhere: {
          match: { id: input.id },
          properties: input.data,
        },
      },
    })

    const { redirect } = await import("@remix-run/node")
    return redirect(`/worlds/${character.worldId}/characters/${character.id}`)
  },
)
