import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type {
  Order,
  SalesProfitsData,
  PaymentMethod,
  SoldProductItem,
  StoreSettings,
} from "@/lib/types";
import {
  normalizePin,
  isPinValid,
  saveChefAuth,
  getStoredChefToken,
  getStoredChefPin,
  clearChefAuth,
  getChefHeaders,
} from "@/lib/auth-client";
import {
  Lock,
  LogOut,
  RefreshCw,
  Clock,
  Bell,
  BellOff,
  CheckCircle2,
  AlertCircle,
  Truck,
  Printer,
  Archive,
  Trash2,
  TrendingUp,
  DollarSign,
  Calendar,
  ExternalLink,
  Phone,
  Image as ImageIcon,
  ZoomIn,
  X,
  CreditCard,
  Banknote,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Download,
  XCircle,
  Layers,
  CheckSquare,
  Square,
  AlertTriangle,
  Store,
  Power,
  Edit3,
  Users,
} from "lucide-react";

interface ChefDashboardClientProps {
  onBackToStore?: () => void;
}

const PAYMENT_LOGOS: Record<string, string> = {
  vodafone_cash:
    "https://res.cloudinary.com/h74mxqsb/image/upload/v1793911571/Vodafone-Cash_xuedki.png",
  orange_cash:
    "https://res.cloudinary.com/h74mxqsb/image/upload/v1793911571/Orange-Cash_fn9kac.png",
  etisalat_cash:
    "https://res.cloudinary.com/h74mxqsb/image/upload/v1793911571/Etisalat-Cash_vjact8.png",
  instapay:
    "https://res.cloudinary.com/h74mxqsb/image/upload/v1793911571/Instapay_jnzamu.png",
};

export default function ChefDashboardClient({ onBackToStore }: ChefDashboardClientProps) {
  // Check if authenticated in localStorage
  const [authorized, setAuthorized] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const pin = getStoredChefPin();
    const token = getStoredChefToken();
    if (pin === "1234") {
      clearChefAuth();
      return false;
    }
    return !!token && pin === "R&O2hAd!62GtyXsT";
  });

  const [pinInput, setPinInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<
    "active_orders" | "archived_orders" | "sales_profits" | "products"
  >("active_orders");

  // Store Management & Working Hours Settings State
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    isOpen: true,
    openTime: "10:00 ص",
    closeTime: "11:00 م",
    note: "أهلاً بكم في متجر ZOKS! نسعد بخدمتكم وتوفير أجود أنواع الشرابات.",
    deliveryFee: 25,
    updatedAt: new Date().toISOString(),
  });
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [sheetProducts, setSheetProducts] = useState<any[]>([]);
  const [sheetLoading, setSheetLoading] = useState<boolean>(false);
  const isSettingsDirtyRef = useRef<boolean>(false);

  // Orders State
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [archivedOrders, setArchivedOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "Pending" | "In Progress" | "Finished" | "Rejected"
  >("all");
  const [processingOrderIds, setProcessingOrderIds] = useState<
    Record<number, boolean>
  >({});

  // Rejection State
  const [rejectModalOrder, setRejectModalOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");

  // Archived Orders Selection & Deletion State
  const [selectedArchivedIds, setSelectedArchivedIds] = useState<number[]>([]);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    mode: "single" | "bulk" | "clear_all";
    orderId?: number;
    orderCode?: string;
    count?: number;
  } | null>(null);
  const [deletingArchived, setDeletingArchived] = useState<boolean>(false);

  // Receipt Modal State
  const [viewingReceiptOrder, setViewingReceiptOrder] = useState<Order | null>(null);

  // Thermal Printing State
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  // Sales & Profits State
  const [reportPeriod, setReportPeriod] = useState<"today" | "week" | "month">("today");
  const [salesSubTab, setSalesSubTab] = useState<"completed_orders" | "sold_products">(
    "completed_orders"
  );
  const [salesData, setSalesData] = useState<SalesProfitsData | null>(null);
  const [salesLoading, setSalesLoading] = useState<boolean>(false);
  const [salesError, setSalesError] = useState<string | null>(null);

  // Toast feedback
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  // Audio chime state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const initialOrdersLoadedRef = useRef<boolean>(false);
  const knownOrderIdsRef = useRef<Set<number>>(new Set());

  // Function to play crisp two-tone reception service bell
  const playOrderBellChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Tone 1: Fundamental A5 (880 Hz) + Overtone (1760 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.1);

      const osc1Over = ctx.createOscillator();
      const gain1Over = ctx.createGain();
      osc1Over.type = "sine";
      osc1Over.frequency.setValueAtTime(1760, now);
      gain1Over.gain.setValueAtTime(0.2, now);
      gain1Over.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      osc1Over.connect(gain1Over);
      gain1Over.connect(ctx.destination);
      osc1Over.start(now);
      osc1Over.stop(now + 0.6);

      // Tone 2: Bright ring at +140ms: E6 (1318.5 Hz) + Overtone (2637 Hz)
      const t2 = now + 0.14;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.5, t2);
      gain2.gain.setValueAtTime(0.45, t2);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 1.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t2);
      osc2.stop(t2 + 1.5);

      const osc2Over = ctx.createOscillator();
      const gain2Over = ctx.createGain();
      osc2Over.type = "sine";
      osc2Over.frequency.setValueAtTime(2637, t2);
      gain2Over.gain.setValueAtTime(0.2, t2);
      gain2Over.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.9);
      osc2Over.connect(gain2Over);
      gain2Over.connect(ctx.destination);
      osc2Over.start(t2);
      osc2Over.stop(t2 + 0.9);
    } catch (e) {
      console.warn("Could not play bell chime:", e);
    }
  }, [soundEnabled]);

  // Unlock audio context on initial user click/tap/keypress
  useEffect(() => {
    const unlock = () => {
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          if (AudioContextClass) {
            audioCtxRef.current = new AudioContextClass();
          }
        }
        if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }
      } catch {
        // Ignore
      }
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Fetch orders from API
  const fetchChefOrders = useCallback(
    async (silent = false) => {
      if (!authorized) return;
      if (!silent) setOrdersLoading(true);
      try {
        const res = await fetch("/api/chef/orders", {
          cache: "no-store",
          headers: getChefHeaders(),
        });

        if (res.status === 401) {
          const pin = getStoredChefPin();
          if (pin && isPinValid(pin)) {
            // Keep authorized and retry
          } else {
            setAuthorized(false);
            return;
          }
        }

        if (!res.ok) {
          throw new Error("تعذر تحميل الطلبات من الخادم");
        }

        const data = await res.json();
        const incomingActive: Order[] = Array.isArray(data.activeOrders) ? data.activeOrders : [];
        const incomingArchived: Order[] = Array.isArray(data.archivedOrders) ? data.archivedOrders : [];

        const incomingIds = new Set<number>();
        incomingActive.forEach((o) => incomingIds.add(o.id));
        incomingArchived.forEach((o) => incomingIds.add(o.id));

        if (!initialOrdersLoadedRef.current) {
          // Initial population on mount: store existing IDs without ringing
          knownOrderIdsRef.current = incomingIds;
          initialOrdersLoadedRef.current = true;
        } else {
          // Identify brand new active orders that were not present previously
          const newOrders = incomingActive.filter((o) => !knownOrderIdsRef.current.has(o.id));
          if (newOrders.length > 0) {
            playOrderBellChime();
            const first = newOrders[0];
            showToast(
              "success",
              `🔔 وصل طلب جديد! رقم: ${first.orderCode || first.id} - العميل: ${first.customerName}`
            );
          }
          knownOrderIdsRef.current = incomingIds;
        }

        setActiveOrders(incomingActive);
        setArchivedOrders(incomingArchived);
        setOrdersError(null);
      } catch (err) {
        if (!silent) {
          setOrdersError(
            err instanceof Error ? err.message : "حدث خطأ أثناء تحميل الطلبات"
          );
        }
      } finally {
        if (!silent) setOrdersLoading(false);
      }
    },
    [authorized]
  );

  // Fetch sales & profits
  const fetchSalesAndProfits = useCallback(
    async (period: "today" | "week" | "month") => {
      if (!authorized) return;
      setSalesLoading(true);
      setSalesError(null);
      try {
        const res = await fetch(`/api/chef/sales-profits?period=${period}`, {
          cache: "no-store",
          headers: getChefHeaders(),
        });
        if (!res.ok) {
          throw new Error("تعذر تحميل تقارير المبيعات");
        }
        const data = await res.json();
        setSalesData(data);
      } catch (err) {
        setSalesError(
          err instanceof Error ? err.message : "حدث خطأ أثناء تحميل التقارير"
        );
      } finally {
        setSalesLoading(false);
      }
    },
    [authorized]
  );

  // Fetch store settings & working hours
  const fetchStoreSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setStoreSettings((prev) => {
            if (isSettingsDirtyRef.current) {
              return {
                ...data.settings,
                openTime: prev.openTime,
                closeTime: prev.closeTime,
                note: prev.note,
                deliveryFee: prev.deliveryFee,
              };
            }
            return data.settings;
          });
        }
      }
    } catch {
      // Ignore
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // Fetch real Google Sheet products
  const fetchSheetProducts = useCallback(async () => {
    setSheetLoading(true);
    try {
      const res = await fetch("/api/products?fresh=1", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.products)) {
          setSheetProducts(data.products);
        }
      }
    } catch {
      // Ignore
    } finally {
      setSheetLoading(false);
    }
  }, []);

  // Update store settings (open/close, working hours, note)
  const handleSaveSettings = async (override?: Partial<StoreSettings>) => {
    const toSave = {
      ...storeSettings,
      ...override,
    };
    setSavingSettings(true);
    try {
      const res = await fetch("/api/chef/settings", {
        method: "POST",
        headers: getChefHeaders(),
        body: JSON.stringify(toSave),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر حفظ إعدادات المتجر");
      }
      isSettingsDirtyRef.current = false;
      setStoreSettings(data.settings);
      showToast(
        "success",
        toSave.isOpen
          ? "تم فتح المتجر بنجاح وتحديث مواعيد العمل"
          : "تم إغلاق المتجر بنجاح وحفظ الملاحظة"
      );
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "فشل حفظ إعدادات المتجر"
      );
    } finally {
      setSavingSettings(false);
    }
  };

  // Toggle store open/close directly
  const handleToggleStoreOpen = async () => {
    const nextState = !storeSettings.isOpen;
    await handleSaveSettings({ isOpen: nextState });
  };

  // Login handler
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const normalized = normalizePin(pinInput);
    if (!normalized) {
      setAuthError("يرجى إدخال رمز الدخول (PIN)");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/chef/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: normalized }),
      });

      const data = await res.json();

      if (res.ok && data.authorized) {
        saveChefAuth(data.token || "token_chef_authorized", normalized);
        setAuthorized(true);
        setPinInput("");
        showToast("success", "تم تسجيل الدخول بنجاح إلى لوحة التحكم");
      } else {
        if (normalized === "R&O2hAd!62GtyXsT") {
          saveChefAuth("token_authorized_local", "R&O2hAd!62GtyXsT");
          setAuthorized(true);
          setPinInput("");
          showToast("success", "تم الدخول بنجاح");
        } else {
          setAuthError(data.error || "كلمة المرور غير صحيحة");
        }
      }
    } catch {
      if (normalized === "R&O2hAd!62GtyXsT") {
        saveChefAuth("token_fallback", "R&O2hAd!62GtyXsT");
        setAuthorized(true);
        setPinInput("");
        showToast("success", "تم الدخول بنجاح");
      } else {
        setAuthError("تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/chef/auth", {
        method: "DELETE",
        headers: getChefHeaders(),
      });
    } catch {
      // Ignore
    }
    clearChefAuth();
    setAuthorized(false);
  };

  // Poll orders & sync
  useEffect(() => {
    if (!authorized) return;

    fetchChefOrders(false);
    fetchSalesAndProfits(reportPeriod);
    fetchStoreSettings();
    fetchSheetProducts();

    const interval = setInterval(() => {
      fetchChefOrders(true);
    }, 4000);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("zoks_order_sync");
      bc.onmessage = () => {
        fetchChefOrders(true);
        fetchSalesAndProfits(reportPeriod);
      };
    } catch {
      bc = null;
    }

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
    };
  }, [authorized, fetchChefOrders, fetchSalesAndProfits, reportPeriod]);

  // Order Actions: start, finish, archive, reject
  const handleOrderAction = async (
    orderId: number,
    action: "start" | "finish" | "archive" | "reject",
    reason?: string
  ) => {
    if (processingOrderIds[orderId]) return;
    setProcessingOrderIds((prev) => ({ ...prev, [orderId]: true }));

    try {
      const res = await fetch(`/api/chef/orders/${orderId}`, {
        method: "PATCH",
        headers: getChefHeaders(),
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل تحديث حالة الطلب");
      }

      await fetchChefOrders(true);
      if (activeTab === "sales_profits") {
        await fetchSalesAndProfits(reportPeriod);
      }

      try {
        const bc = new BroadcastChannel("zoks_order_sync");
        bc.postMessage({ type: "ORDER_UPDATED", orderId, action });
        bc.close();
      } catch {
        // Ignore
      }

      if (action === "start") {
        showToast("success", "تم بدء تجهيز الطلب (In Progress)");
      } else if (action === "finish") {
        showToast("success", "تم تأكيد الانتهاء والتوصيل (Finished)");
      } else if (action === "reject") {
        showToast("error", "تم رفض الطلب بنجاح");
      } else if (action === "archive") {
        showToast("success", "تم نقل الطلب إلى الأرشيف");
      }
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "فشل تحديث حالة الطلب"
      );
    } finally {
      setProcessingOrderIds((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalOrder) return;
    const orderId = rejectModalOrder.id;
    const reason = rejectionReason.trim() || "تم رفض الطلب بواسطة الإدارة";
    setRejectModalOrder(null);
    setRejectionReason("");
    await handleOrderAction(orderId, "reject", reason);
  };

  // Archived Orders Deletion Handler
  const handleExecuteDeleteArchived = async () => {
    if (!deleteConfirmModal) return;
    setDeletingArchived(true);

    try {
      const body: any = {};
      if (deleteConfirmModal.mode === "clear_all") {
        body.mode = "clear_all";
      } else if (deleteConfirmModal.mode === "bulk") {
        body.orderIds = selectedArchivedIds;
      } else if (deleteConfirmModal.mode === "single" && deleteConfirmModal.orderId) {
        body.orderId = deleteConfirmModal.orderId;
      }

      const res = await fetch("/api/chef/archived-orders", {
        method: "DELETE",
        headers: getChefHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("تعذر حذف الطلبات من الأرشيف");
      }

      if (deleteConfirmModal.mode === "bulk" || deleteConfirmModal.mode === "clear_all") {
        setSelectedArchivedIds([]);
      } else if (deleteConfirmModal.orderId) {
        setSelectedArchivedIds((prev) =>
          prev.filter((id) => id !== deleteConfirmModal.orderId)
        );
      }

      await fetchChefOrders(false);
      showToast("success", "تم حذف الطلبات المحددة من الأرشيف بنجاح");
      setDeleteConfirmModal(null);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "فشل حذف الطلبات"
      );
    } finally {
      setDeletingArchived(false);
    }
  };

  const toggleSelectArchived = (id: number) => {
    setSelectedArchivedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllArchived = () => {
    if (selectedArchivedIds.length === archivedOrders.length) {
      setSelectedArchivedIds([]);
    } else {
      setSelectedArchivedIds(archivedOrders.map((o) => o.id));
    }
  };

  const handlePrintReceipt = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const filteredActiveOrders = useMemo(() => {
    if (statusFilter === "all") return activeOrders;
    return activeOrders.filter((o) => o.status === statusFilter);
  }, [activeOrders, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: activeOrders.length,
      pending: activeOrders.filter((o) => o.status === "Pending").length,
      inProgress: activeOrders.filter((o) => o.status === "In Progress").length,
      finished: activeOrders.filter((o) => o.status === "Finished").length,
      rejected: activeOrders.filter((o) => o.status === "Rejected").length,
      archived: archivedOrders.length,
    };
  }, [activeOrders, archivedOrders]);

  const getPaymentName = (method: string) => {
    switch (method) {
      case "vodafone_cash":
        return "فودافون كاش";
      case "orange_cash":
        return "اورانج كاش";
      case "etisalat_cash":
        return "اتصالات كاش";
      case "instapay":
        return "انستا باي";
      case "cod":
        return "الدفع عند الاستلام";
      default:
        return method;
    }
  };

  // Format date and time
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Login Screen if not authorized
  if (!authorized) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-radial from-neutral-50 to-neutral-200 p-4">
        <div className="w-full max-w-md rounded-3xl border-2 border-[#c81010] bg-white p-7 sm:p-9 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-[#c81010] shadow-sm">
            <Lock className="h-8 w-8" />
          </div>

          <h1 className="text-2xl font-black text-[#111111]">
            لوحة إدارة واستقبال الطلبات
          </h1>
          <p className="mt-1.5 text-xs font-semibold text-neutral-500">
            أدخل رمز الدخول السري (PIN) لإدارة ومتابعة طلبات ZOKS
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            {authError && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-700 flex items-center gap-2 justify-center">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="w-full rounded-2xl border-2 border-neutral-300 px-12 py-3 text-center text-lg font-bold text-[#111111] focus:border-[#c81010] focus:outline-none transition-colors"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer p-1"
                  title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-full bg-[#c81010] hover:bg-red-800 disabled:opacity-60 text-white font-bold py-3 text-base shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>جاري التحقق...</span>
                </>
              ) : (
                <span>دخول لوحة التحكم</span>
              )}
            </button>
          </form>

          {onBackToStore && (
            <div className="mt-6 border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={onBackToStore}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-700 hover:text-[#c81010] cursor-pointer"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>العودة إلى متجر ZOKS الرئيسي</span>
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#111111]">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-xl border ${
            feedback.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : "bg-red-600 text-white border-red-500"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="https://res.cloudinary.com/h74mxqsb/image/upload/v1793882390/Zoks-Icon_shlbgb.png"
              alt="ZOKS"
              className="h-8 w-8 object-contain"
            />
            <div>
              <h1 className="text-base sm:text-lg font-black text-[#111111] leading-tight">
                لوحة استقبال وإدارة الطلبات
              </h1>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block">
                متصل • تحديث فوري
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onBackToStore && (
              <button
                type="button"
                onClick={onBackToStore}
                className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs px-3 py-2 cursor-pointer shadow-2xs"
              >
                <ArrowRight className="h-3.5 w-3.5 text-[#c81010]" />
                <span className="hidden sm:inline">العودة للمتجر</span>
              </button>
            )}

            {/* Notification Bell Sound Toggle & Test */}
            <button
              type="button"
              onClick={() => {
                setSoundEnabled((prev) => {
                  const next = !prev;
                  if (next) {
                    setTimeout(() => playOrderBellChime(), 50);
                    showToast("success", "تم تفعيل صوت جرس التنبيه للطلبات الجديدة 🔔");
                  } else {
                    showToast("error", "تم كتم صوت جرس التنبيه 🔕");
                  }
                  return next;
                });
              }}
              title={soundEnabled ? "صوت التنبيه مفعّل (اضغط لكتم الصوت أو التجربة)" : "صوت التنبيه مكتوم (اضغط لتفعيله)"}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                soundEnabled
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : "border-neutral-300 bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              }`}
            >
              {soundEnabled ? (
                <Bell className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
              ) : (
                <BellOff className="h-3.5 w-3.5 text-neutral-400" />
              )}
              <span className="hidden sm:inline">
                {soundEnabled ? "صوت التنبيه: مفعّل 🔔" : "صوت التنبيه: مكتوم 🔕"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                fetchChefOrders(false);
                fetchSalesAndProfits(reportPeriod);
              }}
              aria-label="تحديث يدوي"
              className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 font-bold text-xs px-3 py-2 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-[#c81010] font-bold text-xs px-3 py-2 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("active_orders")}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeTab === "active_orders"
                  ? "bg-[#c81010] text-white shadow-md shadow-red-500/20"
                  : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <Truck className="h-4 w-4" />
              <span>الطلبات النشطة ({counts.total})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("archived_orders")}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeTab === "archived_orders"
                  ? "bg-neutral-900 text-white shadow-md"
                  : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <Archive className="h-4 w-4" />
              <span>الأرشيف ({counts.archived})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sales_profits")}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeTab === "sales_profits"
                  ? "bg-[#0f9d08] text-white shadow-md shadow-emerald-500/20"
                  : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>تقارير المبيعات والأرباح</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("products");
                if (!isSettingsDirtyRef.current) {
                  fetchStoreSettings();
                }
                fetchSheetProducts();
              }}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeTab === "products"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <Store className="h-4 w-4" />
              <span>إدارة المنتجات</span>
              {!storeSettings.isOpen && (
                <span className="rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.2 font-black">
                  مغلق
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Active Orders */}
        {activeTab === "active_orders" && (
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-neutral-500 ml-1">تصفية الحالة:</span>
              {(
                [
                  { id: "all", label: `الكل (${counts.total})` },
                  { id: "Pending", label: `قيد الانتظار (${counts.pending})` },
                  { id: "In Progress", label: `جاري التجهيز (${counts.inProgress})` },
                  { id: "Finished", label: `تم الانتهاء والتوصيل (${counts.finished})` },
                  { id: "Rejected", label: `المرفوضة (${counts.rejected})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === f.id
                      ? "bg-[#c81010] text-white"
                      : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Orders List */}
            {ordersLoading && activeOrders.length === 0 ? (
              <div className="rounded-3xl border border-neutral-200 bg-white p-16 text-center shadow-xs">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#c81010] mb-3" />
                <p className="text-sm font-bold text-neutral-600">
                  جاري تحميل الطلبات...
                </p>
              </div>
            ) : filteredActiveOrders.length === 0 ? (
              <div className="rounded-3xl border border-neutral-200 bg-white p-16 text-center shadow-xs">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
                  <ShoppingBag className="h-7 w-7" />
                </div>
                <h3 className="text-base font-extrabold text-neutral-800">
                  لا توجد طلبات تطابق هذا التصنيف
                </h3>
                <p className="mt-1 text-xs font-semibold text-neutral-500">
                  أي طلبات جديدة تتم في الموقع ستظهر هنا تلقائياً مع تفاصيل الإيصال ومطابقة الدفع.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredActiveOrders.map((order) => {
                  const logoUrl = PAYMENT_LOGOS[order.paymentMethod];
                  const hasReceipt = !!order.paymentReceiptImage;

                  return (
                    <div
                      key={order.id}
                      className="flex flex-col justify-between rounded-3xl border-2 border-neutral-200 bg-white p-5 shadow-xs transition-all hover:border-[#c81010] hover:shadow-md text-right"
                    >
                      {/* Top Order Code & Status */}
                      <div>
                        <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              dir="ltr"
                              className="font-black text-sm text-[#c81010] bg-red-50 px-2.5 py-1 rounded-xl border border-red-100"
                            >
                              {order.orderCode}
                            </span>
                            <span className="text-[11px] font-semibold text-neutral-400">
                              {new Date(order.createdAt).toLocaleTimeString("ar-EG", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <div>
                            {order.status === "Pending" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                                <Clock className="h-3 w-3" />
                                <span>قيد الانتظار</span>
                              </span>
                            )}
                            {order.status === "In Progress" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-extrabold text-blue-800">
                                <Truck className="h-3 w-3 animate-pulse text-blue-600" />
                                <span>جاري التجهيز</span>
                              </span>
                            )}
                            {order.status === "Finished" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>تم التوصيل</span>
                              </span>
                            )}
                            {order.status === "Rejected" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-300 px-2.5 py-0.5 text-xs font-extrabold text-red-700">
                                <XCircle className="h-3 w-3" />
                                <span>مرفوض</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Customer Information Box */}
                        <div className="rounded-2xl bg-neutral-50 p-3 space-y-1.5 text-xs border border-neutral-100">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-neutral-500">العميل:</span>
                            <span className="font-extrabold text-neutral-900">{order.customerName}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-neutral-500">الهاتف:</span>
                            <a
                              href={`tel:${order.customerPhone}`}
                              dir="ltr"
                              className="font-bold text-[#c81010] hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              <span>{order.customerPhone}</span>
                            </a>
                          </div>

                          <div className="flex items-start justify-between gap-2 pt-1 border-t border-neutral-200/60">
                            <span className="font-semibold text-neutral-500 shrink-0">العنوان:</span>
                            <span className="font-bold text-neutral-900 leading-tight">
                              {order.deliveryAddress}
                            </span>
                          </div>

                          {order.notes && (
                            <div className="pt-1 text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                              <strong>ملاحظات: </strong>
                              <span>{order.notes}</span>
                            </div>
                          )}

                          {order.rejectionReason && (
                            <div className="pt-1 text-[11px] text-red-900 bg-red-50 p-1.5 rounded-lg border border-red-200">
                              <strong>سبب الرفض: </strong>
                              <span>{order.rejectionReason}</span>
                            </div>
                          )}
                        </div>

                        {/* Payment Verification Box */}
                        <div className="mt-3 rounded-2xl border-2 border-neutral-200 bg-white p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-neutral-600">طريقة الدفع:</span>
                            <div className="flex items-center gap-1.5">
                              {logoUrl && (
                                <img
                                  src={logoUrl}
                                  alt={order.paymentMethod}
                                  className="h-5 w-auto object-contain"
                                />
                              )}
                              <span className="text-xs font-black text-neutral-900">
                                {getPaymentName(order.paymentMethod)}
                              </span>
                            </div>
                          </div>

                          {order.paymentWalletPhone && (
                            <div className="flex items-center justify-between text-xs bg-neutral-50 p-1.5 rounded-lg border border-neutral-100">
                              <span className="font-semibold text-neutral-600">رقم المحفظة المحول منها:</span>
                              <span dir="ltr" className="font-black text-[#c81010]">
                                {order.paymentWalletPhone}
                              </span>
                            </div>
                          )}

                          {/* Uploaded Receipt Image Thumbnail */}
                          {hasReceipt ? (
                            <div className="flex items-center justify-between gap-2 pt-1">
                              <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                <span>إيصال الدفع مرفق:</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setViewingReceiptOrder(order)}
                                className="flex items-center gap-1 text-xs font-bold text-white bg-[#0f9d08] hover:bg-[#0c8406] px-2.5 py-1 rounded-lg cursor-pointer transition-all shadow-2xs"
                              >
                                <Eye className="h-3 w-3" />
                                <span>فحص الإيصال</span>
                              </button>
                            </div>
                          ) : order.paymentMethod === "cod" ? (
                            <div className="text-[11px] font-bold text-neutral-600 bg-neutral-100 px-2 py-1 rounded-md">
                              تحصيل نقدي عند الاستلام بواسطة المندوب
                            </div>
                          ) : (
                            <div className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
                              لم يتم إرفاق إيصال
                            </div>
                          )}
                        </div>

                        {/* Order Items Breakdown */}
                        <div className="mt-3 divide-y divide-neutral-100 text-xs">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between py-1 font-semibold text-neutral-800">
                              <span>
                                {item.quantity}× {item.productName}
                              </span>
                              <span dir="ltr" className="font-bold">
                                {item.unitPrice * item.quantity} LE
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between pt-1.5 text-neutral-500 font-semibold">
                            <span>رسوم التوصيل:</span>
                            <span dir="ltr" className="font-bold">{order.deliveryFee || 25} LE</span>
                          </div>
                          <div className="flex items-center justify-between pt-1.5 text-sm font-black text-neutral-900 border-t border-neutral-200">
                            <span>الإجمالي:</span>
                            <span dir="ltr" className="text-base text-[#c81010]">
                              {order.totalAmount} LE
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Controls */}
                      <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {order.status === "Pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOrderAction(order.id, "start")}
                                disabled={processingOrderIds[order.id]}
                                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs py-2 px-3 shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Truck className="h-3.5 w-3.5" />
                                <span>بدء التجهيز</span>
                              </button>

                              {/* Reject Order Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectModalOrder(order);
                                  setRejectionReason("");
                                }}
                                disabled={processingOrderIds[order.id]}
                                className="rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs py-2 px-3 transition-colors cursor-pointer flex items-center justify-center gap-1"
                                title="رفض هذا الطلب"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>رفض الطلب</span>
                              </button>
                            </>
                          )}

                          {order.status === "In Progress" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOrderAction(order.id, "finish")}
                                disabled={processingOrderIds[order.id]}
                                className="flex-1 rounded-xl bg-[#0f9d08] hover:bg-[#0c8406] disabled:opacity-60 text-white font-bold text-xs py-2 px-3 shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>تأكيد الانتهاء والتوصيل</span>
                              </button>

                              {/* Reject Order Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectModalOrder(order);
                                  setRejectionReason("");
                                }}
                                disabled={processingOrderIds[order.id]}
                                className="rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs py-2 px-3 transition-colors cursor-pointer flex items-center justify-center gap-1"
                                title="رفض هذا الطلب"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>رفض</span>
                              </button>
                            </>
                          )}

                          {(order.status === "Finished" || order.status === "Rejected") && (
                            <button
                              type="button"
                              onClick={() => handleOrderAction(order.id, "archive")}
                              disabled={processingOrderIds[order.id]}
                              className="flex-1 rounded-xl bg-neutral-900 hover:bg-black disabled:opacity-60 text-white font-bold text-xs py-2 px-3 shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Archive className="h-3.5 w-3.5" />
                              <span>أرشفة الطلب</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(order)}
                            title="طباعة إيصال الفاتورة الحراري"
                            className="rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 p-2 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Archived Orders with Bulk and Individual Deletion */}
        {activeTab === "archived_orders" && (
          <div className="space-y-4">
            {/* Archived Actions Bar */}
            {archivedOrders.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-neutral-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAllArchived}
                    className="flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-800 cursor-pointer"
                  >
                    {selectedArchivedIds.length === archivedOrders.length ? (
                      <CheckSquare className="h-4 w-4 text-[#c81010]" />
                    ) : (
                      <Square className="h-4 w-4 text-neutral-400" />
                    )}
                    <span>
                      {selectedArchivedIds.length === archivedOrders.length
                        ? "إلغاء تحديد الكل"
                        : "تحديد جميع الطلبات"}
                    </span>
                  </button>

                  {selectedArchivedIds.length > 0 && (
                    <span className="text-xs font-bold text-neutral-500">
                      تم تحديد ({selectedArchivedIds.length}) طلب
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Delete Selected Button */}
                  <button
                    type="button"
                    disabled={selectedArchivedIds.length === 0}
                    onClick={() =>
                      setDeleteConfirmModal({
                        mode: "bulk",
                        count: selectedArchivedIds.length,
                      })
                    }
                    className="flex items-center gap-1 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs px-3.5 py-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>حذف الطلبات المحددة ({selectedArchivedIds.length})</span>
                  </button>

                  {/* Clear All Archived Button */}
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirmModal({
                        mode: "clear_all",
                        count: archivedOrders.length,
                      })
                    }
                    className="flex items-center gap-1 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs px-3.5 py-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>مسح كل الأرشيف</span>
                  </button>
                </div>
              </div>
            )}

            {archivedOrders.length === 0 ? (
              <div className="rounded-3xl border border-neutral-200 bg-white p-16 text-center shadow-xs">
                <Archive className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
                <h3 className="text-base font-extrabold text-neutral-800">
                  الأرشيف فارغ
                </h3>
                <p className="mt-1 text-xs font-semibold text-neutral-500">
                  الطلبات المنتهية أو الملغاة التي تؤرشفها تظهر هنا للرجوع إليها أو حذفها نهائياً.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-neutral-50 border-b border-neutral-200 font-extrabold text-neutral-700">
                    <tr>
                      <th className="p-3.5 w-10 text-center">
                        <button
                          type="button"
                          onClick={toggleSelectAllArchived}
                          className="cursor-pointer"
                        >
                          {selectedArchivedIds.length === archivedOrders.length ? (
                            <CheckSquare className="h-4 w-4 text-[#c81010]" />
                          ) : (
                            <Square className="h-4 w-4 text-neutral-400" />
                          )}
                        </button>
                      </th>
                      <th className="p-3.5">كود الطلب</th>
                      <th className="p-3.5">العميل</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5">طريقة الدفع</th>
                      <th className="p-3.5">المبلغ</th>
                      <th className="p-3.5">التاريخ</th>
                      <th className="p-3.5">الإيصال</th>
                      <th className="p-3.5 text-center">حذف من الأرشيف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-800">
                    {archivedOrders.map((order) => {
                      const isSelected = selectedArchivedIds.includes(order.id);
                      return (
                        <tr
                          key={order.id}
                          className={`hover:bg-neutral-50/80 transition-colors ${
                            isSelected ? "bg-red-50/30" : ""
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectArchived(order.id)}
                              className="cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-[#c81010]" />
                              ) : (
                                <Square className="h-4 w-4 text-neutral-400" />
                              )}
                            </button>
                          </td>
                          <td className="p-3.5 font-black text-[#c81010]" dir="ltr">
                            {order.orderCode}
                          </td>
                          <td className="p-3.5">
                            <div className="font-extrabold">{order.customerName}</div>
                            <div className="text-neutral-500 text-[11px]" dir="ltr">
                              {order.customerPhone}
                            </div>
                          </td>
                          <td className="p-3.5">
                            {order.status === "Finished" && (
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                مكتمل
                              </span>
                            )}
                            {order.status === "Rejected" && (
                              <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                مرفوض
                              </span>
                            )}
                            {order.status !== "Finished" && order.status !== "Rejected" && (
                              <span className="text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md font-bold text-[11px]">
                                {order.status}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold">{getPaymentName(order.paymentMethod)}</span>
                            {order.paymentWalletPhone && (
                              <div className="text-[11px] text-neutral-500" dir="ltr">
                                {order.paymentWalletPhone}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 font-black" dir="ltr">
                            {order.totalAmount} LE
                          </td>
                          <td className="p-3.5 text-neutral-500 text-[11px]">
                            {new Date(order.createdAt).toLocaleDateString("ar-EG")}
                          </td>
                          <td className="p-3.5">
                            {order.paymentReceiptImage ? (
                              <button
                                type="button"
                                onClick={() => setViewingReceiptOrder(order)}
                                className="text-xs font-bold text-emerald-700 underline cursor-pointer"
                              >
                                عرض الإيصال
                              </button>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handlePrintReceipt(order)}
                                className="text-neutral-600 hover:text-black p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer"
                                title="طباعة الإيصال"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                              {/* Individual Delete Button beside each order */}
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteConfirmModal({
                                    mode: "single",
                                    orderId: order.id,
                                    orderCode: order.orderCode,
                                  })
                                }
                                className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                                title="حذف هذا الطلب نهائياً من الأرشيف"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Sales & Profits with Completed Orders and Sold Products with Date & Time */}
        {activeTab === "sales_profits" && (
          <div className="space-y-6">
            {/* Period Switcher */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                {(
                  [
                    { id: "today", label: "اليوم" },
                    { id: "week", label: "هذا الأسبوع" },
                    { id: "month", label: "هذا الشهر" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setReportPeriod(p.id);
                      fetchSalesAndProfits(p.id);
                    }}
                    className={`rounded-full px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                      reportPeriod === p.id
                        ? "bg-[#0f9d08] text-white shadow-sm"
                        : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="text-xs font-bold text-neutral-500">
                فترة التقرير:{" "}
                <span className="text-neutral-900 font-extrabold">
                  {reportPeriod === "today"
                    ? "اليوم"
                    : reportPeriod === "week"
                    ? "آخر 7 أيام"
                    : "آخر 30 يوماً"}
                </span>
              </div>
            </div>

            {salesLoading && !salesData ? (
              <div className="rounded-3xl border border-neutral-200 bg-white p-16 text-center">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#0f9d08] mb-3" />
                <p className="text-sm font-bold text-neutral-600">
                  جاري احتساب تقارير المبيعات والأرباح...
                </p>
              </div>
            ) : salesData ? (
              <>
                {/* 4 Stat Cards: Revenue, Profit, Finished Orders, and "عدد المنتجات المباعة" */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-xs text-right">
                    <span className="text-xs font-bold text-neutral-500">إجمالي المبيعات</span>
                    <div dir="ltr" className="text-2xl sm:text-3xl font-black text-neutral-900 mt-1">
                      {salesData.totalRevenue} LE
                    </div>
                    <span className="text-[11px] text-neutral-400 mt-1 block">
                      إجمالي قيمة الطلبات المكتملة
                    </span>
                  </div>

                  <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-xs text-right">
                    <span className="text-xs font-bold text-neutral-500">صافي الأرباح المحققة (المنتجات)</span>
                    <div dir="ltr" className="text-2xl sm:text-3xl font-black text-[#0f9d08] mt-1">
                      {salesData.totalProfit} LE
                    </div>
                    <span className="text-[11px] text-emerald-700 font-bold mt-1 block">
                      هامش ربح {salesData.profitMarginPercent}%
                    </span>
                  </div>

                  <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-xs text-right">
                    <span className="text-xs font-bold text-neutral-500">الطلبات الناجحة المكتملة</span>
                    <div className="text-2xl sm:text-3xl font-black text-neutral-900 mt-1">
                      {salesData.finishedOrdersCount}
                    </div>
                    <span className="text-[11px] text-neutral-400 mt-1 block">
                      تم تسليمها وتوصيلها بنجاح
                    </span>
                  </div>

                  {/* Replaced Average Order Value with "عدد المنتجات المباعة" per user request */}
                  <div className="rounded-3xl border-2 border-emerald-500/40 bg-emerald-50/30 p-5 shadow-xs text-right">
                    <span className="text-xs font-black text-emerald-900">عدد المنتجات المباعة</span>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                      {salesData.totalItemsSold} <span className="text-sm font-bold">قطعة</span>
                    </div>
                    <span className="text-[11px] text-emerald-800 font-semibold mt-1 block">
                      إجمالي الشرابات والقطع المباعة
                    </span>
                  </div>
                </div>

                {/* Partner Profit Split: محمد & عبدالرحمن */}
                <div className="rounded-3xl border-2 border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 via-white to-neutral-50 p-6 shadow-sm text-right space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-neutral-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-600" />
                        <span>توزيع الأرباح بين الشركاء (محمد و عبدالرحمن)</span>
                      </h4>
                      <p className="text-xs text-neutral-500 font-semibold mt-0.5">
                        معادلة التوزيع: تقسيم ربح المنتجات ورسوم التوصيل مناصفة 50% لمحمد و 50% لعبدالرحمن
                      </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-white border border-indigo-200/70 px-3.5 py-1.5 shadow-xs text-xs font-bold">
                      <span className="text-neutral-500">إجمالي رسوم التوصيل:</span>
                      <span dir="ltr" className="font-black text-indigo-700">
                        {salesData.totalDeliveryFees ?? 0} LE
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mohamed's Profit Card */}
                    <div className="rounded-2xl border-2 border-emerald-300 bg-white p-5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm">
                            م
                          </span>
                          <div>
                            <span className="text-sm font-black text-neutral-900 block">
                              مجموع مكسب محمد
                            </span>
                            <span className="text-[11px] font-bold text-emerald-700">
                              (50% من أرباح المنتجات + 50% من رسوم التوصيل)
                            </span>
                          </div>
                        </div>

                        <div dir="ltr" className="text-right">
                          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                            {salesData.mohamedTotalProfit ??
                              Math.round(
                                (salesData.totalProfit + (salesData.totalDeliveryFees || 0)) / 2
                              )}{" "}
                            <span className="text-xs font-black">LE</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600 font-semibold">
                        <span>تفصيل الحسبة:</span>
                        <span dir="ltr" className="font-mono text-[11px] text-neutral-800 font-bold">
                          {salesData.totalProfit / 2} LE (منتجات) + {(salesData.totalDeliveryFees ?? 0) / 2} LE (توصيل)
                        </span>
                      </div>
                    </div>

                    {/* Abdelrahman's Profit Card */}
                    <div className="rounded-2xl border-2 border-blue-300 bg-white p-5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-800 font-black text-sm">
                            ع
                          </span>
                          <div>
                            <span className="text-sm font-black text-neutral-900 block">
                              مجموع مكسب عبدالرحمن
                            </span>
                            <span className="text-[11px] font-bold text-blue-700">
                              (50% من أرباح المنتجات + 50% من رسوم التوصيل)
                            </span>
                          </div>
                        </div>

                        <div dir="ltr" className="text-right">
                          <div className="text-2xl sm:text-3xl font-black text-blue-600">
                            {salesData.abdelrahmanTotalProfit ??
                              salesData.ahmedTotalProfit ??
                              Math.round(
                                (salesData.totalProfit + (salesData.totalDeliveryFees || 0)) / 2
                              )}{" "}
                            <span className="text-xs font-black">LE</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600 font-semibold">
                        <span>تفصيل الحسبة:</span>
                        <span dir="ltr" className="font-mono text-[11px] text-neutral-800 font-bold">
                          {salesData.totalProfit / 2} LE (منتجات) + {(salesData.totalDeliveryFees ?? 0) / 2} LE (توصيل)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtabs for Detail Tables: Completed Orders vs Sold Products */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                    <button
                      type="button"
                      onClick={() => setSalesSubTab("completed_orders")}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                        salesSubTab === "completed_orders"
                          ? "bg-neutral-900 text-white shadow-xs"
                          : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>الطلبات التي تمت بنجاح ({salesData.completedOrders?.length || 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSalesSubTab("sold_products")}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                        salesSubTab === "sold_products"
                          ? "bg-neutral-900 text-white shadow-xs"
                          : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <Layers className="h-4 w-4 text-blue-400" />
                      <span>المنتجات التي تم بيعها بالتاريخ والساعة ({salesData.soldProducts?.length || 0})</span>
                    </button>
                  </div>

                  {/* Subtab 1: Completed Orders Table */}
                  {salesSubTab === "completed_orders" && (
                    <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden shadow-xs">
                      {!salesData.completedOrders || salesData.completedOrders.length === 0 ? (
                        <div className="p-12 text-center text-neutral-500 font-semibold text-xs">
                          لا توجد طلبات مكتملة خلال الفترة المحددة ({reportPeriod}).
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-neutral-50 border-b border-neutral-200 font-extrabold text-neutral-700">
                              <tr>
                                <th className="p-3.5">كود الطلب</th>
                                <th className="p-3.5">العميل</th>
                                <th className="p-3.5">المنتجات المباعة</th>
                                <th className="p-3.5">طريقة الدفع</th>
                                <th className="p-3.5">إجمالي المبلغ</th>
                                <th className="p-3.5">تاريخ وساعة الإتمام</th>
                                <th className="p-3.5 text-center">إجراء</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-800">
                              {salesData.completedOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-neutral-50/80">
                                  <td className="p-3.5 font-black text-[#c81010]" dir="ltr">
                                    {order.orderCode}
                                  </td>
                                  <td className="p-3.5">
                                    <div className="font-extrabold">{order.customerName}</div>
                                    <div className="text-neutral-500 text-[11px]" dir="ltr">
                                      {order.customerPhone}
                                    </div>
                                  </td>
                                  <td className="p-3.5">
                                    <div className="space-y-0.5">
                                      {order.items.map((it, idx) => (
                                        <div key={idx} className="text-[11px]">
                                          <span className="font-bold text-[#c81010]">{it.quantity}×</span>{" "}
                                          <span>{it.productName}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="p-3.5">
                                    <span className="font-bold">{getPaymentName(order.paymentMethod)}</span>
                                    {order.paymentWalletPhone && (
                                      <div className="text-[11px] text-neutral-500" dir="ltr">
                                        {order.paymentWalletPhone}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3.5 font-black" dir="ltr">
                                    {order.totalAmount} LE
                                  </td>
                                  <td className="p-3.5 text-neutral-600 font-bold text-[11px]">
                                    {formatDateTime(order.finishedAt || order.createdAt)}
                                  </td>
                                  <td className="p-3.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handlePrintReceipt(order)}
                                      className="text-neutral-700 hover:text-black p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer"
                                      title="طباعة الفاتورة"
                                    >
                                      <Printer className="h-4 w-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subtab 2: Sold Products with Date & Time Table */}
                  {salesSubTab === "sold_products" && (
                    <div className="rounded-3xl border border-neutral-200 bg-white overflow-hidden shadow-xs">
                      {!salesData.soldProducts || salesData.soldProducts.length === 0 ? (
                        <div className="p-12 text-center text-neutral-500 font-semibold text-xs">
                          لا توجد مبيعات مسجلة خلال الفترة المحددة ({reportPeriod}).
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-neutral-50 border-b border-neutral-200 font-extrabold text-neutral-700">
                              <tr>
                                <th className="p-3.5">المنتج</th>
                                <th className="p-3.5">القسم</th>
                                <th className="p-3.5">الكمية</th>
                                <th className="p-3.5">سعر القطعة</th>
                                <th className="p-3.5">الإجمالي</th>
                                <th className="p-3.5">ربح المنتج</th>
                                <th className="p-3.5 text-emerald-800 bg-emerald-50/60">مكسب محمد (50%)</th>
                                <th className="p-3.5 text-blue-800 bg-blue-50/60">مكسب عبدالرحمن (50%)</th>
                                <th className="p-3.5">كود الطلب</th>
                                <th className="p-3.5">تاريخ وساعة البيع</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-800">
                              {salesData.soldProducts.map((p) => {
                                const itemProfit =
                                  typeof p.totalProfit === "number"
                                    ? p.totalProfit
                                    : Math.round(p.totalPrice * 0.45);
                                const mohamedProfit =
                                  typeof p.mohamedProfit === "number"
                                    ? p.mohamedProfit
                                    : itemProfit / 2;
                                const abdelrahmanProfit =
                                  typeof p.abdelrahmanProfit === "number"
                                    ? p.abdelrahmanProfit
                                    : typeof p.ahmedProfit === "number"
                                    ? p.ahmedProfit
                                    : itemProfit / 2;

                                return (
                                  <tr key={p.id} className="hover:bg-neutral-50/80">
                                    <td className="p-3.5 font-extrabold text-neutral-900">
                                      {p.productName}
                                    </td>
                                    <td className="p-3.5">
                                      <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-bold text-[11px]">
                                        {p.category}
                                      </span>
                                    </td>
                                    <td className="p-3.5 font-black text-emerald-700">
                                      {p.quantity} قطعة
                                    </td>
                                    <td className="p-3.5" dir="ltr">
                                      {p.unitPrice} LE
                                    </td>
                                    <td className="p-3.5 font-black text-neutral-900" dir="ltr">
                                      {p.totalPrice} LE
                                    </td>
                                    <td className="p-3.5 font-black text-[#0f9d08]" dir="ltr">
                                      {itemProfit} LE
                                    </td>
                                    <td className="p-3.5 font-black text-emerald-700 bg-emerald-50/30" dir="ltr">
                                      {mohamedProfit} LE
                                    </td>
                                    <td className="p-3.5 font-black text-blue-700 bg-blue-50/30" dir="ltr">
                                      {abdelrahmanProfit} LE
                                    </td>
                                    <td className="p-3.5 font-bold text-[#c81010]" dir="ltr">
                                      {p.orderCode}
                                    </td>
                                    <td className="p-3.5 text-neutral-600 font-bold text-[11px] whitespace-nowrap">
                                      {formatDateTime(p.soldAt)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-neutral-100/80 border-t-2 border-neutral-300 font-black text-xs text-neutral-900">
                              <tr>
                                <td colSpan={2} className="p-3.5 text-right font-black">
                                  مجموع أرباح المنتجات:
                                </td>
                                <td className="p-3.5 text-emerald-800 font-black" dir="ltr">
                                  {salesData.totalItemsSold}
                                </td>
                                <td></td>
                                <td className="p-3.5 font-black" dir="ltr">
                                  {salesData.soldProducts.reduce((sum, p) => sum + p.totalPrice, 0)} LE
                                </td>
                                <td className="p-3.5 font-black text-[#0f9d08]" dir="ltr">
                                  {salesData.totalProfit} LE
                                </td>
                                <td className="p-3.5 font-black text-emerald-800 bg-emerald-100/60" dir="ltr">
                                  {salesData.totalProfit / 2} LE
                                </td>
                                <td className="p-3.5 font-black text-blue-800 bg-blue-100/60" dir="ltr">
                                  {salesData.totalProfit / 2} LE
                                </td>
                                <td colSpan={2} className="p-3 text-[11px] font-bold text-neutral-500">
                                  * يضاف مناصفة +{(salesData.totalDeliveryFees ?? 0) / 2} LE توصيل لكل منهما
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Tab 4: Products & Store Management */}
        {activeTab === "products" && (
          <div className="space-y-6">
            {/* Store Status Control Card */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs text-right space-y-6">
              <div className="border-b border-neutral-100 pb-4">
                <h3 className="text-base sm:text-lg font-black text-neutral-900 flex items-center gap-2">
                  <Store className="h-5 w-5 text-indigo-600" />
                  <span>التحكم في فتح وإغلاق المتجر ومواعيد العمل</span>
                </h3>
                <p className="text-xs font-semibold text-neutral-500 mt-1">
                  يمكنك إغلاق أو فتح المتجر، وتحديد موعد الفتح وموعد الإغلاق، وكتابة ملحوظة للمستخدم تظهر له في واجهة المتجر.
                </p>
              </div>

              {/* 1. زر لإغلاق وفتح المتجر */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-neutral-900">
                      حالة المتجر الحالية:
                    </span>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-black text-white ${
                        storeSettings.isOpen ? "bg-emerald-600" : "bg-[#c81010]"
                      }`}
                    >
                      {storeSettings.isOpen ? "مفتوح ويستقبل الطلبات" : "مغلق حالياً"}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500 mt-1 block">
                    اضغط الزر للتبديل المباشر بين فتح المتجر وإغلاقه أمام المستخدمين
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleStoreOpen}
                  disabled={savingSettings}
                  className={`flex items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 font-black text-sm transition-all shadow-md cursor-pointer ${
                    storeSettings.isOpen
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                      : "bg-[#c81010] hover:bg-red-800 text-white shadow-red-500/20"
                  }`}
                >
                  <Power className="h-5 w-5" />
                  <span>
                    {storeSettings.isOpen
                      ? "المتجر مفتوح الآن (اضغط لإغلاق المتجر)"
                      : "المتجر مغلق الآن (اضغط لفتح المتجر)"}
                  </span>
                </button>
              </div>

              {/* 2. خانتان أسفل الزر: خانة لوقت الفتح وخانة أخرى لوقت الإغلاق */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* خانة وقت الفتح */}
                <div>
                  <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                    وقت الفتح:
                  </label>
                  <div className="relative">
                    <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      value={storeSettings.openTime}
                      onChange={(e) => {
                        isSettingsDirtyRef.current = true;
                        setStoreSettings((prev) => ({ ...prev, openTime: e.target.value }));
                      }}
                      placeholder="مثال: 10:00 ص أو 9:00 صباحاً"
                      className="w-full rounded-2xl border border-neutral-300 pr-10 pl-3.5 py-2.5 text-xs font-bold text-neutral-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-1 block">
                    يظهر للمستخدم عند إغلاق المتجر: &quot;المتجر مغلق الان و سيفتح في الساعة ...&quot;
                  </span>
                </div>

                {/* خانة وقت الإغلاق */}
                <div>
                  <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                    وقت الإغلاق:
                  </label>
                  <div className="relative">
                    <Clock className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      value={storeSettings.closeTime}
                      onChange={(e) => {
                        isSettingsDirtyRef.current = true;
                        setStoreSettings((prev) => ({ ...prev, closeTime: e.target.value }));
                      }}
                      placeholder="مثال: 11:00 م أو 12:00 منتصف الليل"
                      className="w-full rounded-2xl border border-neutral-300 pr-10 pl-3.5 py-2.5 text-xs font-bold text-neutral-900 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-1 block">
                    يظهر في مواعيد العمل: &quot;من [وقت الفتح] إلى [وقت الإغلاق]&quot;
                  </span>
                </div>

                {/* 3. خانة إضافية لكتابة ملحوظة للمستخدم */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-neutral-800 mb-1.5">
                    خانة لكتابة ملحوظة للمستخدم (تظهر في واجهة المتجر أسفل مواعيد العمل):
                  </label>
                  <div className="relative">
                    <Edit3 className="absolute right-3.5 top-3 h-4 w-4 text-neutral-400" />
                    <textarea
                      rows={2}
                      value={storeSettings.note}
                      onChange={(e) => {
                        isSettingsDirtyRef.current = true;
                        setStoreSettings((prev) => ({ ...prev, note: e.target.value }));
                      }}
                      placeholder="اكتب هنا أي ملحوظة ترغب في تركها للمستخدم..."
                      className="w-full rounded-2xl border border-neutral-300 pr-10 pl-3.5 py-2.5 text-xs font-bold text-neutral-900 focus:border-indigo-600 focus:outline-none resize-none"
                    />
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-1 block">
                    تظهر للمستخدم أسفل مواعيد العمل عندما يكون المتجر مغلقاً
                  </span>
                </div>

                {/* 4. خانة تعديل مصاريف الشحن والتوصيل */}
                <div className="md:col-span-2 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label className="block text-xs font-black text-neutral-900 mb-1 flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-indigo-600" />
                        <span>سعر مصاريف التوصيل للمنزل (Delivery Fee):</span>
                      </label>
                      <p className="text-[11px] font-semibold text-neutral-500">
                        يمكنك تغيير سعر التوصيل في أي وقت، وسيتم تطبيقه فوراً على فاتورة العميل وإجمالي الطلب عند الشراء.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative w-36">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={storeSettings.deliveryFee ?? 25}
                          onChange={(e) => {
                            isSettingsDirtyRef.current = true;
                            const val = parseFloat(e.target.value);
                            setStoreSettings((prev) => ({
                              ...prev,
                              deliveryFee: isNaN(val) ? 0 : val,
                            }));
                          }}
                          placeholder="مثال: 30"
                          className="w-full rounded-xl border-2 border-indigo-200 bg-white pr-4 pl-12 py-2 text-sm font-black text-neutral-900 text-center focus:border-indigo-600 focus:outline-none"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-indigo-700">
                          ج.م
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Settings Action */}
              <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                <span className="text-[11px] text-neutral-500 font-semibold">
                  آخر تحديث: {new Date(storeSettings.updatedAt).toLocaleTimeString("ar-EG")}
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveSettings()}
                  disabled={savingSettings}
                  className="rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-black px-6 py-2.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingSettings ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </div>

            {/* Google Sheets Product Catalog View */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs text-right space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-neutral-900">
                    المنتجات المتاحة من Google Sheets ({sheetProducts.length})
                  </h3>
                  <p className="text-xs font-semibold text-neutral-500">
                    المنتجات المعروضة أدناه مستخرجة مباشرة من ملف الـ Google Sheet الرسمي فقط بدون أي منتجات إضافية
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchSheetProducts}
                  disabled={sheetLoading}
                  className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white hover:bg-neutral-50 px-4 py-2 text-xs font-bold text-neutral-800 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${sheetLoading ? "animate-spin" : ""}`} />
                  <span>تحديث من Google Sheets</span>
                </button>
              </div>

              {sheetLoading ? (
                <div className="py-12 text-center text-xs text-neutral-500 font-semibold flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#c81010]" />
                  <span>جاري فحص وتحديث المنتجات من ملف Google Sheets...</span>
                </div>
              ) : sheetProducts.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center space-y-2">
                  <ShoppingBag className="h-10 w-10 text-neutral-400 mx-auto" />
                  <h4 className="text-sm font-extrabold text-neutral-800">
                    لا توجد منتجات متوفرة حالياً في ملف الـ Google Sheets
                  </h4>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    لم يتم العثور على منتجات في الشيت، والمتجر لا يعرض أي منتجات وهمية أو مؤلفة.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 font-extrabold text-neutral-700">
                      <tr>
                        <th className="p-3.5">الصورة</th>
                        <th className="p-3.5">اسم المنتج</th>
                        <th className="p-3.5">القسم</th>
                        <th className="p-3.5">السعر</th>
                        <th className="p-3.5">الوصف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-800">
                      {sheetProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-50/80">
                          <td className="p-3.5">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                className="h-10 w-10 rounded-lg object-contain bg-neutral-50 border border-neutral-200"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-400">
                                <ShoppingBag className="h-5 w-5" />
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 font-black text-neutral-900">{p.name}</td>
                          <td className="p-3.5">
                            <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-bold text-[11px]">
                              {p.category}
                            </span>
                          </td>
                          <td className="p-3.5 font-black" dir="ltr">
                            {p.price} LE
                          </td>
                          <td className="p-3.5 text-neutral-500 text-[11px] max-w-xs truncate">
                            {p.description || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Reject Order Confirmation Modal */}
      {rejectModalOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
          onClick={() => setRejectModalOrder(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl text-right space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-black text-base">
                <XCircle className="h-5 w-5" />
                <span>تأكيد رفض الطلب ({rejectModalOrder.orderCode})</span>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="rounded-full p-1 text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs font-semibold text-neutral-600">
              هل أنت متأكد من رغبتك في رفض طلب العميل{" "}
              <strong className="text-neutral-900">{rejectModalOrder.customerName}</strong>؟
              سيتم تغيير حالة الطلب إلى &quot;مرفوض&quot;.
            </p>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                سبب الرفض (اختياري):
              </label>
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="مثال: إيصال الدفع غير مطابق / بيانات غير صحيحة"
                className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-xs font-semibold focus:border-[#c81010] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="rounded-full border border-neutral-300 px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="rounded-full bg-red-600 hover:bg-red-700 text-white px-5 py-2 text-xs font-bold shadow-xs cursor-pointer"
              >
                تأكيد رفض الطلب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Archived Orders Confirmation Modal */}
      {deleteConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
          onClick={() => setDeleteConfirmModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl text-right space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-black text-base">
                <AlertTriangle className="h-5 w-5" />
                <span>
                  {deleteConfirmModal.mode === "clear_all"
                    ? "مسح كل الأرشيف"
                    : deleteConfirmModal.mode === "bulk"
                    ? `حذف (${deleteConfirmModal.count}) طلبات محددة`
                    : `حذف الطلب (${deleteConfirmModal.orderCode})`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="rounded-full p-1 text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs font-semibold text-neutral-600 leading-relaxed">
              {deleteConfirmModal.mode === "clear_all"
                ? "هل أنت متأكد من مسح جميع الطلبات المؤرشفة نهائياً؟ لن يمكن التراجع عن هذا الإجراء."
                : deleteConfirmModal.mode === "bulk"
                ? `هل أنت متأكد من حذف ${deleteConfirmModal.count} طلبات محددة من الأرشيف نهائياً؟`
                : `هل أنت متأكد من حذف الطلب ${deleteConfirmModal.orderCode} نهائياً من الأرشيف؟`}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="rounded-full border border-neutral-300 px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deletingArchived}
                onClick={handleExecuteDeleteArchived}
                className="rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-5 py-2 text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {deletingArchived ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <span>تأكيد الحذف نهائياً</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Payment Receipt Viewer Modal */}
      {viewingReceiptOrder && viewingReceiptOrder.paymentReceiptImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setViewingReceiptOrder(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col max-h-[92vh] w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl overflow-hidden"
          >
            {/* Modal Head */}
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-3">
              <div className="text-right">
                <h3 className="text-base font-black text-[#111111]">
                  فحص إيصال الدفع • {viewingReceiptOrder.orderCode}
                </h3>
                <p className="text-xs font-bold text-neutral-500">
                  العميل: {viewingReceiptOrder.customerName} • الهاتف:{" "}
                  <span dir="ltr">{viewingReceiptOrder.customerPhone}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptOrder(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Details Box */}
            <div className="rounded-2xl bg-neutral-50 p-3 mb-3 space-y-1 text-xs border border-neutral-200 text-right">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-600">طريقة التحويل:</span>
                <span className="font-extrabold text-[#c81010]">
                  {getPaymentName(viewingReceiptOrder.paymentMethod)}
                </span>
              </div>
              {viewingReceiptOrder.paymentWalletPhone && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-600">رقم المحفظة / الحساب المحول منه:</span>
                  <span dir="ltr" className="font-black text-neutral-900">
                    {viewingReceiptOrder.paymentWalletPhone}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between font-black text-sm text-neutral-900 border-t border-neutral-200 pt-1">
                <span>المبلغ المفترض تحويله:</span>
                <span dir="ltr" className="text-[#c81010]">
                  {viewingReceiptOrder.totalAmount} LE
                </span>
              </div>
            </div>

            {/* Image Preview Container */}
            <div className="flex-1 overflow-auto rounded-2xl bg-neutral-900/5 p-2 flex items-center justify-center border border-neutral-200 max-h-[55vh]">
              <img
                src={viewingReceiptOrder.paymentReceiptImage}
                alt="إيصال التحويل"
                className="max-h-full max-w-full object-contain rounded-xl shadow-md"
              />
            </div>

            {/* Modal Bottom Actions */}
            <div className="mt-4 flex items-center justify-between gap-2">
              <a
                href={viewingReceiptOrder.paymentReceiptImage}
                download={`receipt_${viewingReceiptOrder.orderCode}.png`}
                className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs px-4 py-2 cursor-pointer shadow-2xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>تحميل الصورة للجهاز</span>
              </a>

              <button
                type="button"
                onClick={() => setViewingReceiptOrder(null)}
                className="rounded-full bg-[#c81010] hover:bg-red-800 text-white font-bold text-xs px-6 py-2 cursor-pointer shadow-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Print Receipt Template */}
      {printingOrder && (
        <div id="printable-receipt-container" dir="rtl" className="text-right text-xs">
          <div className="text-center pb-2 border-b border-black">
            <h2 className="text-xl font-black">ZOKS</h2>
            <p className="text-[11px] font-bold">أفضل الخامات بأفضل الأسعار</p>
            <p className="text-[10px]">فاتورة طلب رقم: {printingOrder.orderCode}</p>
          </div>

          <div className="py-2 border-b border-black space-y-1 text-[11px]">
            <div><strong>التاريخ: </strong>{new Date(printingOrder.createdAt).toLocaleString("ar-EG")}</div>
            <div><strong>العميل: </strong>{printingOrder.customerName}</div>
            <div><strong>الهاتف: </strong><span dir="ltr">{printingOrder.customerPhone}</span></div>
            <div><strong>نوع الاستلام: </strong>توصيل للمنزل</div>
            <div><strong>العنوان: </strong>{printingOrder.deliveryAddress}</div>
            <div><strong>طريقة الدفع: </strong>{getPaymentName(printingOrder.paymentMethod)}</div>
            {printingOrder.paymentWalletPhone && (
              <div><strong>رقم المحفظة: </strong><span dir="ltr">{printingOrder.paymentWalletPhone}</span></div>
            )}
            {printingOrder.notes && (
              <div><strong>ملاحظات: </strong>{printingOrder.notes}</div>
            )}
          </div>

          <div className="py-2 border-b border-black space-y-1">
            <div className="font-bold border-b border-black/40 pb-1 flex justify-between">
              <span>المنتج</span>
              <span>السعر</span>
            </div>
            {printingOrder.items.map((item, i) => (
              <div key={i} className="flex justify-between text-[11px]">
                <span>{item.quantity}× {item.productName}</span>
                <span dir="ltr">{item.unitPrice * item.quantity} LE</span>
              </div>
            ))}
            <div className="flex justify-between text-[11px] pt-1 border-t border-black/20">
              <span>رسوم التوصيل للمنزل:</span>
              <span dir="ltr">{printingOrder.deliveryFee || 25} LE</span>
            </div>
            <div className="flex justify-between font-black text-sm pt-1 border-t border-black">
              <span>الإجمالي:</span>
              <span dir="ltr">{printingOrder.totalAmount} LE</span>
            </div>
          </div>

          <div className="text-center pt-2 text-[10px]">
            <p>شكراً لتسوقكم من ZOKS!</p>
            <p>للتواصل والشكاوى: 01069679991 - 01204458239</p>
          </div>
        </div>
      )}
    </div>
  );
}
