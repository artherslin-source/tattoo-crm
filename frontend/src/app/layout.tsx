import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import BackToTopButton from "@/components/BackToTopButton";

export const metadata: Metadata = {
  title: "貂蟬 TATTOO - 專業刺青工作室管理系統",
  description: "為熱愛刺青的你打造專屬體驗，透過 Tattoo CRM 預約、管理與追蹤每一次刺青旅程",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/images/logo/diaochan-tattoo-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Navbar />
        {children}
        <BackToTopButton />
      </body>
    </html>
  );
}
