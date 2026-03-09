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
      "Create a new product in Shopify. Always set status to 'active' so it is immediately live. Always include price and description.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Product title." },
        description: { type: "STRING", description: "Product description (HTML allowed). Generate one if not provided by the user." },
        price: { type: "NUMBER", description: "Price in dollars. Ask the user if not known." },
        status: { type: "STRING", description: "Product status. Always pass 'active' to publish immediately." },
        tags: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Product tags.",
        },
        imageUrls: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Image URLs to attach. Pass the imageUrl from generate_product_image or mockupUrls from printify_generate_mockups.",
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
      "Read or update inventory levels for a product. Location ID is auto-fetched if not provided. Pass productId (from shopify_list_products) to auto-resolve the inventory item.",
    parameters: {
      type: "OBJECT",
      properties: {
        action: {
          type: "STRING",
          description: "Either 'read' or 'update'.",
        },
        productId: {
          type: "NUMBER",
          description: "Shopify product ID (numeric). Pass this to auto-resolve the inventory item.",
        },
        inventoryItemId: {
          type: "NUMBER",
          description: "Inventory item ID. Use productId instead if you don't have this.",
        },
        locationId: {
          type: "NUMBER",
          description: "Location ID. Omit to auto-use the store's first active location.",
        },
        available: {
          type: "NUMBER",
          description: "New available stock count (required for action='update').",
        },
        confirmed: {
          type: "BOOLEAN",
          description: "Set true to confirm inventory update.",
        },
      },
      required: ["action"],
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
        productName: {
          type: "STRING",
          description: "Name of the product to generate a listing for (e.g. 'Handmade Ceramic Mug').",
        },
        category: {
          type: "STRING",
          description: "Product category (e.g. 'home decor', 'apparel').",
        },
        targetAudience: {
          type: "STRING",
          description: "Who the product is for (e.g. 'coffee lovers', 'fitness enthusiasts').",
        },
        tone: {
          type: "STRING",
          description: "Listing tone: 'professional', 'playful', 'luxury', 'minimal'.",
        },
      },
      required: ["productName"],
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
    description:
      "Generate a logo or artwork image (clipart, graphic design, illustration) from a text prompt. Use ONLY when the user wants artwork or a logo — NOT when they want a t-shirt, mug, or any physical product mockup. For physical products use printify_generate_mockups instead (optionally chained after this if artwork is needed first).",
    parameters: {
      type: "OBJECT",
      properties: {
        prompt: {
          type: "STRING",
          description: "Describe the logo or artwork to generate (e.g. 'a bold sun graphic', 'minimalist mountain logo').",
        },
        style: {
          type: "STRING",
          description: "Image style: 'studio', 'lifestyle', 'minimal', 'bold'.",
        },
        aspectRatio: {
          type: "STRING",
          description: "Aspect ratio: '1:1', '4:5', '16:9'.",
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
  {
    name: "printify_generate_mockups",
    description:
      "Create a physical product mockup (t-shirt, mug, hoodie, etc.) on Printify using uploaded artwork. Use when the user asks for a product mockup, t-shirt, or merch. If no artwork imageId is provided yet, first call generate_product_image to get one, then pass the imageId here.",
    parameters: {
      type: "OBJECT",
      properties: {
        productTitle: {
          type: "STRING",
          description: "Name for the Printify product (e.g. 'Ali Shamsi Tee').",
        },
        productType: {
          type: "STRING",
          description: "Type of product the user asked for: 'tshirt', 'mug', 'hoodie', 'hat', 'tote', 'poster', 'phone case', 'tank', 'long sleeve'. Always pass this — it determines the correct Printify blueprint.",
        },
        imageId: {
          type: "STRING",
          description: "The imageId returned by generate_product_image. Preferred — pass this instead of base64.",
        },
        imageBase64: {
          type: "STRING",
          description: "Base64-encoded image data (only if imageId is not available).",
        },
        imageUrl: {
          type: "STRING",
          description: "Public URL of the artwork image (alternative to imageId/imageBase64).",
        },
        blueprintId: {
          type: "NUMBER",
          description: "Printify blueprint ID. Default is 6 (Unisex Heavy Cotton Tee). Omit for default.",
        },
      },
      required: ["productTitle"],
    },
  },
  {
    name: "generate_marketing_copy",
    description:
      "Generate marketing copy for a product: Instagram captions, email campaign, Facebook ad, and Twitter posts. Use when the user asks for marketing, promotion, campaign, launch copy, captions, or ad content.",
    parameters: {
      type: "OBJECT",
      properties: {
        productName: {
          type: "STRING",
          description: "The name of the product to generate copy for.",
        },
        productDescription: {
          type: "STRING",
          description: "Optional short description of the product.",
        },
        targetAudience: {
          type: "STRING",
          description: "Who the product is for (e.g. 'fitness enthusiasts', 'young professionals').",
        },
        tone: {
          type: "STRING",
          description: "Tone of voice: 'excited', 'professional', 'playful', 'luxury', 'urgent'.",
        },
        platforms: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Platforms to generate for: 'instagram', 'email', 'facebook_ad', 'twitter'. Defaults to all.",
        },
      },
      required: ["productName"],
    },
  },
];
