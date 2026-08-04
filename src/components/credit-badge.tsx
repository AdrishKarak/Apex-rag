'use client'

import React from 'react'
import { api } from '@/trpc/react'
import Link from 'next/link'
import { Coins, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function CreditBadge() {
    const { data: creditData } = api.user.getMyCredits.useQuery(undefined, {
        refetchInterval: 5000 // refresh credits every 5s
    })

    const credits = creditData?.credits ?? 0

    return (
        <Link href="/billing">
            <Badge
                variant="outline"
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 transition-all cursor-pointer shadow-xs font-semibold text-xs rounded-full"
            >
                <Coins className="size-3.5 text-amber-500 animate-pulse" />
                <span>{credits} Credits</span>
                <span className="flex items-center justify-center rounded-full bg-amber-500/20 p-0.5 ml-0.5">
                    <Plus className="size-2.5 text-amber-600 dark:text-amber-400" />
                </span>
            </Badge>
        </Link>
    )
}
