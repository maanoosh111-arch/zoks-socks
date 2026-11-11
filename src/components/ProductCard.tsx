import React, { useState, useRef } from "react";
import type { PublicProduct } from "@/lib/types";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

interface ProductCardProps {
  product: PublicProduct;
  onAddToCart: (product: PublicProduct) => void;
  onBuyNow: (product: PublicProduct) => void;
  onOpenDetail: (product: PublicProduct) => void;
}

export default function ProductCard({
  product,
  onAddToCart,
  onBuyNow,
  onOpenDetail,
}: ProductCardProps) {
  const images =
    product.allImages && product.allImages.length > 0
      ? product.allImages
      : product.image
      ? [product.image]
      : [];

  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Record<string, boolean>>({});
  const [justAdded, setJustAdded] = useState(false);

  // Touch swipe state
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null) return;
    const delta = touchDeltaX.current;
    touchStartX.current = null;
    if (Math.abs(delta) > 35 && images.length > 1) {
      if (delta > 0) {
        setCurrentImageIdx((prev) => (prev + 1) % images.length);
      } else {
        setCurrentImageIdx((prev) => (prev - 1 + images.length) % images.length);
      }
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length <= 1) return;
    setCurrentImageIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length <= 1) return;
    setCurrentImageIdx((prev) => (prev + 1) % images.length);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1100);
  };

  const handleBuyNowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBuyNow(product);
  };

  const activeUrl = images[currentImageIdx] || "";
  const isImageBroken = !activeUrl || failedUrls[activeUrl];

  return (
    <article
      onClick={() => onOpenDetail(product)}
      className="group relative flex flex-col justify-between rounded-[22px] border-[1.8px] border-[#c81010] bg-white p-3.5 sm:p-4 shadow-[0_6px_20px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(200,16,16,0.12)] cursor-pointer"
    >
      {/* Image Box with Swipe Support for Primary + Extra Images */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full aspect-[4/3] rounded-[14px] bg-[#f4f5f7] overflow-hidden flex items-center justify-center mb-3 select-none"
      >
        {!isImageBroken ? (
          <img
            src={activeUrl}
            alt={`${product.name} - صورة ${currentImageIdx + 1}`}
            loading="lazy"
            onError={() =>
              setFailedUrls((prev) => ({ ...prev, [activeUrl]: true }))
            }
            className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-4 text-neutral-400">
            <img
              src="https://res.cloudinary.com/h74mxqsb/image/upload/v1793882390/Zoks-Icon_shlbgb.png"
              alt={product.name}
              className="h-12 w-12 object-contain opacity-40 mb-2"
            />
            <span className="text-xs font-medium text-neutral-500">
              {product.name}
            </span>
          </div>
        )}

        {/* Swipe navigation controls when Extra Images exist */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handleNextImage}
              aria-label="الصورة التالية"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-black shadow-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handlePrevImage}
              aria-label="الصورة السابقة"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-black shadow-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Pagination dots */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 z-10"
            >
              {images.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`عرض الصورة ${idx + 1}`}
                  onClick={() => setCurrentImageIdx(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentImageIdx
                      ? "w-4 bg-[#c81010]"
                      : "w-1.5 bg-neutral-400/70 hover:bg-neutral-600"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Product Info Row: Right = Name & Description, Left = Price (150 LE) */}
      <div className="flex items-start justify-between gap-2 px-1 mb-3.5">
        <div className="flex flex-col text-right min-w-0">
          <h3 className="text-lg sm:text-xl font-extrabold text-[#111111] leading-snug truncate">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs sm:text-sm font-semibold text-[#333333] mt-0.5 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        {/* Price on the left: 150 LE */}
        <div
          dir="ltr"
          className="flex items-baseline shrink-0 text-[#0b0b0b] leading-none pt-0.5"
        >
          <span className="text-2xl sm:text-[28px] font-black tracking-tight">
            {product.price}
          </span>
          <span className="text-xs sm:text-sm font-extrabold ml-0.5 uppercase">
            LE
          </span>
        </div>
      </div>

      {/* Bottom Action Buttons Row: Right = اشتر الآن (Green), Left = أضف + (Black) */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={handleBuyNowClick}
          className="flex-1 max-w-[125px] rounded-full bg-[#0f9d08] hover:bg-[#0c8406] active:scale-95 text-white font-bold text-sm sm:text-base py-1.5 px-4 text-center shadow-sm transition-all cursor-pointer"
        >
          اشتر الآن
        </button>

        <button
          type="button"
          onClick={handleAddClick}
          className={`flex-1 max-w-[115px] rounded-full font-bold text-sm sm:text-base py-1.5 px-4 text-center shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 ${
            justAdded
              ? "bg-emerald-700 text-white"
              : "bg-[#0d0d0d] hover:bg-[#262626] text-white"
          }`}
        >
          {justAdded ? (
            <>
              <span>تم</span>
              <Check className="h-4 w-4" />
            </>
          ) : (
            <span>أضف +</span>
          )}
        </button>
      </div>
    </article>
  );
}
