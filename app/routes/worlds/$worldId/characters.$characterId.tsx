import { useParams } from "@remix-run/react"
import clsx from "clsx"
import { ImagePlus, Trash } from "lucide-react"
import { type ReactNode } from "react"
import { getSession } from "~/auth.server"
import { db } from "~/db.server"
import { raise } from "~/helpers/errors"
import { forbidden, notFound, unauthorized } from "~/helpers/responses.server"
import { serverAction } from "~/server-actions"
import { ClockInput } from "~/ui/clock-input"
import { ConfirmModal } from "~/ui/confirm-modal"
import { EmptyState } from "~/ui/empty-state"
import { Field, FieldInput, FieldLabel, FieldLabelText } from "~/ui/field"
import { LoadingSpinner } from "~/ui/loading"
import { NotFoundMessage } from "~/ui/not-found-message"
import { buttonStyle, inputStyle, panelStyle } from "~/ui/styles"
import { sendWorldPatch, useWorldState } from "~/world-state"

export default function CharacterPage() {
  const world = useWorldState()
  const { characterId } = useParams()

  if (!world.characters.length) {
    return (
      <EmptyState>
        <p>No characters found</p>
      </EmptyState>
    )
  }

  const character = characterId
    ? world.characters.find((character) => character.id === characterId)
    : world.characters[0]

  if (!character) {
    return <NotFoundMessage />
  }

  return (
    <div className={panelStyle()}>
      <div className="flex flex-col gap-4 p-4">
        <section
          aria-label="Overview"
          className="flex flex-wrap gap-4 [&>*]:flex-1 [&>*]:basis-52"
        >
          <div
            className={clsx(
              panelStyle(),
              "flex min-h-[16rem] flex-col items-center justify-center gap-2",
            )}
          >
            {character.imageUrl ? (
              <img
                src={character.imageUrl}
                alt=""
                className="block h-64 w-full rounded-lg border-white/10 bg-white/10"
              />
            ) : (
              <>
                <ImagePlus className="opacity-50 s-16" />
                <p className="text-lg font-light">Add a reference image</p>
              </>
            )}
          </div>

          <div className="flex flex-col justify-between gap-4">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <FieldInput
                className={inputStyle()}
                placeholder="What should we call you?"
                defaultValue={character.name}
              />
            </Field>
            <Field>
              <FieldLabel>Reference Image</FieldLabel>
              <FieldInput
                className={inputStyle()}
                type="url"
                placeholder="https://web.site/image.png"
                defaultValue={character.imageUrl ?? ""}
              />
            </Field>
            <Field>
              <FieldLabelText>Momentum</FieldLabelText>
              <div className={inputStyle({ interactive: false })}>
                (momentum counter)
              </div>
            </Field>
          </div>

          <div className="flex flex-col gap-4">
            <section
              className={clsx(
                panelStyle(),
                "flex flex-1 flex-col items-center justify-center gap-2 p-2 text-center",
              )}
            >
              <h3 className="text-xl font-light leading-none">Stress</h3>
              <div className="mx-auto w-full max-w-24">
                <ClockInput value={2} max={4} onChange={() => {}} />
              </div>
            </section>
            <Field>
              <FieldLabel>Condition</FieldLabel>
              <FieldInput
                className={inputStyle()}
                placeholder="How are you doing?"
                defaultValue={character.condition}
              />
            </Field>
          </div>
        </section>
        <hr className="border-white/10" />
        <section aria-label="Stats">action levels</section>
        <hr className="border-white/10" />
        <section aria-label="Details">fields</section>
        <hr className="border-white/10" />
        <section aria-label="Actions" className="flex">
          <DeleteCharacterButton
            character={character}
            className={buttonStyle()}
          >
            <Trash /> Delete
          </DeleteCharacterButton>
        </section>
      </div>
    </div>
  )
}

function DeleteCharacterButton({
  character,
  children,
  className,
}: {
  character: { id: string; name: string }
  children: ReactNode
  className?: string
}) {
  const world = useWorldState()
  const fetcher = deleteCharacter.useFetcher()
  return (
    <ConfirmModal
      title="Delete Character"
      body={`Are you sure you want to delete ${character.name}?`}
      confirmText={`Delete ${character.name}`}
      confirmIcon={<Trash />}
      onConfirm={() => fetcher.submit({ id: character.id, worldId: world.id })}
    >
      {(show) => (
        <button
          name="id"
          value={character.id}
          className={className}
          disabled={fetcher.state !== "idle"}
          onClick={show}
        >
          {children}
          {fetcher.state !== "idle" && <LoadingSpinner size={6} />}
        </button>
      )}
    </ConfirmModal>
  )
}

const deleteCharacter = serverAction(
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
