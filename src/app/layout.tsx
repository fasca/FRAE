import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AE Flight Radar',
  description: 'Radar de vol avec projection azimutale équidistante',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#030a14] text-[#c0d8f0] antialiased">
        {children}
      </body>
    </html>
  )
}
