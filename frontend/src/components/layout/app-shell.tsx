"use client"

import { useState } from "react"

import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

type AppShellProps = {
    children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <div className="flex h-screen overflow-hidden bg-[#07080a] text-white">
            <div className="hidden md:block">
                <Sidebar
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((value) => !value)}
                />
            </div>

            <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <Topbar />

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}