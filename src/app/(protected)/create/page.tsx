"use client"

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { Info } from 'lucide-react'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import userefetch from '@/hooks/use-refetch'

type FormInput = {
    repoUrl: string
    projectName: string
    githubToken?: string
}

const CreatePage = () => {
    const { register, handleSubmit, reset } = useForm<FormInput>()
    const createProject = api.project.createProject.useMutation()
    const refetch = userefetch()
    function onSubmit(data: FormInput) {
        createProject.mutate({
            githubUrl: data.repoUrl,
            name: data.projectName,
            githubToken: data.githubToken
        }, {
            onSuccess: () => {
                toast.success("Project created successfully")
                refetch()
                reset()
            },
            onError: (err) => {
                toast.error("Failed to create project")
            }
        })
    }

    return (
        <div className='flex flex-col md:flex-row items-center justify-center gap-12 min-h-[calc(100vh-10rem)] px-4 py-8 max-w-5xl mx-auto'>
            {/* Left Section: Illustration & Welcome Text */}
            <div className='flex flex-col items-center text-center md:items-start md:text-left gap-6 max-w-md'>
                <div className='relative group duration-500 hover:scale-105 transition-all'>
                    <div className='absolute -inset-1 bg-linear-to-r from-blue-600/30 to-indigo-600/30 rounded-lg blur-md opacity-25 group-hover:opacity-40 transition duration-1000'></div>
                    <img
                        src='/undraw_software-engineer_ljie.svg'
                        alt='Software Engineer illustration'
                        className='relative h-56 md:h-64 w-auto drop-shadow-md'
                    />
                </div>
                <div>
                    <h1 className='text-3xl font-bold tracking-tight text-foreground'>
                        Link Your GitHub Repository
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                        Connect your GitHub repository to link it to <span className='font-semibold text-primary'>Apex-Hub</span>. We will analyze your codebase and set up your RAG workspace.
                    </p>
                </div>
            </div>

            {/* Right Section: Form Card */}
            <div className='w-full max-w-md bg-card border border-border shadow-md rounded-2xl p-8 md:p-10 space-y-8'>
                <div className='space-y-1'>
                    <h2 className='text-xl font-bold tracking-tight text-foreground'>Project Creation</h2>
                    <p className='text-sm text-muted-foreground'>Configure the details for your new codebase index.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
                    <div className='space-y-2'>
                        <Label htmlFor="projectName" className="text-sm font-semibold tracking-wide">Project Name</Label>
                        <Input
                            {...register("projectName", { required: true })}
                            placeholder="e.g. My RAG Project"
                            required
                            className="w-full h-10 px-3"
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor="repoUrl" className="text-sm font-semibold tracking-wide">Repository URL</Label>
                        <Input
                            type="url"
                            {...register("repoUrl", { required: true })}
                            placeholder="https://github.com/username/repository"
                            required
                            className="w-full h-10 px-3"
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label htmlFor="grithubToken" className="text-sm font-semibold tracking-wide flex items-center justify-between">
                            <span>GitHub Token</span>
                            <span className='text-xs text-muted-foreground font-normal'>(Optional)</span>
                        </Label>
                        <Input
                            type="password"
                            {...register("githubToken")}
                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                            className="w-full h-10 px-3"
                        />
                        <div className='text-xs text-muted-foreground flex gap-2 mt-1.5 items-start leading-normal'>
                            <Info className='size-4 shrink-0 mt-0.5 text-blue-500' />
                            <span>Required for private repositories to fetch code and commit history.</span>
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button type="submit" disabled={createProject.isPending} size="lg" className="w-full font-semibold h-10">
                            Create Project
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default CreatePage