import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PriceScope — House Price Prediction",
  description:
    "Predict house prices with a linear regression model trained in-app on a synthetic housing market.",
};

const NAV = [
  { href: "/", label: "Estimate" },
  { href: "/dataset", label: "Dataset" },
  { href: "/model", label: "Model lab" },
  { href: "/history", label: "History" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(79,70,229,0.25),transparent_60%)]" />
        <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-sm font-bold text-white">
                ⌂
              </span>
              <span className="text-sm font-semibold tracking-tight text-white">
                PriceScope
                <span className="ml-2 hidden text-xs font-normal text-slate-400 sm:inline">
                  house price prediction
                </span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-xs">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs text-slate-500">
          Linear regression trained from scratch in TypeScript · Next.js + Drizzle + PostgreSQL
        </footer>
      </body>
    </html>
  );
}
