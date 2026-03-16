import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

const geist = Geist({
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Furnish — Beautiful Furniture for Every Room",
  description: "Shop and plan your perfect room with Furnish.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geist.className}>
      <body className="antialiased">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
