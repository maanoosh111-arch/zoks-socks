import type { PublicProduct } from "./types";

/**
 * Extracts alphanumeric and hyphen/underscore characters from product name.
 * e.g. "دستة Z-020" -> "Z-020"
 * e.g. "دستة شرابات Nike Sport" -> "Nike-Sport"
 *
 * If no english/latin letters or numbers exist, falls back to sanitized id or default.
 */
export function getProductSlug(product: Pick<PublicProduct, "name" | "id">): string {
  if (!product) return "product";
  const { name, id } = product;
  const matches = name.match(/[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*/g);
  let slug = matches ? matches.join("-") : "";
  if (!slug) {
    slug = id ? id.replace(/[^A-Za-z0-9_-]/g, "") : "";
  }
  return slug || "product";
}

/**
 * Builds the canonical shareable URL for a product, e.g. "https://domain.com/Z-020"
 */
export function getProductShareUrl(product: Pick<PublicProduct, "name" | "id">): string {
  const slug = getProductSlug(product);
  if (typeof window !== "undefined") {
    return `${window.location.origin}/${slug}`;
  }
  return `/${slug}`;
}

/**
 * Normalizes a slug or path string for comparison, stripping leading/trailing slashes and query params.
 */
export function normalizeSlug(str: string): string {
  return str
    .replace(/^\/+|\/+$/g, "")
    .split("?")[0]
    .split("#")[0]
    .trim()
    .toLowerCase();
}

/**
 * Finds matching product given a slug (case-insensitive).
 * Matches by exact slug match first.
 */
export function findProductBySlug(
  products: PublicProduct[],
  rawSlug: string
): PublicProduct | null {
  if (!rawSlug || !products || products.length === 0) return null;
  const target = normalizeSlug(rawSlug);
  if (!target || target === "chef" || target === "api") return null;

  // 1. Direct match with product slug
  for (const product of products) {
    if (getProductSlug(product).toLowerCase() === target) {
      return product;
    }
  }

  // 2. Fallback match with product id
  for (const product of products) {
    if (product.id.toLowerCase() === target) {
      return product;
    }
  }

  return null;
}
