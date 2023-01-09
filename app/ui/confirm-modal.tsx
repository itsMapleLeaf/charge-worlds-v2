import {
  Dialog,
  DialogDescription,
  DialogDismiss,
  DialogHeading,
  useDialogState,
} from "ariakit"
import clsx from "clsx"
import { Check, X } from "lucide-react"
import { type ReactNode } from "react"
import { buttonStyle, panelStyle } from "~/ui/styles"

export function ConfirmModal({
  title,
  body,
  confirmText,
  confirmIcon = <Check />,
  cancelText = "Never Mind",
  onConfirm,
  children,
}: {
  title: ReactNode
  body: ReactNode
  confirmText: ReactNode
  confirmIcon?: ReactNode
  cancelText?: ReactNode
  onConfirm: () => void
  children: (show: () => void) => ReactNode
}) {
  const dialog = useDialogState({ animated: true })

  return (
    <>
      {children(dialog.show)}
      <Dialog
        state={dialog}
        backdropProps={{
          className: clsx(
            "flex h-full flex-col bg-black/50 p-4 backdrop-blur transition-opacity data-[enter]:opacity-100 data-[leave]:opacity-0",
          ),
        }}
        className={clsx(
          panelStyle(),
          "m-auto flex flex-col gap-4 overflow-y-auto p-4 text-center transition-transform data-[enter]:scale-100 data-[leave]:scale-95",
        )}
      >
        <DialogHeading as="h2" className="text-2xl font-light">
          {title}
        </DialogHeading>
        <DialogDescription as="p">{body}</DialogDescription>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <DialogDismiss className={buttonStyle()}>
            <X /> {cancelText}
          </DialogDismiss>
          <button
            className={buttonStyle()}
            onClick={() => {
              onConfirm()
              dialog.hide()
            }}
          >
            {confirmIcon}
            {confirmText}
          </button>
        </div>
      </Dialog>
    </>
  )
}
