'use client'

import { useActionState, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { signIn, signUp, type AuthState } from '@/app/(frontend)/actions'

const initialState: AuthState = {}

export function AuthForm({ initialMode }: { initialMode: 'signin' | 'signup' }) {
  const [tab, setTab] = useState<'signin' | 'signup'>(initialMode)
  const [loginState, loginAction, loginPending] = useActionState(signIn, initialState)
  const [signupState, signupAction, signupPending] = useActionState(signUp, initialState)

  return (
    <Tabs
      className="auth-tabs"
      onValueChange={(value) => setTab(value as 'signin' | 'signup')}
      value={tab}
    >
      <TabsList className="auth-tabs-list" variant="line">
        <TabsTrigger value="signin">Sign in</TabsTrigger>
        <TabsTrigger value="signup">Create account</TabsTrigger>
      </TabsList>

      <TabsContent value="signin">
        <form action={loginAction} className="auth-form">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="signin-email">Email</FieldLabel>
              <Input
                autoComplete="email"
                defaultValue={loginState?.email ?? ''}
                id="signin-email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="signin-password">Password</FieldLabel>
              <Input
                autoComplete="current-password"
                id="signin-password"
                name="password"
                required
                type="password"
              />
            </Field>

            {loginState?.error && (
              <Alert variant="destructive">
                <AlertDescription>{loginState.error}</AlertDescription>
              </Alert>
            )}

            <Button disabled={loginPending} size="lg" type="submit">
              {loginPending ? (
                <>
                  <Spinner />
                  Signing in
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </FieldGroup>
        </form>
      </TabsContent>

      <TabsContent value="signup">
        <form action={signupAction} className="auth-form">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="signup-name">Name on the roll</FieldLabel>
              <Input
                autoComplete="name"
                defaultValue={signupState?.name ?? ''}
                id="signup-name"
                name="name"
                placeholder="Your name"
                required
                type="text"
              />
              <FieldDescription>This is the name on your dashboard and roll call.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="signup-email">Email</FieldLabel>
              <Input
                autoComplete="email"
                defaultValue={signupState?.email ?? ''}
                id="signup-email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="signup-password">Password</FieldLabel>
              <Input
                autoComplete="new-password"
                id="signup-password"
                minLength={8}
                name="password"
                required
                type="password"
              />
              <FieldDescription>Use at least 8 characters.</FieldDescription>
            </Field>

            {signupState?.error && (
              <Alert variant="destructive">
                <AlertDescription>{signupState.error}</AlertDescription>
              </Alert>
            )}

            <Button disabled={signupPending} size="lg" type="submit">
              {signupPending ? (
                <>
                  <Spinner />
                  Creating your roll
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </FieldGroup>
        </form>
      </TabsContent>
    </Tabs>
  )
}
