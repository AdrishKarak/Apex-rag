/**
 * @file src/app/(protected)/app-sidebar.tsx
 * @description Sidebar navigation container linking routes and project workspace directories.
 * 
 * WHY IT'S NEEDED:
 * Allows developers to jump between layout sections (dashboard, QA, meetings, billing)
 * and manage active projects, containing creator delete triggers.
 * 
 * FLOW OF EXECUTION:
 * 1. Loads projects from `useProject()`.
 * 2. `deleteProject` Mutation: Triggered when the creator clicks delete.
 *    - Invalidates lists inside `getProjects`.
 *    - Checks if the deleted project matches the active project ID. If true, redirects to remaining projects or the project creation page.
 * 
 * CONNECTIONS:
 * - Invokes tRPC mutation `deleteProject` in `src/server/api/routers/project.ts`.
 */

'use client'

import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { Bot, CreditCard, LayoutDashboard, Presentation, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import useProject from "@/hooks/use-project"
import { api } from "@/trpc/react"
import React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
    const router = useRouter()
    const { open } = useSidebar()
    // Load projects list and selected ID hooks
    const { projects, projectId, setProjectid } = useProject()
    const utils = api.useUtils()

    // Dialog state targets for deletions
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
    const [projectToDelete, setProjectToDelete] = React.useState<{ id: string; name: string } | null>(null)

    // Mutation linking deletions triggers to tRPC project.deleteProject
    const deleteProject = api.project.deleteProject.useMutation({
        onSuccess: () => {
            toast.success(`Project "${projectToDelete?.name}" has been permanently deleted.`)
            setDeleteDialogOpen(false)
            setProjectToDelete(null)

            // Invalidate the projects list so the sidebar updates immediately
            utils.project.getProjects.invalidate()

            // If the deleted project was selected, navigate away
            if (projectToDelete?.id === projectId) {
                // Pick the first remaining project, or redirect to create page
                const remaining = projects?.filter(p => p.id !== projectToDelete?.id)
                if (remaining && remaining.length > 0 && remaining[0]) {
                    setProjectid(remaining[0].id)
                    router.push('/dashboard')
                } else {
                    router.push('/create')
                }
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete project.")
            setDeleteDialogOpen(false)
            setProjectToDelete(null)
        }
    })

    /**
     * Triggers the deletion warning dialog window.
     */
    const handleDeleteClick = (e: React.MouseEvent, project: { id: string; name: string }) => {
        e.stopPropagation()
        setProjectToDelete(project)
        setDeleteDialogOpen(true)
    }

    /**
     * Dispatches the delete project mutation to the backend API.
     */
    const confirmDelete = () => {
        if (projectToDelete) {
            deleteProject.mutate({ projectId: projectToDelete.id })
        }
    }


    return (
        <>
            <Sidebar collapsible="icon" variant="floating">
                <SidebarHeader>
                    <Link href="/" className="flex items-center gap-2 px-2 py-1.5 transition-opacity duration-150 hover:opacity-80">
                        <img src="/logo.svg" alt="Apex Logo" className="size-9" />
                        <span className="text-xl font-semibold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                            Apex
                        </span>
                    </Link>
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
                                                    onClick={() => {
                                                        setProjectid(project.id)
                                                        router.push('/dashboard')
                                                    }}
                                                    isActive={project.id === projectId}
                                                    tooltip={project.name}
                                                    render={
                                                        <div className="flex items-center gap-2 cursor-pointer w-full group/project">
                                                            <div className="rounded-sm border size-6 flex items-center justify-center text-sm bg-primary text-white shrink-0 transition-colors duration-200">{project.name[0]}</div>
                                                            <span className="group-data-[collapsible=icon]:hidden flex-1 truncate">{project.name}</span>
                                                            {project.userToProjects?.[0]?.role === "CREATOR" && (
                                                                <button
                                                                    onClick={(e) => handleDeleteClick(e, project)}
                                                                    className="group-data-[collapsible=icon]:hidden opacity-0 group-hover/project:opacity-100 transition-opacity duration-150 p-1 rounded-md hover:bg-destructive/10 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 flex-shrink-0"
                                                                    title={`Delete ${project.name}`}
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                </button>
                                                            )}
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

            {/* Delete Confirmation Modal */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-destructive/10 text-red-500 dark:text-red-400">
                            <Trash2 className="size-5" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong className="text-foreground">{projectToDelete?.name}</strong>? This will permanently remove all associated data including commits, Q&A, saved answers, meetings, and transcriptions. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteProject.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteProject.isPending}
                            className="gap-1.5"
                        >
                            {deleteProject.isPending ? (
                                <>
                                    <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="size-3.5" />
                                    Delete Project
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
