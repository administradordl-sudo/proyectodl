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
        className="text-center mb-16"
      >
        <div className="flex justify-center mb-6">
          <Image src="/logo.png" alt="Logo" width={80} height={80} className="object-contain" />
        </div>
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          DICAR LOGISTIC
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto">
          Selecciona el módulo al que deseas acceder. Cada sección está optimizada para tus tareas diarias.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-4">
        {/* Módulo Recursos Humanos */}
        <Link href="/hr/requests">
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden group rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-full flex flex-col items-center text-center cursor-pointer transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-primary/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-300">
              <Users className="w-10 h-10 text-primary" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Recursos Humanos</h2>
            <p className="text-slate-500 leading-relaxed">
              Gestión de asistencia, permisos, feriados y generación de reportes biométricos procesados.
            </p>
            
            <div className="mt-8 px-6 py-2.5 rounded-full bg-primary/10 text-primary font-medium text-sm opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
              Acceder al Módulo →
            </div>
          </motion.div>
        </Link>

        {/* Módulo Mantenimiento */}
        <Link href="/mantenimiento">
          <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative overflow-hidden group rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 h-full flex flex-col items-center text-center cursor-pointer transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-blue-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors duration-300">
              <Wrench className="w-10 h-10 text-blue-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Mantenimiento</h2>
            <p className="text-slate-500 leading-relaxed">
              Gestión de equipos, tickets de soporte y programación de tareas preventivas.
            </p>
            
            <div className="mt-8 px-6 py-2.5 rounded-full bg-blue-500/10 text-blue-700 font-medium text-sm opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
              Acceder al Módulo →
            </div>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
