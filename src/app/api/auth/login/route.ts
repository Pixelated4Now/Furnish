import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const token = await signToken({ id: user.id, email: user.email, role: user.role });

  const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  res.cookies.set("token", token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7 });
  return res;
}
