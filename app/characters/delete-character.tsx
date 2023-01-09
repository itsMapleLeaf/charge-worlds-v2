import { Trash } from "lucide-react"
import { type ReactNode } from "react"
import { getSession } from "~/auth.server"
import { db } from "~/db.server"
import { raise } from "~/helpers/errors"
import { forbidden, notFound, unauthorized } from "~/helpers/responses.server"
import { serverAction } from "~/server-actions"
import { ConfirmModal } from "~/ui/confirm-modal"
import { sendWorldPatch, useWorldState } from "~/world-state"

export function DeleteCharacterButton({
  character,
  children,
  className,
}: {
  character: { id: string; name: string }
  children: ReactNode
  className?: string
}) {
  const world = useWorldState()
  const submit = DeleteCharacterAction.useSubmit()
  return (
    <ConfirmModal
      title="Delete Character"
      body={`Are you sure you want to delete ${character.name}?`}
      confirmText={`Delete ${character.name}`}
      confirmIcon={<Trash />}
      onConfirm={() => {
        submit({ id: character.id, worldId: world.id })
      }}
    >
      {(show) => (
        <button
          name="id"
          value={character.id}
          className={className}
          onClick={show}
        >
          {children}
        </button>
      )}
    </ConfirmModal>
  )
}

export const DeleteCharacterAction = serverAction(
  "delete-character",
  async (input: { id: string; worldId: string }, request) => {
    const { sessionId } = (await getSession(request)) ?? raise(unauthorized())

    const [user, character] = await Promise.all([
      db.user.findUnique({
        where: { sessionId },
        select: {
          id: true,
          memberships: {
            where: { worldId: input.worldId },
          },
        },
      }),
      db.character.findUnique({
        where: { id: input.id },
        select: { ownerId: true },
      }),
    ])

    if (!character) {
      throw notFound()
    }

    const membership = user?.memberships[0]
    const canDelete =
      character.ownerId === user?.id || membership?.role === "OWNER"
    if (!canDelete) {
      throw forbidden()
    }

    await db.character.delete({ where: { id: input.id } })

    await sendWorldPatch(input.worldId, {
      characters: {
        $removeWhere: { id: input.id },
      },
    })

    const { redirect } = await import("@remix-run/node")
    return redirect(`/worlds/${input.worldId}`)
  },
)
