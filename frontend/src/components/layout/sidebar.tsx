"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Sparkles,
    UserRound,
} from "lucide-react"

import { navigationSections } from "@/config/navigation"
import { appConfig } from "@/config/app"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/icon"

type SidebarProps = {
    collapsed: boolean
    onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const pathname = usePathname()

    return (
        <aside
            className={cn(
                "relative flex h-screen shrink-0 flex-col border-r border-white/[0.07] bg-[#090a0d]/95 backdrop-blur-xl transition-[width] duration-300",
                collapsed ? "w-[78px]" : "w-[260px]"
            )}
        >
            <div className="flex h-[76px] items-center border-b border-white/[0.06] px-4">
                <Link
                    href="/"
                    className={cn(
                        "group flex items-center gap-3 overflow-hidden",
                        collapsed && "mx-auto"
                    )}
                >
                    <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] shadow-[0_0_30px_rgba(139,92,246,0.12)]">
                        <Sparkles
                            size={18}
                            className="text-violet-300 transition-transform duration-300 group-hover:rotate-12"
                        />
                    </div>

                    {!collapsed && (
                        <div className="flex flex-col">
                            <span className="text-[15px] font-semibold tracking-tight text-white">
                                {appConfig.name}
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                                Intelligence
                            </span>
                        </div>
                    )}
                </Link>
            </div>

            <div className="px-3 pt-5">
                <Link
                    href="/chat"
                    className={cn(
                        "flex h-11 items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 text-sm font-medium text-white/80 transition-all hover:border-violet-400/20 hover:bg-white/[0.07] hover:text-white",
                        collapsed && "justify-center px-0"
                    )}
                >
                    <Plus size={18} strokeWidth={2} />

                    {!collapsed && "New chat"}
                </Link>
            </div>

            <nav className="scrollbar-none flex-1 overflow-y-auto px-3 py-6">
                <div className="space-y-7">
                    {navigationSections.map((section) => (
                        <section key={section.id}>
                            {!collapsed && (
                                <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
                                    {section.label}
                                </div>
                            )}

                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const active =
                                        pathname === item.href ||
                                        (item.href !== "/" &&
                                            pathname.startsWith(`${item.href}/`))

                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            title={collapsed ? item.label : undefined}
                                            className={cn(
                                                "group flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all",
                                                collapsed && "justify-center px-0",
                                                active
                                                    ? "border border-violet-400/10 bg-violet-400/[0.09] text-white shadow-[inset_0_0_20px_rgba(139,92,246,0.04)]"
                                                    : "text-white/42 hover:bg-white/[0.035] hover:text-white/80"
                                            )}
                                        >
                                            <Icon
                                                name={item.icon}
                                                size={17}
                                                className={cn(
                                                    "shrink-0 transition-colors",
                                                    active
                                                        ? "text-violet-300"
                                                        : "text-white/35 group-hover:text-white/65"
                                                )}
                                            />

                                            {!collapsed && (
                                                <>
                                                    <span className="truncate">
                                                        {item.label}
                                                    </span>

                                                    {item.badge && (
                                                        <span className="ml-auto rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/35">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </Link>
                                    )
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            </nav>

            <div className="border-t border-white/[0.06] p-3">
                <button
                    type="button"
                    className={cn(
                        "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/[0.04]",
                        collapsed && "justify-center"
                    )}
                >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-violet-400/20 to-blue-400/10">
                        <UserRound size={15} className="text-white/65" />
                    </div>

                    {!collapsed && (
                        <div className="min-w-0">
                            <div className="truncate text-xs font-medium text-white/80">
                                Your account
                            </div>
                            <div className="truncate text-[10px] text-white/30">
                                Personal workspace
                            </div>
                        </div>
                    )}
                </button>

                <button
                    type="button"
                    onClick={onToggle}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    className="absolute -right-3 top-[92px] flex size-6 items-center justify-center rounded-full border border-white/10 bg-[#111216] text-white/45 shadow-lg transition-colors hover:text-white"
                >
                    {collapsed ? (
                        <ChevronRight size={13} />
                    ) : (
                        <ChevronLeft size={13} />
                    )}
                </button>
            </div>
        </aside>
    )
}
