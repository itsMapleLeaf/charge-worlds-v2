import type { ActionArgs, TypedResponse } from "@remix-run/node"
import * as RemixReact from "@remix-run/react"
import type { ComponentProps } from "react"
import { useMemo } from "react"
import type * as z from "zod"
import type { ZodRawShape, ZodType } from "zod"
import { ZodEffects, ZodObject, ZodString } from "zod"
import { autoRef } from "./react"

type OnlyString<T> = T extends string ? T : never
type Merge<A, B> = Omit<A, keyof B> & B

export class ActionRouter<Context> {
  private readonly routes: Array<ActionRoute<Context>> = []

  route<FormInput extends Record<string, string>, FormParsed, Output>(
    name: string,
    config: {
      input?: z.ZodType<FormParsed, z.ZodTypeDef, FormInput>
      callback: (input: FormParsed, context: Context) => Promise<Output>
    },
  ) {
    const route = new ActionRoute(name, config)
    this.routes.push(route as any)
    return route
  }

  async handle(
    args: ActionArgs,
    context: Context,
    redirectTo?: string,
  ): Promise<TypedResponse<unknown>> {
    for (const route of this.routes) {
      const response = await route.handle(args, context, redirectTo)
      if (response) return response
    }
    return new Response(undefined, { status: 404 })
  }
}

export class ActionRoute<
  Context = unknown,
  FormInput extends Record<string, string> = Record<string, string>,
  FormParsed = unknown,
  Output = unknown,
> {
  readonly __fieldNames!: OnlyString<keyof FormInput>

  constructor(
    readonly name: string,
    readonly config: {
      input?: z.ZodType<FormParsed, z.ZodTypeDef, FormInput>
      callback: (input: FormParsed, context: Context) => Promise<Output>
    },
  ) {}

  async handle(
    args: ActionArgs,
    context: Context,
    redirectTo: string | undefined,
  ): Promise<TypedResponse<ActionRouteData<Output>> | undefined> {
    const { json, redirect } = await import("@remix-run/node")

    const { actionName, ...body } = Object.fromEntries(
      await args.request.clone().formData(),
    )
    if (actionName !== this.name) return

    const inputResult = this.config.input?.safeParse(body)
    if (inputResult && !inputResult.success) {
      const { formErrors, fieldErrors } = inputResult.error.formErrors
      return json(
        { __actionName: this.name, errors: formErrors, fieldErrors },
        400,
      )
    }

    const data = await this.config.callback(inputResult?.data as any, context)
    if (redirectTo === undefined) {
      return json({ __actionName: this.name, data })
    }

    return redirect(redirectTo)
  }
}

type ActionRouteData<Data> = {
  __actionName: string
  errors?: string[]
  fieldErrors?: Record<string, string[]>
  data?: Data
}

export function useActionUi<FormInput extends Record<string, string>, Data>(
  route: ActionRoute<any, FormInput, any, Data>,
  actionData: ActionRouteData<unknown> | undefined,
) {
  const Form = useMemo(() => {
    return autoRef(function Form({
      children,
      ...props
    }: Partial<RemixReact.FormProps>) {
      return (
        <RemixReact.Form method="post" {...props}>
          <input type="hidden" name="actionName" value={route.name} />
          {children}
        </RemixReact.Form>
      )
    })
  }, [route.name])

  const Input = useMemo(() => {
    return autoRef(
      (
        props: Merge<
          ComponentProps<"input">,
          { name: OnlyString<keyof FormInput> }
        >,
      ) => {
        const baseProps: {
          type: string
          name: string
          minLength?: number
          maxLength?: number
          required?: boolean
        } = {
          type: "text",
          name: props.name,
        }

        const zodObject =
          route.config.input && extractZodObject(route.config.input)
        const fieldSchema = zodObject?.shape[props.name]
        const zodString = fieldSchema && extractZodString(fieldSchema)

        if (zodString) {
          if (zodString.isEmail) baseProps.type = "email"
          if (zodString.isURL) baseProps.type = "url"
          baseProps.minLength = zodString.minLength ?? undefined
          baseProps.maxLength = zodString.maxLength ?? undefined
          baseProps.required = !fieldSchema.isOptional()
        }

        return <input {...baseProps} {...props} />
      },
    )
  }, [route.config.input])

  const HiddenInput = useMemo(() => {
    return autoRef(function HiddenInput(
      props: Merge<
        ComponentProps<"input">,
        {
          name: OnlyString<keyof FormInput>
          value: string | number | readonly string[]
        }
      >,
    ) {
      return <input type="hidden" {...props} />
    })
  }, [])

  return {
    Form,
    Input,
    HiddenInput,
    data:
      actionData?.__actionName === route.name
        ? (actionData as Data)
        : undefined,
    errors:
      actionData?.__actionName === route.name ? actionData.errors : undefined,
    fieldErrors:
      actionData?.__actionName === route.name
        ? (actionData.fieldErrors as Record<
            OnlyString<keyof FormInput>,
            string[]
          >)
        : undefined,
  }
}

function extractZodString(schema: ZodType): ZodString | undefined {
  if (schema instanceof ZodString) return schema
  if (schema instanceof ZodEffects) return extractZodString(schema.innerType())
  return undefined
}

function extractZodObject(schema: ZodType): ZodObject<ZodRawShape> | undefined {
  if (schema instanceof ZodObject) return schema
  if (schema instanceof ZodEffects) return extractZodObject(schema.innerType())
  return undefined
}
