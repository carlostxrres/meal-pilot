import type { Metadata, Viewport } from "next";
import { KeyboardInsetWatcher } from "@/components/KeyboardInsetWatcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meal Pilot",
  description: "Propuesta diaria de comidas",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <KeyboardInsetWatcher />
        {children}
      </body>
    </html>
  );
}
