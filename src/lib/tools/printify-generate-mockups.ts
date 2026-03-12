import { printifyRequest } from "@/lib/printify/client";
import { ToolExecutionResult } from "@/lib/tools/types";
import { getImage } from "@/lib/tools/image-store";

export interface PrintifyGenerateMockupsInput {
  productTitle: string;
  productType?: string;
  imageId?: string;
  imageBase64?: string;
  imageUrl?: string;
  blueprintId?: number;
}

export interface PrintifyMockupsOutput {
  printifyProductId: string;
  mockupUrls: string[];
  productTitle: string;
  blueprintId: number;
}

interface PrintifyUploadResponse {
  id: string;
  file_name: string;
  preview_url: string;
}

interface PrintifyPrintProvider {
  id: number;
  title: string;
}

interface PrintifyVariant {
  id: number;
  title: string;
}

interface PrintifyVariantsResponse {
  id: number;
  variants: PrintifyVariant[];
}

interface PrintifyProductResponse {
  id: string;
  title: string;
  images: Array<{ src: string; is_default: boolean }>;
}

// Default blueprint: Unisex Heavy Cotton Tee (Gildan 5000)
const DEFAULT_BLUEPRINT_ID = 6;

// Keyword hints for common product types → Printify blueprint title search
const PRODUCT_TYPE_KEYWORDS: Record<string, string> = {
  mug: "mug",
  cup: "mug",
  hoodie: "hoodie",
  sweatshirt: "hoodie",
  hat: "hat",
  cap: "cap",
  tote: "tote",
  bag: "tote",
  phone: "phone case",
  case: "phone case",
  poster: "poster",
  print: "poster",
  tank: "tank",
  "long sleeve": "long sleeve",
};

interface PrintifyCatalogBlueprint {
  id: number;
  title: string;
}

async function findBlueprintByType(productType: string): Promise<number> {
  const keyword = Object.entries(PRODUCT_TYPE_KEYWORDS).find(([k]) =>
    productType.toLowerCase().includes(k),
  )?.[1];

  if (!keyword) return DEFAULT_BLUEPRINT_ID;

  const blueprints = await printifyRequest<PrintifyCatalogBlueprint[]>(
    "/catalog/blueprints.json",
  );

  const match = blueprints.find((b) =>
    b.title.toLowerCase().includes(keyword),
  );

  return match?.id ?? DEFAULT_BLUEPRINT_ID;
}

async function uploadImage(
  imageBase64?: string,
  imageUrl?: string,
  filename = "artwork.png",
): Promise<string> {
  let body: Record<string, string>;

  if (imageBase64) {
    body = { file_name: filename, contents: imageBase64 };
  } else if (imageUrl) {
    body = { file_name: filename, url: imageUrl };
  } else {
    throw new Error("Either imageBase64 or imageUrl must be provided.");
  }

  const result = await printifyRequest<PrintifyUploadResponse>("/uploads/images.json", {
    method: "POST",
    body,
  });

  return result.id;
}

/**
 * Select the first available print provider for the given blueprint.
 * Note: Printify v1 API does not expose a mockup-images catalog endpoint,
 * so all providers return the same flat-lay product shots (front/back).
 * Lifestyle / model mockups are handled separately via AI image generation.
 */
async function selectPrintProvider(blueprintId: number): Promise<number> {
  const providers = await printifyRequest<PrintifyPrintProvider[]>(
    `/catalog/blueprints/${blueprintId}/print_providers.json`,
  );

  if (!providers.length) {
    throw new Error(`No print providers found for blueprint ${blueprintId}.`);
  }

  return providers[0].id;
}

async function getDefaultVariantIds(
  blueprintId: number,
  printProviderId: number,
): Promise<number[]> {
  const response = await printifyRequest<PrintifyVariantsResponse>(
    `/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`,
  );

  // Pick first 4 variants (S, M, L, XL)
  return response.variants
    .slice(0, 4)
    .map((v) => v.id);
}

async function createPrintifyProduct(
  shopId: string,
  title: string,
  blueprintId: number,
  printProviderId: number,
  variantIds: number[],
  uploadedImageId: string,
): Promise<PrintifyProductResponse> {
  const body = {
    title,
    blueprint_id: blueprintId,
    print_provider_id: printProviderId,
    variants: variantIds.map((id) => ({ id, price: 2000, is_enabled: true })),
    print_areas: [
      {
        variant_ids: variantIds,
        placeholders: [
          {
            position: "front",
            images: [
              {
                id: uploadedImageId,
                x: 0.5,
                y: 0.5,
                scale: 0.8,
                angle: 0,
              },
            ],
          },
        ],
      },
    ],
  };

  return printifyRequest<PrintifyProductResponse>(
    `/shops/${shopId}/products.json`,
    { method: "POST", body },
  );
}

/**
 * Printify generates mockup images asynchronously. If the initial product
 * response has fewer than 2 images, poll a few times to let them render.
 */
async function fetchMockupUrls(
  shopId: string,
  productId: string,
  initialUrls: string[],
  maxRetries = 3,
): Promise<string[]> {
  if (initialUrls.length >= 2) return initialUrls;

  for (let i = 0; i < maxRetries; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const product = await printifyRequest<PrintifyProductResponse>(
      `/shops/${shopId}/products/${productId}.json`,
    );
    const urls = product.images.filter((img) => img.src).map((img) => img.src);
    if (urls.length >= 2) return urls;
  }

  return initialUrls;
}

export async function printifyGenerateMockups(
  input: PrintifyGenerateMockupsInput,
): Promise<ToolExecutionResult<PrintifyMockupsOutput>> {
  if (!input.productTitle?.trim()) {
    return {
      status: "error",
      message: "productTitle is required.",
      error: { code: "INVALID_INPUT", details: "`productTitle` must be a non-empty string." },
    };
  }

  // Resolve imageId → base64 from server-side store
  let resolvedBase64 = input.imageBase64;
  if (!resolvedBase64 && input.imageId) {
    const stored = getImage(input.imageId);
    if (stored) resolvedBase64 = stored.base64Data;
  }

  if (!resolvedBase64 && !input.imageUrl) {
    return {
      status: "error",
      message: "either imageId, imageBase64, or imageUrl is required.",
      error: { code: "INVALID_INPUT", details: "Provide imageId, imageBase64, or imageUrl." },
    };
  }

  const shopId = process.env.PRINTIFY_SHOP_ID?.trim();
  if (!shopId) {
    return {
      status: "error",
      message: "printify shop id not configured.",
      error: { code: "MISSING_CONFIG", details: "PRINTIFY_SHOP_ID is not set." },
    };
  }

  const blueprintId =
    input.blueprintId ??
    (input.productType ? await findBlueprintByType(input.productType) : DEFAULT_BLUEPRINT_ID);

  try {
    const uploadedImageId = await uploadImage(
      resolvedBase64,
      input.imageUrl,
      `${input.productTitle.trim().toLowerCase().replace(/\s+/g, "-")}.png`,
    );

    const printProviderId = await selectPrintProvider(blueprintId);
    const variantIds = await getDefaultVariantIds(blueprintId, printProviderId);

    const product = await createPrintifyProduct(
      shopId,
      input.productTitle.trim(),
      blueprintId,
      printProviderId,
      variantIds,
      uploadedImageId,
    );

    const initialUrls = product.images.map((img) => img.src);
    const mockupUrls = await fetchMockupUrls(shopId, product.id, initialUrls);

    return {
      status: "success",
      message: `generated ${mockupUrls.length} mockup(s) for "${product.title}".`,
      data: {
        printifyProductId: product.id,
        mockupUrls,
        productTitle: product.title,
        blueprintId,
      },
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return {
      status: "error",
      message: "failed to generate mockups.",
      error: { code: "PRINTIFY_MOCKUP_FAILED", details },
    };
  }
}
