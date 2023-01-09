import { useParams } from "@remix-run/react"
import clsx from "clsx"
import { ImagePlus, Trash } from "lucide-react"
import { DeleteCharacterButton } from "~/characters/delete-character"
import { ClockInput } from "~/ui/clock-input"
import { EmptyState } from "~/ui/empty-state"
import { Field, FieldInput, FieldLabel, FieldLabelText } from "~/ui/field"
import { NotFoundMessage } from "~/ui/not-found-message"
import { buttonStyle, inputStyle, panelStyle } from "~/ui/styles"
import { useWorldState } from "~/world-state"

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
