"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, FileText, CheckSquare, Upload, LayoutDashboard, Wrench, PlusSquare, ArrowLeft, BarChart3, Menu, X, Home, Users, Palmtree, HeartPulse, ShieldCheck, FileBadge, Clock, Bell, UserCheck, BookOpen, PackageCheck, ShieldAlert, ScanFace, MonitorSmartphone } from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { InstallAppButton } from "@/components/ui/InstallAppButton";

const hrRoutes = [
  {
    name: "Empleados",
    path: "/hr/employees",
    icon: Users
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
    name: "Gestor Vacaciones",
    path: "/hr/vacations",
    icon: Palmtree,
  },
  ...(process.env.NEXT_PUBLIC_ENABLE_BIOMETRICS === 'true' ? [{
    name: "Gestor Horarios",
    path: "/hr/horarios",
    icon: Clock, // Usaremos un icono de reloj para horarios
  }] : []),
  {
    name: "Cambios de Horario",
    path: "/hr/schedule-changes",
    icon: Clock,
  },
  {
    name: "Dashboard (KPIs)",
    path: "/hr/kpis",
    icon: BarChart3,
  },
  {
    name: "Enviar Notificación",
    path: "/hr/notifications",
    icon: Bell,
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
  {
    name: "Enviar Notificación",
    path: "/mantenimiento/notifications",
    icon: Bell,
  },
];

const sstRoutes = [
  {
    name: "Registro EMO",
    path: "/sst/emo",
    icon: HeartPulse,
  },
  {
    name: "Registro EPP",
    path: "/sst/epp",
    icon: ShieldCheck,
  },
  {
    name: "Almacén EPP",
    path: "/sst/epp/almacen",
    icon: PackageCheck,
  },
  {
    name: "Carnets de Sanidad",
    path: "/sst/carnets",
    icon: FileBadge,
  },
  {
    name: "Acuerdos de Seguridad",
    path: "/sst/acuerdos",
    icon: BookOpen,
  },
  {
    name: "Enviar Notificación",
    path: "/sst/notifications",
    icon: Bell,
  },
];

const vigilanciaRoutes = [
  {
    name: "Registro de Visitas",
    path: "/vigilancia/visitas",
    icon: UserCheck,
  },
];

const adminRoutes = [
  {
    name: "Auditoría de Sistema",
    path: "/admin/auditoria",
    icon: ShieldAlert,
  },
  {
    name: "Gestión de Usuarios",
    path: "/admin/usuarios",
    icon: Users,
  },
  ...(process.env.NEXT_PUBLIC_ENABLE_BIOMETRICS === 'true' ? [
    {
      name: "Enrolamiento Biométrico",
      path: "/admin/biometria",
      icon: ScanFace,
    },
    {
      name: "Modo Kiosco (Asistencia)",
      path: "/kiosk",
      icon: MonitorSmartphone,
    }
  ] : []),
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  if (pathname === "/" || pathname === "/kiosk") return null;

  const isAdmin = pathname.startsWith("/admin");
  const isMantenimiento = pathname.startsWith("/mantenimiento");
  const isSST = pathname.startsWith("/sst");
  const isVigilancia = pathname.startsWith("/vigilancia");
  const routes = isAdmin ? adminRoutes : isVigilancia ? vigilanciaRoutes : isMantenimiento ? mantenimientoRoutes : isSST ? sstRoutes : hrRoutes;

  return (
    <>
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between p-3 px-4 bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <img src={process.env.NEXT_PUBLIC_CLIENT_LOGO || "/logo.png"} alt={process.env.NEXT_PUBLIC_CLIENT_NAME || "Logo"} className="h-8 object-contain" />
        </div>
        
        {/* Botones superiores: Atrás y Inicio */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.back()}
            className="flex items-center justify-center p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            title="Atrás"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Link 
            href="/" 
            className="flex items-center justify-center p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            title="Inicio"
          >
            <Home className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Botones de acción en PC (Esquina superior derecha) */}
      <div className="hidden md:flex fixed top-6 right-8 z-50 items-center gap-2">
        <button 
          onClick={() => router.back()}
          className="flex items-center justify-center p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shadow-sm border border-blue-100"
          title="Atrás"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Link 
          href="/" 
          className="flex items-center justify-center p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors shadow-sm border border-red-100"
          title="Inicio"
        >
          <Home className="w-5 h-5" />
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

        {/* Sidebar Header (Logo) */}
        <div className="p-4 border-b border-gray-100 flex flex-col gap-4">
          <div className="flex items-center justify-center pt-2">
            <img 
              src={process.env.NEXT_PUBLIC_CLIENT_LOGO || "/logo.png"} 
              alt={process.env.NEXT_PUBLIC_CLIENT_NAME || "Logo"} 
              className="w-40 object-contain"
            />
          </div>
        </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
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
        <InstallAppButton />
        <div className="flex items-center gap-3 px-4 py-2 mt-2">
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
