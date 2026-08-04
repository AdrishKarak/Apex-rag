'use client'

import React from 'react'
import { useDropzone } from 'react-dropzone'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { uploadFile } from '@/lib/firebase'
import { Presentation, Upload } from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { api } from '@/trpc/react'
import useProject from '@/hooks/use-project'
import { useRouter } from 'next/navigation'

const MeetingCard = () => {
    const { project } = useProject()
    const [progress, setProgress] = React.useState(0)
    const [isUploading, setIsUploading] = React.useState(false)
    const { resolvedTheme } = useTheme()
    const router = useRouter()
    const uploadMeeting = api.project.uploadMeeting.useMutation({
        onSuccess: () => {
            toast.success("Meeting audio uploaded successfully!")
            router.push("/meetings")
        },
        onError: (e) => {
            toast.error(e.message)
        }
    })

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            "audio/*": [".mp3", ".wav", ".m4a"]
        },
        multiple: false,
        maxSize: 50_000_000,
        disabled: isUploading,
        onDrop: async (acceptedFiles, fileRejections) => {
            if (!project) return;
            if (fileRejections.length > 0) {
                toast.error("File type not supported or file too large (max 50MB)")
                return
            }

            const file = acceptedFiles[0]
            if (!file) return
            setIsUploading(true)
            setProgress(0)
            try {
                const downloadURL = await uploadFile(file as File, setProgress) as string
                uploadMeeting.mutate({
                    projectId: project.id,
                    meetingUrl: downloadURL,
                    name: file.name
                }, {
                    onSuccess: () => {
                        toast.success("Meeting audio uploaded successfully!")
                    }
                })

            } catch (error: any) {
                toast.error(error?.message || "Failed to upload meeting audio")
            } finally {
                setIsUploading(false)
            }
        }
    })

    const isDark = resolvedTheme === 'dark'

    return (
        <Card
            className={`relative col-span-1 sm:col-span-2 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all duration-200 overflow-hidden cursor-pointer shadow-xs group ${isDragActive
                ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100/80 dark:bg-zinc-800/50 scale-[1.01]'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30'
                }`}
            {...getRootProps()}
        >
            {/* Visual Accent top border */}
            <div className="absolute top-0 inset-x-0 h-0.5 bg-zinc-200 dark:bg-zinc-800" />

            {!isUploading && (
                <div className="flex flex-col items-center text-center py-2">
                    <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 shadow-xs mb-3 group-hover:scale-105 transition-transform duration-200">
                        <Presentation className="size-6 text-zinc-900 dark:text-zinc-100" />
                    </div>

                    <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Create a new meeting
                    </h3>

                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                        Analyse your meeting with Apex AI.
                        <br />
                        Upload recording to get transcripts & smart insights.
                    </p>

                    <div className="flex items-center gap-1.5 mt-3">
                        <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60">
                            MP3
                        </span>
                        <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60">
                            WAV
                        </span>
                        <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-700/60">
                            M4A
                        </span>
                    </div>

                    <div className="mt-5">
                        <Button
                            disabled={isUploading}
                            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 border border-zinc-800 dark:border-zinc-200 font-medium shadow-xs transition-all duration-200 px-4 py-2 text-xs rounded-md flex items-center gap-2"
                        >
                            <Upload className="size-3.5" aria-hidden="true" />
                            Upload Meeting
                            <input className="hidden" {...getInputProps()} />
                        </Button>
                    </div>
                </div>
            )}

            {isUploading && (
                <div className="flex flex-col items-center justify-center py-4 space-y-4 w-full">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 relative flex items-center justify-center">
                        <CircularProgressbar
                            value={progress}
                            text={`${progress}%`}
                            styles={buildStyles({
                                strokeLinecap: 'round',
                                textSize: '20px',
                                pathTransitionDuration: 0.5,
                                pathColor: isDark ? '#f4f4f5' : '#18181b',
                                textColor: isDark ? '#f4f4f5' : '#09090b',
                                trailColor: isDark ? '#27272a' : '#e4e4e7',
                            })}
                        />
                    </div>
                    <div className="text-center space-y-1">
                        <div className="flex items-center justify-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-600 dark:bg-zinc-300"></span>
                            </span>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                Uploading meeting...
                            </p>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Please wait while we process your audio file
                        </p>
                    </div>
                </div>
            )}
        </Card>
    )
}

export default MeetingCard