'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import useProject from '@/hooks/use-project'
import { api } from '@/trpc/react'
import React from 'react'
import AskQuestionCard from '../dashboard/ask-question-card'
import CodeReferences from '../dashboard/code-references'
import { Bot, MessageSquareText, Calendar, ChevronRight, Sparkles, FileCode2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'

import "@uiw/react-markdown-preview/markdown.css";

const MarkdownPreview = dynamic(() => import("@uiw/react-markdown-preview"), {
    ssr: false,
    loading: () => (
        <div className="flex flex-col gap-3 py-4">
            <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-4 w-[92%] rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
            <div className="h-4 w-[80%] rounded bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        </div>
    ),
})

const QAPage = () => {
    const { projectId } = useProject()
    const { data: questions } = api.project.getQuestions.useQuery({ projectId })
    const [questionIndex, setQuestionIndex] = React.useState(0)
    const question = questions?.[questionIndex]
    const { resolvedTheme } = useTheme()

    return (
        <Sheet>
            {/* Ask Question Card */}
            <AskQuestionCard />

            {/* Section Header */}
            <div className="mt-8 mb-5">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 dark:bg-primary/15 border border-primary/20">
                        <MessageSquareText className="size-4.5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                            Saved Questions
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {questions?.length
                                ? `${questions.length} question${questions.length !== 1 ? 's' : ''} saved`
                                : 'Your saved Q&A history will appear here'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Questions List */}
            {questions && questions.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                    {questions.map((q, index) => (
                        <React.Fragment key={q.id}>
                            <SheetTrigger onClick={() => setQuestionIndex(index)}>
                                <div className="group flex items-start gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-xs hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 cursor-pointer">
                                    {/* Avatar */}
                                    <img
                                        className="rounded-full ring-2 ring-zinc-100 dark:ring-zinc-800 shrink-0 mt-0.5"
                                        height={36}
                                        width={36}
                                        src={q.user.imageUrl ?? ""}
                                        alt="User avatar"
                                    />

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1 leading-snug">
                                                {q.question}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 shrink-0">
                                                <Calendar className="size-3" />
                                                <span className="text-[11px] whitespace-nowrap">
                                                    {q.createdAt.toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1.5 leading-relaxed">
                                            {q.answer}
                                        </p>

                                        {/* Tags row */}
                                        <div className="flex items-center gap-2 mt-2.5">
                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full px-2 py-0.5">
                                                <Bot className="size-2.5" />
                                                AI Answered
                                            </span>
                                            {(q.filesReferences as any)?.length > 0 && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-full px-2 py-0.5">
                                                    <FileCode2 className="size-2.5" />
                                                    {(q.filesReferences as any).length} file{(q.filesReferences as any).length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Chevron */}
                                    <ChevronRight className="size-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-500 dark:group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all duration-200 shrink-0 mt-1.5" />
                                </div>
                            </SheetTrigger>
                        </React.Fragment>
                    ))}
                </div>
            ) : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-16 px-4">
                    <div className="flex items-center justify-center size-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-4">
                        <Sparkles className="size-7 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                        No saved questions yet
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center max-w-xs leading-relaxed">
                        Ask a question above and save the answer to build your project&apos;s knowledge base.
                    </p>
                </div>
            )}

            {/* Sheet Content — Answer Detail Panel */}
            {question && (
                <SheetContent className="w-[90vw] sm:w-[60vw]! sm:max-w-[60vw]! flex flex-col overflow-hidden p-0">
                    <SheetHeader className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
                        <div className="flex items-center gap-2.5 mb-1">
                            <div className="flex items-center justify-center size-7 rounded-md bg-primary/10 dark:bg-primary/15">
                                <Bot className="size-3.5 text-primary" />
                            </div>
                            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                                AI Answer
                            </span>
                        </div>
                        <SheetTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50 leading-snug pr-8">
                            {question.question}
                        </SheetTitle>
                        <div className="flex items-center gap-1.5 mt-1">
                            <img
                                className="rounded-full size-4"
                                src={question.user.imageUrl ?? ""}
                                alt=""
                            />
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                Asked on {question.createdAt.toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </span>
                        </div>
                    </SheetHeader>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                        {/* Answer Section */}
                        <div className="prose dark:prose-invert max-w-none text-foreground text-sm"
                            data-color-mode={resolvedTheme === 'dark' ? 'dark' : 'light'}
                        >
                            <MarkdownPreview
                                source={question.answer}
                                style={{
                                    background: 'transparent',
                                    color: 'inherit',
                                    fontFamily: 'var(--font-sans)',
                                }}
                            />
                        </div>

                        {/* Code References */}
                        {(question.filesReferences as any)?.length > 0 && (
                            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileCode2 className="size-3.5 text-zinc-400 dark:text-zinc-500" />
                                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                                        Referenced Files ({(question.filesReferences as any).length})
                                    </span>
                                </div>
                                <CodeReferences filesReferences={(question.filesReferences ?? [] as any)} />
                            </div>
                        )}
                    </div>
                </SheetContent>
            )}
        </Sheet>
    )
}

export default QAPage