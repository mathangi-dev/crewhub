import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "CrewHub – Event staffing, sorted",
  description: "CrewHub connects event organizers with paid temporary event workers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400..700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..24,400,0,0&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
