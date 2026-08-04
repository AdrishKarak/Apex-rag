/**
 * @file src/app/(protected)/meetings/meeting-detail-modal.tsx
 * @description Dialog modal overlay displaying transcripts segments (Issues).
 * 
 * WHY IT'S NEEDED:
 * Visualizes the transcribed segments, timeline intervals, and summaries of a completed meeting.
 * 
 * FLOW OF EXECUTION:
 * 1. Checks if `meeting` props exists. Returns null if empty.
 * 2. Renders a modal dialog mapping `meeting.issues` containing timeline headlines and summaries.
 * 
 * CONNECTIONS:
 * - Loaded by `src/app/(protected)/meetings/page.tsx`.
 */

'use client'

import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Clock, FileText, Sparkles } from 'lucide-react'

interface Issue {
    id: string
    start: string
    end: string
    headline: string
    summary: string
    gist: string
    createdAt: Date
}

interface Meeting {
    id: string
    name: string
    createdAt: Date
    status: string
    issues: Issue[]
}

interface MeetingDetailModalProps {
    meeting: Meeting | null
    open: boolean
    onOpenChange: (open: boolean) => void
}

const MeetingDetailModal = ({ meeting, open, onOpenChange }: MeetingDetailModalProps) => {

    if (!meeting) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-3 pr-8">
                        <div className="space-y-1.5 min-w-0">
                            <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 truncate">
                                {meeting.name}
                            </DialogTitle>
                            <DialogDescription className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                                <span className="flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {meeting.createdAt.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </span>
                                <span className="flex items-center gap-1">
                                    <FileText className="size-3" />
                                    {meeting.issues.length} {meeting.issues.length === 1 ? 'section' : 'sections'}
                                </span>
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto -mx-4 px-4 pb-2 space-y-3 mt-2 scrollbar-thin">
                    {meeting.issues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 mb-3">
                                <Sparkles className="size-6 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                No summaries available yet
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                Summaries will appear here once processing is complete.
                            </p>
                        </div>
                    ) : (
                        meeting.issues.map((issue, index) => (
                            <div
                                key={issue.id}
                                className="group relative rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-gradient-to-br from-zinc-50/80 via-white to-zinc-50/50 dark:from-zinc-900/80 dark:via-zinc-900/50 dark:to-zinc-800/30 p-4 transition-all duration-200 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 hover:-translate-y-0.5"
                            >
                                {/* Section number indicator */}
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 text-xs font-bold mt-0.5">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {/* Headline */}
                                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 leading-snug">
                                            {issue.headline}
                                        </h3>

                                        {/* Time range badge */}
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60 text-[10px] font-medium px-2 py-0.5">
                                                <Clock className="size-2.5 mr-1" />
                                                {issue.start} — {issue.end}
                                            </Badge>
                                        </div>

                                        {/* Gist */}
                                        {issue.gist && (
                                            <p className="mt-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 italic">
                                                {issue.gist}
                                            </p>
                                        )}

                                        {/* Summary */}
                                        <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                                            {issue.summary}
                                        </p>
                                    </div>
                                </div>

                                {/* Subtle accent line on hover */}
                                <div className="absolute top-0 inset-x-0 h-0.5 rounded-t-xl bg-gradient-to-r from-transparent via-zinc-300 dark:via-zinc-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default MeetingDetailModal
