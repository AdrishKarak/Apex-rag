/**
 * @file src/app/sync-user/page.tsx
 * @description Next.js Server Component that syncs authenticated Clerk user profile details with the local PostgreSQL database.
 * 
 * WHY IT'S NEEDED:
 * Guarantees that the local `User` record database instance remains in sync with the external Clerk Authentication profiles.
 * This is crucial for verifying project memberships, mapping author profiles, and matching credit ledger balances.
 * 
 * FLOW OF EXECUTION:
 * 1. Checks if a `userId` is present in the current Clerk auth context. If not, redirects to `/sign-in`.
 * 2. Retrieves full user details (first/last names, profile picture URL, and primary email address) from Clerk's API.
 * 3. Step 1: Searches the local DB for a user with the corresponding `userId`.
 *    - If found: Updates name, email address, and profile picture URL inside the local `User` record.
 * 4. Step 2: If NOT found by ID, searches by primary `emailAddress` instead.
 *    - If found by email: Tries to update the local record's primary ID to the new Clerk `userId`.
 *    - Fallback: If primary key updates are prohibited by database adapter triggers, it deletes the old record
 *      and recreates it using the current `userId`.
 * 5. Step 3: If no matches are found, it inserts a brand new `User` record.
 * 6. Redirects the user to the dashboard route.
 * 
 * CONNECTIONS:
 * - Loaded automatically as the post-sign-up / post-sign-in landing page inside Clerk authentication flows.
 * - Initializes rows inside the local `User` table, which is imported and referenced by all database entities.
 */

import { db } from "@/server/db";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const SyncUser = async () => {
    // 1. Resolve Clerk session authentication state
    const { userId } = await auth();
    if (!userId) {
        return redirect("/sign-in");
    }

    // Initialize the Clerk administrative API client context
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Retrieve the user's primary email address
    const emailAddress =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
            ?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

    if (!emailAddress) {
        return redirect("/sign-in");
    }

    // 1. Check if user already exists by Clerk userId
    const userById = await db.user.findUnique({
        where: { id: userId },
    });

    if (userById) {
        // User exists with correct ID -> update user details (including email if updated)
        await db.user.update({
            where: { id: userId },
            data: {
                emailAddress,
                firstName: user.firstName,
                lastName: user.lastName,
                imageUrl: user.imageUrl,
            },
        });
    } else {
        // 2. User not found by ID -> check if user exists by emailAddress
        // This handles cases where user profiles were pre-populated (e.g. via project invites)
        const userByEmail = await db.user.findUnique({
            where: { emailAddress },
        });

        if (userByEmail) {
            // A record exists with this email but under a different ID.
            // Attempt to update its ID to match the current Clerk userId.
            try {
                await db.user.update({
                    where: { emailAddress },
                    data: {
                        id: userId,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        imageUrl: user.imageUrl,
                    },
                });
            } catch {
                // Fallback: If updating primary key fails, delete old record & recreate
                await db.user.delete({ where: { id: userByEmail.id } });
                await db.user.create({
                    data: {
                        id: userId,
                        emailAddress,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        imageUrl: user.imageUrl,
                    },
                });
            }
        } else {
            // 3. Brand new user -> create record
            await db.user.create({
                data: {
                    id: userId,
                    emailAddress,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    imageUrl: user.imageUrl,
                },
            });
        }
    }

    // Redirect to the protected dashboard
    return redirect("/dashboard");
};

export default SyncUser;