'use client'

import React, { useEffect, use } from 'react'
import { api } from '@/trpc/react'
import { useRouter } from 'next/navigation'
import useProject from '@/hooks/use-project'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Props = {
    params: Promise<{ inviteCode: string }>
}

export default function JoinPage({ params }: Props) {
    const { inviteCode } = use(params)
    const router = useRouter()
    const { setProjectid } = useProject()
    const utils = api.useUtils()

    const joinProject = api.project.joinProject.useMutation({
        onSuccess: (project) => {
            setProjectid(project.id)
            utils.project.getProjects.invalidate()
            toast.success(`Successfully joined "${project.name}"!`)
            router.push('/dashboard')
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to join project')
            router.push('/dashboard')
        }
    })

    useEffect(() => {
        if (inviteCode) {
            joinProject.mutate({ inviteCode })
        }
    }, [inviteCode])

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="size-8 text-primary animate-spin" />
            <p className="text-sm text-zinc-500 font-medium">Joining project...</p>
        </div>
    )
}
