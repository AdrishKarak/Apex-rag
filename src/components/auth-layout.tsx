import React from "react";
import Image from "next/image";

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col lg:flex-row relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-violet-200/15 rounded-full blur-[180px] pointer-events-none" />

      {/* Left side: Showcase Pane (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col justify-between p-12 xl:p-16 border-r border-zinc-200/80 bg-white/60 backdrop-blur-3xl overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4e4e7_1px,transparent_1px),linear-gradient(to_bottom,#e4e4e7_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

        {/* Top: Logo & Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="relative w-9 h-9 flex items-center justify-center bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
            <Image
              src="/logo.svg"
              alt="Apex Logo"
              width={26}
              height={26}
              className="object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-700 bg-clip-text text-transparent">
                Apex
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                RAG AI
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">Query repositories at speed</p>
          </div>
        </div>

        {/* Middle: Beautiful AI Interface Mockup */}
        <div className="relative z-10 my-auto py-10">
          <div className="relative mx-auto max-w-[500px]">
            {/* Outer Decorative Gradient Border */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-indigo-200/50 via-violet-200/20 to-transparent blur-md opacity-75" />

            {/* Main Mockup Card */}
            <div className="relative bg-white border border-zinc-200 rounded-2xl shadow-xl shadow-zinc-200/40 overflow-hidden backdrop-blur-xl">
              {/* Header Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400/30 border border-red-400/40" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/30 border border-yellow-400/40" />
                  <div className="w-3 h-3 rounded-full bg-green-400/30 border border-green-400/40" />
                  <span className="text-xs text-zinc-400 font-mono ml-2">apex-rag://chat-session</span>
                </div>
                <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100/50 rounded-md px-2 py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-[10px] text-indigo-600 font-mono">github:main</span>
                </div>
              </div>

              {/* Chat Content */}
              <div className="p-4 space-y-4 font-mono text-xs text-zinc-600">
                {/* Message 1 (User) */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-500">User</span>
                    <span>•</span>
                    <span className="text-[10px]">Just now</span>
                  </div>
                  <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-2.5 text-zinc-800">
                    How does user synchronization work in our code?
                  </div>
                </div>

                {/* Message 2 (AI Response) */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-violet-500">Apex Assistant</span>
                    <span>•</span>
                    <span className="text-[10px]">Connected to RAG</span>
                  </div>
                  <div className="bg-indigo-50/10 border border-indigo-500/10 rounded-lg p-3 space-y-2.5 text-zinc-650">
                    <p className="leading-relaxed">
                      User synchronization is handled in <span className="text-indigo-600 font-medium">[sync-user/page.tsx](file:///src/app/sync-user/page.tsx)</span>. It performs the following steps:
                    </p>
                    <div className="bg-zinc-950 border border-zinc-800 rounded-md p-2.5 text-[11px] text-zinc-300 overflow-x-auto space-y-1 shadow-sm">
                      <div className="text-zinc-500">// Upserting user into Prisma database</div>
                      <div>await db.user.upsert&#40;&#123;</div>
                      <div className="pl-3">where: &#123; emailAddress &#125;,</div>
                      <div className="pl-3 text-emerald-400">update: &#123; firstName, lastName, imageUrl &#125;,</div>
                      <div className="pl-3 text-indigo-400">create: &#123; id, emailAddress, ... &#125;</div>
                      <div>&#125;&#41;</div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-indigo-600 bg-indigo-50/80 border border-indigo-100/50 rounded px-2 py-1 w-fit">
                      <span>✓ DB connection verified</span>
                      <span>•</span>
                      <span>✓ Syncs profile pic & names</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Glowing Badges overlay */}
            <div className="absolute -bottom-4 -left-6 bg-white border border-zinc-200/80 px-3 py-1.5 rounded-lg shadow-md flex items-center gap-2 animate-bounce [animation-duration:4s]">
              <span className="text-xs text-zinc-700 font-medium">Vector Search Active</span>
            </div>
            <div className="absolute -top-5 -right-5 bg-white border border-zinc-200/80 px-3 py-1.5 rounded-lg shadow-md flex items-center gap-2 animate-bounce [animation-duration:5s]">
              <span className="text-xs text-zinc-700 font-medium">Gemini 1.5 Pro</span>
            </div>
          </div>
        </div>

        {/* Bottom: Feature Points */}
        <div className="relative z-10 grid grid-cols-2 gap-6 xl:gap-8 pt-6 border-t border-zinc-200">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              Semantic Code RAG
            </h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Ask questions across files and commits using natural language.
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              Secure Syncing
            </h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Sync repositories with absolute privacy via Clerk and Octokit.
            </p>
          </div>
        </div>
      </div>

      {/* Right side: Auth Form Pane */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 md:p-16 relative bg-zinc-50">
        {/* Glowing aura directly behind the Clerk component */}
        <div className="absolute w-[350px] h-[350px] bg-indigo-100/30 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10 flex flex-col items-center">
          {/* Mobile Logo (Visible only on mobile/tablet) */}
          <div className="lg:hidden flex flex-col items-center gap-2 mb-8">
            <div className="w-10 h-10 flex items-center justify-center bg-white border border-zinc-200 rounded-xl shadow-sm">
              <Image
                src="/logo.svg"
                alt="Apex Logo"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div className="text-center">
              <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-zinc-950 to-zinc-700 bg-clip-text text-transparent">
                Apex
              </span>
              <p className="text-xs text-zinc-500">Query your Github repositories with AI</p>
            </div>
          </div>

          {/* Clerk Component Wrapper */}
          <div className="w-full flex justify-center">{children}</div>
        </div>
      </div>
    </div>
  );
}
