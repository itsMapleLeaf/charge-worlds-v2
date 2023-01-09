import {
  createContext,
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

export function FieldLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  const { id } = useContext(Context)
  return <label {...props} htmlFor={id} className={labelStyle()} />
}

export function FieldLabelText(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={labelStyle()} />
}

export const FieldInput = createFieldInput(
  "FieldInput",
  (props: ComponentPropsWithoutRef<"input">) => <input {...props} />,
)
export const FieldTextArea = createFieldInput(
  "FieldTextArea",
  (props: ComponentPropsWithoutRef<"textarea">) => <textarea {...props} />,
)
export const FieldSelect = createFieldInput(
  "FieldSelect",
  (props: ComponentPropsWithoutRef<"select">) => <select {...props} />,
)

function createFieldInput<Props>(
  name: string,
  render: (props: Props & { id?: string | undefined }) => ReactNode,
) {
  function FieldInput(props: Props) {
    const { id } = useContext(Context)
    return <>{render({ ...props, id })}</>
  }

  FieldInput.displayName = `FieldInput(${name})`

  return FieldInput
}
