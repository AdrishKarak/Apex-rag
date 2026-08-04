'use client'

import React, { useState } from 'react'
import useProject from '@/hooks/use-project'
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, UserPlus, LogOut, Crown, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

export default function TeamMembers() {
    const { project, projectId, projects, setProjectid } = useProject()
    const { user: currentUser } = useUser()
    const router = useRouter()
    const utils = api.useUtils()

    const [copied, setCopied] = useState(false)
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
    const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
    const [membersDialogOpen, setMembersDialogOpen] = useState(false)

    const { data: members } = api.project.getTeamMembers.useQuery(
        { projectId: projectId! },
        { enabled: !!projectId }
    )

    const leaveProject = api.project.leaveProject.useMutation({
        onSuccess: () => {
            toast.success(`You left project "${project?.name}"`)
            setLeaveDialogOpen(false)
            setMembersDialogOpen(false)
            utils.project.getProjects.invalidate()
            const remaining = projects?.filter(p => p.id !== projectId)
            if (remaining && remaining.length > 0 && remaining[0]) {
                setProjectid(remaining[0].id)
                router.push('/dashboard')
            } else {
                router.push('/create')
            }
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to leave project')
            setLeaveDialogOpen(false)
        }
    })

    if (!project) return null

    const inviteUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/join/${project.inviteCode}`
        : ''

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteUrl)
        setCopied(true)
        toast.success('Invite link copied to clipboard!')
        setTimeout(() => setCopied(false), 2000)
    }

    const currentMember = members?.find(m => m.userId === currentUser?.id)
    const isCreator = currentMember?.role === 'CREATOR'

    return (
        <div className="flex items-center gap-3">
            {/* Team Avatars Section Trigger -> Opens Team Members Modal */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <button
                                type="button"
                                onClick={() => setMembersDialogOpen(true)}
                                className="group flex items-center gap-2 rounded-full border border-border bg-card/60 px-2 py-1 transition-all hover:bg-accent hover:shadow-xs cursor-pointer"
                            >
                                <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
                                    {members?.slice(0, 4).map((member) => {
                                        const name = member.user.firstName
                                            ? `${member.user.firstName} ${member.user.lastName || ''}`.trim()
                                            : member.user.emailAddress
                                        const initials = member.user.firstName
                                            ? `${member.user.firstName[0]}${member.user.lastName?.[0] || ''}`.toUpperCase()
                                            : member.user.emailAddress[0]?.toUpperCase()

                                        return (
                                            <Avatar key={member.id} className="size-7 border-2 border-background ring-1 ring-border transition-transform group-hover:scale-105">
                                                <AvatarImage src={member.user.imageUrl || undefined} alt={name} />
                                                <AvatarFallback className="text-[9px] font-semibold bg-primary/10 text-primary">
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                        )
                                    })}
                                    {members && members.length > 4 && (
                                        <div className="flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-bold text-muted-foreground ring-1 ring-border">
                                            +{members.length - 4}
                                        </div>
                                    )}
                                </div>
                                <span className="pr-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                                    {members?.length ?? 0} {members?.length === 1 ? 'member' : 'members'}
                                </span>
                            </button>
                        }
                    />
                    <TooltipContent side="bottom">
                        <p className="text-xs">Click to view all team members</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Team Members List Dialog */}
            <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="size-5 text-primary" />
                                <span>Team Members</span>
                            </div>
                            <Badge variant="secondary" className="font-mono text-xs">
                                {members?.length ?? 0} total
                            </Badge>
                        </DialogTitle>
                        <DialogDescription>
                            People with access to <strong className="text-foreground">{project.name}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    {/* Members List */}
                    <div className="my-2 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                        {members?.map((member) => {
                            const fullName = member.user.firstName
                                ? `${member.user.firstName} ${member.user.lastName || ''}`.trim()
                                : null
                            const initials = member.user.firstName
                                ? `${member.user.firstName[0]}${member.user.lastName?.[0] || ''}`.toUpperCase()
                                : member.user.emailAddress[0]?.toUpperCase()
                            const isSelf = member.userId === currentUser?.id

                            return (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-2.5 transition-colors hover:bg-muted/60"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar className="size-9 border border-border shrink-0">
                                            <AvatarImage src={member.user.imageUrl || undefined} alt={fullName || member.user.emailAddress} />
                                            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                                    {fullName || member.user.emailAddress}
                                                </span>
                                                {isSelf && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/20 shrink-0">
                                                        You
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-[11px] text-muted-foreground truncate">
                                                {member.user.emailAddress}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {member.role === 'CREATOR' ? (
                                            <Badge variant="outline" className="gap-1 text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium">
                                                <Crown className="size-3 text-amber-500" />
                                                Creator
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium text-muted-foreground">
                                                Member
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Dialog Footer Actions */}
                    <div className="flex items-center justify-between border-t pt-3 mt-1 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setMembersDialogOpen(false)
                                setInviteDialogOpen(true)
                            }}
                            className="gap-1.5 text-xs h-8"
                        >
                            <UserPlus className="size-3.5" />
                            <span>Invite Teammates</span>
                        </Button>

                        {!isCreator && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLeaveDialogOpen(true)}
                                className="gap-1.5 text-xs h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                                <LogOut className="size-3.5" />
                                <span>Leave Project</span>
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Invite Button & Modal */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger
                    render={
                        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs font-medium">
                            <UserPlus className="size-3.5" />
                            <span>Invite</span>
                        </Button>
                    }
                />
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="size-5 text-primary" />
                            Invite Team Members
                        </DialogTitle>
                        <DialogDescription>
                            Share this link with your teammates to invite them to <strong className="text-foreground">{project.name}</strong>. Anyone with the link can join.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center gap-2 mt-2">
                        <Input
                            readOnly
                            value={inviteUrl}
                            className="text-xs h-9 font-mono bg-muted/50"
                        />
                        <Button size="sm" onClick={handleCopy} className="h-9 px-3 gap-1.5 shrink-0">
                            {copied ? (
                                <>
                                    <Check className="size-3.5" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="size-3.5" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Leave Project Dialog */}
            {!isCreator && (
                <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogMedia className="bg-destructive/10 text-destructive">
                                <LogOut className="size-5" />
                            </AlertDialogMedia>
                            <AlertDialogTitle>Leave Project</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to leave <strong className="text-foreground">{project.name}</strong>? You will lose access to its commits, Q&A, and meetings unless re-invited.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={leaveProject.isPending}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                variant="destructive"
                                onClick={() => leaveProject.mutate({ projectId })}
                                disabled={leaveProject.isPending}
                                className="gap-1.5"
                            >
                                {leaveProject.isPending ? 'Leaving...' : 'Leave Project'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    )
}

