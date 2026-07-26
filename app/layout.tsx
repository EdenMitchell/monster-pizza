import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slice Rush — Run the Pizza Parlour",
  description:
    "Race the clock, serve perfectly portioned pizzas, and earn a place on the local Slice Rush top ten.",
  icons: {
    icon: "/assets/topping-pepperoni.webp",
  },
  openGraph: {
    title: "Slice Rush",
    description: "You have 90 seconds to portion pizzas, serve the rush, and reach the local top ten.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slice Rush",
    description: "You have 90 seconds to portion pizzas, serve the rush, and reach the local top ten.",
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
