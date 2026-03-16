"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCartStore } from "@/store/cartStore";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const totalItems = useCartStore((s) => s.getTotalItems());
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <nav className="relative flex items-center justify-between px-8 py-6">
      <Link href="/" className="text-lg text-[#0a0a0a] tracking-tight">
        Furnish.
      </Link>

      {/* Desktop nav links */}
      <div className="hidden md:flex items-center gap-8 text-sm text-[#0a0a0a]">
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
          {mounted && totalItems > 0 && (
            <span className="absolute -top-2 -right-4 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-[#0a0a0a] text-white text-[10px] px-1 tabular-nums leading-none">
              {totalItems > 99 ? "99+" : totalItems}
            </span>
          )}
        </Link>
      </div>

      {/* Desktop auth section */}
      <div className="hidden md:flex items-center gap-6 text-sm min-w-[160px] justify-end">
        {!mounted ? (
          <div className="h-3.5 w-20 bg-gray-200 rounded animate-pulse" />
        ) : loading ? (
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

      {/* Mobile right side: cart badge + hamburger */}
      <div className="flex md:hidden items-center gap-4">
        <Link href="/cart" className="relative text-sm text-[#0a0a0a] hover:opacity-60 transition-opacity">
          Cart
          {mounted && totalItems > 0 && (
            <span className="absolute -top-2 -right-4 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-[#0a0a0a] text-white text-[10px] px-1 tabular-nums leading-none">
              {totalItems > 99 ? "99+" : totalItems}
            </span>
          )}
        </Link>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="md:hidden p-1 text-[#0a0a0a] hover:opacity-60 transition-opacity"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect y="3" width="20" height="1.5" fill="currentColor" />
            <rect y="9" width="20" height="1.5" fill="currentColor" />
            <rect y="15" width="20" height="1.5" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 shadow-sm z-50 flex flex-col text-sm text-[#0a0a0a]">
          <Link href="/" onClick={() => setMenuOpen(false)} className="px-8 py-4 hover:bg-gray-50 transition-colors">Home</Link>
          <Link href="/shop" onClick={() => setMenuOpen(false)} className="px-8 py-4 hover:bg-gray-50 transition-colors">Shop</Link>
          <Link href="/planner" onClick={() => setMenuOpen(false)} className="px-8 py-4 hover:bg-gray-50 transition-colors">3D Preview</Link>
          <div className="border-t border-gray-100">
            {mounted && !loading && user ? (
              <>
                <span className="block px-8 py-4 text-[#6b7280]">{user.name}</span>
                <button onClick={() => { logout(); setMenuOpen(false); }} className="w-full text-left px-8 py-4 hover:bg-gray-50 transition-colors">Log Out</button>
              </>
            ) : mounted && !loading ? (
              <>
                <Link href="/auth/signup" onClick={() => setMenuOpen(false)} className="block px-8 py-4 hover:bg-gray-50 transition-colors">Sign Up</Link>
                <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="block px-8 py-4 hover:bg-gray-50 transition-colors">Log In</Link>
              </>
            ) : null}
          </div>
        </div>
      )}
    </nav>
  );
}
