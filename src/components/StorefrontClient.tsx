import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { PublicProduct, CartItem, StoreSettings } from "@/lib/types";
import HeroSection from "@/components/HeroSection";
import ProductCard from "@/components/ProductCard";
import ProductDetailModal from "@/components/ProductDetailModal";
import CartDrawer from "@/components/CartDrawer";
import MyOrdersModal from "@/components/MyOrdersModal";
import {
  Search,
  ShoppingBag,
  Package,
  RefreshCw,
  X,
  Phone,
  AlertCircle,
  Copy,
  Check,
  Clock,
  Info,
} from "lucide-react";
import { findProductBySlug, getProductSlug } from "@/lib/productSlug";

const FOOTER_BG_URL =
  "https://res.cloudinary.com/h74mxqsb/image/upload/v1793882397/Zoks-Footer_pgiasf.jpg";
const TOP_LOGO_URL =
  "https://res.cloudinary.com/h74mxqsb/image/upload/v1793882390/Zoks-logo-transparent_frabt2.png";
const ICON_URL =
  "https://res.cloudinary.com/h74mxqsb/image/upload/v1793882390/Zoks-Icon_shlbgb.png";
const WHATSAPP_LOGO_URL =
  "https://res.cloudinary.com/h74mxqsb/image/upload/v1793917546/whatsapp-logo_kv0gdr.png";

interface StorefrontClientProps {
  initialProducts: PublicProduct[];
  initialCategories: string[];
  initialError?: string | null;
  isLoadingProducts?: boolean;
  onOpenChef?: () => void;
}

/**
 * Matches the category pill colors from the reference image:
 * رجالي -> Red (#c80000)
 * حريمي -> Pink (#ff47d6)
 * أطفال -> Blue (#498fff)
 * رياضي -> Lime (#b8ff01)
 */
function getCategoryPillStyle(categoryName: string, isSelected: boolean): string {
  const normalized = categoryName.trim();
  const baseBorder = "border-[1.8px] border-[#1a1a1a]";
  const activeTransform = isSelected
    ? "-translate-y-1.5 shadow-[0_6px_14px_rgba(0,0,0,0.22)] ring-2 ring-black/20"
    : "translate-y-0.5 opacity-95 hover:-translate-y-0.5";

  if (normalized === "رجالي" || normalized.toLowerCase() === "men") {
    return `${baseBorder} bg-[#c80000] text-white ${activeTransform}`;
  }
  if (normalized === "حريمي" || normalized.toLowerCase() === "women") {
    return `${baseBorder} bg-[#ff47d6] text-[#111111] ${activeTransform}`;
  }
  if (normalized === "أطفال" || normalized.toLowerCase() === "kids") {
    return `${baseBorder} bg-[#498fff] text-white ${activeTransform}`;
  }
  if (normalized === "رياضي" || normalized.toLowerCase() === "sports") {
    return `${baseBorder} bg-[#b8ff01] text-[#111111] ${activeTransform}`;
  }

  const fallbackStyles = [
    "bg-[#ff6d00] text-white",
    "bg-[#7c3aed] text-white",
    "bg-[#0d9488] text-white",
    "bg-[#eab308] text-[#111111]",
  ];
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const picked = fallbackStyles[Math.abs(hash) % fallbackStyles.length];
  return `${baseBorder} ${picked} ${activeTransform}`;
}

export default function StorefrontClient({
  initialProducts,
  initialCategories,
  initialError,
  isLoadingProducts = false,
  onOpenChef,
}: StorefrontClientProps) {
  const [products, setProducts] = useState<PublicProduct[]>(initialProducts);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [loadError, setLoadError] = useState<string | null>(initialError || null);
  const [retrying, setRetrying] = useState(false);

  // Sync when initialProducts updates from live Google Sheet fetch
  useEffect(() => {
    if (initialProducts) {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  useEffect(() => {
    if (initialCategories) {
      setCategories(initialCategories);
    }
  }, [initialCategories]);

  // Selected category ("all" or category name)
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState<boolean>(false);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Product detail modal state & URL slug deep-linking
  const [detailProduct, setDetailProduct] = useState<PublicProduct | null>(null);

  // Open product automatically if URL path matches a product slug (e.g. /Z-020)
  useEffect(() => {
    if (typeof window === "undefined" || products.length === 0) return;
    const pathname = window.location.pathname;
    if (!pathname || pathname === "/" || pathname === "/chef" || pathname.startsWith("/api/")) {
      return;
    }
    const matched = findProductBySlug(products, pathname);
    if (matched) {
      setDetailProduct(matched);
    }
  }, [products]);

  // Sync browser URL whenever a product is selected or modal closed
  const handleOpenDetail = useCallback((product: PublicProduct) => {
    setDetailProduct(product);
    try {
      const slug = getProductSlug(product);
      window.history.pushState({ productId: product.id }, "", `/${slug}`);
    } catch {
      // ignore
    }
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailProduct(null);
    try {
      if (window.location.pathname !== "/" && window.location.pathname !== "/chef") {
        window.history.pushState({}, "", "/");
      }
    } catch {
      // ignore
    }
  }, []);

  // Handle browser back/forward buttons for product modal
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePop = () => {
      const pathname = window.location.pathname;
      if (pathname === "/" || pathname === "/chef") {
        setDetailProduct(null);
      } else {
        const matched = findProductBySlug(products, pathname);
        setDetailProduct(matched || null);
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [products]);

  // My Orders modal state
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState<boolean>(false);
  const [highlightOrderCode, setHighlightOrderCode] = useState<string | null>(null);

  // Copied phone notification state
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const handleCopyPhone = useCallback((phone: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(phone);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = phone;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedPhone(phone);
    setTimeout(() => {
      setCopiedPhone((prev) => (prev === phone ? null : prev));
    }, 2500);
  }, []);

  // Load saved cart from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("zoks_cart_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCartItems(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("zoks_cart_v2", JSON.stringify(cartItems));
    } catch {
      // Ignore
    }
  }, [cartItems]);

  // Store status and working hours settings
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    isOpen: true,
    openTime: "10:00 ص",
    closeTime: "11:00 م",
    note: "",
    deliveryFee: 25,
    updatedAt: new Date().toISOString(),
  });

  const fetchStoreSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setStoreSettings(data.settings);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchStoreSettings();
    const interval = setInterval(fetchStoreSettings, 5000);
    return () => clearInterval(interval);
  }, [fetchStoreSettings]);

  // Fetch live products if needed
  const reloadCatalog = useCallback(async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/products?fresh=1", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("تعذر تحميل المنتجات من الخادم");
      }
      const data = await res.json();
      if (Array.isArray(data.products)) {
        setProducts(data.products);
        setCategories(
          Array.isArray(data.categories)
            ? data.categories
            : []
        );
        setLoadError(null);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "حدث خطأ أثناء تحميل الكتالوج"
      );
    } finally {
      setRetrying(false);
    }
  }, []);

  // Filter products by selected category and search query
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === "all" ||
        p.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase();

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Total quantity in cart
  const cartQuantity = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [cartItems]);

  // Cart operations
  const handleAddToCart = (product: PublicProduct, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const handleBuyNow = (product: PublicProduct, quantity = 1) => {
    handleAddToCart(product, quantity);
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((i) => {
          if (i.product.id === productId) {
            const newQ = i.quantity + delta;
            return newQ > 0 ? { ...i, quantity: newQ } : null;
          }
          return i;
        })
        .filter((i): i is CartItem => i !== null)
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleOrderCreated = (orderCode: string) => {
    setHighlightOrderCode(orderCode);
    setIsMyOrdersOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col">

      {/* Top Banner when Store is Closed */}
      {!storeSettings.isOpen && (
        <div className="bg-[#c81010] text-white py-2 px-4 text-center text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-xs z-40">
          <Clock className="h-4 w-4 shrink-0" />
          <span>المتجر مغلق الان و سيفتح في الساعة {storeSettings.openTime}</span>
        </div>
      )}

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-md px-3 sm:px-6 py-2.5 shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          {/* Right Logo & Brand */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
            >
              <img
                src={ICON_URL}
                alt="ZOKS Icon"
                className="h-8 w-8 sm:h-9 sm:w-9 object-contain"
              />
              <img
                src={TOP_LOGO_URL}
                alt="ZOKS"
                className="h-6 sm:h-7 w-auto object-contain hidden sm:block"
              />
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xs sm:max-w-md mx-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن شراب، دستة، رجالي، أطفال..."
                className="w-full rounded-full border border-neutral-300 bg-neutral-50 px-4 py-1.5 pr-9 text-xs sm:text-sm font-semibold text-right focus:border-[#c81010] focus:bg-white focus:outline-none transition-colors"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Left Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* My Orders Button */}
            <button
              type="button"
              onClick={() => setIsMyOrdersOpen(true)}
              className="flex items-center gap-1 rounded-full border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs px-2.5 sm:px-3 py-1.5 transition-colors cursor-pointer"
              title="متابعة طلباتي السابقة"
            >
              <Package className="h-3.5 w-3.5 text-[#c81010]" />
              <span className="hidden sm:inline">طلباتي</span>
            </button>

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1.5 rounded-full bg-[#c81010] hover:bg-red-800 text-white font-bold text-xs sm:text-sm px-3 sm:px-4 py-1.5 shadow-sm transition-all cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>السلة</span>
              {cartQuantity > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#c81010] text-[11px] font-black mr-0.5">
                  {cartQuantity}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Slower Arched Text Animation */}
      <HeroSection />

      {/* Category Pills Navigation - ONLY when Store is OPEN */}
      {storeSettings.isOpen && (
        <section
          aria-label="أقسام المنتجات"
          className="sticky top-[58px] z-20 border-y border-neutral-200/80 bg-white/95 backdrop-blur-sm py-2.5 shadow-2xs"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 sm:px-6">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {/* All Categories Chip */}
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-black border-[1.8px] transition-all cursor-pointer shrink-0 ${
                  selectedCategory === "all"
                    ? "border-[#1a1a1a] bg-[#1a1a1a] text-white -translate-y-1 shadow-md ring-2 ring-black/20"
                    : "border-neutral-300 bg-neutral-50 text-neutral-800 hover:bg-neutral-100"
                }`}
              >
                جميع الشرابات
              </button>

              {/* Dynamic Categories: رجالي، حريمي، أطفال، رياضي */}
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const style = getCategoryPillStyle(cat, isSelected);

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-black transition-all cursor-pointer shrink-0 ${style}`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Quick Refresh */}
            <button
              type="button"
              onClick={reloadCatalog}
              disabled={retrying}
              className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-neutral-500 hover:text-black cursor-pointer shrink-0"
              title="تحديث قائمة المنتجات من الشيت"
            >
              <RefreshCw className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </button>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <main className="flex-1 mx-auto max-w-6xl w-full px-3 sm:px-6 py-6 sm:py-8">
        {!storeSettings.isOpen ? (
          /* Store is CLOSED: Show status, opening time, working hours, note, and DO NOT show any products */
          <div className="mx-auto max-w-2xl my-6 sm:my-10 p-6 sm:p-10 rounded-3xl border-2 border-red-200 bg-gradient-to-b from-red-50/80 via-white to-white text-center shadow-lg space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-[#c81010] shadow-inner">
              <Clock className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <span className="inline-block rounded-full bg-red-600 text-white text-xs font-black px-4 py-1.5 shadow-xs">
                المتجر مغلق الآن
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 leading-snug">
                المتجر مغلق الان و سيفتح في الساعة {storeSettings.openTime}
              </h2>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs text-right space-y-3.5">
              <div className="flex items-center gap-2 text-neutral-900 font-black text-sm border-b border-neutral-100 pb-3">
                <Clock className="h-4 w-4 text-[#c81010] shrink-0" />
                <span>
                  مواعيد العمل: من {storeSettings.openTime} إلى {storeSettings.closeTime}
                </span>
              </div>

              {storeSettings.note && storeSettings.note.trim() ? (
                <div className="pt-1">
                  <span className="block text-xs font-bold text-neutral-500 mb-1.5">
                    الملحوظة:
                  </span>
                  <div className="text-xs sm:text-sm font-semibold text-neutral-800 bg-neutral-50 p-3.5 sm:p-4 rounded-xl border border-neutral-200 leading-relaxed whitespace-pre-wrap">
                    {storeSettings.note}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          /* Store is OPEN: Show real Google Sheet products only */
          <>
            {loadError && (
              <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-right flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-red-800">
                    {loadError}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={reloadCatalog}
                  className="text-xs font-bold text-[#c81010] underline cursor-pointer"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {isLoadingProducts ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <RefreshCw className="h-10 w-10 text-[#c81010] animate-spin mb-3" />
                <h3 className="text-sm font-bold text-neutral-700">
                  جاري تحميل المنتجات من Google Sheet...
                </h3>
              </div>
            ) : products.length === 0 ? (
              /* No products from Google Sheet: strictly show no products available, NO fake or synthesized products */
              <div className="mx-auto max-w-md my-16 p-8 rounded-3xl border border-neutral-200 bg-neutral-50/70 text-center space-y-3">
                <ShoppingBag className="h-14 w-14 text-neutral-300 mx-auto" />
                <h3 className="text-lg font-black text-neutral-800">
                  لا يوجد منتجات متوفرة الان
                </h3>
                <p className="text-xs font-semibold text-neutral-500 leading-relaxed">
                  كل المنتجات التي تتوفر في المتجر هي من ملف الـ Google Sheet فقط.
                </p>
                <button
                  type="button"
                  onClick={reloadCatalog}
                  disabled={retrying}
                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#c81010] text-white px-5 py-2 text-xs font-bold shadow-sm hover:bg-red-800 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} />
                  <span>تحديث المنتجات من Google Sheet</span>
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <ShoppingBag className="h-12 w-12 text-neutral-300 mb-3" />
                <h3 className="text-lg font-black text-neutral-800">
                  لم نجد منتجات تطابق بحثك
                </h3>
                <p className="mt-1 text-xs font-semibold text-neutral-500">
                  جرب تغيير الكلمات المفتاحية أو اختر تصنيفاً آخر من الأعلى
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchQuery("");
                  }}
                  className="mt-4 rounded-full bg-[#c81010] text-white px-5 py-2 text-xs font-bold shadow-sm hover:bg-red-800 cursor-pointer"
                >
                  عرض جميع المنتجات
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={(p) => handleAddToCart(p, 1)}
                    onBuyNow={(p) => handleBuyNow(p, 1)}
                    onOpenDetail={handleOpenDetail}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        className="relative mt-auto border-t-2 border-[#c81010] bg-cover bg-center text-white py-10 px-4 text-center select-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.92)), url(${FOOTER_BG_URL})`,
        }}
      >
        <div className="mx-auto max-w-4xl space-y-3">
          <img
            src={TOP_LOGO_URL}
            alt="ZOKS"
            className="mx-auto h-8 sm:h-9 w-auto object-contain brightness-200"
          />
          <p className="text-sm font-bold text-neutral-300 max-w-md mx-auto">
            أفضل الخامات بأفضل الأسعار — نوفر أجود الشرابات القطنية والرياضية والمدرسية لجميع أفراد العائلة.
          </p>
          {/* للتواصل والشكاوى */}
          <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-center gap-2 mb-2 text-[#b8ff01]">
              <Phone className="h-4 w-4" />
              <span className="text-sm font-extrabold tracking-wide">
                للتواصل والشكاوى والاستفسارات
              </span>
            </div>
            <p className="text-xs text-neutral-300 font-medium mb-3">
              نحن في خدمتكم دائماً لأي استفسار أو متابعة أو شكوى بشأن طلبك:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Number 1: 01069679991 */}
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 p-3 transition-all shadow-sm">
                <button
                  type="button"
                  onClick={() => handleCopyPhone("01069679991")}
                  dir="ltr"
                  title="اضغط لنسخ الرقم فوراً"
                  className="w-full flex items-center justify-between gap-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/25 px-3 py-2 text-sm font-black text-white transition-all cursor-pointer group"
                >
                  <span className="flex items-center gap-1.5 text-xs text-[#b8ff01]">
                    {copiedPhone === "01069679991" ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span className="text-[11px] font-bold text-emerald-400">تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
                        <span className="text-[10px] text-neutral-300">نسخ</span>
                      </>
                    )}
                  </span>
                  <span className="tracking-wider text-sm font-black">01069679991</span>
                </button>

                {/* WhatsApp button with logo only */}
                <a
                  href="https://wa.me/201069679991"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="مراسلة عبر واتساب (01069679991)"
                  aria-label="تواصل عبر واتساب 01069679991"
                  className="w-full flex items-center justify-center rounded-xl bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 py-2 px-3 shadow-md transition-all cursor-pointer"
                >
                  <img
                    src={WHATSAPP_LOGO_URL}
                    alt="WhatsApp"
                    className="h-6 w-6 object-contain"
                  />
                </a>
              </div>

              {/* Number 2: 01204458239 */}
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 p-3 transition-all shadow-sm">
                <button
                  type="button"
                  onClick={() => handleCopyPhone("01204458239")}
                  dir="ltr"
                  title="اضغط لنسخ الرقم فوراً"
                  className="w-full flex items-center justify-between gap-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/25 px-3 py-2 text-sm font-black text-white transition-all cursor-pointer group"
                >
                  <span className="flex items-center gap-1.5 text-xs text-[#b8ff01]">
                    {copiedPhone === "01204458239" ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span className="text-[11px] font-bold text-emerald-400">تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
                        <span className="text-[10px] text-neutral-300">نسخ</span>
                      </>
                    )}
                  </span>
                  <span className="tracking-wider text-sm font-black">01204458239</span>
                </button>

                {/* WhatsApp button with logo only */}
                <a
                  href="https://wa.me/201204458239"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="مراسلة عبر واتساب (01204458239)"
                  aria-label="تواصل عبر واتساب 01204458239"
                  className="w-full flex items-center justify-center rounded-xl bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 py-2 px-3 shadow-md transition-all cursor-pointer"
                >
                  <img
                    src={WHATSAPP_LOGO_URL}
                    alt="WhatsApp"
                    className="h-6 w-6 object-contain"
                  />
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-neutral-400 pt-1">
            <span>توصيل سريع للمنزل ({storeSettings.deliveryFee ?? 25} ج.م)</span>
            <span>•</span>
            <span>تحويل محفظة كاش وانستاباي</span>
            <span>•</span>
            <span>دفع عند الاستلام</span>
          </div>
          <div className="text-[11px] text-neutral-500 pt-4 border-t border-neutral-800 text-center">
            <span>جميع الحقوق محفوظة © {new Date().getFullYear()} ZOKS Store.</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <ProductDetailModal
        product={detailProduct}
        onClose={handleCloseDetail}
        onAddToCart={(p, q) => handleAddToCart(p, q)}
        onBuyNow={(p, q) => handleBuyNow(p, q)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        storeSettings={storeSettings}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onOrderCreated={handleOrderCreated}
      />

      <MyOrdersModal
        isOpen={isMyOrdersOpen}
        onClose={() => {
          setIsMyOrdersOpen(false);
          setHighlightOrderCode(null);
        }}
        highlightOrderCode={highlightOrderCode}
      />
    </div>
  );
}
