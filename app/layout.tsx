import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slice Rush — Run the Pizza Parlour",
  description:
    "Serve perfectly portioned pizzas, race through five friendly shifts, and turn Chef Pip's little shop into a five-star parlour.",
  icons: {
    icon: "/assets/topping-pepperoni.webp",
  },
  openGraph: {
    title: "Slice Rush",
    description: "Portion pizzas, serve the rush, and build a five-star parlour.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slice Rush",
    description: "Portion pizzas, serve the rush, and build a five-star parlour.",
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
