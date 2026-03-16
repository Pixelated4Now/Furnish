import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const sort = searchParams.get("sort");

  const where = category ? { category } : {};

  let orderBy: Record<string, string> = { id: "asc" };
  if (sort === "name_asc") orderBy = { name: "asc" };
  else if (sort === "name_desc") orderBy = { name: "desc" };
  else if (sort === "price_asc") orderBy = { price: "asc" };
  else if (sort === "price_desc") orderBy = { price: "desc" };

  const products = await prisma.product.findMany({ where, orderBy });
  return NextResponse.json({ products });
}
