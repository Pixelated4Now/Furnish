"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCartStore } from "@/store/cartStore";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const totalItems = useCartStore((s) => s.getTotalItems());

  return (
    <nav className="flex items-center justify-between px-8 py-6">
      <Link href="/" className="text-lg text-[#0a0a0a] tracking-tight">
        Furnish.
      </Link>

      <div className="flex items-center gap-8 text-sm text-[#0a0a0a]">
        <Link href="/" className="hover:opacity-60 transition-opacity">
          Home
        </Link>
        <Link href="/shop" className="hover:opacity-60 transition-opacity">
          Shop
        </Link>
        <Link href="/planner" className="hover:opacity-60 transition-opacity">
          3D Preview
        </Link>
        {/* Cart with badge */}
        <Link href="/cart" className="relative hover:opacity-60 transition-opacity">
          Cart
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-4 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-[#0a0a0a] text-white text-[10px] px-1 tabular-nums leading-none">
              {totalItems > 99 ? "99+" : totalItems}
            </span>
          )}
        </Link>
      </div>

      <div className="flex items-center gap-6 text-sm min-w-[160px] justify-end">
        {loading ? (
          <div className="h-3.5 w-20 bg-gray-200 rounded animate-pulse" />
        ) : user ? (
          <>
            <span className="text-[#0a0a0a] truncate max-w-[120px]">{user.name}</span>
            <button
              onClick={logout}
              className="hover:opacity-60 transition-opacity text-[#0a0a0a]"
            >
              Log Out
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/signup" className="hover:opacity-60 transition-opacity text-[#0a0a0a]">
              Sign Up
            </Link>
            <Link href="/auth/login" className="hover:opacity-60 transition-opacity text-[#0a0a0a]">
              Log In
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
