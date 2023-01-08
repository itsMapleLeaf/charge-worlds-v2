import {
  createContext,
  createElement,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
} from "react"
import { labelStyle } from "~/ui/styles"

const Context = createContext<{ id?: string }>({})

export function Field(props: { children: ReactNode }) {
  const id = useId()
  return (
    <div className="grid gap-1">
      <Context.Provider value={{ id }}>{props.children}</Context.Provider>
    </div>
  )
}

Field.Label = function FieldLabel(
  props: LabelHTMLAttributes<HTMLLabelElement>,
) {
  const { id } = useContext(Context)
  return <label {...props} htmlFor={id} className={labelStyle()} />
}

Field.LabelText = function FieldLabel(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={labelStyle()} />
}

Field.Input = createFieldInput("input")
Field.TextArea = createFieldInput("textarea")
Field.Select = createFieldInput("select")

function createFieldInput<Tag extends keyof JSX.IntrinsicElements>(tag: Tag) {
  function FieldInput(props: ComponentPropsWithoutRef<Tag>) {
    const { id } = useContext(Context)
    return createElement(tag, { ...props, id })
  }
  FieldInput.displayName = `FieldInput(${tag})`
  return FieldInput
}
