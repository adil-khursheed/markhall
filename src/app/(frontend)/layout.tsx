import React from 'react'
import { Oswald } from 'next/font/google'
import './globals.css'

const condensed = Oswald({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-condensed-loaded',
  weight: ['400', '500', '600', '700'],
})

export const metadata = {
  description:
    'Markhall is a Class 9–10 revision desk for all boards: practise chapters, take sample tests, and track syllabus coverage.',
  title: 'Markhall · Every chapter has a seat',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html className={condensed.variable} lang="en">
      <body>{children}</body>
    </html>
  )
}
