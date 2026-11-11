import React, { useEffect, useState, useCallback } from "react";
import type { Order } from "@/lib/types";
import {
  X,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  RefreshCw,
  CreditCard,
  Banknote,
  AlertCircle,
} from "lucide-react";

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightOrderCode?: string | null;
}

export default function MyOrdersModal({
  isOpen,
  onClose,
  highlightOrderCode,
}: MyOrdersModalProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomerOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("تعذر تحميل سجل الطلبات");
      }
      const data = await res.json();
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setError(null);
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof Error ? err.message : "حدث خطأ أثناء تحميل الطلبات"
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchCustomerOrders(false);

    const interval = setInterval(() => {
      fetchCustomerOrders(true);
    }, 4000);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("zoks_order_sync");
      bc.onmessage = () => {
        fetchCustomerOrders(true);
      };
    } catch {
      bc = null;
    }

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
    };
  }, [isOpen, fetchCustomerOrders]);

  if (!isOpen) return null;

  const renderStatusBadge = (status: Order["status"]) => {
    if (status === "Pending") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-800">
          <Clock className="h-3.5 w-3.5" />
          <span>Pending • قيد المراجعة والانتظار</span>
        </span>
      );
    }
    if (status === "In Progress") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-800">
          <Truck className="h-3.5 w-3.5 animate-pulse text-blue-600" />
          <span>In Progress • جاري التجهيز والشحن</span>
        </span>
      );
    }
    if (status === "Rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-extrabold text-red-700">
          <X className="h-3.5 w-3.5" />
          <span>Rejected • تم رفض الطلب</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Finished • تم التوصيل بنجاح</span>
      </span>
    );
  };

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
        return method || "إلكتروني";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="طلباتي ومتابعة الحالة"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full max-h-[90vh] w-full max-w-2xl flex-col rounded-[26px] border-2 border-[#c81010] bg-white shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <Package className="h-5 w-5 text-[#c81010]" />
            <h2 className="text-lg font-extrabold text-[#111111]">
              طلباتي ({orders.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchCustomerOrders(false)}
              aria-label="تحديث الطلبات"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200/80 text-neutral-700 hover:bg-neutral-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق النافذة"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200/80 text-neutral-700 hover:bg-[#c81010] hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading && orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-[#c81010] mb-3" />
              <p className="text-sm font-bold text-neutral-600">
                جاري تحميل طلباتك...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-center">
              <p className="text-sm font-bold text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => fetchCustomerOrders(false)}
                className="mt-3 rounded-full bg-[#c81010] text-white px-5 py-2 text-xs font-bold cursor-pointer hover:bg-red-800"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                <Package className="h-7 w-7" />
              </div>
              <h3 className="text-base font-extrabold text-neutral-800">
                لا توجد طلبات مسجلة حتى الآن
              </h3>
              <p className="mt-1 text-xs font-semibold text-neutral-500 max-w-sm">
                عند إتمام أي طلب من متجر ZOKS ستظهر بياناته وحالته ومتابعة المندوب هنا فوراً.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const isHighlighted = highlightOrderCode === order.orderCode;
              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border transition-all p-4 text-right ${
                    isHighlighted
                      ? "border-[#c81010] bg-red-50/40 ring-2 ring-[#c81010]/30 shadow-md"
                      : "border-neutral-200 bg-white hover:border-neutral-300 shadow-xs"
                  }`}
                >
                  {/* Order Head */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span
                        dir="ltr"
                        className="font-black text-sm text-[#c81010] bg-red-50 px-2.5 py-1 rounded-lg border border-red-100"
                      >
                        {order.orderCode}
                      </span>
                      <span className="text-xs font-semibold text-neutral-500">
                        {new Date(order.createdAt).toLocaleDateString("ar-EG", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div>{renderStatusBadge(order.status)}</div>
                  </div>

                  {/* Rejection Reason Notice */}
                  {order.status === "Rejected" && (
                    <div className="mt-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3 text-right">
                      <div className="flex items-center gap-1.5 text-xs font-black text-red-800">
                        <AlertCircle className="h-4 w-4 text-[#c81010] shrink-0" />
                        <span>سبب الرفض:</span>
                      </div>
                      <p className="mt-1 text-xs font-bold text-red-700 leading-relaxed pr-5">
                        {order.rejectionReason && order.rejectionReason.trim()
                          ? order.rejectionReason
                          : "تم رفض الطلب بواسطة الإدارة"}
                      </p>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="divide-y divide-neutral-100 py-2.5">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1.5 text-xs font-bold text-neutral-800"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-black">
                            {item.quantity}×
                          </span>
                          <span className="truncate">{item.productName}</span>
                        </div>
                        <span dir="ltr" className="shrink-0 text-neutral-900 font-extrabold mr-2">
                          {item.unitPrice * item.quantity} LE
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Order Details & Summary */}
                  <div className="rounded-xl bg-neutral-50 p-3 mt-1 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-neutral-600 font-semibold">
                      <span>طريقة الدفع:</span>
                      <span className="text-neutral-900 font-extrabold flex items-center gap-1">
                        {order.paymentMethod === "cod" ? (
                          <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5 text-[#c81010]" />
                        )}
                        <span>{getPaymentName(order.paymentMethod)}</span>
                      </span>
                    </div>

                    {order.paymentWalletPhone && (
                      <div className="flex items-center justify-between text-neutral-600 font-semibold">
                        <span>رقم المحفظة / الحساب:</span>
                        <span dir="ltr" className="text-neutral-900 font-bold">
                          {order.paymentWalletPhone}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-neutral-600 font-semibold">
                      <span>عنوان التوصيل:</span>
                      <span className="text-neutral-900 font-bold truncate max-w-[240px]">
                        {order.deliveryAddress}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-600 font-semibold">
                      <span>رسوم التوصيل للمنزل:</span>
                      <span dir="ltr" className="font-bold text-neutral-800">
                        {order.deliveryFee || 25} LE
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-neutral-200/80 pt-2 text-sm font-black text-neutral-900">
                      <span>الإجمالي:</span>
                      <span dir="ltr" className="text-base text-[#c81010]">
                        {order.totalAmount} LE
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
