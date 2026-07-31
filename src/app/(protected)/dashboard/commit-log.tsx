"use client"

import React from 'react'
import useProject from '@/hooks/use-project'
import { api } from '@/trpc/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

const CommitLog = () => {
    const { projectId, project } = useProject();
    const { data: commits } = api.project.getCommits.useQuery({ projectId });

    return (
        <>
            <ul className='space-y-6'>
                {commits?.map((commit, commitIdx) => {
                    return <li className='relative flex gap-x-4' key={commit.id}>
                        <div className={cn(
                            commitIdx === commits.length - 1 ? "h-6" : "-bottom-6",
                            "absolute left-0 top-0 flex w-6 rounded-full"
                        )}>
                            <div className="w-px trasnlate-x-1 bg-gray-200"></div>
                        </div>
                        <>
                            <img src={commit.commitAuthorAvatar} className='size-8 relative mt-4 flex-none rounded-full bg-gray-50' alt='commit author' />
                            <div className="flex-auto rounded-mg bg-white p-3 ring-1 ring-inset ring-gray-200">
                                <div className="flex justify-between gap-x-4">
                                    <Link target='_blank' href={`${project?.githubUrl}/commit/${commit.commitHash}`} className='py-0.5 text-xs leading-5 text-gray-500'>
                                        <span className='font-medium text-gray-900'>
                                            {commit.commitAuthorName}
                                        </span> {" "}
                                        <span className='inline-flex items-center gap-0.5'>
                                            commited <ExternalLink className='ml-1 size-4' />
                                        </span>
                                    </Link>
                                </div>
                                <span className='font-semibold'>
                                    {commit.commitMessage}
                                </span>
                                <pre className='mt-2 text-gray-500 text-sm leading-6 whitespace-pre-wrap'>
                                    {commit.summary || "No summary available"}
                                </pre>
                            </div>
                        </>
                    </li>
                })}
            </ul>
        </>
    )
}

export default CommitLog