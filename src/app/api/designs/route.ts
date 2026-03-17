import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserPayload(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(req: NextRequest) {
  const payload = await getUserPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const designs = await prisma.design.findMany({
    where: { userId: payload.id as number },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ designs });
}

export async function POST(req: NextRequest) {
  const payload = await getUserPayload(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, roomWidth, roomDepth, items } = await req.json();

  const design = await prisma.design.create({
    data: {
      userId: payload.id as number,
      name: name ?? "Untitled Design",
      roomWidth,
      roomDepth,
      items: items ?? "[]",
    },
  });

  return NextResponse.json({ design });
}
