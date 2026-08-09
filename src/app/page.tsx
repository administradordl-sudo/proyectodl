"use client";

import Link from "next/link";
import Image from "next/image";
import { Users, Wrench, ShieldCheck, UserCheck, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { InstallAppButton } from "@/components/ui/InstallAppButton";

export default function Home() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-2">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-4"
      >
        <div className="flex justify-center mb-1">
          <Image src="/logo.png" alt="Logo" width={45} height={45} className="object-contain" />
        </div>
        <h1 className="text-3xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
          DICAR LOGISTIC
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto mb-3 px-4">
          Selecciona el módulo al que deseas acceder.
        </p>
        
        <div className="flex justify-center">
          <div className="w-[160px]">
            <InstallAppButton />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-[340px] sm:max-w-4xl px-2 sm:px-4 mx-auto">
        {/* Módulo Recursos Humanos */}
        <Link href="/hr/requests" className="w-full">
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden group rounded-[22px] sm:rounded-2xl bg-white p-3 sm:p-5 shadow-[0_8px_20px_rgb(0,0,0,0.04)] sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-full flex flex-col items-center sm:text-center cursor-pointer transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-primary/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="w-16 h-16 sm:w-14 sm:h-14 bg-primary/10 rounded-[20px] sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-primary/20 transition-colors duration-300">
              <Users className="w-8 h-8 sm:w-7 sm:h-7 text-primary" />
            </div>
            
            <h2 className="text-[11px] sm:text-lg font-bold text-slate-900 mb-0 sm:mb-1 text-center leading-tight">Recursos Humanos</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-snug hidden sm:block">
              Gestión de asistencia, permisos, feriados y generación de reportes biométricos procesados.
            </p>
            
            <div className="hidden sm:block mt-auto pt-3 w-full">
              <div className="w-full py-2 rounded-lg bg-blue-600 text-white font-semibold text-[11px] text-center shadow-md opacity-0 transform translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                Acceder al Módulo →
              </div>
            </div>
          </motion.div>
        </Link>

        {/* Módulo Mantenimiento */}
        <Link href="/mantenimiento" className="w-full">
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden group rounded-[22px] sm:rounded-2xl bg-white p-3 sm:p-5 shadow-[0_8px_20px_rgb(0,0,0,0.04)] sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-full flex flex-col items-center sm:text-center cursor-pointer transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-blue-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="w-16 h-16 sm:w-14 sm:h-14 bg-blue-500/10 rounded-[20px] sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-blue-500/20 transition-colors duration-300">
              <Wrench className="w-8 h-8 sm:w-7 sm:h-7 text-blue-600" />
            </div>
            
            <h2 className="text-[11px] sm:text-lg font-bold text-slate-900 mb-0 sm:mb-1 text-center leading-tight">Mantenimiento</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-snug hidden sm:block">
              Gestión de equipos, tickets de soporte y programación de tareas preventivas.
            </p>
            
            <div className="hidden sm:block mt-auto pt-3 w-full">
              <div className="w-full py-2 rounded-lg bg-blue-600 text-white font-semibold text-[11px] text-center shadow-md opacity-0 transform translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                Acceder al Módulo →
              </div>
            </div>
          </motion.div>
        </Link>

        {/* Módulo SST */}
        <Link href="/sst/emo" className="w-full">
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden group rounded-[22px] sm:rounded-2xl bg-white p-3 sm:p-5 shadow-[0_8px_20px_rgb(0,0,0,0.04)] sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-full flex flex-col items-center sm:text-center cursor-pointer transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-emerald-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="w-16 h-16 sm:w-14 sm:h-14 bg-emerald-500/10 rounded-[20px] sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-emerald-500/20 transition-colors duration-300">
              <ShieldCheck className="w-8 h-8 sm:w-7 sm:h-7 text-emerald-600" />
            </div>
            
            <h2 className="text-[11px] sm:text-lg font-bold text-slate-900 mb-0 sm:mb-1 text-center leading-tight">SST</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-snug hidden sm:block">
              Gestión de EMO, control de entrega de EPPs y seguimiento de Carnets de Sanidad.
            </p>
            
            <div className="hidden sm:block mt-auto pt-3 w-full">
              <div className="w-full py-2 rounded-lg bg-emerald-600 text-white font-semibold text-[11px] text-center shadow-md opacity-0 transform translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                Acceder al Módulo →
              </div>
            </div>
          </motion.div>
        </Link>

        {/* Módulo Vigilancia */}
        <Link href="/vigilancia/visitas" className="w-full">
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden group rounded-[22px] sm:rounded-2xl bg-white p-3 sm:p-5 shadow-[0_8px_20px_rgb(0,0,0,0.04)] sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-full flex flex-col items-center sm:text-center cursor-pointer transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-amber-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="w-16 h-16 sm:w-14 sm:h-14 bg-amber-500/10 rounded-[20px] sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-amber-500/20 transition-colors duration-300">
              <UserCheck className="w-8 h-8 sm:w-7 sm:h-7 text-amber-600" />
            </div>
            
            <h2 className="text-[11px] sm:text-lg font-bold text-slate-900 mb-0 sm:mb-1 text-center leading-tight">Vigilancia</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-snug hidden sm:block">
              Registro de visitas, validación de acuerdos de seguridad y control de accesos a planta.
            </p>
            
            <div className="hidden sm:block mt-auto pt-3 w-full">
              <div className="w-full py-2 rounded-lg bg-amber-600 text-white font-semibold text-[11px] text-center shadow-md opacity-0 transform translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                Acceder al Módulo →
              </div>
            </div>
          </motion.div>
        </Link>

        {/* Módulo Auditoría */}
        <Link href="/admin/auditoria" className="w-full">
          <motion.div
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden group rounded-[22px] sm:rounded-2xl bg-white p-3 sm:p-5 shadow-[0_8px_20px_rgb(0,0,0,0.04)] sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-full flex flex-col items-center sm:text-center cursor-pointer transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-indigo-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="w-16 h-16 sm:w-14 sm:h-14 bg-indigo-500/10 rounded-[20px] sm:rounded-xl flex items-center justify-center mb-2 sm:mb-3 group-hover:bg-indigo-500/20 transition-colors duration-300">
              <ShieldAlert className="w-8 h-8 sm:w-7 sm:h-7 text-indigo-600" />
            </div>
            
            <h2 className="text-[11px] sm:text-lg font-bold text-slate-900 mb-0 sm:mb-1 text-center leading-tight">Auditoría</h2>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-snug hidden sm:block">
              Monitoreo y trazabilidad de todos los cambios realizados en el sistema y base de datos.
            </p>
            
            <div className="hidden sm:block mt-auto pt-3 w-full">
              <div className="w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold text-[11px] text-center shadow-md opacity-0 transform translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                Acceder al Módulo →
              </div>
            </div>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
