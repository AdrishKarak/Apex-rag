'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Check, Loader2 } from 'lucide-react'
import useProject from '@/hooks/use-project'
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { Badge } from '@/components/ui/badge'

export function ProjectSearch() {
    const [open, setOpen] = React.useState(false)
    const [shortcutKey, setShortcutKey] = React.useState('⌘K')
    const { projects, projectId, setProjectid } = useProject()
    const router = useRouter()

    React.useEffect(() => {
        const isMac = typeof window !== 'undefined' && (navigator.platform.toUpperCase().indexOf('MAC') >= 0 || navigator.userAgent.toUpperCase().indexOf('MAC') >= 0)
        setShortcutKey(isMac ? '⌘K' : 'Ctrl+K')
    }, [])

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [])

    const handleSelectProject = (id: string) => {
        setProjectid(id)
        setOpen(false)
        router.push('/dashboard')
    }

    const handleCreateProject = () => {
        setOpen(false)
        router.push('/create')
    }

    const selectedProject = projects?.find((p) => p.id === projectId)

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="group flex items-center justify-between gap-2 h-9 w-full max-w-[200px] sm:max-w-[280px] md:max-w-[340px] px-3 py-1.5 rounded-lg border border-input/60 bg-background/50 hover:bg-accent hover:text-accent-foreground text-xs sm:text-sm text-muted-foreground shadow-2xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <div className="flex items-center gap-2 truncate">
                    <Search className="size-3.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                    <span className="truncate">
                        {selectedProject ? (
                            <span className="text-foreground font-medium">{selectedProject.name}</span>
                        ) : (
                            'Search projects...'
                        )}
                    </span>
                </div>
                <Kbd className="shrink-0 hidden sm:inline-flex">{shortcutKey}</Kbd>
            </button>

            <CommandDialog
                open={open}
                onOpenChange={setOpen}
                title="Search Projects"
                description="Search and navigate through your projects"
            >
                <CommandInput placeholder="Search projects by name or repository..." />
                <CommandList>
                    <CommandEmpty>No projects found.</CommandEmpty>
                    <CommandGroup heading="Your Projects">
                        {projects?.map((project) => {
                            const isSelected = project.id === projectId
                            const isCreator = project.userToProjects?.[0]?.role === 'CREATOR'
                            return (
                                <CommandItem
                                    key={project.id}
                                    value={`${project.name} ${project.githubUrl}`}
                                    onSelect={() => handleSelectProject(project.id)}
                                    className="flex items-center justify-between gap-2 py-2 cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <div className="rounded-md border size-7 flex items-center justify-center text-xs font-semibold bg-primary text-white shrink-0">
                                            {project.name[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-medium text-foreground truncate">{project.name}</span>
                                                {project.isIndexing && (
                                                    <Badge variant="secondary" className="gap-1 text-[10px] h-4 px-1.5">
                                                        <Loader2 className="size-2.5 animate-spin" />
                                                        Indexing
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-muted-foreground truncate max-w-[240px] sm:max-w-[320px]">
                                                {project.githubUrl}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                            {isCreator ? 'Owner' : 'Member'}
                                        </Badge>
                                        {isSelected && (
                                            <Check className="size-4 text-primary shrink-0" />
                                        )}
                                    </div>
                                </CommandItem>
                            )
                        })}
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Actions">
                        <CommandItem
                            value="Create New Project"
                            onSelect={handleCreateProject}
                            className="flex items-center gap-2 py-2 text-primary cursor-pointer font-medium"
                        >
                            <Plus className="size-4" />
                            <span>Create New Project</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
