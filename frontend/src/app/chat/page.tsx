"use client";

import {
  ArrowUp,
  ChevronDown,
  FileText,
  Menu,
  MessageSquare,
  Paperclip,
  Plus,
  Sparkles,
  User,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Conversation,
  Message,
  createConversation,
  getConversation,
  getConversations,
  getModels,
} from "@/lib/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

function getSessionId() {
  const key = "nexaai-session-id";
  const existing =
    window.localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();

  window.localStorage.setItem(
    key,
    created,
  );

  return created;
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState("");
  const [conversations, setConversations] =
    useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] =
    useState<Message[]>([]);
  const [models, setModels] =
    useState<string[]>([]);
  const [selectedModel, setSelectedModel] =
    useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const id = getSessionId();

    setSessionId(id);

    async function initialize() {
      try {
        const [
          modelConfig,
          conversationList,
        ] = await Promise.all([
          getModels(),
          getConversations(id),
        ]);

        setModels(modelConfig.models);

        if (modelConfig.models.length > 0) {
          setSelectedModel(
            modelConfig.models[0],
          );
        }

        setConversations(
          conversationList,
        );

        if (conversationList.length > 0) {
          await openConversation(
            conversationList[0].id,
            id,
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not connect to NexaAI.",
        );
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, []);

  async function openConversation(
    conversationId: string,
    currentSessionId = sessionId,
  ) {
    try {
      const result =
        await getConversation(
          conversationId,
          currentSessionId,
        );

      setActiveConversation(
        result.conversation,
      );

      setMessages(result.messages);

      if (result.conversation.model) {
        setSelectedModel(
          result.conversation.model,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load conversation.",
      );
    }
  }

  async function handleNewConversation() {
    if (!sessionId || sending) {
      return;
    }

    try {
      const conversation =
        await createConversation(
          sessionId,
          selectedModel,
        );

      setConversations((current) => [
        conversation,
        ...current,
      ]);

      setActiveConversation(
        conversation,
      );

      setMessages([]);
      setError("");

      textareaRef.current?.focus();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create conversation.",
      );
    }
  }

  async function streamMessage(
    conversation: Conversation,
    content: string,
  ) {
    const response = await fetch(
      `${API_BASE}/api/chat/conversations/${conversation.id}/messages/stream?session_id=${encodeURIComponent(sessionId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          content,
          model: selectedModel,
        }),
      },
    );

    if (!response.ok) {
      let message =
        "Failed to send message.";

      try {
        const data =
          await response.json();

        message =
          data.detail || message;
      } catch {
        // Keep fallback message.
      }

      throw new Error(message);
    }

    if (!response.body) {
      throw new Error(
        "Streaming is not supported by this response.",
      );
    }

    const reader =
      response.body.getReader();

    const decoder =
      new TextDecoder();

    let buffer = "";

    while (true) {
      const {
        value,
        done,
      } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(
        value,
        { stream: true },
      );

      const events =
        buffer.split("\n\n");

      buffer =
        events.pop() || "";

      for (const event of events) {
        const line = event
          .split("\n")
          .find((item) =>
            item.startsWith("data:"),
          );

        if (!line) {
          continue;
        }

        const payload =
          line
            .slice(5)
            .trim();

        if (!payload) {
          continue;
        }

        const data =
          JSON.parse(payload);

        if (
          data.type === "token"
        ) {
          const chunk =
            data.content || "";

          setMessages((current) =>
            current.map(
              (message) => {
                if (
                  message.id !==
                  "__streaming_assistant__"
                ) {
                  return message;
                }

                return {
                  ...message,
                  content:
                    message.content +
                    chunk,
                };
              },
            ),
          );
        }

        if (
          data.type === "done"
        ) {
          const finalMessage =
            data.message;

          setMessages((current) =>
            current.map(
              (message) =>
                message.id ===
                "__streaming_assistant__"
                  ? {
                      ...finalMessage,
                    }
                  : message,
            ),
          );
        }

        if (
          data.type === "error"
        ) {
          throw new Error(
            data.error ||
              "Generation failed.",
          );
        }
      }
    }
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    const content =
      input.trim();

    if (
      !content ||
      sending ||
      !sessionId
    ) {
      return;
    }

    let conversation =
      activeConversation;

    try {
      setSending(true);
      setError("");

      if (!conversation) {
        conversation =
          await createConversation(
            sessionId,
            selectedModel,
          );

        setActiveConversation(
          conversation,
        );

        setConversations(
          (current) => [
            conversation!,
            ...current,
          ],
        );
      }

      const temporaryUserMessage: Message =
        {
          id: `temporary-${Date.now()}`,
          conversation_id:
            conversation.id,
          role: "user",
          content,
          model:
            selectedModel || null,
          input_tokens: null,
          output_tokens: null,
          created_at:
            new Date().toISOString(),
        };

      const streamingAssistant: Message =
        {
          id: "__streaming_assistant__",
          conversation_id:
            conversation.id,
          role: "assistant",
          content: "",
          model:
            selectedModel || null,
          input_tokens: null,
          output_tokens: null,
          created_at:
            new Date().toISOString(),
        };

      setMessages(
        (current) => [
          ...current,
          temporaryUserMessage,
          streamingAssistant,
        ],
      );

      setInput("");

      await streamMessage(
        conversation,
        content,
      );

      const refreshed =
        await getConversations(
          sessionId,
        );

      setConversations(
        refreshed,
      );

      const updated =
        refreshed.find(
          (item) =>
            item.id ===
            conversation!.id,
        );

      if (updated) {
        setActiveConversation(
          updated,
        );
      }

      const finalConversation =
        await getConversation(
          conversation.id,
          sessionId,
        );

      setMessages(
        finalConversation.messages,
      );
    } catch (err) {
      setMessages(
        (current) =>
          current.filter(
            (message) =>
              !message.id.startsWith(
                "temporary-",
              ) &&
              message.id !==
                "__streaming_assistant__",
          ),
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      );
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      event.currentTarget.form?.requestSubmit();
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-1px)] items-center justify-center bg-[#08090b] text-white">
        <div className="flex items-center gap-3 text-sm text-white/50">
          <Sparkles className="h-4 w-4" />
          Initializing NexaAI...
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100vh-1px)] overflow-hidden bg-[#08090b] text-white">
      <aside className="hidden w-[280px] shrink-0 border-r border-white/[0.07] bg-[#0a0b0e] md:flex md:flex-col">
        <div className="flex h-16 items-center justify-between border-b border-white/[0.06] px-4">
          <div>
            <p className="text-sm font-semibold">
              Conversations
            </p>
            <p className="text-[11px] text-white/35">
              Stored in PostgreSQL
            </p>
          </div>

          <button
            onClick={
              handleNewConversation
            }
            className="rounded-lg border border-white/10 bg-white/[0.04] p-2 transition hover:bg-white/[0.08]"
            title="New conversation"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {conversations.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-center">
              <MessageSquare className="mx-auto mb-2 h-4 w-4 text-white/30" />
              <p className="text-xs text-white/40">
                No conversations yet.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map(
                (conversation) => (
                  <button
                    key={
                      conversation.id
                    }
                    onClick={() =>
                      openConversation(
                        conversation.id,
                      )
                    }
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      activeConversation?.id ===
                      conversation.id
                        ? "bg-white/[0.08] text-white"
                        : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <div className="truncate">
                      {
                        conversation.title
                      }
                    </div>

                    <div className="mt-1 text-[10px] text-white/25">
                      {
                        conversation.model ||
                        "NexaAI"
                      }
                    </div>
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.07] px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-white/50 hover:bg-white/[0.05] md:hidden">
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <p className="text-sm font-semibold">
                {
                  activeConversation?.title ||
                  "New conversation"
                }
              </p>

              <p className="text-[11px] text-white/35">
                Universal AI workspace
              </p>
            </div>
          </div>

          <div className="relative">
            <select
              value={selectedModel}
              onChange={(event) =>
                setSelectedModel(
                  event.target.value,
                )
              }
              disabled={sending}
              className="appearance-none rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-3 pr-8 text-xs text-white/70 outline-none transition focus:border-violet-400/40 disabled:opacity-50"
            >
              {models.length ===
              0 ? (
                <option value="">
                  No model configured
                </option>
              ) : (
                models.map(
                  (model) => (
                    <option
                      key={model}
                      value={model}
                      className="bg-[#111217]"
                    >
                      {model}
                    </option>
                  ),
                )
              )}
            </select>

            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {messages.length ===
          0 ? (
            <div className="flex min-h-full items-center justify-center px-6 py-16">
              <div className="w-full max-w-2xl text-center">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/[0.08]">
                  <Sparkles className="h-5 w-5 text-violet-300" />
                </div>

                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  What are we building?
                </h1>

                <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/40">
                  Start a conversation
                  with NexaAI. Your
                  messages are
                  persisted in the
                  NexaAI database.
                </p>

                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    {
                      icon: MessageSquare,
                      title: "Ask anything",
                    },
                    {
                      icon: FileText,
                      title:
                        "Use your knowledge",
                    },
                    {
                      icon: Sparkles,
                      title:
                        "Build with AI",
                    },
                  ].map(
                    (item) => {
                      const Icon =
                        item.icon;

                      return (
                        <button
                          key={
                            item.title
                          }
                          onClick={() =>
                            setInput(
                              item.title ===
                                "Ask anything"
                                ? "Explain how NexaAI should work."
                                : item.title ===
                                    "Use your knowledge"
                                  ? "How can Universal RAG work across my files?"
                                  : "Help me plan a NexaAI feature.",
                            )
                          }
                          className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition hover:border-white/15 hover:bg-white/[0.04]"
                        >
                          <Icon className="mb-3 h-4 w-4 text-violet-300" />

                          <p className="text-xs font-medium text-white/70">
                            {
                              item.title
                            }
                          </p>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
              <div className="space-y-8">
                {messages.map(
                  (message) => (
                    <div
                      key={
                        message.id
                      }
                      className="flex gap-4"
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                          message.role ===
                          "user"
                            ? "border-white/10 bg-white/[0.06]"
                            : "border-violet-400/20 bg-violet-400/[0.08]"
                        }`}
                      >
                        {message.role ===
                        "user" ? (
                          <User className="h-4 w-4 text-white/60" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-violet-300" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 text-xs font-medium text-white/45">
                          {message.role ===
                          "user"
                            ? "You"
                            : "NexaAI"}
                        </div>

                        <div className="whitespace-pre-wrap text-sm leading-7 text-white/80">
                          {message.content}

                          {message.id ===
                            "__streaming_assistant__" &&
                            sending && (
                              <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-violet-300 align-middle" />
                            )}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 px-4 pb-5 pt-3 md:px-6">
          <div className="mx-auto max-w-3xl">
            {error && (
              <div className="mb-3 rounded-xl border border-red-400/20 bg-red-400/[0.05] px-4 py-3 text-xs text-red-200/80">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="relative rounded-2xl border border-white/[0.10] bg-[#111216] shadow-2xl shadow-black/30 transition focus-within:border-violet-400/30"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value,
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                rows={1}
                placeholder="Message NexaAI..."
                disabled={sending}
                className="min-h-[58px] w-full resize-none bg-transparent px-4 pb-14 pt-4 text-sm text-white outline-none placeholder:text-white/25 disabled:opacity-50"
              />

              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                <button
                  type="button"
                  className="rounded-lg p-2 text-white/35 transition hover:bg-white/[0.06] hover:text-white/70"
                  title="Attach files"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                <button
                  type="submit"
                  disabled={
                    !input.trim() ||
                    sending
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-25"
                  title="Send message"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </form>

            <p className="mt-2 text-center text-[10px] text-white/20">
              Enter to send · Shift +
              Enter for a new line
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
