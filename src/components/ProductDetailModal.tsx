import React, { useState } from "react";
import type { PublicProduct } from "@/lib/types";
import {
  X,
  Plus,
  Minus,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Share2,
  Copy,
  Check,
} from "lucide-react";
import { getProductShareUrl, getProductSlug } from "@/lib/productSlug";

interface ProductDetailModalProps {
  product: PublicProduct | null;
  onClose: () => void;
  onAddToCart: (product: PublicProduct, quantity: number) => void;
  onBuyNow: (product: PublicProduct, quantity: number) => void;
}

export default function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
}: ProductDetailModalProps) {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyShareLink = async () => {
    if (!product) return;
    const shareUrl = getProductShareUrl(product);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement("input");
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch (e) {
      console.warn("Failed to copy link:", e);
    }
  };

  if (!product) return null;

  const images =
    product.allImages && product.allImages.length > 0
      ? product.allImages
      : product.image
      ? [product.image]
      : [];

  const activeImage = images[selectedImageIdx] || images[0] || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-t-[28px] sm:rounded-[28px] border-2 border-[#c81010] bg-white p-5 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق تفاصيل المنتج"
          className="absolute left-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-[#c81010] hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Image Gallery Column */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-[4/3] w-full rounded-[18px] bg-[#f4f5f7] overflow-hidden flex items-center justify-center border border-neutral-200">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.name}
                  className="h-full w-full object-contain p-3"
                />
              ) : (
                <img
                  src="https://res.cloudinary.com/h74mxqsb/image/upload/v1793882390/Zoks-Icon_shlbgb.png"
                  alt={product.name}
                  className="h-16 w-16 object-contain opacity-40"
                />
              )}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedImageIdx((prev) => (prev + 1) % images.length)
                    }
                    aria-label="الصورة التالية"
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black shadow hover:bg-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedImageIdx(
                        (prev) => (prev - 1 + images.length) % images.length
                      )
                    }
                    aria-label="الصورة السابقة"
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black shadow hover:bg-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`h-14 w-14 shrink-0 rounded-xl overflow-hidden border-2 bg-[#f4f5f7] p-1 transition-all ${
                      idx === selectedImageIdx
                        ? "border-[#c81010] scale-105 shadow-sm"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${product.name} مصغرة ${idx + 1}`}
                      className="h-full w-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details Column */}
          <div className="flex flex-col justify-between text-right">
            <div>
              <span className="inline-block rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-[#c81010] mb-2">
                الصنف: {product.category}
              </span>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111111] leading-tight">
                {product.name}
              </h2>

              {product.description && (
                <p className="mt-2 text-base font-semibold text-neutral-600 leading-relaxed">
                  {product.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between border-y border-neutral-100 py-3">
                <span className="text-sm font-bold text-neutral-500">السعر:</span>
                <div dir="ltr" className="flex items-baseline text-[#111111]">
                  <span className="text-3xl font-black">{product.price}</span>
                  <span className="text-sm font-extrabold ml-1">LE</span>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-700">الكمية:</span>
                <div className="flex items-center gap-3 rounded-full border border-neutral-300 bg-neutral-50 px-3 py-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="تقليل الكمية"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black shadow-xs hover:bg-neutral-200"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-[24px] text-center font-black text-sm">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    aria-label="زيادة الكمية"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black shadow-xs hover:bg-neutral-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Total Row */}
              <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 font-semibold">
                <span>الإجمالي للمنتج:</span>
                <span dir="ltr" className="font-extrabold text-[#c81010]">
                  {product.price * quantity} LE
                </span>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onBuyNow(product, quantity);
                  onClose();
                }}
                className="w-full rounded-full bg-[#0f9d08] hover:bg-[#0c8406] text-white font-bold py-3 text-base shadow-md transition-all cursor-pointer text-center"
              >
                شراء فوري ({product.price * quantity} LE)
              </button>

              <button
                type="button"
                onClick={() => {
                  onAddToCart(product, quantity);
                  onClose();
                }}
                className="w-full rounded-full bg-[#0d0d0d] hover:bg-[#262626] text-white font-bold py-2.5 text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>إضافة إلى سلة الطلبات</span>
              </button>

              {/* Share Product Link Box */}
              <div className="mt-1 rounded-2xl border border-neutral-200 bg-neutral-50/90 p-2.5">
                <div className="flex items-center justify-between gap-1 mb-1.5 px-0.5">
                  <span className="text-[11px] font-extrabold text-neutral-600 flex items-center gap-1">
                    <Share2 className="h-3.5 w-3.5 text-[#c81010]" />
                    <span>مشاركة رابط هذا المنتج:</span>
                  </span>
                  <span
                    dir="ltr"
                    className="text-[10px] font-mono font-bold text-neutral-400 bg-neutral-200/60 px-1.5 py-0.5 rounded"
                  >
                    /{getProductSlug(product)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl p-1.5">
                  <input
                    type="text"
                    readOnly
                    dir="ltr"
                    value={getProductShareUrl(product)}
                    className="flex-1 bg-transparent text-xs font-mono text-neutral-700 px-2 select-all outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    title="نسخ الرابط"
                    className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      copiedLink
                        ? "bg-emerald-600 text-white"
                        : "bg-[#c81010] hover:bg-[#a50d0d] text-white shadow-xs"
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>نسخ الرابط</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
