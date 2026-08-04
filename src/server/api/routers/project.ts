import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { pollCommits } from "@/lib/github";
import { indexGithubRepo } from "@/lib/github-loaders";
import { processMeeting } from "@/lib/assembly";
import { serverCache } from "@/lib/cache";

export const projectRouter = createTRPCRouter({
    createProject: protectedProcedure.input(
        z.object({
            name: z.string().trim().min(1, "Project name is required").max(100, "Project name too long"),
            githubUrl: z.string().trim().url("Invalid GitHub URL").max(300, "URL too long"),
            githubToken: z.string().trim().optional(),
        })
    ).mutation(async ({ ctx, input }) => {
        const user = await ctx.db.user.findUnique({ where: { id: ctx.user.userId! } });
        if (!user || user.credits < 150) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Insufficient credits: You need 150 credits to create and index a new project. You currently have ${user?.credits ?? 0} credits. Please top up on the Billing page.`
            });
        }

        // Deduct 150 credits
        await ctx.db.user.update({
            where: { id: ctx.user.userId! },
            data: { credits: { decrement: 150 } }
        });

        const project = await ctx.db.project.create({
            data: {
                githubUrl: input.githubUrl,
                name: input.name,
                githubToken: input.githubToken,
                userToProjects: {
                    create: {
                        userId: ctx.user.userId!,
                        role: "CREATOR"
                    }
                }
            }
        });

        // Invalidate project list cache for this user
        serverCache.invalidate(`projects:user:${ctx.user.userId}`);

        await pollCommits(project.id);

        // Run repository indexing in the background so the project dashboard loads instantly.
        indexGithubRepo(project.id, input.githubUrl, input.githubToken)
            .then(async () => {
                await ctx.db.project.update({
                    where: { id: project.id },
                    data: { isIndexing: false }
                });
                serverCache.invalidate(`projects:user:${ctx.user.userId}`);
                console.log(`Indexing successfully completed for project: ${project.id}`);
            })
            .catch(async (err) => {
                await ctx.db.project.update({
                    where: { id: project.id },
                    data: { isIndexing: false }
                });
                serverCache.invalidate(`projects:user:${ctx.user.userId}`);
                console.error(`Indexing failed for project: ${project.id}`, err);
            });

        return project;
    }),

    getProjects: protectedProcedure.query(async ({ ctx }) => {
        const cacheKey = `projects:user:${ctx.user.userId}`;
        const cached = serverCache.get<any[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const projects = await ctx.db.project.findMany({
            where: {
                userToProjects: {
                    some: {
                        userId: ctx.user.userId!
                    }
                },
                deletedAt: null
            },
            include: {
                userToProjects: {
                    where: {
                        userId: ctx.user.userId!
                    }
                }
            }
        });

        // Cache for 30 seconds
        serverCache.set(cacheKey, projects, 30 * 1000);
        return projects;
    }),

    getCommits: protectedProcedure.input(
        z.object({
            projectId: z.string().trim().min(1)
        })
    ).query(async ({ ctx, input }) => {
        return await ctx.db.commit.findMany({
            where: {
                projectId: input.projectId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }),

    syncProject: protectedProcedure.input(
        z.object({
            projectId: z.string().trim().min(1)
        })
    ).mutation(async ({ ctx, input }) => {
        const user = await ctx.db.user.findUnique({ where: { id: ctx.user.userId! } });
        if (!user || user.credits < 15) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Insufficient credits: You need 15 credits to sync a repository. You currently have ${user?.credits ?? 0} credits. Please top up on the Billing page.`
            });
        }

        const project = await ctx.db.project.findUnique({
            where: { id: input.projectId },
            select: { githubUrl: true, githubToken: true }
        });

        if (!project) {
            throw new Error("Project not found");
        }

        // Deduct 15 credits
        await ctx.db.user.update({
            where: { id: ctx.user.userId! },
            data: { credits: { decrement: 15 } }
        });

        // 1. Set indexing flag to true
        await ctx.db.project.update({
            where: { id: input.projectId },
            data: { isIndexing: true }
        });

        serverCache.invalidate(`projects:user:${ctx.user.userId}`);

        // 2. Poll commits synchronously so that commits list updates immediately
        await pollCommits(input.projectId);

        // 3. Trigger codebase indexing in the background asynchronously
        indexGithubRepo(input.projectId, project.githubUrl, project.githubToken ?? undefined)
            .then(async () => {
                await ctx.db.project.update({
                    where: { id: input.projectId },
                    data: { isIndexing: false }
                });
                serverCache.invalidate(`projects:user:${ctx.user.userId}`);
                console.log(`Sync indexing successfully completed for project: ${input.projectId}`);
            })
            .catch(async (err) => {
                await ctx.db.project.update({
                    where: { id: input.projectId },
                    data: { isIndexing: false }
                });
                serverCache.invalidate(`projects:user:${ctx.user.userId}`);
                console.error(`Sync indexing failed for project: ${input.projectId}`, err);
            });

        return { success: true };
    }),

    saveAnswer: protectedProcedure.input(
        z.object({
            projectId: z.string().trim().min(1),
            question: z.string().trim().min(1).max(2000),
            answer: z.string().trim().min(1),
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
        });
    }),

    getQuestions: protectedProcedure.input(
        z.object({
            projectId: z.string().trim().min(1)
        })
    ).query(async ({ ctx, input }) => {
        return await ctx.db.question.findMany({
            where: {
                projectId: input.projectId,
            },
            include: {
                user: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }),

    uploadMeeting: protectedProcedure.input(
        z.object({
            projectId: z.string().trim().min(1),
            meetingUrl: z.string().trim().url(),
            name: z.string().trim().min(1).max(200)
        })
    ).mutation(async ({ ctx, input }) => {
        const user = await ctx.db.user.findUnique({ where: { id: ctx.user.userId! } });
        if (!user || user.credits < 100) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Insufficient credits: You need 100 credits to process a meeting recording. You currently have ${user?.credits ?? 0} credits. Please top up on the Billing page.`
            });
        }

        // Deduct 100 credits
        await ctx.db.user.update({
            where: { id: ctx.user.userId! },
            data: { credits: { decrement: 100 } }
        });

        const meeting = await ctx.db.meeting.create({
            data: {
                projectId: input.projectId,
                meetingUrl: input.meetingUrl,
                name: input.name,
                status: "PROCESSING"
            }
        });

        // Fire AssemblyAI processing in the background (non-blocking)
        processMeeting(meeting.id, input.meetingUrl)
            .then(() => {
                console.log(`[AssemblyAI] Meeting processing completed: ${meeting.id}`);
            })
            .catch((err) => {
                console.error(`[AssemblyAI] Meeting processing failed: ${meeting.id}`, err);
            });

        return meeting;
    }),

    getMeetings: protectedProcedure.input(
        z.object({
            projectId: z.string().trim().min(1)
        })
    ).query(async ({ ctx, input }) => {
        return await ctx.db.meeting.findMany({
            where: {
                projectId: input.projectId
            },
            include: {
                issues: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }),

    getMeetingById: protectedProcedure.input(
        z.object({
            meetingId: z.string().trim().min(1)
        })
    ).query(async ({ ctx, input }) => {
        return await ctx.db.meeting.findUnique({
            where: {
                id: input.meetingId
            },
            include: {
                issues: {
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        });
    }),

    getTeamMembers: protectedProcedure.input(
        z.object({
            projectId: z.string().trim().min(1)
        })
    ).query(async ({ ctx, input }) => {
        const cacheKey = `members:project:${input.projectId}`;
        const cached = serverCache.get<any[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const members = await ctx.db.userToProject.findMany({
            where: {
                projectId: input.projectId
            },
            include: {
                user: true
            }
        });

        // Cache for 60 seconds
        serverCache.set(cacheKey, members, 60 * 1000);
        return members;
    }),

    getProjectByInviteCode: protectedProcedure.input(
        z.object({
            inviteCode: z.string().trim().min(1)
        })
    ).query(async ({ ctx, input }) => {
        const cacheKey = `invite:${input.inviteCode}`;
        const cached = serverCache.get<any>(cacheKey);
        if (cached) {
            return cached;
        }

        const project = await ctx.db.project.findUnique({
            where: { inviteCode: input.inviteCode },
            select: { id: true, name: true, githubUrl: true }
        });

        if (project) {
            serverCache.set(cacheKey, project, 5 * 60 * 1000);
        }
        return project;
    }),

    joinProject: protectedProcedure.input(
        z.object({
            inviteCode: z.string().trim().min(1)
        })
    ).mutation(async ({ ctx, input }) => {
        const project = await ctx.db.project.findUnique({
            where: { inviteCode: input.inviteCode }
        });
        if (!project) {
            throw new Error("Invalid invite code");
        }

        const existingMembership = await ctx.db.userToProject.findUnique({
            where: {
                userId_projectId: {
                    userId: ctx.user.userId!,
                    projectId: project.id
                }
            }
        });

        if (!existingMembership) {
            await ctx.db.userToProject.create({
                data: {
                    userId: ctx.user.userId!,
                    projectId: project.id,
                    role: "MEMBER"
                }
            });
        }

        // Invalidate cached lists for user & project members
        serverCache.invalidate(`projects:user:${ctx.user.userId}`);
        serverCache.invalidate(`members:project:${project.id}`);

        return project;
    }),

    leaveProject: protectedProcedure.input(
        z.object({
            projectId: z.string().trim().min(1)
        })
    ).mutation(async ({ ctx, input }) => {
        const membership = await ctx.db.userToProject.findUnique({
            where: {
                userId_projectId: {
                    userId: ctx.user.userId!,
                    projectId: input.projectId
                }
            }
        });

        if (!membership) {
            throw new Error("You are not a member of this project");
        }

        if (membership.role === "CREATOR") {
            throw new Error("Creators cannot leave the project. Delete the project instead.");
        }

        await ctx.db.userToProject.delete({
            where: {
                id: membership.id
            }
        });

        // Invalidate cached lists for user & project members
        serverCache.invalidate(`projects:user:${ctx.user.userId}`);
        serverCache.invalidate(`members:project:${input.projectId}`);

        return { success: true };
    }),

    deleteProject: protectedProcedure.input(
        z.object({
            projectId: z.string().trim().min(1)
        })
    ).mutation(async ({ ctx, input }) => {
        // Verify the user owns this project as CREATOR
        const membership = await ctx.db.userToProject.findFirst({
            where: {
                projectId: input.projectId,
                userId: ctx.user.userId!
            }
        });

        if (!membership) {
            throw new Error("Project not found or you do not have access.");
        }

        if (membership.role !== "CREATOR") {
            throw new Error("Only the creator of this project can delete it.");
        }

        // Get all meeting IDs for this project (needed to delete child issues)
        const meetings = await ctx.db.meeting.findMany({
            where: { projectId: input.projectId },
            select: { id: true }
        });
        const meetingIds = meetings.map(m => m.id);

        // Cascading delete in a transaction — children first, parent last
        await ctx.db.$transaction([
            // 1. Delete all Issues (children of Meetings)
            ctx.db.issue.deleteMany({
                where: { meetingId: { in: meetingIds } }
            }),
            // 2. Delete all Meetings
            ctx.db.meeting.deleteMany({
                where: { projectId: input.projectId }
            }),
            // 3. Delete all saved Questions / Answers
            ctx.db.question.deleteMany({
                where: { projectId: input.projectId }
            }),
            // 4. Delete all Commits
            ctx.db.commit.deleteMany({
                where: { projectId: input.projectId }
            }),
            // 5. Delete all SourceCodeEmbeddings
            ctx.db.sourceCodeEmbeddings.deleteMany({
                where: { projectId: input.projectId }
            }),
            // 6. Delete UserToProject links
            ctx.db.userToProject.deleteMany({
                where: { projectId: input.projectId }
            }),
            // 7. Delete the Project itself
            ctx.db.project.delete({
                where: { id: input.projectId }
            }),
        ]);

        // Invalidate cached lists for user & project members
        serverCache.invalidate(`projects:user:${ctx.user.userId}`);
        serverCache.invalidate(`members:project:${input.projectId}`);

        return { success: true };
    }),
});