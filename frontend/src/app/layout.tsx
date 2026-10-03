import type { Metadata } from "next"
import "./globals.css"

import { appConfig } from "@/config/app"

export const metadata: Metadata = {
    title: appConfig.name,
    description: appConfig.description,
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}