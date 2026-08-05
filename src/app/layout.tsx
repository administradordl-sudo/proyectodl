import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { NotificationPrompt } from "@/components/ui/NotificationPrompt";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Auto Tareo - Portal Interno",
  description: "Plataforma de gestión de asistencia y permisos",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-50 text-slate-900 flex flex-col md:flex-row min-h-screen">
        <Sidebar />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-full">
          {children}
        </main>
        <NotificationPrompt />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
