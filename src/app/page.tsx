"use client";

import Link from "next/link";
import Image from "next/image";
import { Users, Wrench } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <div className="flex justify-center mb-4">
          <Image src="/logo.png" alt="Logo" width={60} height={60} className="object-contain" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
          DICAR LOGISTIC
        </h1>
        <p className="text-base text-slate-500 max-w-lg mx-auto">
          Selecciona el módulo al que deseas acceder. Cada sección está optimizada para tus tareas diarias.
        </p>
      </motion.div>

      <div className="flex flex-row justify-center items-stretch gap-4 w-full max-w-5xl px-2">
        {/* Módulo Recursos Humanos */}
        <Link href="/hr/requests" className="w-1/2 md:w-1/3">
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden group rounded-2xl bg-white p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-full flex flex-col items-center text-center cursor-pointer transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-primary/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary/20 transition-colors duration-300">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            
            <h2 className="text-base sm:text-xl font-bold text-slate-900 mb-2">Recursos Humanos</h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed hidden sm:block">
              Gestión de asistencia, permisos, feriados y generación de reportes biométricos procesados.
            </p>
            
            <div className="mt-auto pt-4 w-full">
              <div className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-[11px] sm:text-xs text-center shadow-md opacity-100 sm:opacity-0 transform sm:translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                Acceder al Módulo →
              </div>
            </div>
          </motion.div>
        </Link>

        {/* Módulo Mantenimiento */}
        <Link href="/mantenimiento" className="w-1/2 md:w-1/3">
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden group rounded-2xl bg-white p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-full flex flex-col items-center text-center cursor-pointer transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-blue-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500/10 rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-blue-500/20 transition-colors duration-300">
              <Wrench className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            
            <h2 className="text-base sm:text-xl font-bold text-slate-900 mb-2">Mantenimiento</h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed hidden sm:block">
              Gestión de equipos, tickets de soporte y programación de tareas preventivas.
            </p>
            
            <div className="mt-auto pt-4 w-full">
              <div className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-[11px] sm:text-xs text-center shadow-md opacity-100 sm:opacity-0 transform sm:translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                Acceder al Módulo →
              </div>
            </div>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
