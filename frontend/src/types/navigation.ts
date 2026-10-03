export type NavigationItem = {
    id: string
    label: string
    href: string
    icon: string
    section?: string
    badge?: string
}

export type NavigationSection = {
    id: string
    label: string
    items: NavigationItem[]
}