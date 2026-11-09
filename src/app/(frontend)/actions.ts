'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { generatePayloadCookie } from 'payload/shared'
import config from '@payload-config'

export type AuthState = {
  error?: string
  name?: string
  email?: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

async function setAuthCookie(payload: Awaited<ReturnType<typeof getPayload>>, token: string) {
  const authCookie = generatePayloadCookie({
    collectionAuthConfig: payload.collections.users.config.auth,
    cookiePrefix: payload.config.cookiePrefix,
    returnCookieAsObject: true,
    token,
  })

  const cookieStore = await cookies()
  cookieStore.set({
    name: authCookie.name,
    value: authCookie.value ?? '',
    httpOnly: authCookie.httpOnly,
    sameSite: authCookie.sameSite?.toLowerCase() as 'lax' | 'none' | 'strict' | undefined,
    secure: authCookie.secure,
    path: authCookie.path,
    domain: authCookie.domain,
    maxAge: authCookie.maxAge,
    expires: authCookie.expires ? new Date(authCookie.expires) : undefined,
  })
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const email = readText(formData, 'email').toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!emailPattern.test(email) || !password) {
    return { email, error: 'Enter the email and password you used to create your account.' }
  }

  let payload
  try {
    payload = await getPayload({ config })
  } catch {
    return { email, error: 'The desk cannot reach the database. Try again in a moment.' }
  }

  try {
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    if (!result.token) {
      return { email, error: 'That email and password do not match. Try again.' }
    }

    await setAuthCookie(payload, result.token)
  } catch {
    return { email, error: 'That email and password do not match. Try again.' }
  }

  redirect('/dashboard')
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const name = readText(formData, 'name')
  const email = readText(formData, 'email').toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (name.length < 2) {
    return { name, email, error: 'Add the name you want on the roll call.' }
  }

  if (!emailPattern.test(email)) {
    return { name, email, error: 'Enter a valid email address.' }
  }

  if (password.length < 8) {
    return { name, email, error: 'Use at least 8 characters for your password.' }
  }

  let payload
  try {
    payload = await getPayload({ config })
  } catch {
    return { name, email, error: 'The desk cannot reach the database. Try again in a moment.' }
  }

  try {
    await payload.create({
      collection: 'users',
      data: { name, email, password, role: 'student' },
      context: { publicSignup: true },
      overrideAccess: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/already|unique|exists/i.test(message)) {
      return { name, email, error: 'That email is already on the roll. Sign in instead.' }
    }

    return { name, email, error: 'We could not create that account. Try again.' }
  }

  try {
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    if (result.token) {
      await setAuthCookie(payload, result.token)
    }
  } catch {
    return { name, email, error: 'Your account was created. Sign in to take your seat.' }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const cookieStore = await cookies()
  const prefix = process.env.PAYLOAD_COOKIE_PREFIX || 'payload'

  cookieStore.delete(`${prefix}-token`)
  redirect('/')
}
