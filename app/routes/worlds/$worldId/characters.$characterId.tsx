import { useParams } from "@remix-run/react"
import clsx from "clsx"
import { ImagePlus, Trash } from "lucide-react"
import { type ComponentPropsWithoutRef } from "react"
import { DeleteCharacterButton } from "~/characters/delete-character"
import {
  UpdateCharacterAction,
  type UpdateCharacterData,
} from "~/characters/update-character"
import { ClockInput } from "~/ui/clock-input"
import { DebouncedInput, DebouncedTextArea } from "~/ui/debounced-input"
import { EmptyState } from "~/ui/empty-state"
import { createFieldInput, Field, FieldLabel, FieldLabelText } from "~/ui/field"
import { NotFoundMessage } from "~/ui/not-found-message"
import { buttonStyle, inputStyle, panelStyle } from "~/ui/styles"
import { useWorldState } from "~/world-state"

const DebouncedFieldInput = createFieldInput(
  "DebouncedFieldInput",
  (props: ComponentPropsWithoutRef<typeof DebouncedInput>) => (
    <DebouncedInput {...props} />
  ),
)

const DebouncedFieldTextArea = createFieldInput(
  "DebouncedFieldTextArea",
  (props: ComponentPropsWithoutRef<typeof DebouncedTextArea>) => (
    <DebouncedTextArea {...props} />
  ),
)

export default function CharacterPage() {
  const world = useWorldState()
  const { characterId } = useParams()
  const updateCharacterFetcher = UpdateCharacterAction.useFetcher()

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

  const updateCharacter = (data: UpdateCharacterData) => {
    updateCharacterFetcher.submit({ id: character.id, data })
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
              <DebouncedFieldInput
                className={inputStyle()}
                placeholder="What should we call you?"
                value={character.name}
                onChangeValue={(name) => updateCharacter({ name })}
                debouncePeriod={500}
              />
            </Field>
            <Field>
              <FieldLabel>Reference Image</FieldLabel>
              <DebouncedFieldInput
                className={inputStyle()}
                type="url"
                placeholder="https://web.site/image.png"
                value={character.imageUrl ?? ""}
                onChangeValue={(imageUrl) => updateCharacter({ imageUrl })}
                debouncePeriod={500}
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
                <ClockInput
                  value={character.stress}
                  max={4}
                  onChange={(stress) => {
                    updateCharacter({ stress })
                  }}
                />
              </div>
            </section>
            <Field>
              <FieldLabel>Condition</FieldLabel>
              <DebouncedFieldTextArea
                className={inputStyle()}
                placeholder="How are you doing?"
                value={character.condition}
                onChangeValue={(condition) => updateCharacter({ condition })}
                debouncePeriod={500}
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
