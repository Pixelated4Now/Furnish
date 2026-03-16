import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { name, imageUrl, slug } = await req.json();
  if (!name?.trim() || !slug?.trim())
    return NextResponse.json({ error: "Name and slug required" }, { status: 400 });
  const category = await prisma.category.create({
    data: { name: name.trim(), imageUrl: imageUrl?.trim() ?? "", slug: slug.trim() },
  });
  return NextResponse.json(category, { status: 201 });
}
