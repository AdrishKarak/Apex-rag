"use client"

import React from 'react'
import { useUser } from '@clerk/nextjs'
import useProject from '@/hooks/use-project'
import { FiGithub } from "react-icons/fi";
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

const page = () => {
    const { user } = useUser()
    const { project } = useProject()
    return (
        <div>
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
                    AskQuestionCard
                    MeetingCard
                </div>
            </div>

            <div className="mt-8"></div>
            commitlog
        </div>
    )
}

export default page