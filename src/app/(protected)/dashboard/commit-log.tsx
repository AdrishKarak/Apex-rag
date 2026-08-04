"use client"

import React from 'react'
import useProject from '@/hooks/use-project'
import { api } from '@/trpc/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ExternalLink, RefreshCw, GitCommit, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const CommitLog = () => {
    const { projectId, project } = useProject();
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const { data: commits, refetch } = api.project.getCommits.useQuery(
        { projectId: projectId ?? "" },
        { enabled: !!projectId }
    );
    const utils = api.useUtils();
    const syncProject = api.project.syncProject.useMutation();

    const handleSync = () => {
        if (!projectId) return;
        syncProject.mutate({ projectId }, {
            onSuccess: () => {
                toast.success("Repository sync started in background");
                refetch();
                utils.project.getProjects.invalidate();
            },
            onError: (err) => {
                toast.error("Failed to sync repository: " + (err.message || "Unknown error"));
            }
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">Commit Log</h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={!isMounted || syncProject.isPending || !projectId}
                    className="gap-2"
                >
                    <RefreshCw className={cn("size-4", syncProject.isPending && "animate-spin")} />
                    {syncProject.isPending ? "Syncing..." : "Sync Repo"}
                </Button>
            </div>

            {(!commits || commits.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 bg-zinc-50/50 dark:bg-zinc-900/20">
                    <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 mb-3">
                        <GitCommit className="size-6 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        No commits found
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mb-4 leading-relaxed">
                        No commits have been indexed for this project yet. Sync your repository or create a new project.
                    </p>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncProject.isPending || !projectId} className="gap-2 text-xs">
                            <RefreshCw className={cn("size-3.5", syncProject.isPending && "animate-spin")} />
                            Sync Repo
                        </Button>
                        <Link href="/create">
                            <Button size="sm" className="gap-2 text-xs">
                                <Plus className="size-3.5" />
                                Create New Project
                            </Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <ul className='space-y-6'>
                    {commits.map((commit, commitIdx) => {
                        return <li className='relative flex gap-x-4' key={commit.id}>
                            <div className={cn(
                                commitIdx === commits.length - 1 ? "h-6" : "-bottom-6",
                                "absolute left-0 top-0 flex w-6 rounded-full"
                            )}>
                                <div className="w-px translate-x-1 bg-gray-200"></div>
                            </div>
                            <>
                                <img src={commit.commitAuthorAvatar} className='size-8 relative mt-4 flex-none rounded-full bg-gray-50' alt='commit author' />
                                <div className="flex-auto rounded-md bg-white p-3 ring-1 ring-inset ring-gray-200">
                                    <div className="flex justify-between gap-x-4">
                                        <Link target='_blank' href={`${project?.githubUrl}/commit/${commit.commitHash}`} className='py-0.5 text-xs leading-5 text-gray-500'>
                                            <span className='font-medium text-gray-900'>
                                                {commit.commitAuthorName}
                                            </span> {" "}
                                            <span className='inline-flex items-center gap-0.5'>
                                                committed <ExternalLink className='ml-1 size-4' />
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
            )}
        </div>
    )
}

export default CommitLog