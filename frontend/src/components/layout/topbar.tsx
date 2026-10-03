"use client"

import {
    Bell,
    Command,
    Search,
} from "lucide-react"

export function Topbar() {
    return (
        <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#090a0d]/70 px-5 backdrop-blur-xl lg:px-7">
            <button
                type="button"
                className="flex h-10 min-w-0 max-w-[430px] flex-1 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
                <Search size={17} className="shrink-0 text-white/30" />

                <span className="truncate text-xs text-white/30">
                    Search your workspace...
                </span>

                <span className="ml-auto hidden items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.035] px-1.5 py-1 text-[9px] text-white/25 sm:flex">
                    <Command size={10} />
                    K
                </span>
            </button>

            <div className="ml-4 flex items-center gap-2">
                <button
                    type="button"
                    aria-label="Notifications"
                    className="relative flex size-10 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/80"
                >
                    <Bell size={18} />

                    <span className="absolute right-[9px] top-[8px] size-1.5 rounded-full bg-violet-400" />
                </button>

                <div className="ml-1 size-9 rounded-full border border-white/10 bg-gradient-to-br from-violet-400/30 via-blue-400/10 to-white/5 p-[1px]">
                    <div className="flex size-full items-center justify-center rounded-full bg-[#111216] text-[11px] font-semibold text-white/70">
                        AI
                    </div>
                </div>
            </div>
        </header>
    )
}