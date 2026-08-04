import { db } from "@/server/db";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const SyncUser = async () => {
    const { userId } = await auth();
    if (!userId) {
        return redirect("/sign-in");
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

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

    return redirect("/dashboard");
};

export default SyncUser;