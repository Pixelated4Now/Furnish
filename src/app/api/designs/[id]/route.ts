import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserPayload(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getUserPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const designId = parseInt(id, 10);

  const design = await prisma.design.findUnique({ where: { id: designId } });
  if (!design || design.userId !== (payload.id as number)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.design.update({
    where: { id: designId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.roomWidth !== undefined && { roomWidth: body.roomWidth }),
      ...(body.roomDepth !== undefined && { roomDepth: body.roomDepth }),
      ...(body.items !== undefined && { items: body.items }),
    },
  });

  return NextResponse.json({ design: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getUserPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const designId = parseInt(id, 10);

  const design = await prisma.design.findUnique({ where: { id: designId } });
  if (!design || design.userId !== (payload.id as number)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.design.delete({ where: { id: designId } });
  return NextResponse.json({ success: true });
}
