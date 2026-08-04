/**
 * @file src/app/(protected)/billing/page.tsx
 * @description Page managing token accounting and purchases.
 * 
 * WHY IT'S NEEDED:
 * Visualizes user balances, costs, and allows mock credit purchases up to 1000 tokens per hour.
 * 
 * FLOW OF EXECUTION:
 * 1. `getMyCredits` Query: Fetches credit details and rolling transaction histories.
 * 2. `buyCredits` Mutation: Adds credits to the account and invalidates cache keys.
 * 3. `handleBuy(amount)`: Rejects inputs if outside bounds (100–1,000).
 * 
 * CONNECTIONS:
 * - Invokes tRPC query `getMyCredits` and mutation `buyCredits` in `src/server/api/routers/user.ts`.
 */

'use client'

import React, { useState } from 'react'
import { api } from '@/trpc/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
    Coins,
    Zap,
    CreditCard,
    Clock,
    Plus,
    Sparkles,
    FolderPlus,
    Headphones,
    RefreshCw,
    MessageSquare,
    ShieldAlert
} from 'lucide-react'
import { toast } from 'sonner'

const PRESET_PACKS = [
    {
        name: 'Starter',
        amount: 100,
        description: 'For quick Q&A queries and repo syncs.',
        popular: false,
        icon: Zap
    },
    {
        name: 'Pro',
        amount: 250,
        description: 'Covers 1 project setup and multiple meeting transcripts.',
        popular: false,
        icon: Sparkles
    },
    {
        name: 'Team',
        amount: 500,
        description: 'Recommended for teams managing several repositories.',
        popular: true,
        icon: Coins
    },
    {
        name: 'Max Pack',
        amount: 1000,
        description: 'Maximum allowable tokens per 1-hour window.',
        popular: false,
        icon: CreditCard
    }
]

const SERVICE_COSTS = [
    {
        title: 'Project Creation & Indexing',
        cost: 150,
        unit: 'tokens',
        description: 'Full GitHub repository scan, code summaries, and vector embeddings.',
        icon: FolderPlus
    },
    {
        title: 'Audio Meeting Summary',
        cost: 100,
        unit: 'tokens',
        description: 'AssemblyAI audio transcription and Gemini AI chapter summaries.',
        icon: Headphones
    },
    {
        title: 'Repository Sync',
        cost: 15,
        unit: 'tokens',
        description: 'Polls latest commits and updates vector embeddings.',
        icon: RefreshCw
    },
    {
        title: 'AI Question & Answer',
        cost: 10,
        unit: 'tokens',
        description: 'Vector search across codebase and streamed Groq AI answer.',
        icon: MessageSquare
    }
]

export default function BillingPage() {
    const utils = api.useUtils()
    // Local state for custom purchase numbers
    const [customAmount, setCustomAmount] = useState<number>(250)

    // Query active credit amounts and transaction logs
    const { data: creditData, isLoading } = api.user.getMyCredits.useQuery()

    // Mutation linking purchase requests to backend update services
    const buyCredits = api.user.buyCredits.useMutation({
        onSuccess: (data, variables) => {
            toast.success(`Added ${variables.amount} tokens to your account!`)
            utils.user.getMyCredits.invalidate()
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to purchase tokens.')
        }
    })

    /**
     * Top up button event trigger.
     * @param amount Selected transaction sum
     */
    const handleBuy = (amount: number) => {
        if (amount < 100 || amount > 1000) {
            toast.error('Token purchases must be between 100 and 1,000 tokens.')
            return
        }
        buyCredits.mutate({ amount })
    }

    const credits = creditData?.credits ?? 0
    const purchasedInWindow = creditData?.purchasedInWindow ?? 0
    const maxPerWindow = creditData?.maxPerWindow ?? 1000
    const remainingInWindow = creditData?.remainingInWindow ?? 1000
    const nextResetInSeconds = creditData?.nextResetInSeconds ?? 0

    const resetMinutes = Math.ceil(nextResetInSeconds / 60)


    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Billing & Tokens</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Manage your token balance and top up demo credits.
                    </p>
                </div>
                <Badge variant="outline" className="text-xs font-medium px-2.5 py-1 gap-1">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    Demo Mode (Free)
                </Badge>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Available Balance */}
                <div className="rounded-lg border bg-card p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                        <span>Current Token Balance</span>
                        <Coins className="size-4 text-amber-500" />
                    </div>
                    <div className="text-3xl font-bold tracking-tight">
                        {isLoading ? '...' : credits.toLocaleString()}
                        <span className="text-xs font-normal text-muted-foreground ml-1.5">tokens</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-normal">
                        Tokens are deducted per action when indexing projects, asking AI questions, or processing meetings.
                    </p>
                </div>

                {/* 1-Hour Window Limit */}
                <div className="rounded-lg border bg-card p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                        <span>1-Hour Purchase Limit</span>
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="size-3" />
                            Max 1,000 / hr
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm font-semibold mb-1">
                            <span>{purchasedInWindow.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">/ {maxPerWindow} used</span></span>
                            <span className="text-xs text-muted-foreground font-normal">{remainingInWindow.toLocaleString()} tokens left</span>
                        </div>
                        <Progress value={(purchasedInWindow / maxPerWindow) * 100} className="h-1.5" />
                    </div>
                    {purchasedInWindow > 0 && resetMinutes > 0 && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            Window resets in ~{resetMinutes} min{resetMinutes === 1 ? '' : 's'}
                        </p>
                    )}
                </div>
            </div>

            {/* Limit Warning Alert */}
            {remainingInWindow === 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 text-xs text-amber-700 dark:text-amber-300">
                    <ShieldAlert className="size-4 shrink-0 text-amber-500" />
                    <div>
                        <span className="font-semibold">1-Hour Purchase Limit Reached (1,000 Tokens): </span>
                        <span>Please wait ~{resetMinutes} minute(s) before purchasing additional tokens.</span>
                    </div>
                </div>
            )}

            {/* Token Packs */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold tracking-tight text-foreground">Select Token Pack</h2>
                    <span className="text-xs text-muted-foreground">1-click instant top up</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {PRESET_PACKS.map((pack) => {
                        const Icon = pack.icon
                        const isExceeded = pack.amount > remainingInWindow

                        return (
                            <div
                                key={pack.name}
                                className={`rounded-lg border bg-card p-4 flex flex-col justify-between transition-all ${
                                    pack.popular
                                        ? 'border-primary/50 ring-1 ring-primary/20'
                                        : 'hover:border-border'
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-muted-foreground">{pack.name}</span>
                                        {pack.popular && (
                                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-semibold bg-primary/10 text-primary">
                                                Popular
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-2xl font-bold tracking-tight">
                                        {pack.amount}
                                        <span className="text-xs font-normal text-muted-foreground ml-1">tokens</span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-normal min-h-[28px]">
                                        {pack.description}
                                    </p>
                                </div>

                                <Button
                                    onClick={() => handleBuy(pack.amount)}
                                    disabled={buyCredits.isPending || isExceeded}
                                    size="sm"
                                    className="w-full text-xs gap-1 mt-4"
                                    variant={pack.popular ? 'default' : 'outline'}
                                >
                                    {buyCredits.isPending ? (
                                        'Adding...'
                                    ) : isExceeded ? (
                                        'Limit Reached'
                                    ) : (
                                        <>
                                            <Plus className="size-3.5" />
                                            Add {pack.amount}
                                        </>
                                    )}
                                </Button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Custom Amount Picker */}
            <div className="rounded-lg border bg-card p-4 flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 w-full space-y-1">
                    <label className="text-xs font-semibold">Custom Amount</label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            min={100}
                            max={1000}
                            step={50}
                            value={customAmount}
                            onChange={(e) => setCustomAmount(Number(e.target.value))}
                            className="h-8 text-xs font-medium max-w-[140px]"
                        />
                        <span className="text-xs text-muted-foreground font-medium">tokens (100–1,000)</span>
                    </div>
                </div>

                <Button
                    onClick={() => handleBuy(customAmount)}
                    disabled={buyCredits.isPending || customAmount < 100 || customAmount > 1000 || customAmount > remainingInWindow}
                    size="sm"
                    className="w-full sm:w-auto text-xs gap-1.5 shrink-0"
                >
                    <Coins className="size-3.5" />
                    Buy {customAmount} Tokens
                </Button>
            </div>

            {/* Token Usage Rates Table */}
            <div className="space-y-3">
                <h2 className="text-sm font-bold tracking-tight">Token Cost Rates</h2>

                <div className="rounded-lg border bg-card divide-y">
                    {SERVICE_COSTS.map((service) => {
                        const Icon = service.icon
                        return (
                            <div key={service.title} className="p-3.5 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 rounded-md bg-muted text-foreground shrink-0">
                                        <Icon className="size-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold truncate">{service.title}</p>
                                        <p className="text-[11px] text-muted-foreground truncate">{service.description}</p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="font-mono text-xs font-semibold shrink-0 bg-muted/50">
                                    {service.cost} tokens
                                </Badge>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}