import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monster Pizza — 90-Second Fraction Feast",
  description:
    "Choose fraction skills, then race the clock and feed hungry monsters perfectly portioned pizzas.",
  icons: {
    icon: "/assets/monster-topping-fried-slugs.webp",
  },
  openGraph: {
    title: "Monster Pizza",
    description: "Choose fraction skills, build gross pizzas for 90 seconds, and reach that setup's local top ten.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Monster Pizza",
    description: "Choose fraction skills, build gross pizzas for 90 seconds, and reach that setup's local top ten.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
