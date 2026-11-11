import React from "react";

const TOP_LOGO_URL =
  "https://res.cloudinary.com/h74mxqsb/image/upload/v1793882390/Zoks-logo-transparent_frabt2.png";
const HERO_ICON_URL =
  "https://res.cloudinary.com/h74mxqsb/image/upload/v1793882390/Zoks-Icon_shlbgb.png";
const SOCKS_COLLECTION_URL =
  "https://res.cloudinary.com/h74mxqsb/image/upload/v1793882396/Socks_Shadows_asgn73.png";

export default function HeroSection() {
  return (
    <section
      aria-label="قسم العرض الرئيسي ZOKS"
      className="relative w-full overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#ffffff_0%,#f1f1f1_58%,#e1e1e1_100%)] pt-3 pb-4 sm:pt-4 sm:pb-6 select-none"
    >
      {/* Subtle studio vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_60%,rgba(0,0,0,0.04)_100%)]" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-2 sm:px-6">
        {/* Small transparent ZOKS logo at the very top */}
        <div className="mb-1 sm:mb-2 flex justify-center">
          <img
            src={TOP_LOGO_URL}
            alt="ZOKS Logo"
            className="h-7 sm:h-9 md:h-10 w-auto object-contain opacity-90 transition-transform duration-700 hover:scale-105"
          />
        </div>

        {/* Arched Hero Text + Colorful Socks Collection */}
        <div className="relative w-full max-w-[920px] flex flex-col items-center">
          {/* SVG Arched Text with Right-to-Left (RTL) stylish slower animation */}
          <div className="w-full animate-hero-rtl -mb-14 sm:-mb-24 md:-mb-32 lg:-mb-36 z-10 pointer-events-none">
            <svg
              viewBox="0 0 1000 340"
              className="w-full h-auto overflow-visible"
              role="img"
              aria-label="أفضل الخامات بأفضل الأسعار"
            >
              <defs>
                {/* Left slope of the arch: بأفضل الأسعار */}
                <path
                  id="zoks-arch-left"
                  d="M 135,310 Q 265,125 462,92"
                  fill="none"
                />
                {/* Right slope of the arch: أفضل الخامات */}
                <path
                  id="zoks-arch-right"
                  d="M 538,92 Q 735,125 865,310"
                  fill="none"
                />
              </defs>

              {/* Right Sentence: أفضل الخامات */}
              <text
                className="font-foda-kufi"
                fill="#0b0b0b"
                fontSize="58"
                fontWeight="900"
                letterSpacing="0"
                style={{
                  fontFamily:
                    '"Foda Kufi Regular", "Reem Kufi", "Noto Kufi Arabic", sans-serif',
                }}
              >
                <textPath
                  href="#zoks-arch-right"
                  startOffset="48%"
                  textAnchor="middle"
                >
                  أفضل الخامات
                </textPath>
              </text>

              {/* Center Red Sock Icon between the two sentences */}
              <image
                href={HERO_ICON_URL}
                x="473"
                y="45"
                width="54"
                height="54"
                preserveAspectRatio="xMidYMid meet"
              />

              {/* Left Sentence: بأفضل الأسعار */}
              <text
                className="font-foda-kufi"
                fill="#0b0b0b"
                fontSize="58"
                fontWeight="900"
                letterSpacing="0"
                style={{
                  fontFamily:
                    '"Foda Kufi Regular", "Reem Kufi", "Noto Kufi Arabic", sans-serif',
                }}
              >
                <textPath
                  href="#zoks-arch-left"
                  startOffset="52%"
                  textAnchor="middle"
                >
                  بأفضل الأسعار
                </textPath>
              </text>
            </svg>
          </div>

          {/* Screen-reader accessible text */}
          <h1 className="sr-only">أفضل الخامات بأفضل الأسعار</h1>

          {/* Colorful Socks Fan with Shadows */}
          <div className="relative z-20 w-[94%] sm:w-[88%] md:w-[84%] animate-socks-rise">
            <img
              src={SOCKS_COLLECTION_URL}
              alt="تشكيلة شرابات ZOKS بألوان متعددة"
              className="w-full h-auto object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.08)]"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
