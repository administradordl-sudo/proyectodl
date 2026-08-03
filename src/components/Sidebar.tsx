"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { CalendarDays, FileText, CheckSquare, Upload, LayoutDashboard, Wrench, PlusSquare, ArrowLeft, BarChart3, Menu, X, Home } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

const hrRoutes = [
  {
    name: "Mis Solicitudes",
    path: "/hr/requests",
    icon: FileText,
  },
  {
    name: "Aprobaciones (RRHH)",
    path: "/hr/approvals",
    icon: CheckSquare,
  },
  {
    name: "Gestor Feriados",
    path: "/hr/holidays",
    icon: CalendarDays,
  },
  {
    name: "Generar Reporte",
    path: "/hr/reports",
    icon: Upload,
  },
];

const mantenimientoRoutes = [
  {
    name: "Panel de Tickets",
    path: "/mantenimiento",
    icon: Wrench,
  },
  {
    name: "Nuevo Ticket",
    path: "/mantenimiento/nuevo",
    icon: PlusSquare,
  },
  {
    name: "KPIs y Métricas",
    path: "/mantenimiento/kpis",
    icon: BarChart3,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  if (pathname === "/") return null;

  const isMantenimiento = pathname.startsWith("/mantenimiento");
  const routes = isMantenimiento ? mantenimientoRoutes : hrRoutes;

  return (
    <>
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-3 px-4 bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-primary">DICAR LOGISTIC</h1>
        </div>
        
        {/* Regresar al inicio visible en topbar */}
        <Link 
          href="/" 
          className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm"
          title="Regresar al Menú Principal"
        >
          <Home className="w-5 h-5" />
          <span className="hidden sm:inline">Inicio</span>
        </Link>
      </div>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={clsx(
          "w-64 bg-white border-r border-gray-200 h-screen flex flex-col z-50 transition-transform duration-300",
          "fixed md:sticky top-0 left-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Mobile close button */}
        <div className="md:hidden absolute top-4 right-4">
          <button onClick={() => setIsOpen(false)} className="p-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      <div className="p-6 border-b border-gray-100">
        <Link 
          href="/" 
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-xl font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Regresar al Menú
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {routes.map((route) => {
          const isActive = pathname === route.path || (route.path !== "/" && pathname.startsWith(route.path) && route.path !== "/mantenimiento");
          // Pequeño ajuste para que /mantenimiento no marque activo si estamos en /mantenimiento/nuevo
          const isExactActive = pathname === route.path;

          const Icon = route.icon;

          return (
            <Link
              key={route.path}
              href={route.path}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative group",
                isExactActive
                  ? "text-primary font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              {isExactActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon
                className={clsx(
                  "w-5 h-5 relative z-10 transition-colors",
                  isExactActive ? "text-primary" : "text-gray-400 group-hover:text-gray-600"
                )}
              />
              <span className="relative z-10">{route.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            U
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Usuario Mock</span>
            <span className="text-xs text-gray-400">Rol: Administrador</span>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
