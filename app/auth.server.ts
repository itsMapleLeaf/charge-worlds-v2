import { createCookieSessionStorage } from "@remix-run/node"
import { randomUUID } from "crypto"
import { Authenticator, type AuthenticateOptions } from "remix-auth"
import { DiscordStrategy } from "remix-auth-discord"
import { db } from "./db.server"
import { env } from "./env.server"

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: [env.COOKIE_SECRET],
    secure: env.NODE_ENV === "production",
  },
})

type Session = {
  sessionId: string
}

const authenticator = new Authenticator<Session>(sessionStorage)

const discordStrategy = "discord"

authenticator.use(
  new DiscordStrategy(
    {
      clientID: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      callbackURL: env.DISCORD_REDIRECT_URI,
    },
    async ({ profile }) => {
      const sessionId = randomUUID()

      const avatarId = profile.photos?.[0].value

      const data = {
        discordId: profile.id,
        name: profile.displayName,
        avatarUrl: avatarId
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${avatarId}.png`
          : null,
        sessionId,
      }

      await db.user.upsert({
        where: { discordId: profile.id },
        update: data,
        create: data,
      })

      return { sessionId }
    },
  ),
  discordStrategy,
)

export function authenticateWithDiscord(
  request: Request,
  options?: Partial<AuthenticateOptions>,
) {
  return authenticator.authenticate(discordStrategy, request, options)
}

export async function getSession(request: Request) {
  const session = await authenticator.isAuthenticated(request)
  return session ?? undefined
}

export function logout(request: Request) {
  return authenticator.logout(request, { redirectTo: "/" })
}

export async function findSessionUser(request: Request) {
  const session = await getSession(request)

  const user =
    session &&
    (await db.user.findUnique({ where: { sessionId: session.sessionId } }))

  return user ?? undefined
}
