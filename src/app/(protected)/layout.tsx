import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { UserButton } from "@clerk/nextjs";
import React from "react";
import { AppSidebar } from "./app-sidebar";
import { CreditBadge } from "@/components/credit-badge";
import { ProjectSearch } from "@/components/project-search";

type Props = {
    children: React.ReactNode
}

const layout = ({ children }: Props) => {
    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="w-full flex-1 flex flex-col min-w-0 min-h-screen p-2 sm:p-4">
                <div className="flex items-center justify-between gap-3 border-sidebar-border bg-sidebar border shadow-xs rounded-lg p-2 px-3 sm:px-4">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md">
                        <SidebarTrigger />
                        <ProjectSearch />
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <CreditBadge />
                        <UserButton />
                    </div>
                </div>
                <div className="h-3 sm:h-4"></div>
                {/*Main content*/}
                <div className="border-sidebar-border bg-sidebar border shadow-xs rounded-lg overflow-y-auto flex-1 min-h-[calc(100vh-5.5rem)] p-3 sm:p-6">
                    {children}
                </div>
            </main>
        </SidebarProvider>
    )
}

export default layout