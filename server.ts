import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fetchPublicCatalog, fetchInternalCatalog } from "./src/lib/google-sheets";
import { fetchOrdersFromSupabase, syncOrderToSupabase, testSupabaseConnection } from "./src/lib/supabase";
import type { Order, OrderItem, PaymentMethod } from "./src/lib/types";

const app = express();
const portArgIndex = process.argv.indexOf("--port");
const argPort = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1], 10) : NaN;
const PORT = !isNaN(argPort) ? argPort : (parseInt(process.env.PORT || "", 10) || 3000);

const hostArgIndex = process.argv.indexOf("--host");
const HOST = hostArgIndex !== -1 ? process.argv[hostArgIndex + 1] : "0.0.0.0";

// Body parsers: allow JSON payloads up to 15mb for receipt screenshots
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Persistent orders file store
const DATA_DIR = path.resolve(process.cwd(), "data");
const ORDERS_FILE = path.resolve(DATA_DIR, "orders.json");
const SETTINGS_FILE = path.resolve(DATA_DIR, "settings.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface AppStore {
  orders: Order[];
  baselineResetAt: string | null;
}

function loadStore(): AppStore {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const raw = fs.readFileSync(ORDERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.orders)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error loading store:", err);
  }

  // Initial seed orders for immediate preview demonstration
  const initialStore: AppStore = {
    baselineResetAt: null,
    orders: [
      {
        id: 1,
        orderCode: "ORD-1001",
        customerId: "cust_demo_1",
        customerName: "محمد عبد الرحمن",
        customerPhone: "01098765432",
        fulfillmentType: "delivery",
        deliveryAddress: "القاهرة، المعادي، شارع 9، عمارة 14 الدور 3",
        notes: "يرجى الاتصال قبل الوصول بنصف ساعة",
        paymentMethod: "vodafone_cash",
        paymentWalletPhone: "01098765432",
        paymentReceiptImage:
          "https://res.cloudinary.com/h74mxqsb/image/upload/v1793911571/Vodafone-Cash_xuedki.png",
        status: "In Progress",
        subtotal: 480,
        deliveryFee: 25,
        discountAmount: 0,
        totalAmount: 505,
        isPaid: true,
        isArchived: false,
        isDeletedFromArchive: false,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        items: [
          {
            id: 1,
            orderId: 1,
            productId: "men__classic__1",
            productName: "دستة شرابات Classic",
            category: "رجالي",
            quantity: 1,
            unitPrice: 300,
            unitProfitSnapshot: 170,
            profitSnapshotAvailable: true,
          },
          {
            id: 2,
            orderId: 1,
            productId: "men__nike__2",
            productName: "دستة شرابات Nike Sport",
            category: "رجالي",
            quantity: 1,
            unitPrice: 180,
            unitProfitSnapshot: 90,
            profitSnapshotAvailable: true,
          },
        ],
      },
      {
        id: 2,
        orderCode: "ORD-1002",
        customerId: "cust_demo_2",
        customerName: "سارة كمال",
        customerPhone: "01234567890",
        fulfillmentType: "delivery",
        deliveryAddress: "الجيزة، الدقي، شارع مصدق، عمارة 22",
        notes: "الدفع نقداً للمندوب عند الاستلام",
        paymentMethod: "cod",
        paymentWalletPhone: null,
        paymentReceiptImage: null,
        status: "Pending",
        subtotal: 240,
        deliveryFee: 25,
        discountAmount: 0,
        totalAmount: 265,
        isPaid: false,
        isArchived: false,
        isDeletedFromArchive: false,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        items: [
          {
            id: 3,
            orderId: 2,
            productId: "women__soft_ankle__4",
            productName: "دستة شرابات حريمي Soft Ankle",
            category: "حريمي",
            quantity: 1,
            unitPrice: 240,
            unitProfitSnapshot: 120,
            profitSnapshotAvailable: true,
          },
        ],
      },
    ],
  };

  saveStore(initialStore);
  return initialStore;
}

let store = loadStore();

function saveStore(data: AppStore) {
  try {
    const tmpFile = `${ORDERS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpFile, ORDERS_FILE);
  } catch (err) {
    try {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Error saving store:", e);
    }
  }

  // Asynchronously attempt to sync updated orders to Supabase if table exists
  Promise.resolve().then(async () => {
    try {
      if (Array.isArray(data.orders) && data.orders.length > 0) {
        // Sync the latest modified order or first 5
        const toSync = data.orders.slice(0, 5);
        for (const order of toSync) {
          await syncOrderToSupabase(order);
        }
      }
    } catch {
      // ignore
    }
  });
}

// Background startup sync with Supabase: load any cloud orders if available
async function initSupabaseSync() {
  try {
    const cloudOrders = await fetchOrdersFromSupabase();
    if (Array.isArray(cloudOrders) && cloudOrders.length > 0) {
      // Merge with local orders, prioritizing latest updates
      const localMap = new Map(store.orders.map((o) => [o.id, o]));
      for (const co of cloudOrders) {
        if (!localMap.has(co.id)) {
          store.orders.push(co);
        }
      }
      saveStore(store);
      console.log(`Synced ${cloudOrders.length} orders from Supabase.`);
    }
  } catch (err) {
    console.warn("Supabase init sync note:", err);
  }
}
initSupabaseSync();

interface ServerStoreSettings {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  note: string;
  deliveryFee: number;
  updatedAt: string;
}

const defaultSettings: ServerStoreSettings = {
  isOpen: true,
  openTime: "10:00 ص",
  closeTime: "11:00 م",
  note: "أهلاً بكم في متجر ZOKS! نسعد بخدمتكم وتوفير أجود أنواع الشرابات.",
  deliveryFee: 25,
  updatedAt: new Date().toISOString(),
};

function loadSettings(): ServerStoreSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (typeof parsed.isOpen === "boolean") {
        return {
          ...defaultSettings,
          ...parsed,
        };
      }
    }
  } catch (err) {
    console.error("Error loading settings:", err);
  }
  return defaultSettings;
}

let storeSettings = loadSettings();

function saveSettings(settings: ServerStoreSettings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving settings:", err);
  }
}

// Helper: Normalize passwords (trim outer whitespace)
function normalizePin(input: string | null | undefined): string {
  if (!input) return "";
  return String(input).trim();
}

function getExpectedChefPin(): string {
  return process.env.CHEF_PIN || "R&O2hAd!62GtyXsT";
}

function isChefAuthorized(req: express.Request): boolean {
  // Check header x-chef-pin
  const pinHeader = req.headers["x-chef-pin"];
  if (pinHeader && normalizePin(String(pinHeader)) === getExpectedChefPin()) {
    return true;
  }

  // Check Bearer token
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token === "token_chef_authorized" || token.includes("chef_authorized")) {
      return true;
    }
  }

  // Check cookie
  const cookieHeader = req.headers.cookie;
  if (cookieHeader && cookieHeader.includes("zoks_chef_session")) {
    return true;
  }

  return false;
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Products catalog
app.get("/api/products", async (req, res) => {
  const forceFresh = req.query.fresh === "1";
  const catalog = await fetchPublicCatalog({ forceFresh });
  res.json({
    products: catalog.products,
    categories: catalog.categories,
    fetchedAt: catalog.fetchedAt,
    fromFallbackCache: catalog.fromFallbackCache,
    error: catalog.error || null,
  });
});

// 1.1 Store Status & Working Hours Settings (Public)
app.get("/api/settings", (req, res) => {
  res.json({
    settings: storeSettings,
  });
});

// 1.2 Update Store Settings (Chef / Admin)
app.post("/api/chef/settings", (req, res) => {
  if (!isChefAuthorized(req)) {
    return res.status(401).json({ error: "غير مصرح لك بتعديل إعدادات المتجر" });
  }

  const { isOpen, openTime, closeTime, note, deliveryFee } = req.body;

  let parsedFee = storeSettings.deliveryFee;
  if (typeof deliveryFee === "number" && !isNaN(deliveryFee) && deliveryFee >= 0) {
    parsedFee = deliveryFee;
  } else if (typeof deliveryFee === "string" && !isNaN(parseFloat(deliveryFee)) && parseFloat(deliveryFee) >= 0) {
    parsedFee = parseFloat(deliveryFee);
  }

  storeSettings = {
    isOpen: typeof isOpen === "boolean" ? isOpen : storeSettings.isOpen,
    openTime: typeof openTime === "string" ? openTime.trim() : storeSettings.openTime,
    closeTime: typeof closeTime === "string" ? closeTime.trim() : storeSettings.closeTime,
    note: typeof note === "string" ? note.trim() : storeSettings.note,
    deliveryFee: parsedFee,
    updatedAt: new Date().toISOString(),
  };

  saveSettings(storeSettings);

  res.json({
    success: true,
    settings: storeSettings,
  });
});

// 2. Customer Session
app.get("/api/session", (req, res) => {
  let customerId = "";
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/zoks_customer_id=([^;]+)/);
    if (match) {
      customerId = match[1];
    }
  }

  if (!customerId) {
    customerId = `cust_${crypto.randomBytes(8).toString("hex")}`;
    res.setHeader(
      "Set-Cookie",
      `zoks_customer_id=${customerId}; Path=/; Max-Age=31536000; SameSite=Lax`
    );
  }

  res.json({
    customerId,
    authenticated: true,
  });
});

// 3. Customer Orders
app.get("/api/orders", (req, res) => {
  // Returns all non-archived orders for customer view
  const visible = store.orders.filter((o) => !o.isDeletedFromArchive);
  // Sort latest first
  const sorted = [...visible].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json({ orders: sorted });
});

// 4. Create Order
app.post("/api/orders", async (req, res) => {
  try {
    if (!storeSettings.isOpen) {
      return res.status(400).json({
        error: `المتجر مغلق حالياً، سيفتح في تمام الساعة ${storeSettings.openTime}. ${storeSettings.note || ""}`.trim(),
      });
    }

    const {
      customerName,
      customerPhone,
      deliveryAddress,
      notes,
      paymentMethod,
      paymentWalletPhone,
      paymentReceiptImage,
      items,
    } = req.body;

    if (!customerName || !customerPhone) {
      return res.status(400).json({ error: "الاسم ورقم الهاتف مطلوبان" });
    }

    if (!deliveryAddress) {
      return res.status(400).json({ error: "عنوان التوصيل بالتفصيل مطلوب" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "يجب اختيار منتج واحد على الأقل" });
    }

    // Require receipt and wallet phone for electronic wallets
    if (
      ["vodafone_cash", "orange_cash", "etisalat_cash", "instapay"].includes(
        paymentMethod
      )
    ) {
      if (!paymentWalletPhone) {
        return res
          .status(400)
          .json({ error: "رقم الهاتف المربوط بالمحفظة مطلوب لإتمام الدفع" });
      }
      if (!paymentReceiptImage) {
        return res
          .status(400)
          .json({ error: "إرفاق صورة إيصال الدفع مطلوب لتأكيد التحويل" });
      }
    }

    // Calculate subtotal
    let subtotal = 0;
    const catalog = await fetchInternalCatalog();

    const orderItems: OrderItem[] = items.map((item: any, idx: number) => {
      const product = catalog.products.find((p) => p.id === item.productId);
      const unitPrice = product ? product.price : Number(item.unitPrice) || 200;
      const profit = product ? product.profit : null;
      const qty = Number(item.quantity) || 1;
      subtotal += unitPrice * qty;

      return {
        id: idx + 1,
        productId: item.productId,
        productName: item.productName || product?.name || "شراب ZOKS",
        category: item.category || product?.category || "عام",
        quantity: qty,
        unitPrice,
        unitProfitSnapshot: profit,
        profitSnapshotAvailable: profit !== null,
        image: item.image || product?.image || "",
      };
    });

    // Home delivery fee dynamically from storeSettings (defaults to 25 EGP)
    const deliveryFee =
      typeof storeSettings.deliveryFee === "number" && storeSettings.deliveryFee >= 0
        ? storeSettings.deliveryFee
        : 25;
    const totalAmount = subtotal + deliveryFee;

    const newId = store.orders.length > 0
      ? Math.max(...store.orders.map((o) => o.id)) + 1
      : 1;
    const orderCode = `ORD-${1000 + newId}`;

    const newOrder: Order = {
      id: newId,
      orderCode,
      customerId: `cust_${crypto.randomBytes(6).toString("hex")}`,
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      fulfillmentType: "delivery", // always delivery
      deliveryAddress: String(deliveryAddress).trim(),
      notes: notes ? String(notes).trim() : null,
      paymentMethod: (paymentMethod as PaymentMethod) || "cod",
      paymentWalletPhone: paymentWalletPhone
        ? String(paymentWalletPhone).trim()
        : null,
      paymentReceiptImage: paymentReceiptImage || null,
      status: "Pending",
      subtotal,
      deliveryFee,
      discountAmount: 0,
      totalAmount,
      isPaid: paymentMethod !== "cod",
      isArchived: false,
      isDeletedFromArchive: false,
      createdAt: new Date().toISOString(),
      items: orderItems,
    };

    store.orders.unshift(newOrder);
    saveStore(store);

    res.status(201).json({
      success: true,
      order: newOrder,
    });
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء حفظ الطلب" });
  }
});

// 5. Chef Auth
app.get("/api/chef/auth", (req, res) => {
  const authorized = isChefAuthorized(req);
  res.json({ authorized });
});

app.post("/api/chef/auth", (req, res) => {
  const rawPin = req.body?.pin;
  const normalized = normalizePin(rawPin);

  if (normalized === getExpectedChefPin()) {
    const token = "token_chef_authorized";
    res.setHeader(
      "Set-Cookie",
      `zoks_chef_session=${token}; Path=/; Max-Age=604800; SameSite=Lax`
    );
    return res.json({
      authorized: true,
      token,
    });
  }

  res.status(401).json({
    authorized: false,
    error: "رمز الدخول غير صحيح",
  });
});

app.delete("/api/chef/auth", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    `zoks_chef_session=; Path=/; Max-Age=0; SameSite=Lax`
  );
  res.json({ authorized: false });
});

// 6. Chef Orders
app.get("/api/chef/orders", (req, res) => {
  if (!isChefAuthorized(req)) {
    return res.status(401).json({ error: "غير مصرح بالوصول إلى لوحة التحكم" });
  }

  const visible = store.orders.filter((o) => !o.isDeletedFromArchive);
  const activeOrders = visible.filter((o) => !o.isArchived);
  const archivedOrders = visible.filter((o) => o.isArchived);

  res.json({
    activeOrders,
    archivedOrders,
  });
});

// 7. Update Order Status
app.patch("/api/chef/orders/:id", (req, res) => {
  if (!isChefAuthorized(req)) {
    return res.status(401).json({ error: "غير مصرح بالوصول" });
  }

  const orderId = Number(req.params.id);
  const action = req.body?.action;

  const order = store.orders.find((o) => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }

  const now = new Date().toISOString();

  if (action === "start") {
    order.status = "In Progress";
    order.startedAt = now;
  } else if (action === "finish") {
    order.status = "Finished";
    order.finishedAt = now;
    order.isPaid = true;
  } else if (action === "reject") {
    order.status = "Rejected";
    order.rejectedAt = now;
    order.rejectionReason = req.body?.reason ? String(req.body.reason).trim() : "تم رفض الطلب بواسطة الإدارة";
  } else if (action === "archive") {
    order.isArchived = true;
    order.archivedAt = now;
  } else if (action === "delete") {
    order.isDeletedFromArchive = true;
    order.archivedDeletedAt = now;
  } else {
    return res.status(400).json({ error: "إجراء غير معروف" });
  }

  saveStore(store);

  res.json({
    success: true,
    order,
  });
});

// 8. Delete archived orders (single, bulk selected, or clear all)
app.delete("/api/chef/archived-orders", (req, res) => {
  if (!isChefAuthorized(req)) {
    return res.status(401).json({ error: "غير مصرح بالوصول" });
  }

  const { mode, orderIds, orderId } = req.body || {};
  const now = new Date().toISOString();

  if (mode === "clear_all") {
    store.orders.forEach((o) => {
      if (o.isArchived) {
        o.isDeletedFromArchive = true;
        o.archivedDeletedAt = now;
      }
    });
  } else if (orderId !== undefined && orderId !== null) {
    const target = store.orders.find((o) => o.id === Number(orderId));
    if (target) {
      target.isDeletedFromArchive = true;
      target.archivedDeletedAt = now;
    }
  } else if (Array.isArray(orderIds)) {
    const ids = orderIds.map(Number);
    store.orders.forEach((o) => {
      if (ids.includes(o.id)) {
        o.isDeletedFromArchive = true;
        o.archivedDeletedAt = now;
      }
    });
  }

  saveStore(store);
  res.json({ success: true });
});

// 9. Sales & Profits Analytics
app.get("/api/chef/sales-profits", (req, res) => {
  if (!isChefAuthorized(req)) {
    return res.status(401).json({ error: "غير مصرح بالوصول" });
  }

  const period = (req.query.period as "today" | "week" | "month") || "today";

  const now = new Date();
  const startTime = new Date();

  if (period === "today") {
    startTime.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    startTime.setDate(now.getDate() - 7);
  } else if (period === "month") {
    startTime.setMonth(now.getMonth() - 1);
  }

  const baselineTime = store.baselineResetAt
    ? new Date(store.baselineResetAt).getTime()
    : 0;

  const eligibleOrders = store.orders.filter((o) => {
    if (o.isDeletedFromArchive) return false;
    const orderTime = new Date(o.createdAt).getTime();
    return orderTime >= startTime.getTime() && orderTime >= baselineTime;
  });

  const totalOrdersCount = eligibleOrders.length;
  const finishedOrders = eligibleOrders.filter((o) => o.status === "Finished");
  const pendingOrdersCount = eligibleOrders.filter((o) => o.status === "Pending").length;
  const inProgressOrdersCount = eligibleOrders.filter((o) => o.status === "In Progress").length;
  const rejectedOrdersCount = eligibleOrders.filter((o) => o.status === "Rejected").length;

  const totalRevenue = finishedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalDeliveryFees = finishedOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

  // Sold products detailed list with date and time & Mohamed/Abdelrahman split
  const soldProducts: Array<{
    id: string;
    productName: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    unitProfit: number;
    totalProfit: number;
    mohamedProfit: number;
    abdelrahmanProfit: number;
    ahmedProfit?: number;
    orderCode: string;
    soldAt: string;
  }> = [];

  let totalItemsSold = 0;
  let totalProfit = 0;

  finishedOrders.forEach((o) => {
    o.items.forEach((item, idx) => {
      const qty = item.quantity || 1;
      totalItemsSold += qty;
      const itemTotal = item.unitPrice * qty;

      let itemUnitProfit = 0;
      if (item.unitProfitSnapshot !== undefined && item.unitProfitSnapshot !== null) {
        itemUnitProfit = item.unitProfitSnapshot;
      } else {
        itemUnitProfit = Math.round(item.unitPrice * 0.45);
      }

      const itemTotalProfit = itemUnitProfit * qty;
      totalProfit += itemTotalProfit;

      const mohamedItemProfit = itemTotalProfit / 2;
      const abdelrahmanItemProfit = itemTotalProfit / 2;

      soldProducts.push({
        id: `${o.id}_${item.productId}_${idx}`,
        productName: item.productName,
        category: item.category,
        quantity: qty,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
        unitProfit: itemUnitProfit,
        totalProfit: itemTotalProfit,
        mohamedProfit: mohamedItemProfit,
        abdelrahmanProfit: abdelrahmanItemProfit,
        ahmedProfit: abdelrahmanItemProfit, // alias
        orderCode: o.orderCode,
        soldAt: o.finishedAt || o.createdAt,
      });
    });
  });

  // Sort sold products by date descending
  soldProducts.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());

  // Both Mohamed and Abdelrahman split products profit AND delivery fees equally (50% / 50%)
  const totalNetWithDelivery = totalProfit + totalDeliveryFees;
  const mohamedTotalProfit = totalNetWithDelivery / 2;
  const abdelrahmanTotalProfit = totalNetWithDelivery / 2;

  const profitMarginPercent =
    totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  res.json({
    period,
    totalRevenue,
    totalProfit,
    totalDeliveryFees,
    totalNetWithDelivery,
    mohamedTotalProfit,
    abdelrahmanTotalProfit,
    ahmedTotalProfit: abdelrahmanTotalProfit, // backward-compat alias
    totalOrdersCount,
    finishedOrdersCount: finishedOrders.length,
    pendingOrdersCount,
    inProgressOrdersCount,
    rejectedOrdersCount,
    totalItemsSold,
    profitMarginPercent,
    completedOrders: finishedOrders,
    soldProducts,
    baselineResetAt: store.baselineResetAt,
    generatedAt: new Date().toISOString(),
  });
});

app.post("/api/chef/sales-profits/reset", (req, res) => {
  if (!isChefAuthorized(req)) {
    return res.status(401).json({ error: "غير مصرح بالوصول" });
  }

  store.baselineResetAt = new Date().toISOString();
  saveStore(store);

  res.json({
    success: true,
    baselineResetAt: store.baselineResetAt,
  });
});

// 10. Health check & Supabase status
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/chef/supabase-status", async (req, res) => {
  if (!isChefAuthorized(req)) {
    return res.status(401).json({ error: "غير مصرح بالوصول" });
  }

  const status = await testSupabaseConnection();
  res.json({
    url: "https://ytwvhalzdaofstxbfupn.supabase.co",
    ...status,
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// Vite integration: Dev Server vs Static Production
// -------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`ZOKS Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
