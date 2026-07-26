import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slice Rush — Run the Pizza Parlour",
  description:
    "Choose fraction skills, then race the clock and serve perfectly portioned pizzas.",
  icons: {
    icon: "/assets/topping-pepperoni.webp",
  },
  openGraph: {
    title: "Slice Rush",
    description: "Choose fraction skills, portion pizzas for 90 seconds, and reach that setup's local top ten.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slice Rush",
    description: "Choose fraction skills, portion pizzas for 90 seconds, and reach that setup's local top ten.",
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
