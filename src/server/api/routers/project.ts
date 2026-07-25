import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";

export const projectRouter = createTRPCRouter({
    createProject: protectedProcedure.input().mutation(async ({ ctx, input }) => {
        console.log('hi')
        return true;
    })
})