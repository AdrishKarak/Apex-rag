'use client'

import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { Bot, CreditCard, LayoutDashboard, Presentation, Plus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import useProject from "@/hooks/use-project"

const items = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard
    },
    {
        title: "Q&A",
        url: "/qa",
        icon: Bot
    },
    {
        title: "Meetings",
        url: "/meetings",
        icon: Presentation
    },
    {
        title: "Billing",
        url: "/billing",
        icon: CreditCard
    }
]



export function AppSidebar() {
    const pathname = usePathname()
    const { open } = useSidebar()
    const { projects, projectId, setProjectid } = useProject()
    return (
        <Sidebar collapsible="icon" variant="floating">
            <SidebarHeader>
                <div className="flex items-center gap-2 px-2 py-1.5">
                    <img src="/logo.svg" alt="Apex Logo" className="size-9" />
                    <span className="text-xl font-semibold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                        Apex
                    </span>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>
                        Application
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-1.5">
                            {items.map(item => {
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            isActive={pathname === item.url}
                                            render={
                                                <Link href={item.url} className={cn({ 'bg-primary! text-white!': pathname === item.url }, 'list-none')}>
                                                    <item.icon />
                                                    <span>{item.title}</span>
                                                </Link>
                                            }
                                        />
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>
                        Your Projects
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <div className="max-h-52 overflow-y-auto pr-1">
                            <SidebarMenu className="gap-1.5">
                                {projects?.map(project => {
                                    return (
                                        <SidebarMenuItem key={project.id}>
                                            <SidebarMenuButton
                                                onClick={() => setProjectid(project.id)}
                                                isActive={project.id === projectId}
                                                tooltip={project.name}
                                                render={
                                                    <div className="flex items-center gap-2 cursor-pointer">
                                                        <div className="rounded-sm border size-6 flex items-center justify-center text-sm bg-primary text-white shrink-0 transition-colors duration-200">{project.name[0]}</div>
                                                        <span className="group-data-[collapsible=icon]:hidden">{project.name}</span>
                                                    </div>
                                                }
                                            />
                                        </SidebarMenuItem>
                                    )
                                })}
                            </SidebarMenu>
                        </div>
                        <div className="h-2" />
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    variant="outline"
                                    className="border border-primary/20 bg-sidebar hover:bg-sidebar-accent shadow-xs"
                                    tooltip="New Project"
                                    render={
                                        <Link href="/create" className="flex items-center gap-2">
                                            <Plus className="size-4" />
                                            <span>New Project</span>
                                        </Link>
                                    }
                                />
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}