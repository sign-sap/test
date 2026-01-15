import "./globals.css"

export const metadata = {
  title: "Innovation Portal",
  description: "Innovation Portal MVP",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
