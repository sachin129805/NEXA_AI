import type { NavigationSection } from "@/types/navigation"

export const navigationSections: NavigationSection[] = [
    {
        id: "workspace",
        label: "Workspace",
        items: [
            {
                id: "chat",
                label: "Chat",
                href: "/chat",
                icon: "message-square",
            },
            {
                id: "projects",
                label: "Projects",
                href: "/projects",
                icon: "folder-kanban",
            },
            {
                id: "knowledge",
                label: "Knowledge",
                href: "/knowledge",
                icon: "database",
            },
            {
                id: "images",
                label: "Image Studio",
                href: "/images",
                icon: "image",
            },
            {
                id: "documents",
                label: "Documents",
                href: "/documents",
                icon: "file-text",
            },
            {
                id: "data",
                label: "Data Studio",
                href: "/data",
                icon: "chart-no-axes-combined",
            },
        ],
    },
    {
        id: "intelligence",
        label: "Intelligence",
        items: [
            {
                id: "models",
                label: "Model Lab",
                href: "/models",
                icon: "bot",
            },
            {
                id: "agents",
                label: "Agents",
                href: "/agents",
                icon: "workflow",
            },
            {
                id: "memory",
                label: "Memory",
                href: "/memory",
                icon: "brain",
            },
            {
                id: "playground",
                label: "AI Playground",
                href: "/playground",
                icon: "flask-conical",
            },
        ],
    },
    {
        id: "system",
        label: "System",
        items: [
            {
                id: "analytics",
                label: "Analytics",
                href: "/analytics",
                icon: "activity",
            },
            {
                id: "settings",
                label: "Settings",
                href: "/settings",
                icon: "settings",
            },
        ],
    },
]