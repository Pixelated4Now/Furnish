import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductImage from "@/components/ProductImage";

const PLACEHOLDER = "#c4b5a0";

async function getFeaturedProducts() {
  return prisma.product.findMany({ take: 4, orderBy: { id: "asc" } });
}

async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ]);

  return (
    <div className="bg-white min-h-screen text-[#0a0a0a]">

      {/* ── Hero ── */}
      <section className="px-8 pt-10 pb-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-end mb-12">
          {/* Left: editorial heading — size alone signals hierarchy */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl leading-tight tracking-tight">
            Design Your Space Before You Buy
          </h1>

          {/* Right: description + CTAs */}
          <div className="flex flex-col gap-6 md:pb-2">
            <p className="text-[#6b7280] text-base leading-relaxed max-w-sm">
              Browse hundreds of pieces, visualise them in your room with our 3D
              planner, and order with confidence — all in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="px-6 py-3 bg-[#0a0a0a] text-white text-sm hover:bg-[#2a2a2a] transition-colors"
              >
                Browse Furniture
              </Link>
              <Link
                href="/planner"
                className="px-6 py-3 border border-[#0a0a0a] text-sm hover:bg-gray-50 transition-colors"
              >
                Try 3D Room Preview
              </Link>
            </div>
          </div>
        </div>

        {/* Full-width hero image */}
        <div className="relative w-full" style={{ aspectRatio: "16 / 6" }}>
          <ProductImage
            src="/images/hero.jpg"
            alt="Hero"
            className="absolute inset-0 w-full h-full"
          />
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="px-8 pt-24 pb-16">
        <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-4">
          Categories.
        </p>
        <h2 className="text-3xl sm:text-4xl tracking-tight mb-12 max-w-lg">
          Furniture Designed for Modern Living
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/shop?category=${cat.slug}`}
              className="group flex flex-col gap-3"
            >
              {cat.imageUrl ? (
                <ProductImage
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="w-full aspect-square group-hover:opacity-90 transition-opacity"
                />
              ) : (
                <div
                  className="w-full aspect-square group-hover:opacity-90 transition-opacity"
                  style={{ background: PLACEHOLDER }}
                />
              )}
              <span className="text-sm text-[#0a0a0a] text-center">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="px-8 pt-8 pb-24">
        <p className="text-xs uppercase tracking-widest text-[#6b7280] mb-4">
          Browse.
        </p>
        <h2 className="text-3xl sm:text-4xl tracking-tight mb-12">
          Featured Products
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-14">
          {products.map((product) => (
            <Link key={product.id} href="/shop" className="group flex flex-col gap-4">
              <ProductImage
                src={product.imageUrl}
                alt={product.name}
                className="w-full aspect-[3/2] group-hover:opacity-90 transition-opacity"
              />
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[#6b7280] uppercase tracking-wider">
                  {product.category}
                </span>
                <span className="text-xl leading-snug">{product.name}</span>
                <span className="text-sm text-[#6b7280]">
                  ${product.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </Link>
          ))}
        </div>
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
