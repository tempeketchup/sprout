import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Providers } from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sprout",
  description: "Fun, simple, and minimalist on-chain social platform for micro-tasking. Post bounties, complete challenges, and earn CNPY tokens on the Canopy Network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-screen overflow-hidden bg-sprout-bg text-sprout-accent bg-pattern">
        <Providers>
          <Navbar />
          <main className="h-full flex flex-col pt-24 pb-2 max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
