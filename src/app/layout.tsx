import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "도심창고:함 HAAM — 숭실대입구 셀프스토리지",
  description: "합리적인 가격의 개인 보관함. 모바일로 간편하게 예약하고 QR로 바로 이용하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="noise min-h-full flex flex-col bg-[#0c0a09] text-stone-100">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: 'text-sm',
            duration: 2500,
          }}
          offset="calc(1rem + env(safe-area-inset-bottom, 0px))"
        />
      </body>
    </html>
  );
}
