import { RSC_ACTION_CLIENT_WRAPPER_ALIAS } from "next/dist/lib/constants";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { pollCommits } from "@/lib/github";
import { indexGithubRepo } from "@/lib/github-loaders";

export const projectRouter = createTRPCRouter({
    createProject: protectedProcedure.input(
        z.object({
            name: z.string(),
            githubUrl: z.string(),
            githubToken: z.string().optional(),
        })
    ).mutation(async ({ ctx, input }) => {
        const project = await ctx.db.project.create({
            data: {
                githubUrl: input.githubUrl,
                name: input.name,
                githubToken: input.githubToken,
                userToProjects: {
                    create: {
                        userId: ctx.user.userId!
                    }
                }
            }
        })
        await pollCommits(project.id);

        // Run repository indexing in the background so the project dashboard loads instantly.
        indexGithubRepo(project.id, input.githubUrl, input.githubToken)
            .then(async () => {
                await ctx.db.project.update({
                    where: { id: project.id },
                    data: { isIndexing: false }
                });
                console.log(`Indexing successfully completed for project: ${project.id}`);
            })
            .catch(async (err) => {
                await ctx.db.project.update({
                    where: { id: project.id },
                    data: { isIndexing: false }
                });
                console.error(`Indexing failed for project: ${project.id}`, err);
            });

        return project;
    }),

    getProjects: protectedProcedure.query(async ({ ctx }) => {
        return await ctx.db.project.findMany({
            where: {
                userToProjects: {
                    some: {
                        userId: ctx.user.userId!
                    }
                },
                deletedAt: null
            }
        })
    }),
    getCommits: protectedProcedure.input(
        z.object({
            projectId: z.string()
        })
    ).query(async ({ ctx, input }) => {
        return await ctx.db.commit.findMany({
            where: {
                projectId: input.projectId
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
    }),

    syncProject: protectedProcedure.input(
        z.object({
            projectId: z.string()
        })
    ).mutation(async ({ ctx, input }) => {
        const project = await ctx.db.project.findUnique({
            where: { id: input.projectId },
            select: { githubUrl: true, githubToken: true }
        });

        if (!project) {
            throw new Error("Project not found");
        }

        // 1. Set indexing flag to true
        await ctx.db.project.update({
            where: { id: input.projectId },
            data: { isIndexing: true }
        });

        // 2. Poll commits synchronously so that commits list updates immediately
        await pollCommits(input.projectId);

        // 3. Trigger codebase indexing in the background asynchronously
        indexGithubRepo(input.projectId, project.githubUrl, project.githubToken ?? undefined)
            .then(async () => {
                await ctx.db.project.update({
                    where: { id: input.projectId },
                    data: { isIndexing: false }
                });
                console.log(`Sync indexing successfully completed for project: ${input.projectId}`);
            })
            .catch(async (err) => {
                await ctx.db.project.update({
                    where: { id: input.projectId },
                    data: { isIndexing: false }
                });
                console.error(`Sync indexing failed for project: ${input.projectId}`, err);
            });

        return { success: true };
    }),

    saveAnswer: protectedProcedure.input(
        z.object({
            projectId: z.string(),
            question: z.string(),
            answer: z.string(),
            filesReferences: z.any()
        })
    ).mutation(async ({ ctx, input }) => {
        const existing = await ctx.db.question.findFirst({
            where: {
                projectId: input.projectId,
                userId: ctx.user.userId!,
                question: input.question
            }
        });
        if (existing) {
            return existing;
        }
        return await ctx.db.question.create({
            data: {
                projectId: input.projectId,
                question: input.question,
                answer: input.answer,
                filesReferences: input.filesReferences,
                userId: ctx.user.userId!
            }
        })
    })
})