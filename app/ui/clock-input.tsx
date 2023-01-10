import { useEffect, useRef, useState } from "react"
import { raise } from "~/helpers/errors"
import { type Nullish } from "~/helpers/types"

const fullTurn = Math.PI * 2
const quarterTurn = Math.PI * 0.5

export function ClockInput(props: {
  value: number
  max: number
  onChange?: (value: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvas, canvasRef] = useState<HTMLCanvasElement | null>()
  const rect = useRect(containerRef)
  const [previewValue, setPreviewValue] = useState<number>()

  useEffect(() => {
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    const lineWidth = 2
    const radius = canvas.width / 2 - lineWidth / 2

    context.clearRect(0, 0, canvas.width, canvas.height)

    context.save()

    context.lineWidth = lineWidth
    context.strokeStyle = context.fillStyle = getComputedStyle(canvas).color

    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate(-quarterTurn)

    context.save()
    context.globalAlpha = 0.5

    context.beginPath()
    context.moveTo(0, 0)
    context.arc(0, 0, radius, 0, (props.value / props.max) * fullTurn)
    context.lineTo(0, 0)
    context.fill()

    if (previewValue !== undefined && props.onChange) {
      context.beginPath()
      context.moveTo(0, 0)
      context.arc(0, 0, radius, 0, (previewValue / props.max) * fullTurn)
      context.lineTo(0, 0)
      context.fill()
    }

    context.restore()

    for (let i = 0; i < props.max; i++) {
      const angle = (i / props.max) * fullTurn
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      context.beginPath()
      context.moveTo(0, 0)
      context.lineTo(x, y)
      context.stroke()
    }

    context.beginPath()
    context.arc(0, 0, radius, 0, fullTurn)
    context.stroke()

    context.restore()
  })

  return (
    <div className="relative aspect-square opacity-60" ref={containerRef}>
      {rect && (
        <canvas
          className="absolute inset-0"
          width={rect.width}
          height={rect.height}
          ref={canvasRef}
          onPointerMove={(event) => {
            const { offsetX, offsetY } = event.nativeEvent

            const angle = Math.atan2(
              // swap x and y to get angle starting from the top
              offsetX - event.currentTarget.clientWidth / 2,
              offsetY - event.currentTarget.clientHeight / 2,
            )

            const progress = 1 - (angle + Math.PI) / (Math.PI * 2)

            setPreviewValue(Math.ceil(progress * props.max))
          }}
          onPointerLeave={() => setPreviewValue(undefined)}
        />
      )}
    </div>
  )
}

function useRect(
  ref: Nullish<Element> | { readonly current: Nullish<Element> },
) {
  const [rect, setRect] = useState<DOMRectReadOnly>()

  useEffect(() => {
    const element = ref instanceof Element ? ref : ref?.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) =>
      setRect(entry?.contentRect ?? raise("ResizeObserver has no entry")),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return rect
}
