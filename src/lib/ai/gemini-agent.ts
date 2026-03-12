import {
  GoogleGenerativeAI,
  Content,
  Part,
  FunctionCallPart,
  FunctionCallingMode,
} from "@google/generative-ai";
import { toolFunctionDeclarations } from "./tool-schemas";

export type AgentToolCall = {
  kind: "tool_call";
  toolName: string;
  input: Record<string, unknown>;
  thought: string;
};

export type AgentParallelToolCalls = {
  kind: "parallel_tool_calls";
  calls: Omit<AgentToolCall, "kind">[];
};

export type AgentFinal = {
  kind: "final";
  response: string;
};

export type AgentStep = AgentToolCall | AgentParallelToolCalls | AgentFinal;

type ChatMessage = {
  role: string;
  content: string;
};

const SYSTEM_PROMPT = `you are orpheus, an ecommerce copilot. you help users build, manage, and grow their shopify stores.

behavior:
- be action-first: when you have enough information to call a tool, call it immediately — do not re-explain or ask for confirmation unless the action is destructive.
- follow-through rule: if you asked the user a question and they answered it, call the relevant tool immediately. never ignore a direct answer to your own question.
- chain tools when needed. call multiple tools in one turn when they are independent.
- CRITICAL: after tool results come back, check if the user's FULL request is done. if not, call the NEXT tool in the chain. do NOT stop and summarize until everything the user asked for is complete.
- for destructive actions (update product, manage inventory), always call with confirmed=true since the system handles confirmation separately.
- if you're unsure what the user wants, ask a clarifying question instead of guessing.
- after ALL tool calls in the pipeline are complete, summarize everything that happened in plain language.

full pipeline example — "create a graphic, put it on a hoodie, upload to shopify at $29.99 with 10 in stock":
1. generate_product_image (create the artwork) → get imageId and imageUrl
2. printify_generate_mockups (put artwork on hoodie, pass imageId from step 1) → get mockupUrls
3. shopify_create_product (create listing with title, price, status='active', imageUrls from step 2) → get product id
4. shopify_manage_inventory (set stock to 10, action='update', productId from step 3, available=10)
you MUST complete ALL steps the user asked for. do NOT stop after image generation.

CRITICAL FIRST RULE — existing product check:
- when the user mentions a product by name (e.g. 'the hoodie', 'sunset mug', 'flag hoodie'), your FIRST tool call MUST be shopify_list_products to look it up. this applies to ALL requests about existing products: marketing, updates, inventory, campaigns, etc.
- product name matching: when comparing the user's query to shopify_list_products results, use FUZZY matching. ignore emojis, special characters, casing, and extra words in product titles. for example, if the user says "pakistan x philippines flag hoodie" and the catalog has "🇵🇭❤️🇵🇰 Unite! Pakistan x Philippines Flag Hoodie", that IS a match. if any product title contains most of the keywords the user mentioned, treat it as a match.
- NEVER call generate_product_image for a product that already exists in shopify. do not generate new artwork for existing products.
- only call generate_product_image when the user explicitly asks to CREATE something new (e.g. 'design a new logo', 'make me a new t-shirt').

marketing campaign rule — for instagram campaigns, ads, or promotional content:
- for EXISTING products: shopify_list_products (to get product info) → printify_generate_mockups (to get 2-3 lifestyle mockup photos of the product being worn/used) → generate_marketing_copy (with platforms: ["instagram"] for a single caption).
- for NEW products: generate_product_image → printify_generate_mockups → generate_marketing_copy.
- the deliverable is: 2-3 mockup photos + one caption with hashtags. that's it. keep it clean.
- when calling generate_marketing_copy for instagram, always pass platforms: ["instagram"]. only include other platforms if the user explicitly asks for them.

tool selection rules:
- product lookup rule: shopify_update_product and shopify_manage_inventory require a numeric productId. if the user refers to a product by name, first call shopify_list_products to find its ID, then immediately call the update/inventory tool with that ID.
- upload to shopify rule: when the user says 'upload to shopify', 'add to shopify', or 'put it on shopify' — they want shopify_create_product called with the product details you already know. if you need a price, ask once then act immediately on their answer.
- CRITICAL image vs listing distinction:
  - generate_product_image: use when the user asks to "generate an image", "create a graphic", "make a logo", "design artwork", or anything involving VISUAL content. this creates an actual image file.
  - generate_product_listing: use when the user asks for product COPY — titles, descriptions, tags, SEO text, pricing suggestions. this generates TEXT, not images.
  - when the user says "generate" or "create" with words like "image", "photo", "graphic", "logo", "artwork", "design" → always use generate_product_image FIRST.
  - when the user says "generate" or "create" with words like "listing", "copy", "description", "title" → use generate_product_listing.
- printify_generate_mockups: for placing artwork onto physical products (t-shirts, hoodies, mugs). chain after generate_product_image if artwork is needed first.
- shopify_create_product: create a new shopify listing. always pass status='active'. optionally call generate_product_listing first for professional copy, but NOT when the user already provided product details.
- shopify_update_product: change price, title, description, or tags. requires productId — look it up first if not known.
- shopify_manage_inventory: read or update stock levels.
- generate_marketing_copy: captions, email campaigns, ads, promotional content. always pass the specific platforms array (e.g. ["instagram"]). do not default to all platforms unless the user asks for multiple.

formatting:
- keep responses concise and lowercase. never show a generic help menu unless the user explicitly asks what you can do.
- use markdown for structure: **bold** for headings/labels, bullet lists for multiple items, and clear section breaks.
- ABSOLUTELY NO EMOJIS. zero. none. no flags, hearts, sparkles, pointing fingers, fire, stars, or any unicode emoji characters. this is a strict rule with no exceptions. write plain text only.
- NEVER show internal IDs (product IDs, inventory item IDs, variant IDs, etc.) to the user. those are for your internal use only.
- when listing products, format each as: **product name** — $price (stock: N). example:
  - **awesome sunset mug** — $24.00 (stock: 15)
  - **logo tee** — $25.00 (stock: 8)
- when listing orders, format each as: **order #name** — $total (status)
- when showing marketing copy, separate each platform with a bold heading and line breaks:
  **instagram**
  (caption text here)

  **email**
  subject: (subject)
  (body here)

  **facebook ad**
  headline: (headline)
  (body + cta)

  **twitter**
  (tweet text here)
- never dump raw JSON to the user. translate tool results into clean, readable summaries.
- when summarizing tool results, lead with the outcome ("done — created your product"), then show the key details. keep it under 4-5 lines unless the user asked for detail.
- when showing product listings from generate_product_listing, format as:
  **title:** (title)
  **description:** (description)
  **tags:** tag1, tag2, tag3
  **suggested price:** $X.XX
  **seo title:** (meta title)
- when showing market research, format as:
  **summary:** (niche summary)
  **pricing range:** $min — $max
  **top keywords:** keyword1, keyword2, keyword3
  **trend:** (direction)
  **opportunity score:** X/100
  **recommendation:** (recommendation)
- when a tool fails, tell the user what went wrong in plain language and suggest what to try next. never show error codes.`;

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
      const rest = msg.content.slice("tool_call:".length);
      // Format: "toolName:jsonArgs" or legacy "toolName"
      const colonIdx = rest.indexOf(":{");
      const toolName = colonIdx >= 0 ? rest.slice(0, colonIdx) : rest;
      let args: Record<string, unknown> = {};
      if (colonIdx >= 0) {
        try { args = JSON.parse(rest.slice(colonIdx + 1)); } catch { /* keep empty */ }
      }
      contents.push({
        role: "model",
        parts: [
          {
            functionCall: {
              name: toolName,
              args,
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

// Tool groups — map conversation intent to relevant tool subsets.
// Always include a "core" set so the model can chain when needed.
const TOOL_GROUPS: Record<string, string[]> = {
  shopify: [
    "shopify_list_products", "shopify_create_product", "shopify_update_product",
    "shopify_manage_inventory", "shopify_manage_orders", "shopify_discounts_collections",
    "generate_product_listing",
  ],
  creative: [
    "generate_product_image", "printify_generate_mockups", "generate_product_listing",
    "generate_marketing_copy",
  ],
  research: [
    "research_market", "research_competitors", "analyze_store_performance",
  ],
  support: [
    "draft_customer_response",
  ],
};

// Always available so the model can chain across groups.
const ALWAYS_AVAILABLE = new Set([
  "shopify_list_products", "shopify_create_product", "generate_product_listing",
  "generate_product_image", "printify_generate_mockups", "shopify_manage_inventory",
]);

function pickRelevantTools(conversation: ChatMessage[]): string[] | undefined {
  const lastUser = [...conversation].reverse().find((m) => m.role === "user");
  if (!lastUser) return undefined; // send all

  const text = lastUser.content.toLowerCase();
  const matched = new Set<string>(ALWAYS_AVAILABLE);

  const signals: [RegExp, string][] = [
    [/product|catalog|listing|store item|inventory|stock|order|fulfil|discount|coupon|collection|upload.*shopify|add.*shopify|put.*shopify/, "shopify"],
    [/image|logo|artwork|design|mockup|t-?shirt|mug|hoodie|merch|tote|poster|phone case|marketing|caption|campaign|email|ad\b|promo/, "creative"],
    [/market|trend|research|niche|competitor|rival|analytics|performance|revenue|sales|stats/, "research"],
    [/customer|support|reply|complaint|response/, "support"],
  ];

  let anyMatch = false;
  for (const [regex, group] of signals) {
    if (regex.test(text)) {
      for (const tool of TOOL_GROUPS[group]) matched.add(tool);
      anyMatch = true;
    }
  }

  // If nothing matched, send all tools (don't restrict)
  if (!anyMatch) return undefined;

  return Array.from(matched);
}

// ── Conversation compaction ──
// When the conversation exceeds a threshold, summarize older messages into a
// single "summary" user message so the context stays lean.  We keep the most
// recent RECENT_WINDOW messages intact so the model has full fidelity on the
// current exchange.

const COMPACTION_THRESHOLD = 24; // trigger when total messages exceed this
const RECENT_WINDOW = 8;        // always keep the last N messages verbatim

export async function compactConversation(
  conversation: ChatMessage[],
): Promise<ChatMessage[]> {
  // Don't count system messages toward the threshold
  const nonSystem = conversation.filter((m) => m.role !== "system");
  if (nonSystem.length <= COMPACTION_THRESHOLD) return conversation;

  const systemMessages = conversation.filter((m) => m.role === "system");
  const cutoff = nonSystem.length - RECENT_WINDOW;
  const oldMessages = nonSystem.slice(0, cutoff);
  const recentMessages = nonSystem.slice(cutoff);

  // Build a plain-text digest of old messages for the summarizer
  const digest = oldMessages
    .map((m) => {
      if (m.role === "tool") {
        try {
          const parsed = JSON.parse(m.content);
          return `[tool:${parsed.toolName ?? "unknown"}] ${parsed.ok ? "success" : "error"}`;
        } catch {
          return `[tool] ${m.content.slice(0, 100)}`;
        }
      }
      if (m.content.startsWith("tool_call:")) {
        return `[called ${m.content.slice("tool_call:".length)}]`;
      }
      return `${m.role}: ${m.content.slice(0, 200)}`;
    })
    .join("\n");

  // Use Gemini to produce a compact summary
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  let summary: string;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `summarize this conversation history in 3-5 bullet points. focus on: what the user asked for, what tools were called, what the outcomes were. be concise.\n\n${digest}`,
              },
            ],
          },
        ],
      });
      summary =
        result.response.candidates?.[0]?.content?.parts
          ?.map((p) => ("text" in p ? (p as { text: string }).text : ""))
          .join("") ?? "previous conversation context unavailable.";
    } catch (err) {
      console.warn("[compaction] gemini summarization failed, using fallback", err);
      summary = digest.slice(0, 600);
    }
  } else {
    // No API key — just truncate
    summary = digest.slice(0, 600);
  }

  const summaryMessage: ChatMessage = {
    role: "user",
    content: `[conversation summary — earlier messages were compacted]\n${summary}`,
  };

  return [...systemMessages, summaryMessage, ...recentMessages];
}

export async function geminiRespond(
  conversation: ChatMessage[],
): Promise<AgentStep> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    console.warn("[gemini-agent] No GEMINI_API_KEY, falling back to keyword router");
    return fallbackRespond(conversation);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const allowedTools = pickRelevantTools(conversation);

    // Force a tool call (ANY) on the first pass when we have a clear intent
    // match and no tool results yet.  On subsequent iterations keep the same
    // tool subset available but let the model decide whether to call one or
    // respond with text (AUTO) — this allows proper multi-step chaining while
    // still letting the model summarize when it's ready.
    const hasToolResults = conversation.some((m) => m.role === "tool");

    // Gemini API only allows allowedFunctionNames with ANY mode.
    // On the first pass (no tool results yet), use ANY + allowedFunctionNames to force a tool call.
    // On subsequent passes, use AUTO without allowedFunctionNames so the model can chain or summarize.
    const toolConfig = allowedTools && !hasToolResults
      ? {
          functionCallingConfig: {
            mode: FunctionCallingMode.ANY,
            allowedFunctionNames: allowedTools,
          },
        }
      : hasToolResults
        ? { functionCallingConfig: { mode: FunctionCallingMode.AUTO } }
        : undefined;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ functionDeclarations: toolFunctionDeclarations }],
      ...(toolConfig && { toolConfig }),
    });

    const contents = buildContents(conversation);

    const result = await model.generateContent({ contents });
    const response = result.response;
    const candidate = response.candidates?.[0];

    if (!candidate || !candidate.content?.parts?.length) {
      return fallbackRespond(conversation);
    }

    // Check for function calls (Gemini can return multiple in one response)
    const functionCallParts = candidate.content.parts.filter(
      (p): p is FunctionCallPart => "functionCall" in p,
    );

    if (functionCallParts.length === 1) {
      const fc = functionCallParts[0].functionCall;
      return {
        kind: "tool_call",
        toolName: fc.name,
        input: (fc.args as Record<string, unknown>) ?? {},
        thought: `calling ${fc.name} to handle your request.`,
      };
    }

    if (functionCallParts.length > 1) {
      return {
        kind: "parallel_tool_calls",
        calls: functionCallParts.map((p) => ({
          toolName: p.functionCall.name,
          input: (p.functionCall.args as Record<string, unknown>) ?? {},
          thought: `calling ${p.functionCall.name}.`,
        })),
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

  // Image / artwork generation — check BEFORE product matching
  if ((text.includes("image") || text.includes("graphic") || text.includes("logo") || text.includes("artwork") || text.includes("design") || text.includes("photo")) &&
      (text.includes("generate") || text.includes("create") || text.includes("make") || text.includes("design"))) {
    return {
      kind: "tool_call",
      toolName: "generate_product_image",
      input: { prompt: lastUser.content },
      thought: "generating your image.",
    };
  }

  // Mockup — t-shirt, hoodie, mug etc.
  if (text.includes("mockup") || text.includes("t-shirt") || text.includes("tshirt") || text.includes("hoodie") || text.includes("mug") || text.includes("merch")) {
    return {
      kind: "tool_call",
      toolName: "printify_generate_mockups",
      input: { productTitle: lastUser.content, productType: "tshirt" },
      thought: "creating your product mockup.",
    };
  }

  // Products — broad matching
  if (text.includes("product") || text.includes("catalog") || text.includes("listing") || text.includes("store items")) {
    if (text.includes("create") || text.includes("new") || text.includes("add") || text.includes("draft") || text.includes("generate")) {
      return {
        kind: "tool_call",
        toolName: "generate_product_listing",
        input: { productName: lastUser.content },
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
