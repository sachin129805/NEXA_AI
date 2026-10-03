"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Brain,
  FileText,
  Image,
  MessageSquare,
  Sparkles,
  Upload,
  Workflow,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { appConfig } from "@/config/app";

const quickActions = [
  {
    id: "chat",
    title: "Start a conversation",
    description: "Ask, reason, brainstorm or build.",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    id: "knowledge",
    title: "Explore knowledge",
    description: "Connect your documents and sources.",
    href: "/knowledge",
    icon: FileText,
  },
  {
    id: "images",
    title: "Create an image",
    description: "Turn an idea into a visual.",
    href: "/images",
    icon: Image,
  },
  {
    id: "agents",
    title: "Run an agent",
    description: "Let AI handle a multi-step task.",
    href: "/agents",
    icon: Workflow,
  },
];

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");

  function submitPrompt(event: FormEvent) {
    event.preventDefault();

    const value = prompt.trim();

    if (!value) {
      router.push("/chat");
      return;
    }

    router.push(
      `/chat?prompt=${encodeURIComponent(value)}`,
    );
  }

  return (
    <AppShell>
      <div className="relative min-h-full overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.13),transparent_55%)]" />

        <div className="relative mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[11px] font-medium text-white/45 backdrop-blur">
              <Sparkles
                size={13}
                className="text-violet-300"
              />
              Your intelligent workspace
            </div>

            <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              Think. Create.
              <span className="block bg-gradient-to-r from-white via-violet-200 to-blue-200 bg-clip-text text-transparent">
                Discover.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-sm leading-7 text-white/40 sm:text-base">
              {appConfig.description}
            </p>

            <form
              onSubmit={submitPrompt}
              className="mx-auto mt-9 flex max-w-xl items-center rounded-2xl border border-white/[0.08] bg-white/[0.035] p-2 shadow-2xl shadow-black/20 backdrop-blur-xl transition focus-within:border-violet-400/30"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                <Sparkles size={18} />
              </div>

              <input
                value={prompt}
                onChange={(event) =>
                  setPrompt(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/25"
                placeholder="What would you like to build?"
                aria-label="Start a conversation"
              />

              <button
                type="submit"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-black transition hover:scale-[1.03] hover:bg-white/90 disabled:opacity-40"
                aria-label="Start"
              >
                <ArrowUpRight size={17} />
              </button>
            </form>

            <div className="mt-4 flex justify-center gap-2 text-[10px] text-white/25">
              <span>Ask anything</span>
              <span>·</span>
              <span>Use your knowledge</span>
              <span>·</span>
              <span>Create with AI</span>
            </div>
          </div>

          <section className="mx-auto mt-20 max-w-5xl">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
                  Get started
                </p>

                <h2 className="mt-2 text-lg font-medium tracking-tight text-white/80">
                  What do you want to do?
                </h2>
              </div>

              <Brain
                size={20}
                className="text-white/15"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.id}
                    href={action.href}
                    className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-400/15 hover:bg-white/[0.045]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex size-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035] text-white/55 transition-colors group-hover:text-violet-300">
                        <Icon size={18} />
                      </div>

                      <ArrowUpRight
                        size={15}
                        className="text-white/15 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/50"
                      />
                    </div>

                    <h3 className="mt-5 text-sm font-medium text-white/80">
                      {action.title}
                    </h3>

                    <p className="mt-2 text-xs leading-5 text-white/30">
                      {action.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="mx-auto mt-12 max-w-5xl">
            <div className="rounded-3xl border border-white/[0.07] bg-gradient-to-br from-white/[0.035] to-white/[0.015] p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-violet-300">
                    <Upload size={16} />

                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                      Universal knowledge
                    </span>
                  </div>

                  <h2 className="mt-3 text-xl font-medium tracking-tight text-white/85">
                    Bring your knowledge with you.
                  </h2>

                  <p className="mt-2 max-w-xl text-xs leading-6 text-white/35">
                    Connect documents, conversations,
                    projects and sources so your AI can
                    work with the information that matters
                    to you.
                  </p>
                </div>

                <Link
                  href="/knowledge"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  Open knowledge
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
