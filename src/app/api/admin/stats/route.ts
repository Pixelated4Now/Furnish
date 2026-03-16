import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [totalProducts, totalUsers, categories] = await Promise.all([
    prisma.product.count(),
    prisma.user.count(),
    prisma.product.findMany({ select: { category: true }, distinct: ["category"] }),
  ]);

  return NextResponse.json({
    totalProducts,
    totalCategories: categories.length,
    totalUsers,
  });
}
