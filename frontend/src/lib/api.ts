const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

export type Conversation = {
  id: string;
  session_id: string;
  title: string;
  model: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};

export type ModelConfig = {
  models: string[];
  provider: string;
};

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      data?.detail ||
      `Request failed with status ${response.status}`;

    throw new Error(detail);
  }

  return data as T;
}

export async function getModels(): Promise<ModelConfig> {
  return request<ModelConfig>("/api/chat/models");
}

export async function getConversations(
  sessionId: string,
): Promise<Conversation[]> {
  return request<Conversation[]>(
    `/api/chat/conversations?session_id=${encodeURIComponent(sessionId)}`,
  );
}

export async function createConversation(
  sessionId: string,
  model?: string,
): Promise<Conversation> {
  return request<Conversation>("/api/chat/conversations", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      title: "New conversation",
      model: model || null,
    }),
  });
}

export async function getConversation(
  conversationId: string,
  sessionId: string,
): Promise<{
  conversation: Conversation;
  messages: Message[];
}> {
  return request(
    `/api/chat/conversations/${conversationId}?session_id=${encodeURIComponent(sessionId)}`,
  );
}

export async function sendMessage(
  conversationId: string,
  sessionId: string,
  content: string,
  model?: string,
): Promise<Message[]> {
  return request<Message[]>(
    `/api/chat/conversations/${conversationId}/messages?session_id=${encodeURIComponent(sessionId)}`,
    {
      method: "POST",
      body: JSON.stringify({
        content,
        model: model || null,
      }),
    },
  );
}