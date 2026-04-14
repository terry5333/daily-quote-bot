// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css"; // 載入我們剛剛設定好的全域 CSS 與字體

export const metadata: Metadata = {
  title: "Serene Curator - 每日金句",
  description: "尋找每日的喜悅火花",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 加上預設的語系與我們 UI 的 light mode class
    <html lang="zh-TW" className="light">
      <body>{children}</body>
    </html>
  );
}
