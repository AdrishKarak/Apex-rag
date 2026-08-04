"use client"

import React from "react"
import Image from "next/image"
import Link from "next/link"
import { useUser, UserButton } from "@clerk/nextjs"
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Lenis from "lenis"
import {
  ArrowRight,
  AudioLines,
  Bot,
  Check,
  Code2,
  FileQuestion,
  Layers3,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Users2,
} from "lucide-react"
import { FiGithub } from "react-icons/fi"

const navLinks = [
  { label: "Workflow", href: "#workflow" },
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
]

const productSignals = [
  "GitHub indexing",
  "Codebase Q&A",
  "Commit summaries",
  "Meeting intelligence",
]

const workflow = [
  {
    step: "01",
    title: "Connect a repository",
    copy: "Link a public or private GitHub repository and Apex builds code summaries, commit context, and vector search over the project.",
    icon: FiGithub,
  },
  {
    step: "02",
    title: "Ask with file-level memory",
    copy: "Ask implementation questions and receive answers grounded in referenced source files instead of detached chatbot guesses.",
    icon: FileQuestion,
  },
  {
    step: "03",
    title: "Keep project context current",
    copy: "Sync latest commits, review AI summaries, invite teammates, and attach meeting recordings to the same project workspace.",
    icon: RefreshCw,
  },
]

const capabilities = [
  {
    title: "Repository RAG",
    copy: "Code summaries and embeddings make the repository searchable by intent, not just by exact filenames.",
    icon: Layers3,
  },
  {
    title: "Saved answers",
    copy: "Useful Q&A can be saved into a project history with referenced files for later review.",
    icon: MessageSquareText,
  },
  {
    title: "Meeting summaries",
    copy: "Upload MP3, WAV, or M4A recordings and turn them into transcripts, sections, and actionable notes.",
    icon: AudioLines,
  },
  {
    title: "Team workspace",
    copy: "Invite collaborators into a shared project so onboarding and code exploration happen in one place.",
    icon: Users2,
  },
]

const tokenCosts = [
  ["Project indexing", "150"],
  ["Meeting summary", "100"],
  ["Repository sync", "15"],
  ["AI question", "10"],
]

const introSteps = ["repository", "commits", "questions", "meetings"]

function SmoothScroll() {
  React.useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion) return

    gsap.registerPlugin(ScrollTrigger)

    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
    })

    lenis.on("scroll", ScrollTrigger.update)

    const update = (time: number) => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(update)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(update)
      lenis.destroy()
    }
  }, [])

  return null
}

function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  )
}

function HomeIntroOverlay({ open }: { open: boolean }) {
  const reduceMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] overflow-hidden bg-[#0A0A0A] text-[#FAFAFA]"
          initial={reduceMotion ? false : { opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.55, ease: [0.23, 1, 0.32, 1] }}
        >
          <motion.div
            className="absolute inset-0 bg-[linear-gradient(#2a2a2a_1px,transparent_1px),linear-gradient(90deg,#2a2a2a_1px,transparent_1px)] [background-size:52px_52px] opacity-35"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 0.35 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          />

          <motion.div
            className="absolute inset-x-0 top-0 h-1/2 bg-[#0A0A0A]"
            exit={reduceMotion ? undefined : { y: "-100%" }}
            transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 h-1/2 bg-[#0A0A0A]"
            exit={reduceMotion ? undefined : { y: "100%" }}
            transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
          />

          <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
            <div className="w-full max-w-3xl">
              <motion.div
                className="mb-8 flex items-center justify-between border-b border-white/15 pb-4"
                initial={reduceMotion ? false : { y: 18, opacity: 0 }}
                animate={reduceMotion ? undefined : { y: 0, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center bg-white">
                    <Image src="/logo.svg" alt="Apex logo" width={28} height={28} priority />
                  </div>
                  <div>
                    <div className="text-sm font-semibold tracking-[-0.02em]">Apex</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">memory layer</div>
                  </div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">initializing</div>
              </motion.div>

              <motion.div
                className="grid gap-px bg-white/15 sm:grid-cols-4"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: reduceMotion ? 0 : 0.12,
                      delayChildren: 0.18,
                    },
                  },
                }}
              >
                {introSteps.map((step, index) => (
                  <motion.div
                    key={step}
                    className="relative min-h-28 overflow-hidden bg-[#0A0A0A] p-4"
                    variants={{
                      hidden: reduceMotion ? {} : { y: 22, opacity: 0 },
                      visible: reduceMotion ? {} : { y: 0, opacity: 1 },
                    }}
                    transition={{ duration: 0.62, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">0{index + 1}</div>
                    <div className="mt-8 text-lg font-semibold tracking-[-0.03em]">{step}</div>
                    <motion.div
                      className="absolute bottom-0 left-0 h-px bg-white"
                      initial={reduceMotion ? false : { width: 0 }}
                      animate={reduceMotion ? undefined : { width: "100%" }}
                      transition={{ duration: 0.65, delay: 0.5 + index * 0.12, ease: [0.23, 1, 0.32, 1] }}
                    />
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                className="mt-8 h-px origin-left bg-white"
                initial={reduceMotion ? false : { scaleX: 0 }}
                animate={reduceMotion ? undefined : { scaleX: 1 }}
                transition={{ duration: 1.15, delay: 0.75, ease: [0.23, 1, 0.32, 1] }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AnimatedHeadline({ text }: { text: string }) {
  const reduceMotion = useReducedMotion()
  const words = text.split(" ")

  if (reduceMotion) {
    return (
      <h1 className="max-w-4xl text-[clamp(3rem,7vw,6.4rem)] font-semibold leading-[0.88] tracking-[-0.055em]">
        {text}
      </h1>
    )
  }

  return (
    <motion.h1
      className="max-w-4xl text-[clamp(3rem,7vw,6.4rem)] font-semibold leading-[0.88] tracking-[-0.055em]"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.055,
            delayChildren: 1.8,
          },
        },
      }}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="mr-[0.18em] inline-block"
          variants={{
            hidden: { y: "0.7em", opacity: 0, filter: "blur(8px)" },
            visible: { y: 0, opacity: 1, filter: "blur(0px)" },
          }}
          transition={{ duration: 0.72, ease: [0.23, 1, 0.32, 1] }}
        >
          {word}
        </motion.span>
      ))}
    </motion.h1>
  )
}

function SignatureVisual() {
  const reduceMotion = useReducedMotion()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 90, damping: 18 })
  const springY = useSpring(mouseY, { stiffness: 90, damping: 18 })
  const rotateX = useTransform(springY, [-0.5, 0.5], [4, -4])
  const rotateY = useTransform(springX, [-0.5, 0.5], [-5, 5])

  return (
    <motion.div
      className="relative min-h-[440px] overflow-hidden border border-[#D4D4D4] bg-[#F7F7F7] p-3 sm:min-h-[520px] sm:p-4"
      style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 1100 }}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        mouseX.set((event.clientX - rect.left) / rect.width - 0.5)
        mouseY.set((event.clientY - rect.top) / rect.height - 0.5)
      }}
      onMouseLeave={() => {
        mouseX.set(0)
        mouseY.set(0)
      }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(#e4e4e4_1px,transparent_1px),linear-gradient(90deg,#e4e4e4_1px,transparent_1px)] [background-size:48px_48px] opacity-70" />
      <motion.div
        className="absolute inset-y-0 w-24 bg-linear-to-r from-transparent via-white/80 to-transparent"
        initial={reduceMotion ? false : { x: "-35%" }}
        animate={reduceMotion ? undefined : { x: "720%" }}
        transition={{ duration: 3.8, repeat: Infinity, repeatDelay: 0.8, ease: [0.77, 0, 0.175, 1] }}
      />
      <motion.div
        className="absolute left-8 top-8 right-8 flex items-center justify-between border border-[#D4D4D4] bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5C5C5C]"
        initial={reduceMotion ? false : { y: -18, opacity: 0 }}
        animate={reduceMotion ? undefined : { y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
      >
        <span>apex index</span>
          <span className="flex items-center gap-2">
          <motion.span
            className="size-1.5 rounded-full bg-[#171717]"
            animate={reduceMotion ? undefined : { opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
          />
          live
        </span>
      </motion.div>

      <div className="absolute left-8 top-24 w-[46%] space-y-2">
        {["src/app/dashboard/page.tsx", "project.router.ts", "meeting-card.tsx", "commit-log.tsx"].map((file, index) => (
          <motion.div
            key={file}
            className="flex items-center justify-between border border-[#D4D4D4] bg-white px-3 py-3 text-xs text-[#171717]"
            initial={reduceMotion ? false : { x: -18, opacity: 0 }}
            animate={reduceMotion ? undefined : { x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.18 + index * 0.08, ease: [0.23, 1, 0.32, 1] }}
          >
            <span className="truncate font-mono">{file}</span>
            <Code2 className="size-3.5 text-[#8A8A8A]" />
            <motion.span
              className="absolute inset-x-0 bottom-0 h-px bg-[#0A0A0A]"
              initial={reduceMotion ? false : { scaleX: 0 }}
              animate={reduceMotion ? undefined : { scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.42 + index * 0.1, ease: [0.23, 1, 0.32, 1] }}
              style={{ transformOrigin: "left" }}
            />
          </motion.div>
        ))}
      </div>

      <motion.div
        className="absolute right-8 top-32 w-[40%] border border-[#0A0A0A] bg-[#0A0A0A] p-4 text-[#FAFAFA]"
        initial={reduceMotion ? false : { scale: 0.96, opacity: 0 }}
        animate={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.28, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="mb-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A8A8A]">
          <span>answer stream</span>
          <Bot className="size-3.5" />
        </div>
        <p className="text-sm leading-6">
          Auth flow starts in <span className="text-white">src/app/layout.tsx</span>, then routes through protected dashboard context.
        </p>
        <div className="mt-5 space-y-2">
          {[70, 92, 54].map((width, index) => (
            <motion.div
              key={width}
              className="h-1 bg-white"
              initial={reduceMotion ? false : { width: 0 }}
              animate={reduceMotion ? undefined : { width: `${width}%` }}
              transition={{ duration: 0.8, delay: 0.75 + index * 0.15, ease: [0.23, 1, 0.32, 1] }}
            />
          ))}
        </div>
      </motion.div>

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 640 520" fill="none" aria-hidden="true">
        <motion.path
          d="M245 210 C330 210 315 250 390 250"
          stroke="#0A0A0A"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={reduceMotion ? undefined : { pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.1, delay: 0.55, ease: [0.23, 1, 0.32, 1] }}
        />
        <motion.path
          d="M205 314 C305 340 360 370 434 360"
          stroke="#8A8A8A"
          strokeWidth="1.5"
          strokeDasharray="4 9"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={reduceMotion ? undefined : { pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.82, ease: [0.23, 1, 0.32, 1] }}
        />
      </svg>

      <div className="absolute bottom-8 left-8 right-8 grid grid-cols-3 border border-[#D4D4D4] bg-white">
        {[
          ["2.4k", "chunks"],
          ["186", "commits"],
          ["42", "answers"],
        ].map(([value, label], index) => (
          <motion.div
            key={label}
            className="border-r border-[#E4E4E4] p-4 last:border-r-0"
            initial={reduceMotion ? false : { y: 16, opacity: 0 }}
            animate={reduceMotion ? undefined : { y: 0, opacity: 1 }}
            transition={{ duration: 0.55, delay: 1 + index * 0.08, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="text-2xl font-semibold tracking-[-0.03em] text-[#0A0A0A]">{value}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A8A8A]">{label}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default function Home() {
  const { isSignedIn, isLoaded } = useUser()
  const [scrolled, setScrolled] = React.useState(false)
  const [introOpen, setIntroOpen] = React.useState(true)
  const reduceMotion = useReducedMotion()

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  React.useEffect(() => {
    const duration = reduceMotion ? 450 : 2450
    const timeout = window.setTimeout(() => setIntroOpen(false), duration)
    document.body.style.overflow = "hidden"

    return () => {
      window.clearTimeout(timeout)
      document.body.style.overflow = ""
    }
  }, [reduceMotion])

  React.useEffect(() => {
    if (!introOpen) {
      document.body.style.overflow = ""
    }
  }, [introOpen])

  return (
    <main className="min-h-screen bg-white text-[#0A0A0A]">
      <SmoothScroll />
      <HomeIntroOverlay open={introOpen} />

      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? "border-[#E4E4E4] bg-white/86 backdrop-blur-md"
            : "border-transparent bg-white"
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.9, ease: [0.23, 1, 0.32, 1] }}
          >
          <Link href="/" className="flex items-center gap-2.5 active:scale-[0.98]">
            <Image src="/logo.svg" alt="Apex logo" width={34} height={34} priority />
            <span className="text-sm font-semibold tracking-[-0.02em]">Apex</span>
          </Link>
          </motion.div>
          <motion.div
            className="hidden items-center gap-7 text-sm text-[#5C5C5C] md:flex"
            initial={reduceMotion ? false : { opacity: 0, y: -10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 2, ease: [0.23, 1, 0.32, 1] }}
          >
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors duration-150 hover:text-[#0A0A0A]">
                {link.label}
              </Link>
            ))}
          </motion.div>
          <motion.div
            className="flex items-center gap-2 sm:gap-3"
            initial={reduceMotion ? false : { opacity: 0, y: -10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 2.08, ease: [0.23, 1, 0.32, 1] }}
          >
            {isLoaded && isSignedIn ? (
              <>
                <UserButton />
                <Link
                  href="/dashboard"
                  className="inline-flex h-9 items-center gap-2 bg-[#0A0A0A] px-4 text-sm font-medium text-[#FAFAFA] transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  Open app
                  <ArrowRight className="size-3.5" />
                </Link>
              </>
            ) : (
              <>
                <Link href="/sign-in" className="hidden px-3 py-2 text-sm text-[#5C5C5C] transition-colors hover:text-[#0A0A0A] sm:block">
                  Sign in
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex h-9 items-center gap-2 bg-[#0A0A0A] px-4 text-sm font-medium text-[#FAFAFA] transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  Open app
                  <ArrowRight className="size-3.5" />
                </Link>
              </>
            )}
          </motion.div>
        </nav>
      </header>

      <section className="relative overflow-hidden pt-32 sm:pt-40">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:pb-28">
          <div className="flex flex-col justify-between">
            <Reveal>
              <div className="mb-8 inline-flex items-center gap-2 border border-[#D4D4D4] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5C5C5C]">
                <span className="size-1.5 rounded-full bg-[#0A0A0A]" />
                GitHub RAG workspace
              </div>
              <AnimatedHeadline text="Your codebase, queryable by the whole team." />
              <p className="mt-7 max-w-xl text-[clamp(1rem,1.6vw,1.15rem)] leading-8 tracking-[-0.01em] text-[#5C5C5C]">
                Apex connects to GitHub, indexes repositories, explains commits, answers code questions with file references, and turns meetings into project memory.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/create"
                  className="inline-flex h-11 items-center justify-center gap-2 bg-[#0A0A0A] px-5 text-sm font-medium text-[#FAFAFA] transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  Link a repository
                  <FiGithub className="size-4" />
                </Link>
                <Link
                  href="#product"
                  className="inline-flex h-11 items-center justify-center border border-[#D4D4D4] px-5 text-sm font-medium text-[#171717] transition-colors duration-150 hover:border-[#0A0A0A] hover:bg-[#F7F7F7] active:scale-[0.98]"
                >
                  See the system
                </Link>
              </div>
            </Reveal>

            <Reveal className="mt-14 grid grid-cols-2 gap-px border border-[#E4E4E4] bg-[#E4E4E4] sm:grid-cols-4" delay={0.18} y={16}>
              {productSignals.map((signal) => (
                <div key={signal} className="bg-white px-3 py-4 font-mono text-[10px] uppercase tracking-[0.17em] text-[#5C5C5C]">
                  {signal}
                </div>
              ))}
            </Reveal>
          </div>

          <Reveal delay={0.12} y={18}>
            <SignatureVisual />
          </Reveal>
        </div>
      </section>

      <section className="border-y border-[#E4E4E4] bg-[#F7F7F7]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-[#E4E4E4] px-px md:grid-cols-4">
          {["Next.js", "tRPC", "Prisma", "Groq + Gemini"].map((item) => (
            <div key={item} className="bg-[#F7F7F7] px-5 py-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#5C5C5C]">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <Reveal className="grid gap-8 lg:grid-cols-[0.72fr_1fr]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8A8A8A]">Workflow</p>
            <h2 className="mt-4 text-[clamp(2.3rem,4vw,4.8rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
              From repository URL to working project memory.
            </h2>
          </div>
          <div className="grid gap-px bg-[#D4D4D4]">
            {workflow.map((item, index) => {
              const Icon = item.icon
              return (
                <Reveal key={item.title} delay={index * 0.08} y={18}>
                  <div className="grid gap-6 bg-white p-6 sm:grid-cols-[90px_1fr]">
                    <div className="flex items-start justify-between sm:block">
                      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8A8A8A]">{item.step}</div>
                      <Icon className="mt-4 size-5 text-[#171717]" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold tracking-[-0.03em]">{item.title}</h3>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5C5C5C]">{item.copy}</p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </Reveal>
      </section>

      <section id="product" className="bg-[#0A0A0A] py-24 text-[#FAFAFA]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8A8A8A]">Product surface</p>
              <h2 className="mt-4 text-[clamp(2.2rem,4.7vw,5.3rem)] font-semibold leading-[0.92] tracking-[-0.05em]">
                One place for code, commits, questions, and calls.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-[#BDBDBD]">
              The protected app already brings dashboard actions, Q&A history, meeting uploads, collaborator access, token accounting, and repository sync into the same project shell.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-px bg-[#333] md:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((item, index) => {
              const Icon = item.icon
              return (
                <Reveal key={item.title} delay={index * 0.06} y={28}>
                  <div className="min-h-64 bg-[#0A0A0A] p-6 transition-colors duration-200 hover:bg-[#171717]">
                    <Icon className="size-5 text-[#FAFAFA]" />
                    <h3 className="mt-10 text-xl font-semibold tracking-[-0.03em]">{item.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-[#BDBDBD]">{item.copy}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
          <Reveal>
            <div className="border border-[#D4D4D4] bg-[#F7F7F7] p-4">
              <div className="border border-[#D4D4D4] bg-white">
                <div className="flex items-center justify-between border-b border-[#E4E4E4] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4" />
                    <span className="text-sm font-semibold tracking-[-0.02em]">Ask Apex AI</span>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A8A8A]">referenced</span>
                </div>
                <div className="grid lg:grid-cols-[1fr_260px]">
                  <div className="p-5">
                    <div className="border border-[#D4D4D4] bg-[#F7F7F7] p-4 text-sm text-[#171717]">
                      Which file should I edit to change repository sync behavior?
                    </div>
                    <div className="mt-5 space-y-3 text-sm leading-7 text-[#5C5C5C]">
                      <p>
                        Start in <span className="font-mono text-[#0A0A0A]">src/server/api/routers/project.ts</span>. The sync mutation handles commit polling, summary generation, and embedding updates for the selected project.
                      </p>
                      <p>
                        The dashboard trigger lives in <span className="font-mono text-[#0A0A0A]">commit-log.tsx</span>, where it calls the mutation and refreshes project state.
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-[#E4E4E4] bg-[#F7F7F7] p-5 lg:border-l lg:border-t-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8A8A8A]">File references</p>
                    <div className="mt-4 space-y-2">
                      {["project.ts", "commit-log.tsx", "use-project.ts"].map((file) => (
                        <div key={file} className="flex items-center justify-between border border-[#D4D4D4] bg-white px-3 py-2 text-xs">
                          <span className="font-mono">{file}</span>
                          <Check className="size-3.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="flex h-full flex-col justify-between border border-[#D4D4D4] p-7">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8A8A8A]">Designed for active repos</p>
                <h2 className="mt-5 text-4xl font-semibold leading-none tracking-[-0.045em] sm:text-5xl">
                  Less searching. More precise edits.
                </h2>
                <p className="mt-5 text-sm leading-7 text-[#5C5C5C]">
                  Apex is useful when a team needs to understand an unfamiliar code path, keep up with commits, or preserve meeting context near the repository it belongs to.
                </p>
              </div>
              <div className="mt-12 grid grid-cols-2 gap-px bg-[#D4D4D4]">
                {[
                  ["4", "core actions"],
                  ["1k", "token/hour cap"],
                  ["50mb", "audio upload"],
                  ["RAG", "grounding layer"],
                ].map(([value, label]) => (
                  <div key={label} className="bg-white p-4">
                    <div className="text-3xl font-semibold tracking-[-0.04em]">{value}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8A8A]">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="pricing" className="border-y border-[#E4E4E4] bg-[#F7F7F7] py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.75fr_1fr] lg:px-8">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8A8A8A]">Demo token model</p>
            <h2 className="mt-4 text-[clamp(2.2rem,4vw,4.6rem)] font-semibold leading-[0.94] tracking-[-0.045em]">
              Costs are visible before the work runs.
            </h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-[#5C5C5C]">
              Billing uses demo tokens with clear rates for indexing, repository sync, Q&A, and meeting summaries.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="border border-[#D4D4D4] bg-white">
              {tokenCosts.map(([label, cost]) => (
                <div key={label} className="grid grid-cols-[1fr_auto] items-center border-b border-[#E4E4E4] px-5 py-5 last:border-b-0">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="font-mono text-sm text-[#5C5C5C]">{cost} tokens</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-[#0A0A0A] px-4 py-24 text-[#FAFAFA] sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-5xl">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8A8A8A]">Start with one repository</p>
              <h2 className="mt-4 max-w-3xl text-[clamp(2.5rem,5vw,5.5rem)] font-semibold leading-[0.9] tracking-[-0.05em]">
                Give your codebase a memory layer.
              </h2>
            </div>
            <Link
              href="/create"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-[#FAFAFA] px-5 text-sm font-medium text-[#0A0A0A] transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
            >
              Create project
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-[#E4E4E4] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-[#5C5C5C] sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="Apex logo" width={30} height={30} />
            <span className="font-semibold tracking-[-0.02em] text-[#0A0A0A]">Apex</span>
          </div>
          <div className="flex flex-wrap gap-5">
            <Link href="/dashboard" className="hover:text-[#0A0A0A]">Dashboard</Link>
            <Link href="/qa" className="hover:text-[#0A0A0A]">Q&A</Link>
            <Link href="/meetings" className="hover:text-[#0A0A0A]">Meetings</Link>
            <Link href="/billing" className="hover:text-[#0A0A0A]">Billing</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
