'use client'

import useProject from '@/hooks/use-project'
import { api } from '@/trpc/react'
import React from 'react'
import MeetingCard from '../dashboard/meeting-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Headphones,
    Clock,
    FileText,
    CheckCircle2,
    Loader2,
    Sparkles,
    ExternalLink,
} from 'lucide-react'
import MeetingDetailModal from './meeting-detail-modal'

const MeetingsPage = () => {
    const { projectId } = useProject()
    const { data: meetings, isLoading } = api.project.getMeetings.useQuery(
        { projectId },
        {
            refetchInterval: (query) => {
                const meetingsList = query.state.data;
                const hasProcessing = meetingsList?.some(m => m.status === 'PROCESSING');
                return hasProcessing ? 4000 : false;
            }
        }
    )

    const [selectedMeeting, setSelectedMeeting] = React.useState<(typeof meetings extends (infer T)[] | undefined ? T : never) | null>(null)
    const [modalOpen, setModalOpen] = React.useState(false)

    const handleMeetingClick = (meeting: NonNullable<typeof meetings>[number]) => {
        if (meeting.status === 'COMPLETED') {
            setSelectedMeeting(meeting)
            setModalOpen(true)
        }
    }

    return (
        <>
            {/* Page Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60">
                        <Headphones className="size-5 text-zinc-900 dark:text-zinc-100" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            Meetings
                        </h1>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Upload, transcribe, and get AI-powered summaries of your meeting recordings.
                        </p>
                    </div>
                </div>
            </div>

            {/* Upload Card */}
            <MeetingCard />

            {/* Meetings List */}
            <div className="mt-8">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="animate-pulse rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <div className="h-4 w-48 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                                        <div className="h-3 w-32 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                                    </div>
                                    <div className="h-5 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : meetings && meetings.length > 0 ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between mb-1">
                            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                Your Recordings
                            </h2>
                            <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                {meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'}
                            </span>
                        </div>

                        {meetings.map((meeting) => (
                            <div
                                key={meeting.id}
                                onClick={() => handleMeetingClick(meeting)}
                                className={`group relative rounded-xl border p-4 transition-all duration-200 ${
                                    meeting.status === 'COMPLETED'
                                        ? 'border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                                        : 'border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20 cursor-default'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    {/* Left: Info */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`flex-shrink-0 p-2 rounded-lg border ${
                                            meeting.status === 'COMPLETED'
                                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/50'
                                                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/50'
                                        }`}>
                                            {meeting.status === 'COMPLETED' ? (
                                                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                                <Loader2 className="size-4 text-amber-600 dark:text-amber-400 animate-spin" />
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                                                    {meeting.name}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                                    <Clock className="size-3" />
                                                    {meeting.createdAt.toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
                                                </span>
                                                {meeting.status === 'COMPLETED' && meeting.issues.length > 0 && (
                                                    <span className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                                        <FileText className="size-3" />
                                                        {meeting.issues.length} {meeting.issues.length === 1 ? 'section' : 'sections'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Status + Action */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {meeting.status === 'PROCESSING' ? (
                                            <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-700/50 text-[10px] font-semibold px-2.5 py-0.5 gap-1.5">
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-600 dark:bg-amber-400" />
                                                </span>
                                                Processing
                                            </Badge>
                                        ) : (
                                            <>
                                                <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-700/50 text-[10px] font-semibold px-2.5 py-0.5 gap-1.5">
                                                    <CheckCircle2 className="size-3" />
                                                    Completed
                                                </Badge>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs h-7 px-3 rounded-lg border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleMeetingClick(meeting)
                                                    }}
                                                >
                                                    <Sparkles className="size-3" />
                                                    View Insights
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Subtle top accent on hover for completed */}
                                {meeting.status === 'COMPLETED' && (
                                    <div className="absolute top-0 inset-x-0 h-0.5 rounded-t-xl bg-gradient-to-r from-transparent via-emerald-400/60 dark:via-emerald-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    !isLoading && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 mb-4">
                                <Headphones className="size-8 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                No meetings yet
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
                                Upload your first meeting recording above to get AI-powered transcriptions and summaries.
                            </p>
                        </div>
                    )
                )}
            </div>

            {/* Detail Modal */}
            <MeetingDetailModal
                meeting={selectedMeeting}
                open={modalOpen}
                onOpenChange={setModalOpen}
            />
        </>
    )
}

export default MeetingsPage