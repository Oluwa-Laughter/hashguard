import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";

export const metadata: Metadata = { title: "HashGuard | Protected payments", description: "Intelligent, protected payments on HSK Chain." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Providers><Header />{children}</Providers></body></html>;
}

