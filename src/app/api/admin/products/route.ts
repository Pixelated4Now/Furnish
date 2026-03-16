import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const product = await prisma.product.create({ data: body });
  return NextResponse.json({ product }, { status: 201 });
}
