/* eslint-disable @typescript-eslint/no-explicit-any */

// We define tool schemas as plain objects and cast to FunctionDeclaration[]
// because the Google AI SDK's Schema types are overly strict for optional nested properties.

export const toolFunctionDeclarations: any[] = [
  {
    name: "shopify_list_products",
    description:
      "List products from the connected Shopify store. Use when the user wants to see their catalog.",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: {
          type: "NUMBER",
          description: "Max products to return (default 10).",
        },
      },
    },
  },
  {
    name: "shopify_create_product",
    description:
      "Create a new product in Shopify. Use after generating listing copy.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Product title." },
        description: { type: "STRING", description: "Product description." },
        price: { type: "NUMBER", description: "Price in dollars." },
        tags: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Product tags.",
        },
        confirmed: {
          type: "BOOLEAN",
          description: "Set true to confirm creation.",
        },
      },
      required: ["title", "price"],
    },
  },
  {
    name: "shopify_update_product",
    description: "Update an existing Shopify product's fields.",
    parameters: {
      type: "OBJECT",
      properties: {
        productId: { type: "STRING", description: "Product ID to update." },
        title: { type: "STRING", description: "New title." },
        description: { type: "STRING", description: "New description." },
        price: { type: "NUMBER", description: "New price." },
        tags: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "New tags.",
        },
        confirmed: {
          type: "BOOLEAN",
          description: "Set true to confirm update.",
        },
      },
      required: ["productId"],
    },
  },
  {
    name: "shopify_manage_inventory",
    description:
      "Read or update inventory levels for a product. Action can be 'read' or 'update'.",
    parameters: {
      type: "OBJECT",
      properties: {
        action: {
          type: "STRING",
          description: "Either 'read' or 'update'.",
        },
        inventoryItemId: { type: "NUMBER", description: "Inventory item ID." },
        locationId: { type: "NUMBER", description: "Location ID." },
        available: {
          type: "NUMBER",
          description: "New available count (for update).",
        },
        confirmed: {
          type: "BOOLEAN",
          description: "Set true to confirm inventory update.",
        },
      },
    },
  },
  {
    name: "shopify_manage_orders",
    description: "List or fetch Shopify order details.",
    parameters: {
      type: "OBJECT",
      properties: {
        action: {
          type: "STRING",
          description: "'list' or 'get'.",
        },
        limit: { type: "NUMBER", description: "Max orders to return." },
        orderId: {
          type: "STRING",
          description: "Specific order ID (for get).",
        },
      },
    },
  },
  {
    name: "generate_product_listing",
    description:
      "Generate AI-powered product listing copy including title, description, tags, SEO, and pricing suggestions.",
    parameters: {
      type: "OBJECT",
      properties: {
        prompt: {
          type: "STRING",
          description: "Description of the product to generate a listing for.",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "research_market",
    description:
      "Research market trends, pricing bands, and opportunities for a given niche or product category.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "The market or niche to research.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "research_competitors",
    description:
      "Analyze competitor products, pricing, and positioning patterns.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "The competitor space or product category to analyze.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "generate_product_image",
    description: "Generate a product image from a text prompt.",
    parameters: {
      type: "OBJECT",
      properties: {
        prompt: {
          type: "STRING",
          description: "Describe the product image to generate.",
        },
        style: {
          type: "STRING",
          description: "Image style: 'studio', 'lifestyle', 'flat-lay'.",
        },
        aspectRatio: {
          type: "STRING",
          description: "Aspect ratio: '1:1', '4:3', '16:9'.",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "shopify_discounts_collections",
    description:
      "Manage Shopify discounts and collections. Actions: 'list_discounts', 'create_discount', 'list_collections', 'create_collection'.",
    parameters: {
      type: "OBJECT",
      properties: {
        action: {
          type: "STRING",
          description:
            "Action to perform: list_discounts, create_discount, list_collections, create_collection.",
        },
        title: { type: "STRING", description: "Discount or collection title." },
        percentageOff: {
          type: "NUMBER",
          description: "Discount percentage (for create_discount).",
        },
        confirmed: {
          type: "BOOLEAN",
          description: "Confirm the action.",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "analyze_store_performance",
    description:
      "Analyze store performance metrics and return health insights, recommendations, and a health score.",
    parameters: {
      type: "OBJECT",
      properties: {
        revenueLast30d: {
          type: "NUMBER",
          description: "Revenue in the last 30 days.",
        },
        ordersLast30d: {
          type: "NUMBER",
          description: "Orders in the last 30 days.",
        },
      },
    },
  },
  {
    name: "draft_customer_response",
    description:
      "Draft a professional support reply to a customer message or inquiry.",
    parameters: {
      type: "OBJECT",
      properties: {
        customerMessage: {
          type: "STRING",
          description: "The customer's message to respond to.",
        },
        tone: {
          type: "STRING",
          description: "Tone: 'friendly', 'professional', 'apologetic'.",
        },
      },
      required: ["customerMessage"],
    },
  },
];
