"use client"

import {
    Activity,
    Brain,
    Bot,
    ChartNoAxesCombined,
    Database,
    FileText,
    FlaskConical,
    FolderKanban,
    Image,
    MessageSquare,
    Settings,
    Workflow,
    type LucideIcon,
} from "lucide-react"

const icons: Record<string, LucideIcon> = {
    activity: Activity,
    brain: Brain,
    bot: Bot,
    "chart-no-axes-combined": ChartNoAxesCombined,
    database: Database,
    "file-text": FileText,
    "flask-conical": FlaskConical,
    "folder-kanban": FolderKanban,
    image: Image,
    "message-square": MessageSquare,
    settings: Settings,
    workflow: Workflow,
}

type IconProps = {
    name: string
    size?: number
    strokeWidth?: number
    className?: string
}

export function Icon({
    name,
    size = 18,
    strokeWidth = 1.8,
    className,
}: IconProps) {
    const Component = icons[name]

    if (!Component) {
        return null
    }

    return (
        <Component
            size={size}
            strokeWidth={strokeWidth}
            className={className}
        />
    )
}