"use client"

import React from 'react'
import { useUser } from '@clerk/nextjs'
import useProject from '@/hooks/use-project'
import { FiGithub } from "react-icons/fi";
import Link from 'next/link';
import { ExternalLink, Loader2, FolderPlus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CommitLog from './commit-log';
import AskQuestionCard from './ask-question-card';
import MeetingCard from './meeting-card';

import TeamMembers from './team-members';

const page = () => {
    const { user } = useUser()
    const { project } = useProject()

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6 border-2 border-dashed rounded-xl my-4">
                <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 mb-1">
                    <FolderPlus className="size-10 text-zinc-400 dark:text-zinc-500" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    No Projects Found
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed">
                    You don't have any active projects yet. Create a new project by linking a GitHub repository to get started with AI code analysis, commit tracking, and meeting notes.
                </p>
                <Link href="/create">
                    <Button className="mt-2 gap-2">
                        <Plus className="size-4" />
                        Create New Project
                    </Button>
                </Link>
            </div>
        )
    }

    return (
        <div>
            {project?.isIndexing && (
                <div className='flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 mb-6 animate-pulse'>
                    <Loader2 className='size-5 text-blue-500 animate-spin shrink-0' />
                    <p className='text-sm text-blue-500 font-medium leading-normal'>
                        Apex-Hub is currently indexing your repository in the background. Generating code summaries and embeddings. AI features will be active once completed. ( Max 5-10 min )
                    </p>
                </div>
            )}

            <div className='flex items-center justify-between flex-wrap gap-3'>
                {/* Linked Repo */}
                <div className="w-full sm:w-fit rounded-lg bg-primary px-3.5 py-2.5 sm:py-3 shadow-xs">
                    <div className="flex items-center min-w-0">
                        <FiGithub className='size-5 text-white shrink-0' />
                        <div className='ml-2.5 min-w-0 flex-1'>
                            <p className='text-xs sm:text-sm font-medium text-white truncate'>
                                Linked to {' '}
                                <Link href={project?.githubUrl ?? ""} target="_blank" className='inline-flex items-center text-white/90 hover:underline max-w-full truncate font-mono text-[11px] sm:text-xs'>
                                    <span className="truncate">{project?.githubUrl}</span>
                                    <ExternalLink className='ml-1 size-3 shrink-0' />
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                <div className='flex items-center gap-3 w-full sm:w-auto justify-end'>
                    <TeamMembers />
                </div>
            </div>

            <div className="mt-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                    <AskQuestionCard />
                    <MeetingCard />
                </div>
            </div>

            <div className="mt-8"></div>
            <CommitLog />
        </div>
    )
}

export default page