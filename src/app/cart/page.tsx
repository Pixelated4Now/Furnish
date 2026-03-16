"use client";

import Link from "next/link";
import { useCartStore } from "@/store/cartStore";

const PLACEHOLDER = "#c4b5a0";

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice } = useCartStore();
  const subtotal = getTotalPrice();

  return (
    <div className="bg-white min-h-screen text-[#0a0a0a]">

      {/* ── Header ── */}
      <section className="px-8 pt-10 pb-12">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl leading-tight tracking-tight">
          Cart
        </h1>
      </section>

      {items.length === 0 ? (
        /* ── Empty state ── */
        <div className="px-8 py-24 text-center">
          <p className="text-[#6b7280] text-sm mb-6">Your cart is empty.</p>
          <Link
            href="/shop"
            className="text-sm text-[#0a0a0a] underline underline-offset-4 hover:opacity-60 transition-opacity"
          >
            Browse Furniture
          </Link>
        </div>
      ) : (
        /* ── Two-column layout ── */
        <section className="px-8 pb-24">
          <div className="flex flex-col lg:flex-row gap-16 items-start">

            {/* ── Cart items (left) ── */}
            <div className="flex-1 min-w-0">
              {items.map((item, idx) => (
                <div key={item.productId}>
                  {idx > 0 && <div className="border-t border-gray-100 my-6" />}

                  <div className="flex gap-6 items-start">
                    {/* Thumbnail */}
                    <div
                      className="shrink-0 w-24 h-24 sm:w-28 sm:h-28"
                      style={{ background: PLACEHOLDER }}
                      aria-label={item.name}
                    />

                    {/* Details + controls */}
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <div>
                        <p className="text-xs text-[#6b7280] uppercase tracking-wider mb-0.5">
                          {item.category}
                        </p>
                        <p className="text-base leading-snug">{item.name}</p>
                        {item.variant && (
                          <p className="text-xs text-[#6b7280] mt-0.5">{item.variant}</p>
                        )}
                      </div>

                      {/* Quantity + remove */}
                      <div className="flex items-center gap-6 mt-1">
                        <div className="flex items-center gap-3 text-sm">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center border border-gray-200 hover:border-gray-400 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="w-5 text-center tabular-nums">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center border border-gray-200 hover:border-gray-400 transition-colors"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-xs text-[#6b7280] hover:text-[#0a0a0a] transition-colors underline underline-offset-2"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Line subtotal */}
                    <p className="shrink-0 text-sm text-[#6b7280] tabular-nums">
                      ${(item.price * item.quantity).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Order summary (right) ── */}
            <div className="w-full lg:w-80 lg:sticky lg:top-8 shrink-0">
              <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-6">
                Order Summary
              </p>

              <div className="flex flex-col gap-3 text-sm border-t border-gray-100 pt-6">
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Subtotal</span>
                  <span className="tabular-nums">
                    ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6b7280]">Shipping</span>
                  <span>Free</span>
                </div>
              </div>

              <div className="flex justify-between text-sm border-t border-gray-100 mt-4 pt-4">
                <span>Total</span>
                <span className="tabular-nums">
                  ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <button
                onClick={() => alert("Checkout coming soon.")}
                className="mt-8 w-full py-4 text-sm text-white bg-[#0a0a0a] hover:bg-[#2a2a2a] transition-colors"
              >
                Checkout
              </button>
            </div>
          </div>
        </section>
      )}

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
