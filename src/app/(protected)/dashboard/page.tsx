"use client"

import React from 'react'
import { useUser } from '@clerk/nextjs'
import useProject from '@/hooks/use-project'
import { FiGithub } from "react-icons/fi";
import Link from 'next/link';
import { ExternalLink, Loader2 } from 'lucide-react';
import CommitLog from './commit-log';
import AskQuestionCard from './ask-question-card';
import MeetingCard from './meeting-card';

const page = () => {
    const { user } = useUser()
    const { project } = useProject()
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

            <div className='flex items-center justify-between flex-wrap gap-y-4'>
                {/* Linked Repo */}
                <div className="w-fit rounded-md bg-primary px-4 py-3">
                    <div className="flex items-center">
                        <FiGithub className='size-5 text-white' />
                        <div className='ml-2'>
                            <p className='text-sm font-medium text-white'>
                                This Project is Linke to {' '}
                                <Link href={project?.githubUrl ?? ""} className='inline-flex items-center text-white/80 hover:underline'>
                                    {project?.githubUrl}
                                    <ExternalLink className='ml-1 size-4' />
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="h-4"></div>
                <div className='flex items-center gap-4'>
                    TeamMembers
                    Invitation
                    Archivebuttuon
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