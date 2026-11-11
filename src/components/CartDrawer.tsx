import React, { useState, useRef } from "react";
import type { PublicProduct, CartItem, PaymentMethod, StoreSettings } from "@/lib/types";
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  Banknote,
  ShieldCheck,
  Clock,
} from "lucide-react";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  storeSettings?: StoreSettings;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onOrderCreated: (orderCode: string) => void;
}

const PAYMENT_TARGET_NUMBER = "01204458239";
const WHATSAPP_LOGO_URL =
  "https://res.cloudinary.com/h74mxqsb/image/upload/v1793917546/whatsapp-logo_kv0gdr.png";

const PAYMENT_METHODS: Array<{
  id: PaymentMethod;
  name: string;
  subname: string;
  iconUrl?: string;
  isWallet: boolean;
  borderActive: string;
  bgActive: string;
}> = [
  {
    id: "vodafone_cash",
    name: "فودافون كاش",
    subname: "Vodafone Cash",
    iconUrl:
      "https://res.cloudinary.com/h74mxqsb/image/upload/v1793911571/Vodafone-Cash_xuedki.png",
    isWallet: true,
    borderActive: "border-[#e60000]",
    bgActive: "bg-red-50/70",
  },
  {
    id: "orange_cash",
    name: "اورانج كاش",
    subname: "Orange Cash",
    iconUrl:
      "https://res.cloudinary.com/h74mxqsb/image/upload/v1793911571/Orange-Cash_fn9kac.png",
    isWallet: true,
    borderActive: "border-[#ff7900]",
    bgActive: "bg-orange-50/70",
  },
  {
    id: "etisalat_cash",
    name: "اتصالات كاش",
    subname: "Etisalat Cash",
    iconUrl:
      "https://res.cloudinary.com/h74mxqsb/image/upload/v1793911571/Etisalat-Cash_vjact8.png",
    isWallet: true,
    borderActive: "border-[#719e19]",
    bgActive: "bg-lime-50/70",
  },
  {
    id: "instapay",
    name: "انستا باي",
    subname: "InstaPay",
    iconUrl:
      "https://res.cloudinary.com/h74mxqsb/image/upload/v1793911571/Instapay_jnzamu.png",
    isWallet: true,
    borderActive: "border-[#872b94]",
    bgActive: "bg-purple-50/70",
  },
  {
    id: "cod",
    name: "الدفع عند الاستلام",
    subname: "نقداً عند الاستلام",
    isWallet: false,
    borderActive: "border-neutral-900",
    bgActive: "bg-neutral-100",
  },
];

export default function CartDrawer({
  isOpen,
  onClose,
  items,
  storeSettings,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderCreated,
}: CartDrawerProps) {
  const [step, setStep] = useState<"cart" | "checkout" | "success">("cart");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("vodafone_cash");
  const [walletPhone, setWalletPhone] = useState("");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string>("");
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdOrderCode, setCreatedOrderCode] = useState<string | null>(null);
  const [confirmedOrderTotal, setConfirmedOrderTotal] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  // Home delivery fee dynamically from storeSettings (defaults to 25 EGP)
  const baseDeliveryFee =
    typeof storeSettings?.deliveryFee === "number" && storeSettings.deliveryFee >= 0
      ? storeSettings.deliveryFee
      : 25;
  const deliveryFee = items.length > 0 ? baseDeliveryFee : 0;
  const finalTotal = subtotal + deliveryFee;

  const selectedMethodObj = PAYMENT_METHODS.find((m) => m.id === paymentMethod);
  const isWalletPayment = selectedMethodObj?.isWallet ?? false;

  const handleCopyNumber = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(PAYMENT_TARGET_NUMBER);
      } else {
        const input = document.createElement("input");
        input.value = PAYMENT_TARGET_NUMBER;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2500);
    } catch {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2500);
    }
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg("حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 8 ميجابايت");
      return;
    }

    setErrorMsg(null);
    setReceiptFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setReceiptImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptImage(null);
    setReceiptFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMsg("يرجى إدخال الاسم بالكامل ورقم الهاتف");
      return;
    }

    if (!deliveryAddress.trim()) {
      setErrorMsg("يرجى إدخال عنوان التوصيل بالتفصيل (المحافظة، المنطقة، اسم الشارع، رقم العقار)");
      return;
    }

    // Validation for Wallet / InstaPay: must enter sender phone and attach receipt
    if (isWalletPayment) {
      if (!walletPhone.trim()) {
        setErrorMsg("يرجى كتابة رقم الهاتف المربوط بالمحفظة أو الحساب الذي تم التحويل منه");
        return;
      }

      if (!receiptImage) {
        setErrorMsg("لا يمكن إتمام الطلب إلا بإرفاق إيصال الدفع");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          fulfillmentType: "delivery", // Always delivery per user instruction
          deliveryAddress: deliveryAddress.trim(),
          notes: notes.trim() || null,
          paymentMethod,
          paymentWalletPhone: isWalletPayment ? walletPhone.trim() : null,
          paymentReceiptImage: isWalletPayment ? receiptImage : null,
          items: items.map((i) => ({
            productId: i.product.id,
            productName: i.product.name,
            category: i.product.category,
            quantity: i.quantity,
            unitPrice: i.product.price,
            image: i.product.image,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر إتمام الطلب");
      }

      const code = data.order?.orderCode || "ORD-1001";
      const totalPaid = Number(data.order?.totalAmount) || finalTotal;
      setConfirmedOrderTotal(totalPaid);
      setCreatedOrderCode(code);
      onClearCart();
      setStep("success");

      // Broadcast order update
      try {
        const bc = new BroadcastChannel("zoks_order_sync");
        bc.postMessage({ type: "ORDER_CREATED", orderCode: code });
        bc.close();
      } catch {
        // Ignore BroadcastChannel errors
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "حدث خطأ أثناء إرسال الطلب، يرجى المحاولة ثانية"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDrawer = () => {
    if (step === "success") {
      setStep("cart");
      setCreatedOrderCode(null);
      setConfirmedOrderTotal(0);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-xs"
      onClick={handleCloseDrawer}
      role="dialog"
      aria-modal="true"
      aria-label="سلة المشتريات"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-md sm:max-w-lg flex-col bg-white shadow-2xl border-l-2 border-[#c81010]"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-[#c81010]" />
            <h2 className="text-lg font-extrabold text-[#111111]">
              {step === "cart" && `سلة الطلبات (${totalQuantity})`}
              {step === "checkout" && "إتمام الشراء والدفع"}
              {step === "success" && "تم تأكيد طلبك بنجاح"}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCloseDrawer}
            aria-label="إغلاق السلة"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200/80 text-neutral-700 hover:bg-[#c81010] hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {step === "success" && createdOrderCode ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#111111]">
                تم استلام طلبك بنجاح!
              </h3>
              <p className="mt-2 text-sm font-semibold text-neutral-600">
                كود الطلب الخاص بك:
              </p>
              <div
                dir="ltr"
                className="mt-2 rounded-2xl border-2 border-[#c81010] bg-red-50 px-6 py-2.5 text-2xl font-black text-[#c81010]"
              >
                {createdOrderCode}
              </div>

              <div className="mt-5 w-full rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-right">
                <div className="flex items-center justify-between text-xs text-neutral-600 font-bold mb-1.5">
                  <span>طريقة الدفع:</span>
                  <span className="text-neutral-900 font-extrabold">
                    {selectedMethodObj?.name}
                  </span>
                </div>
                {isWalletPayment && walletPhone && (
                  <div className="flex items-center justify-between text-xs text-neutral-600 font-bold mb-1.5">
                    <span>رقم المحفظة / الحساب:</span>
                    <span dir="ltr" className="text-neutral-900 font-black">
                      {walletPhone}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-neutral-600 font-bold mb-1.5">
                  <span>نوع الاستلام:</span>
                  <span className="text-emerald-700 font-black">
                    توصيل للمنزل (+{baseDeliveryFee} ج.م)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-neutral-900 font-black border-t border-neutral-200 pt-2 mt-2">
                  <span>الإجمالي المدفوع/المطلوب:</span>
                  <span dir="ltr" className="text-base text-[#c81010]">
                    {confirmedOrderTotal > 0 ? confirmedOrderTotal : finalTotal} LE
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs font-semibold text-neutral-500 leading-relaxed">
                سيقوم فريق ZOKS بمراجعة بيانات الطلب وإيصال الدفع وتجهيز الشحنة مع المندوب فوراً.
              </p>

              <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5 text-center">
                <div className="text-xs font-extrabold text-neutral-800 mb-2.5">
                  للتواصل والشكاوى والاستفسار عن طلبك:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Number 1: 01069679991 */}
                  <div className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 bg-white p-2 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText("01069679991");
                        } else {
                          const ta = document.createElement("textarea");
                          ta.value = "01069679991";
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand("copy");
                          document.body.removeChild(ta);
                        }
                        setCopiedPhone("01069679991");
                        setTimeout(() => setCopiedPhone((prev) => (prev === "01069679991" ? null : prev)), 2000);
                      }}
                      dir="ltr"
                      title="اضغط لنسخ الرقم فوراً"
                      className="flex items-center justify-between gap-1.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 px-2.5 py-1.5 text-xs font-black text-neutral-900 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1 text-[11px] text-[#c81010]">
                        {copiedPhone === "01069679991" ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600 font-extrabold">تم النسخ!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>نسخ</span>
                          </>
                        )}
                      </span>
                      <span>01069679991</span>
                    </button>
                    <a
                      href="https://wa.me/201069679991"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="مراسلة عبر واتساب (01069679991)"
                      aria-label="تواصل عبر واتساب 01069679991"
                      className="flex items-center justify-center rounded-lg bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 py-1.5 px-2 shadow-2xs transition-all cursor-pointer"
                    >
                      <img
                        src={WHATSAPP_LOGO_URL}
                        alt="WhatsApp"
                        className="h-5 w-5 object-contain"
                      />
                    </a>
                  </div>

                  {/* Number 2: 01204458239 */}
                  <div className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 bg-white p-2 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText("01204458239");
                        } else {
                          const ta = document.createElement("textarea");
                          ta.value = "01204458239";
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand("copy");
                          document.body.removeChild(ta);
                        }
                        setCopiedPhone("01204458239");
                        setTimeout(() => setCopiedPhone((prev) => (prev === "01204458239" ? null : prev)), 2000);
                      }}
                      dir="ltr"
                      title="اضغط لنسخ الرقم فوراً"
                      className="flex items-center justify-between gap-1.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 px-2.5 py-1.5 text-xs font-black text-neutral-900 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1 text-[11px] text-[#c81010]">
                        {copiedPhone === "01204458239" ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600 font-extrabold">تم النسخ!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>نسخ</span>
                          </>
                        )}
                      </span>
                      <span>01204458239</span>
                    </button>
                    <a
                      href="https://wa.me/201204458239"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="مراسلة عبر واتساب (01204458239)"
                      aria-label="تواصل عبر واتساب 01204458239"
                      className="flex items-center justify-center rounded-lg bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 py-1.5 px-2 shadow-2xs transition-all cursor-pointer"
                    >
                      <img
                        src={WHATSAPP_LOGO_URL}
                        alt="WhatsApp"
                        className="h-5 w-5 object-contain"
                      />
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col w-full gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const code = createdOrderCode;
                    setStep("cart");
                    setCreatedOrderCode(null);
                    onOrderCreated(code);
                  }}
                  className="w-full rounded-full bg-[#0f9d08] hover:bg-[#0c8406] text-white font-bold py-3 px-6 text-sm sm:text-base shadow-md transition-all cursor-pointer"
                >
                  متابعة حالة الطلب في &quot;طلباتي&quot;
                </button>
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="w-full rounded-full border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 font-bold py-2.5 px-6 text-sm transition-all cursor-pointer"
                >
                  متابعة التسوق
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-extrabold text-neutral-800">
                سلة المشتريات فارغة
              </h3>
              <p className="mt-1 text-sm font-medium text-neutral-500">
                اختر شراباتك المفضلة من تشكيلة ZOKS وأضفها إلى السلة
              </p>
              <button
                type="button"
                onClick={handleCloseDrawer}
                className="mt-6 rounded-full bg-[#c81010] hover:bg-red-800 text-white font-bold px-6 py-2.5 text-sm shadow-sm transition-all cursor-pointer"
              >
                تصفح المنتجات
              </button>
            </div>
          ) : step === "cart" ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500">
                  المنتجات المختارة ({items.length})
                </span>
                <button
                  type="button"
                  onClick={onClearCart}
                  className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>إفراغ السلة</span>
                </button>
              </div>

              {items.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-xs"
                >
                  <div className="h-16 w-16 shrink-0 rounded-xl bg-[#f4f5f7] p-1.5 flex items-center justify-center overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ShoppingBag className="h-6 w-6 text-neutral-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <h4 className="text-sm font-extrabold text-[#111111] truncate">
                      {product.name}
                    </h4>
                    <p className="text-xs font-semibold text-neutral-500">
                      {product.category}
                      {product.description ? ` • ${product.description}` : ""}
                    </p>
                    <div
                      dir="ltr"
                      className="mt-1 inline-flex items-baseline text-[#c81010] font-black text-sm"
                    >
                      <span>{product.price * quantity}</span>
                      <span className="text-[11px] ml-0.5">LE</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(product.id)}
                      aria-label={`حذف ${product.name}`}
                      className="text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-2 rounded-full border border-neutral-300 bg-neutral-50 px-2 py-0.5">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(product.id, -1)}
                        aria-label="تقليل الكمية"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black shadow-2xs hover:bg-neutral-200 cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[20px] text-center text-xs font-extrabold">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(product.id, 1)}
                        aria-label="زيادة الكمية"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black shadow-2xs hover:bg-neutral-200 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Delivery notice */}
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3.5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-[#c81010]">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <h5 className="text-xs font-extrabold text-neutral-900">
                    توصيل سريع للمنزل ({baseDeliveryFee} جنيهاً)
                  </h5>
                  <p className="text-[11px] font-semibold text-neutral-500 mt-0.5">
                    نوفر خدمة التوصيل المباشر لباب منزلك مع إمكانية الدفع بالمحافظ الإلكترونية أو عند الاستلام.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Checkout Form Step */
            <form id="zoks-checkout-form" onSubmit={handleCheckoutSubmit} className="flex flex-col gap-4">
              {errorMsg && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-xs font-bold text-red-700 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Customer Info */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-extrabold text-neutral-700 mb-1">
                    الاسم بالكامل *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="مثال: أحمد محمد"
                    className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm font-semibold focus:border-[#c81010] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-neutral-700 mb-1">
                    رقم الهاتف للتواصل والتوصيل *
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm font-semibold text-right focus:border-[#c81010] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-neutral-700 mb-1">
                    عنوان التوصيل بالتفصيل *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="المحافظة، المنطقة، اسم الشارع، رقم العمارة والشقة"
                    className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm font-semibold focus:border-[#c81010] focus:outline-none"
                  />
                  <span className="text-[11px] font-semibold text-neutral-500 mt-1 block">
                    يتم التوصيل حتى باب المنزل (رسوم التوصيل: {baseDeliveryFee} ج.م مضافة للفاتورة).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-neutral-700 mb-1">
                    ملاحظات للمندوب (اختياري)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي توضيحات أو تعليمات خاصة بموعد التوصيل"
                    className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-sm font-semibold focus:border-[#c81010] focus:outline-none"
                  />
                </div>
              </div>

              {/* Payment Methods Section */}
              <div className="pt-2 border-t border-neutral-200">
                <label className="block text-xs font-extrabold text-neutral-800 mb-2">
                  اختر طريقة الدفع *
                </label>

                {/* 5 Payment Methods Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method.id);
                          setErrorMsg(null);
                        }}
                        className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all cursor-pointer text-center ${
                          isSelected
                            ? `${method.borderActive} ${method.bgActive} shadow-xs scale-[1.02]`
                            : "border-neutral-200 bg-white hover:bg-neutral-50"
                        }`}
                      >
                        {method.iconUrl ? (
                          <div className="h-9 w-auto flex items-center justify-center mb-1">
                            <img
                              src={method.iconUrl}
                              alt={method.name}
                              className="max-h-8 max-w-[85px] object-contain"
                            />
                          </div>
                        ) : (
                          <div className="h-9 flex items-center justify-center text-neutral-800 mb-1">
                            <Banknote className="h-6 w-6 text-emerald-700" />
                          </div>
                        )}
                        <span className="text-xs font-extrabold text-neutral-900 leading-tight">
                          {method.name}
                        </span>
                        {isSelected && (
                          <span className="absolute top-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0f9d08] text-white">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wallet / InstaPay Required Transfer & Receipt Box */}
              {isWalletPayment ? (
                <div className="rounded-2xl border-2 border-dashed border-[#c81010]/60 bg-red-50/50 p-4 space-y-3.5 animate-fadeIn">
                  {/* Unified Number Box with Copy Button */}
                  <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-neutral-600">
                        رقم التحويل الموحد (
                        <span className="text-[#c81010] font-black">{selectedMethodObj?.name}</span>
                        ):
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyNumber}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold transition-all cursor-pointer ${
                          copiedNumber
                            ? "bg-emerald-600 text-white"
                            : "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300"
                        }`}
                      >
                        {copiedNumber ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>تم النسخ!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>نسخ الرقم</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div
                      dir="ltr"
                      className="text-center py-1.5 font-black text-xl sm:text-2xl tracking-wider text-[#111111] bg-neutral-50 rounded-lg border border-neutral-200 select-all"
                    >
                      {PAYMENT_TARGET_NUMBER}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs font-extrabold border-t border-neutral-100 pt-2">
                      <span className="text-neutral-700">المبلغ المطلوب تحويله:</span>
                      <span dir="ltr" className="text-sm font-black text-[#c81010]">
                        {finalTotal} LE (شامل التوصيل)
                      </span>
                    </div>
                  </div>

                  {/* Receipt Requirement Notice without fraud wording */}
                  <div className="flex items-start gap-2 text-xs font-semibold text-neutral-800 bg-neutral-100 border border-neutral-300 p-2.5 rounded-xl">
                    <ShieldCheck className="h-4 w-4 text-[#c81010] shrink-0 mt-0.5" />
                    <span>
                      لا يمكن إتمام الطلب إلا بإرفاق إيصال الدفع.
                    </span>
                  </div>

                  {/* Sender Wallet / Account Phone Input */}
                  <div>
                    <label className="block text-xs font-extrabold text-neutral-900 mb-1">
                      رقم الهاتف المربوط بالمحفظة أو الحساب الذي تم التحويل منه *
                    </label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      value={walletPhone}
                      onChange={(e) => setWalletPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-right focus:border-[#c81010] focus:outline-none"
                    />
                    <span className="text-[11px] font-semibold text-neutral-500 mt-1 block">
                      هذا الرقم هو الذي تم التحويل منه لتأكيد مطابقة الإيصال في النظام.
                    </span>
                  </div>

                  {/* Receipt Image Attachment Upload */}
                  <div>
                    <label className="block text-xs font-extrabold text-neutral-900 mb-1">
                      إرفاق صورة إيصال الدفع / التحويل (سكرين شوت أو صورة) *
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptFileChange}
                      className="hidden"
                      id="receipt-file-input"
                    />

                    {receiptImage ? (
                      <div className="relative rounded-xl border border-emerald-300 bg-emerald-50/50 p-2.5 flex items-center gap-3">
                        <div className="h-16 w-16 shrink-0 rounded-lg bg-white overflow-hidden border border-emerald-200 flex items-center justify-center">
                          <img
                            src={receiptImage}
                            alt="إيصال الدفع"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            تم إرفاق الإيصال بنجاح
                          </span>
                          <p className="text-[11px] font-semibold text-neutral-600 truncate mt-0.5">
                            {receiptFileName || "صورة الإيصال المرفقة"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveReceipt}
                          className="rounded-full bg-white border border-neutral-300 text-red-600 hover:bg-red-50 p-1.5 transition-colors cursor-pointer"
                          title="حذف الصورة واختيار غيرها"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="receipt-file-input"
                        className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-white p-4 hover:border-[#c81010] hover:bg-red-50/30 transition-colors cursor-pointer text-center"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-[#c81010]">
                          <Upload className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-neutral-900 block">
                            اضغط هنا لرفع صورة الإيصال أو السكرين شوت
                          </span>
                          <span className="text-[11px] font-semibold text-neutral-500 block mt-0.5">
                            يدعم صور PNG, JPG, WebP
                          </span>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              ) : (
                /* Cash on delivery reassurance */
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-start gap-2.5">
                  <Banknote className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="text-right">
                    <h5 className="text-xs font-extrabold text-emerald-950">
                      الدفع عند الاستلام
                    </h5>
                    <p className="text-xs font-semibold text-emerald-800 mt-0.5 leading-relaxed">
                      يتم دفع المبلغ الإجمالي ({finalTotal} LE شامل رسوم التوصيل {deliveryFee} ج.م) نقداً للمندوب عند وصول الطلب وفحصه بالكامل.
                    </p>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && step !== "success" && (
          <div className="border-t border-neutral-200 bg-neutral-50 p-4 sm:p-5">
            <div className="flex flex-col gap-1.5 text-sm mb-4">
              <div className="flex items-center justify-between text-neutral-600 font-semibold">
                <span>المجموع الفرعي ({totalQuantity} قطعة):</span>
                <span dir="ltr" className="font-bold text-neutral-900">
                  {subtotal} LE
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-600 font-semibold">
                <span className="flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-[#c81010]" />
                  <span>رسوم التوصيل للمنزل:</span>
                </span>
                <span dir="ltr" className="font-bold text-neutral-900">
                  {deliveryFee} LE
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-base font-extrabold text-[#111111]">
                <span>الإجمالي النهائي بالفاتورة:</span>
                <span dir="ltr" className="text-xl font-black text-[#c81010]">
                  {finalTotal} LE
                </span>
              </div>
            </div>

            {/* Store Closed Warning */}
            {storeSettings && !storeSettings.isOpen && (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-right flex items-start gap-2">
                <Clock className="h-4 w-4 text-[#c81010] shrink-0 mt-0.5" />
                <div className="text-xs font-bold text-red-900 leading-relaxed">
                  المتجر مغلق حالياً وسيفتح في الساعة {storeSettings.openTime}. لا يمكن إتمام الطلب في الوقت الحالي.
                </div>
              </div>
            )}

            {step === "cart" ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setStep("checkout")}
                  disabled={storeSettings ? !storeSettings.isOpen : false}
                  className="w-full rounded-full bg-[#0f9d08] hover:bg-[#0c8406] disabled:bg-neutral-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 text-base shadow-md transition-all cursor-pointer"
                >
                  {storeSettings && !storeSettings.isOpen
                    ? `المتجر مغلق (يفتح ${storeSettings.openTime})`
                    : "متابعة لإتمام الطلب والدفع"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="w-full rounded-full border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 font-bold py-2 px-6 text-xs transition-all cursor-pointer"
                >
                  متابعة التصفح
                </button>
              </div>
            ) : (
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  className="rounded-full border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-800 font-bold py-3 px-5 text-sm transition-all cursor-pointer"
                >
                  رجوع للسلة
                </button>
                <button
                  type="submit"
                  form="zoks-checkout-form"
                  disabled={submitting || (storeSettings ? !storeSettings.isOpen : false)}
                  className="flex-1 rounded-full bg-[#0f9d08] hover:bg-[#0c8406] disabled:bg-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 text-white font-bold py-3 px-6 text-base shadow-md transition-all cursor-pointer"
                >
                  {storeSettings && !storeSettings.isOpen
                    ? "المتجر مغلق حالياً"
                    : submitting
                    ? "جاري تأكيد الطلب..."
                    : `تأكيد الطلب (${finalTotal} LE)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
