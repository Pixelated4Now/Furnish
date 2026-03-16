"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";

const PLACEHOLDER = "#c4b5a0";

const CATEGORIES = [
  { label: "Decor",       value: "Decor" },
  { label: "Bedroom",     value: "Bed" },
  { label: "Living Room", value: "Sofa" },
  { label: "Office",      value: "Chair" },
];

const SORT_OPTIONS = [
  { label: "Default",         value: "" },
  { label: "Name A–Z",        value: "name_asc" },
  { label: "Name Z–A",        value: "name_desc" },
  { label: "Price Low–High",  value: "price_asc" },
  { label: "Price High–Low",  value: "price_desc" },
];

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  imageUrl: string;
}

function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1000);
  }

  return (
    <div className="group flex flex-col gap-4">
      {/* Image + hover button */}
      <div className="relative overflow-hidden">
        <div
          className="w-full group-hover:opacity-90 transition-opacity"
          style={{ background: PLACEHOLDER, aspectRatio: "1 / 1" }}
          aria-label={product.name}
        />
        <button
          onClick={handleAdd}
          className="absolute bottom-0 left-0 right-0 py-3 text-sm text-white bg-[#0a0a0a] translate-y-full group-hover:translate-y-0 transition-transform duration-200"
        >
          {added ? "Added" : "Add to Cart"}
        </button>
      </div>
      {/* Meta */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-[#6b7280] uppercase tracking-wider">
          {product.category}
        </span>
        <span className="text-lg leading-snug">{product.name}</span>
        <span className="text-sm text-[#6b7280]">
          ${product.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(
    searchParams.get("category") ?? ""
  );
  const [sort, setSort] = useState("");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategory) params.set("category", activeCategory);
    if (sort) params.set("sort", sort);

    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [activeCategory, sort]);

  function handleCategoryClick(value: string) {
    const next = activeCategory === value ? "" : value;
    setActiveCategory(next);
    const url = next ? `/shop?category=${next}` : "/shop";
    router.push(url, { scroll: false });
  }

  return (
    <div className="bg-white min-h-screen text-[#0a0a0a]">

      {/* ── Page Header ── */}
      <section className="px-8 pt-10 pb-12 flex items-center justify-between gap-8">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl leading-tight tracking-tight">
          Shop
        </h1>
        <Link
          href="/planner"
          className="shrink-0 px-5 py-3 border border-[#0a0a0a] text-sm hover:bg-gray-50 transition-colors"
        >
          Try 3D Room Preview
        </Link>
      </section>

      {/* ── Category Row ── */}
      <section className="px-8 pb-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map(({ label, value }) => {
            const active = activeCategory === value;
            return (
              <button
                key={value}
                onClick={() => handleCategoryClick(value)}
                className="group flex flex-col gap-3 text-left"
              >
                <div
                  className="w-full group-hover:opacity-90 transition-opacity"
                  style={{
                    background: PLACEHOLDER,
                    aspectRatio: "3 / 4",
                    opacity: active ? 1 : undefined,
                  }}
                />
                <span
                  className={`text-sm text-center w-full transition-colors ${
                    active
                      ? "text-[#0a0a0a] underline underline-offset-4"
                      : "text-[#6b7280] hover:text-[#0a0a0a]"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Sort + Grid ── */}
      <section className="px-8 pb-24">
        {/* Sort row */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-[#6b7280]">
            {loading ? "Loading…" : `${products.length} product${products.length !== 1 ? "s" : ""}`}
          </p>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-sm text-[#0a0a0a] bg-transparent border-b border-[#0a0a0a] pb-0.5 pr-6 focus:outline-none cursor-pointer appearance-none"
            style={{ backgroundImage: "none" }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-4">
                <div
                  className="w-full animate-pulse"
                  style={{ background: "#e5e7eb", aspectRatio: "1 / 1" }}
                />
                <div className="flex flex-col gap-2">
                  <div className="h-3 w-16 bg-gray-200 animate-pulse rounded" />
                  <div className="h-4 w-40 bg-gray-200 animate-pulse rounded" />
                  <div className="h-3 w-20 bg-gray-200 animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-[#6b7280] text-sm">No products found.</p>
            {activeCategory && (
              <button
                onClick={() => handleCategoryClick(activeCategory)}
                className="mt-4 text-sm text-[#0a0a0a] underline underline-offset-4 hover:opacity-60 transition-opacity"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <footer className="px-8 pt-20 pb-10 border-t border-gray-100">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <p className="text-7xl sm:text-8xl lg:text-9xl leading-none tracking-tight select-none">
            Furnish.
          </p>
          <nav className="flex flex-col gap-3 text-sm text-[#0a0a0a] md:text-right">
            <Link href="/" className="hover:opacity-60 transition-opacity">Home</Link>
            <Link href="/shop" className="hover:opacity-60 transition-opacity">Shop</Link>
            <Link href="/planner" className="hover:opacity-60 transition-opacity">3D Preview</Link>
            <Link href="/auth/signup" className="hover:opacity-60 transition-opacity">Sign Up</Link>
            <Link href="/auth/login" className="hover:opacity-60 transition-opacity">Log In</Link>
          </nav>
        </div>
        <p className="mt-16 text-xs text-[#6b7280]">
          © 2026 Furnish. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense>
      <ShopContent />
    </Suspense>
  );
}
