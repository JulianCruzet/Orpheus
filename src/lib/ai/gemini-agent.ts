import {
  GoogleGenerativeAI,
  Content,
  Part,
  FunctionCallPart,
} from "@google/generative-ai";
import { toolFunctionDeclarations } from "./tool-schemas";

export type AgentToolCall = {
  kind: "tool_call";
  toolName: string;
  input: Record<string, unknown>;
  thought: string;
};

export type AgentFinal = {
  kind: "final";
  response: string;
};

export type AgentStep = AgentToolCall | AgentFinal;

type ChatMessage = {
  role: string;
  content: string;
};

const SYSTEM_PROMPT = `You are Shams-E, an AI e-commerce copilot. You help users build, manage, and grow their Shopify stores.

Your capabilities (via function calls):
- List, create, and update Shopify products
- Manage inventory levels
- View and manage orders
- Generate AI product listings (title, description, tags, SEO, pricing)
- Research markets and competitors
- Generate product images
- Manage discounts and collections
- Analyze store performance
- Draft customer support responses

Guidelines:
- Be concise and direct. Use lowercase, casual tone.
- When a user asks to do something, use the appropriate tool — don't just describe what you'd do.
- Chain tools when needed (e.g., generate listing → create product).
- For destructive actions (update product, manage inventory), always call with confirmed=true since the system handles confirmation separately.
- If you're unsure what the user wants, ask a clarifying question instead of guessing.
- After tool results come back, summarize what happened in plain language.

Formatting rules:
- Use markdown for structure: **bold** for emphasis, bullet lists for multiple items, line breaks between sections.
- When listing products or data, use a clean bulleted list with each item on its own line.
- Keep responses short — 2-4 sentences for simple answers, bulleted lists for data.
- Never dump raw JSON or IDs to the user. Translate tool results into readable summaries.`;

function convertRole(role: string): "user" | "model" | "function" {
  if (role === "assistant") return "model";
  if (role === "tool") return "function";
  return "user";
}

function buildContents(conversation: ChatMessage[]): Content[] {
  const contents: Content[] = [];

  for (const msg of conversation) {
    if (msg.role === "system") continue;

    const geminiRole = convertRole(msg.role);

    if (geminiRole === "function") {
      // Tool results — parse the JSON content to extract tool name and result
      try {
        const parsed = JSON.parse(msg.content);
        const toolName = parsed.toolName || "unknown_tool";
        contents.push({
          role: "function",
          parts: [
            {
              functionResponse: {
                name: toolName,
                response: parsed,
              },
            } as Part,
          ],
        });
      } catch {
        contents.push({
          role: "function",
          parts: [
            {
              functionResponse: {
                name: "unknown_tool",
                response: { raw: msg.content },
              },
            } as Part,
          ],
        });
      }
      continue;
    }

    // For assistant messages that encode tool_call: or confirmation_required:, convert to model
    if (geminiRole === "model" && msg.content.startsWith("tool_call:")) {
      const toolName = msg.content.slice("tool_call:".length);
      contents.push({
        role: "model",
        parts: [
          {
            functionCall: {
              name: toolName,
              args: {},
            },
          } as unknown as Part,
        ],
      });
      continue;
    }

    if (geminiRole === "model" && msg.content.startsWith("confirmation_required:")) {
      continue; // Skip confirmation markers
    }

    contents.push({
      role: geminiRole,
      parts: [{ text: msg.content }],
    });
  }

  // Merge consecutive same-role entries (Gemini requires alternating roles)
  const merged: Content[] = [];
  for (const c of contents) {
    const last = merged[merged.length - 1];
    if (last && last.role === c.role) {
      last.parts.push(...c.parts);
    } else {
      merged.push({ ...c, parts: [...c.parts] });
    }
  }

  return merged;
}

export async function geminiRespond(
  conversation: ChatMessage[],
): Promise<AgentStep> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[gemini-agent] No GEMINI_API_KEY, falling back to keyword router");
    return fallbackRespond(conversation);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: toolFunctionDeclarations }],
    });

    const contents = buildContents(conversation);

    const result = await model.generateContent({ contents });
    const response = result.response;
    const candidate = response.candidates?.[0];

    if (!candidate || !candidate.content?.parts?.length) {
      return fallbackRespond(conversation);
    }

    // Check for function calls
    const functionCallPart = candidate.content.parts.find(
      (p): p is FunctionCallPart => "functionCall" in p,
    );

    if (functionCallPart) {
      const fc = functionCallPart.functionCall;
      return {
        kind: "tool_call",
        toolName: fc.name,
        input: (fc.args as Record<string, unknown>) ?? {},
        thought: `calling ${fc.name} to handle your request.`,
      };
    }

    // Otherwise extract text
    const textParts = candidate.content.parts
      .filter((p) => "text" in p && typeof p.text === "string")
      .map((p) => (p as { text: string }).text);

    const text = textParts.join("").trim();

    if (!text) {
      return fallbackRespond(conversation);
    }

    return { kind: "final", response: text };
  } catch (error) {
    console.error("[gemini-agent] Gemini call failed, falling back:", error);
    return fallbackRespond(conversation);
  }
}

/* ── Keyword fallback (demo never breaks) ── */

function fallbackRespond(conversation: ChatMessage[]): AgentStep {
  const lastUser = [...conversation]
    .reverse()
    .find((m) => m.role === "user");

  if (!lastUser) {
    return {
      kind: "final",
      response: "hey! tell me what you'd like to do and i'll get started.",
    };
  }

  const text = lastUser.content.toLowerCase();

  // Products — broad matching
  if (text.includes("product") || text.includes("catalog") || text.includes("listing") || text.includes("store items")) {
    if (text.includes("create") || text.includes("new") || text.includes("add") || text.includes("draft") || text.includes("generate")) {
      return {
        kind: "tool_call",
        toolName: "generate_product_listing",
        input: { prompt: lastUser.content },
        thought: "i'll generate product copy first.",
      };
    }
    return {
      kind: "tool_call",
      toolName: "shopify_list_products",
      input: { limit: 10 },
      thought: "let me pull up your product catalog.",
    };
  }

  // Market research
  if (text.includes("market") || text.includes("trend") || text.includes("research") || text.includes("niche")) {
    return {
      kind: "tool_call",
      toolName: "research_market",
      input: { query: lastUser.content },
      thought: "let me research the market for you.",
    };
  }

  // Competitors
  if (text.includes("competitor") || text.includes("competing") || text.includes("rivals")) {
    return {
      kind: "tool_call",
      toolName: "research_competitors",
      input: { query: lastUser.content },
      thought: "analyzing competitor landscape.",
    };
  }

  // Orders
  if (text.includes("order") || text.includes("fulfil") || text.includes("shipment")) {
    return {
      kind: "tool_call",
      toolName: "shopify_manage_orders",
      input: { action: "list", limit: 10 },
      thought: "pulling your recent orders.",
    };
  }

  // Inventory
  if (text.includes("inventory") || text.includes("stock") || text.includes("restock") || text.includes("warehouse")) {
    return {
      kind: "tool_call",
      toolName: "shopify_manage_inventory",
      input: { action: "read", inventoryItemId: 1001, locationId: 2001 },
      thought: "checking inventory levels.",
    };
  }

  // Performance / revenue / analytics
  if (text.includes("performance") || text.includes("analytics") || text.includes("health") || text.includes("revenue") || text.includes("sales") || text.includes("conversion") || text.includes("how am i doing") || text.includes("stats")) {
    return {
      kind: "tool_call",
      toolName: "analyze_store_performance",
      input: {},
      thought: "analyzing your store performance.",
    };
  }

  // Discount / launch / marketing
  if (text.includes("discount") || text.includes("coupon") || text.includes("launch") || text.includes("marketing") || text.includes("campaign")) {
    return {
      kind: "tool_call",
      toolName: "shopify_discounts_collections",
      input: { action: "list_discounts" },
      thought: "checking your discounts and collections.",
    };
  }

  // Customer support
  if (text.includes("customer") || text.includes("support") || text.includes("reply") || text.includes("complaint")) {
    return {
      kind: "tool_call",
      toolName: "draft_customer_response",
      input: { customerMessage: lastUser.content, tone: "friendly" },
      thought: "drafting a customer response.",
    };
  }

  return {
    kind: "final",
    response:
      "i can help with products, market research, competitors, inventory, orders, store analytics, and more. what would you like to do?",
  };
}
