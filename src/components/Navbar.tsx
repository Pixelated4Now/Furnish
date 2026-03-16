"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-xl font-bold text-gray-900 tracking-tight">
          Furnish
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            Home
          </Link>
          <Link href="/shop" className="hover:text-gray-900 transition-colors">
            Shop
          </Link>
          <Link href="/planner" className="hover:text-gray-900 transition-colors">
            Planner
          </Link>
          <Link href="/cart" className="hover:text-gray-900 transition-colors">
            Cart
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm font-medium">
        {user ? (
          <>
            <span className="text-gray-700">Hi, {user.name}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
