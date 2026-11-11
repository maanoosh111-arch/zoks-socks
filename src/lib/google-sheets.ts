import type { PublicProduct, InternalProduct } from "./types";

export interface CatalogResult {
  products: PublicProduct[];
  categories: string[];
  fetchedAt: string;
  fromFallbackCache: boolean;
  error?: string;
}

export interface InternalCatalogResult {
  products: InternalProduct[];
  categories: string[];
  fetchedAt: string;
  fromFallbackCache: boolean;
  error?: string;
}

export interface SheetTabInfo {
  name: string;
  gid: string;
}

const SPREADSHEET_ID = "14G5H-cFTOfmW0dHS_OEbz05cuQTbWuEvn8pMgk81Z88";

const DEFAULT_SHEETS: SheetTabInfo[] = [
  { name: "رجالي", gid: "0" },
  { name: "حريمي", gid: "1399998156" },
  { name: "أطفال", gid: "1715516829" },
  { name: "رياضي", gid: "1419005915" },
];

const CACHE_TTL_MS = 15 * 1000;

let cachedInternalCatalog: {
  data: InternalCatalogResult;
  timestamp: number;
} | null = null;

export const FALLBACK_PRODUCTS: InternalProduct[] = [];

/**
 * Standard RFC-4180 compliant CSV parser that respects newlines and quotes inside cells.
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
      } else if (char === "\r" && nextChar === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        i++;
      } else if (char === "\n" || char === "\r") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function parseNumericPrice(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.-]/g, "").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function parseNumericProfit(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.includes("%")) return null;
  const cleaned = trimmed.replace(/[^\d.-]/g, "").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function extractUrls(rawCells: string[]): string[] {
  const urls: string[] = [];
  for (const cell of rawCells) {
    if (!cell) continue;
    // Discard spreadsheet formula artifacts such as =IMAGE(...)
    if (cell.trim().startsWith("=")) continue;
    const parts = cell
      .split(/[\s,\n\r|;]+/)
      .map((s) => s.trim())
      .filter((s) => s.startsWith("http://") || s.startsWith("https://"));
    for (const url of parts) {
      if (!urls.includes(url)) {
        urls.push(url);
      }
    }
  }
  return urls;
}

/**
 * Dynamically discovers sheet tabs from Google Sheets htmlview page.
 * If dynamic discovery fails or is blocked, falls back to the known tabs.
 */
async function discoverSheetTabs(): Promise<SheetTabInfo[]> {
  try {
    const htmlViewUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/htmlview`;
    const res = await fetch(htmlViewUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    if (res.ok) {
      const html = await res.text();
      const regex = /items\.push\((\{name:\s*"([^"]+)",\s*pageUrl:[^}]+gid:\s*"([0-9]+)"[^}]*\})\);/g;
      const discovered: SheetTabInfo[] = [];
      let m: RegExpExecArray | null;
      while ((m = regex.exec(html)) !== null) {
        discovered.push({ name: m[2], gid: m[3] });
      }
      if (discovered.length > 0) {
        return discovered;
      }
    }
  } catch (err) {
    console.warn("Could not dynamically inspect sheet tabs, using defaults:", err);
  }
  return DEFAULT_SHEETS;
}

/**
 * Fetches and parses a single worksheet tab as a category.
 */
async function fetchSheetProducts(sheet: SheetTabInfo): Promise<InternalProduct[]> {
  const exportUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${sheet.gid}`;
  const response = await fetch(exportUrl, {
    cache: "no-store",
    headers: {
      Accept: "text/csv,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Google Sheet tab "${sheet.name}" returned HTTP ${response.status}`);
  }

  const csvText = await response.text();
  if (!csvText || !csvText.trim()) {
    return [];
  }

  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return [];
  }

  const headerRow = rows[0].map((h) => h.trim().toLowerCase());
  const colIndex = {
    productName: headerRow.findIndex((h) => h.includes("product") || h.includes("اسم")),
    price: headerRow.findIndex((h) => h.includes("price") || h.includes("سعر")),
    cost: headerRow.findIndex((h) => h.includes("cost") || h.includes("تكلفة")),
    profit: headerRow.findIndex((h) => h.includes("profit") || h.includes("ربح")),
    description: headerRow.findIndex((h) => h.includes("description") || h.includes("وصف")),
    primaryImage: headerRow.findIndex((h) => h.includes("primary")),
    prev: headerRow.findIndex((h) => h === "prev" || h.includes("prev")),
    extraImages: headerRow.findIndex((h) => h.includes("extra")),
  };

  if (colIndex.productName === -1 || colIndex.price === -1) {
    // If headers don't have product/price by name, fallback to standard column positions:
    // col 0 = Product Name, col 1 = Price, col 2 = Cost, col 3 = Profit, col 4 = Description
    if (colIndex.productName === -1) colIndex.productName = 0;
    if (colIndex.price === -1) colIndex.price = 1;
    if (colIndex.cost === -1) colIndex.cost = 2;
    if (colIndex.profit === -1) colIndex.profit = 3;
    if (colIndex.description === -1) colIndex.description = 4;
  }

  const categoryProducts: InternalProduct[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => !c.trim())) continue;

    const rawName = (row[colIndex.productName] ?? "").trim();
    const rawPrice = (row[colIndex.price] ?? "").trim();

    if (!rawName || !rawPrice) continue;

    const price = parseNumericPrice(rawPrice);
    if (price === null) continue;

    const rawCost = colIndex.cost !== -1 ? row[colIndex.cost] : undefined;
    const cost = parseNumericProfit(rawCost);

    const rawProfit = colIndex.profit !== -1 ? row[colIndex.profit] : undefined;
    let profit = parseNumericProfit(rawProfit);

    // If profit is not directly in the sheet or empty, but cost exists: profit = price - cost
    if (profit === null && cost !== null && price !== null) {
      profit = price - cost;
    }

    const description =
      colIndex.description !== -1 ? (row[colIndex.description] ?? "").trim() : "";

    // 1. Primary image: check primaryImage column first
    let primaryImage = "";
    if (colIndex.primaryImage !== -1) {
      const urls = extractUrls([row[colIndex.primaryImage] ?? ""]);
      if (urls.length > 0) primaryImage = urls[0];
    }

    // Fallback: If primaryImage is missing but "prev" column contains an image URL directly (e.g. in some sheets)
    if (!primaryImage && colIndex.prev !== -1) {
      const urls = extractUrls([row[colIndex.prev] ?? ""]);
      if (urls.length > 0) primaryImage = urls[0];
    }

    // Fallback: Check column 4 if still empty
    if (!primaryImage && row[4]) {
      const urls = extractUrls([row[4]]);
      if (urls.length > 0) primaryImage = urls[0];
    }

    // 2. Extra images: gather all trailing columns starting from extraImages column (or after prev)
    // NEVER include the "Prev" column in extra images
    const extraCells: string[] = [];
    const startExtra =
      colIndex.extraImages !== -1
        ? colIndex.extraImages
        : colIndex.prev !== -1
        ? colIndex.prev + 1
        : 6;

    for (let c = startExtra; c < row.length; c++) {
      if (c !== colIndex.prev) {
        extraCells.push(row[c] ?? "");
      }
    }

    const extraImages = extractUrls(extraCells).filter((u) => u !== primaryImage);
    const allImages = primaryImage ? [primaryImage, ...extraImages] : [...extraImages];

    const id = `${sheet.name}__${rawName}__${i}`
      .toLowerCase()
      .replace(/\s+/g, "-");

    categoryProducts.push({
      id,
      category: sheet.name,
      name: rawName,
      price,
      priceFormatted: `${price}`,
      cost,
      profit,
      description,
      image: primaryImage,
      extraImages,
      allImages,
    });
  }

  return categoryProducts;
}

export async function fetchInternalCatalog(options?: {
  forceFresh?: boolean;
}): Promise<InternalCatalogResult> {
  const now = Date.now();
  if (
    !options?.forceFresh &&
    cachedInternalCatalog &&
    now - cachedInternalCatalog.timestamp < CACHE_TTL_MS
  ) {
    return cachedInternalCatalog.data;
  }

  try {
    const sheetTabs = await discoverSheetTabs();
    const sheetResults = await Promise.allSettled(
      sheetTabs.map((sheet) => fetchSheetProducts(sheet))
    );

    const allProducts: InternalProduct[] = [];
    const categories: string[] = [];

    sheetResults.forEach((res, index) => {
      const tab = sheetTabs[index];
      if (res.status === "fulfilled") {
        allProducts.push(...res.value);
        if (res.value.length > 0 || !categories.includes(tab.name)) {
          categories.push(tab.name);
        }
      } else {
        console.error(`Error loading sheet tab "${tab.name}":`, res.reason);
      }
    });

    if (allProducts.length === 0) {
      throw new Error("No products could be parsed from any of the sheets.");
    }

    const result: InternalCatalogResult = {
      products: allProducts,
      categories,
      fetchedAt: new Date().toISOString(),
      fromFallbackCache: false,
    };

    cachedInternalCatalog = {
      data: result,
      timestamp: now,
    };

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Error fetching sheet";
    if (cachedInternalCatalog) {
      return {
        ...cachedInternalCatalog.data,
        fromFallbackCache: true,
        error: errorMsg,
      };
    }

    return {
      products: [],
      categories: [],
      fetchedAt: new Date().toISOString(),
      fromFallbackCache: true,
      error: errorMsg,
    };
  }
}

export function stripProfitFromProduct(p: InternalProduct): PublicProduct {
  return {
    id: p.id,
    category: p.category,
    name: p.name,
    price: p.price,
    priceFormatted: p.priceFormatted,
    description: p.description,
    image: p.image,
    extraImages: p.extraImages,
    allImages: p.allImages,
  };
}

export async function fetchPublicCatalog(options?: {
  forceFresh?: boolean;
}): Promise<CatalogResult> {
  const internal = await fetchInternalCatalog(options);
  return {
    products: internal.products.map(stripProfitFromProduct),
    categories: internal.categories,
    fetchedAt: internal.fetchedAt,
    fromFallbackCache: internal.fromFallbackCache,
    error: internal.error,
  };
}
