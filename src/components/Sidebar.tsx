"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { CalendarDays, FileText, CheckSquare, Upload, LayoutDashboard, Wrench, PlusSquare } from "lucide-react";
import clsx from "clsx";
import { motion } from "framer-motion";

const hrRoutes = [
  {
    name: "Inicio",
    path: "/",
    icon: LayoutDashboard,
  },
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
    name: "Inicio",
    path: "/",
    icon: LayoutDashboard,
  },
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
];

export function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  const isMantenimiento = pathname.startsWith("/mantenimiento");
  const routes = isMantenimiento ? mantenimientoRoutes : hrRoutes;

  return (
    <motion.aside
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col"
    >
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
          DICAR LOGISTIC
        </h1>
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
    </motion.aside>
  );
}
