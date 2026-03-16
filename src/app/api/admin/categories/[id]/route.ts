import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, imageUrl, slug } = await req.json();
  const category = await prisma.category.update({
    where: { id: Number(id) },
    data: { name: name?.trim(), imageUrl: imageUrl?.trim() ?? "", slug: slug?.trim() },
  });
  return NextResponse.json(category);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.category.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
