"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import useProject from "@/hooks/use-project";
import Image from "next/image";
import React from "react";
import { askQuestion } from "./action";
import { readStreamableValue } from "@ai-sdk/rsc";
import { Sparkles, Loader2, ArrowRight, CornerDownLeft, Check } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import CodeReferences from "./code-references";
import { Skeleton } from "@/components/ui/skeleton";

import "@uiw/react-markdown-preview/markdown.css";
import { api } from "@/trpc/react";
import { toast } from "sonner";

// Dynamic import of markdown preview to prevent SSR issues
const MarkdownPreview = dynamic(() => import("@uiw/react-markdown-preview"), {
    ssr: false,
    loading: () => (
        <div className="flex flex-col gap-3 py-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[92%]" />
            <Skeleton className="h-4 w-[85%]" />
        </div>
    ),
});

const AskQuestionCard = () => {
    const { project } = useProject();
    const { resolvedTheme } = useTheme();
    const [question, setQuestion] = React.useState("");
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [streaming, setStreaming] = React.useState(false);
    const [filesReferences, setFilesReferences] = React.useState<{ fileName: string; sourceCode: string; summary: string; }[] | null>(null);
    const [answer, setAnswer] = React.useState("");
    const [hasSaved, setHasSaved] = React.useState(false);
    const saveAnswer = api.project.saveAnswer.useMutation();

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!project?.id || !question.trim()) return;

        setAnswer("");
        setFilesReferences([]);
        setHasSaved(false);
        setLoading(true);

        try {
            const { output, filesReferences } = await askQuestion(question, project.id);
            setOpen(true);
            setFilesReferences(filesReferences);
            setStreaming(true);

            for await (const delta of readStreamableValue(output)) {
                if (delta) {
                    setAnswer((ans) => ans + delta);
                }
            }
        } catch (error) {
            console.error("Error asking question:", error);
        } finally {
            setLoading(false);
            setStreaming(false);
        }
    };

    const handleSave = () => {
        if (!project?.id || !question || !answer) return;
        saveAnswer.mutate({
            projectId: project.id,
            question,
            answer,
            filesReferences: filesReferences || []
        }, {
            onSuccess: () => {
                toast.success("Answer saved successfully!");
                setHasSaved(true);
            },
            onError: (err) => {
                toast.error("Failed to save answer: " + err.message);
            }
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-5xl lg:max-w-6xl max-h-[90vh] flex flex-col p-6 overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                    <DialogHeader className="border-b border-zinc-200 dark:border-zinc-800/80 pb-4 shrink-0">
                        <DialogTitle className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2.5">
                                <Image src="/logo.svg" alt="Apex AI" width={28} height={28} className="dark:brightness-110" />
                                <span className="font-semibold tracking-tight text-lg text-zinc-900 dark:text-zinc-50">Ask Apex AI</span>
                            </div>
                            <div className="flex items-center gap-2 pr-10">
                                {streaming && (
                                    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        AI is typing...
                                    </div>
                                )}
                                {!streaming && answer && (
                                    <Button
                                        onClick={handleSave}
                                        disabled={saveAnswer.isPending || hasSaved}
                                        variant="outline"
                                        size="xs"
                                        className="h-7 text-xs px-3 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-medium"
                                    >
                                        {saveAnswer.isPending ? (
                                            <>
                                                <Loader2 className="size-3 animate-spin mr-1.5" />
                                                Saving...
                                            </>
                                        ) : hasSaved ? (
                                            <>
                                                <Check className="size-3 mr-1" />
                                                Saved
                                            </>
                                        ) : (
                                            "Save Answer"
                                        )}
                                    </Button>
                                )}
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {/* Scrollable Content Body (Vertical Stack) */}
                    <div className="flex-1 overflow-y-auto pr-1 mt-4 space-y-6 scrollbar-thin min-h-0">
                        {/* Question Box */}
                        <div className="flex flex-col gap-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/80 p-4">
                            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                                Your Question
                            </span>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-normal">
                                {question}
                            </p>
                        </div>

                        {/* Answer Box */}
                        <div className="flex flex-col gap-3">
                            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800/80 pb-2">
                                Apex AI Answer
                            </span>
                            <div className="text-sm leading-relaxed text-zinc-900 dark:text-zinc-100">
                                {answer ? (
                                    <div
                                        className="prose dark:prose-invert max-w-none text-foreground"
                                        data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
                                    >
                                        <MarkdownPreview
                                            source={answer}
                                            style={{
                                                background: "transparent",
                                                color: "inherit",
                                                fontFamily: "var(--font-sans)",
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3 py-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-[92%]" />
                                        <Skeleton className="h-4 w-[85%]" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Code References Box (Full Width) */}
                        {filesReferences && filesReferences.length > 0 && (
                            <div className="flex flex-col gap-3 border-t border-zinc-200 dark:border-zinc-800/80 pt-6">
                                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800/80 pb-2">
                                    Files References ({filesReferences.length})
                                </span>
                                <div className="w-full">
                                    <CodeReferences filesReferences={filesReferences} />
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Card className="relative col-span-3 overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xs">
                {/* Visual Accent top border */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-zinc-200 dark:bg-zinc-800" />
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
                        <Sparkles className="size-4.5 text-zinc-500 dark:text-zinc-400 animate-pulse" />
                        Ask a question
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                        Search across the codebase, explain files, or find components.
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-3">
                        <div className="relative rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/10 focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-700 transition-all duration-200">
                            <Textarea
                                placeholder="E.g., Which file should I edit to change the home page?"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                className="min-h-24 resize-none border-0 bg-transparent p-3.5 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm leading-relaxed text-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                        <div className="flex justify-end items-center gap-2">
                            <Button
                                type="submit"
                                disabled={loading || !question.trim()}
                                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 border border-zinc-800 dark:border-zinc-200 font-medium shadow-xs transition-all duration-200 px-4 py-2 text-xs rounded-md"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                                        Thinking...
                                    </>
                                ) : (
                                    <>
                                        Ask Apex AI
                                        <ArrowRight className="size-3.5 ml-1.5" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </>
    );
};

export default AskQuestionCard;
