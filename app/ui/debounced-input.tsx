import {
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
} from "react"
import TextArea from "react-expanding-textarea"
import { useDebouncedCallback } from "~/helpers/use-debounced-callback"

type DebouncedInputOptions<EventTarget extends { value: string }> = {
  debouncePeriod: number
  onChange?: ((event: ChangeEvent<EventTarget>) => void) | undefined
  onChangeValue: (value: string) => void
}

function useDebouncedInput<EventTarget extends { value: string }>(
  options: DebouncedInputOptions<EventTarget>,
) {
  const [tempValue, setTempValue] = useState<string>()

  const handleChangeDebounced = useDebouncedCallback(
    options.debouncePeriod,
    () => {
      if (tempValue) {
        options.onChangeValue(tempValue)
        setTempValue(undefined)
      }
    },
  )

  return {
    ...(tempValue !== undefined && { value: tempValue }),
    onChange: (event: ChangeEvent<EventTarget>) => {
      options.onChange?.(event)
      setTempValue(event.target.value)
      handleChangeDebounced()
    },
  }
}

export function DebouncedInput({
  debouncePeriod,
  onChange,
  onChangeValue,
  ...props
}: ComponentPropsWithoutRef<"input"> &
  DebouncedInputOptions<HTMLInputElement>) {
  return (
    <input
      {...props}
      {...useDebouncedInput({
        debouncePeriod,
        onChange,
        onChangeValue,
      })}
    />
  )
}

export function DebouncedTextArea({
  debouncePeriod,
  onChange,
  onChangeValue,
  ...props
}: ComponentPropsWithoutRef<typeof TextArea> &
  DebouncedInputOptions<HTMLTextAreaElement>) {
  return (
    <TextArea
      {...props}
      {...useDebouncedInput({
        debouncePeriod,
        onChange,
        onChangeValue,
      })}
    />
  )
}
