import './globals.css'
import type { Metadata } from 'next'
import { Coiny } from 'next/font/google'

const coiny = Coiny({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-coiny'
})

export const metadata: Metadata = {
  title: 'MathCraft',
  description: 'Explore one mine at a time.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={coiny.variable}>
      <body>
        {children}
      </body>
    </html>
  )
}
