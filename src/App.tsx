import React, { useState, useEffect } from "react";
import StorefrontClient from "@/components/StorefrontClient";
import ChefDashboardClient from "@/components/ChefDashboardClient";
import type { PublicProduct } from "@/lib/types";

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window === "undefined") return "/";
    return window.location.pathname.startsWith("/chef") ? "/chef" : "/";
  });

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);

  // Load live catalog strictly from official Google Sheet API
  useEffect(() => {
    setIsLoadingProducts(true);
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
        } else {
          setProducts([]);
        }
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        } else {
          setCategories([]);
        }
      })
      .catch(() => {
        setProducts([]);
        setCategories([]);
      })
      .finally(() => {
        setIsLoadingProducts(false);
      });
  }, []);

  // Listen to browser navigation (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.startsWith("/chef") ? "/chef" : "/";
      setCurrentPath(path);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    try {
      window.history.pushState({}, "", path);
    } catch {
      // Ignore
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (currentPath === "/chef") {
    return <ChefDashboardClient onBackToStore={() => navigateTo("/")} />;
  }

  return (
    <StorefrontClient
      initialProducts={products}
      initialCategories={categories}
      isLoadingProducts={isLoadingProducts}
      onOpenChef={() => navigateTo("/chef")}
    />
  );
}
