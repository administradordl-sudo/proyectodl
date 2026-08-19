import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper for time difference in minutes
function getMinutesDiff(timeStr: string, targetTimeStr: string): number {
  if (!timeStr || !targetTimeStr) return 0;
  // both are HH:MM or HH:MM:SS
  const [h1, m1] = timeStr.split(':').map(Number);
  const [h2, m2] = targetTimeStr.split(':').map(Number);
  const totalMins1 = h1 * 60 + m1;
  const totalMins2 = h2 * 60 + m2;
  return totalMins1 - totalMins2;
}

export async function GET(request: Request) {
  try {
    const isBiometrics = process.env.NEXT_PUBLIC_ENABLE_BIOMETRICS === 'true';

    // Para Excel, la data ya viene con minutos_tardanza y es_falta desde el importador.
    // Para Biometría, tenemos que cruzar con horarios.
    const { data: asistencias, error } = await supabase
      .from('asistencias')
      .select(`
        *,
        empleados (
          id,
          nombres,
          apellidos,
          area,
          sede,
          horario_id,
          horarios (
            hora_ingreso,
            minutos_tolerancia,
            dias_laborables
          )
        )
      `);

    if (error) throw error;

    const emptyResponse = {
      topTardanzas: [],
      topFaltas: [],
      topHorasExtra: [],
      topAreasFaltas: [],
      topAreasTardanzas: [],
      diasFaltas: [],
      desconocidos: [],
      resumen: { totalFaltas: 0, totalTardanzasHoras: 0, totalExtrasHoras: 0 }
    };

    if (!asistencias || asistencias.length === 0) {
      if (isBiometrics) {
        // En biometría, si no hay asistencias pero sí empleados, todos faltaron?
        // Solo para no complicar, devolvemos vacío si no hay asistencias en absoluto.
        // Podríamos iterar sobre empleados y contar faltas.
        const { data: empleados } = await supabase.from('empleados').select('id, nombres, apellidos');
        if (!empleados || empleados.length === 0) return NextResponse.json(emptyResponse, { status: 200 });
      } else {
        return NextResponse.json(emptyResponse, { status: 200 });
      }
    }

    type EmployeeStats = {
      nombre: string;
      sede: string;
      area: string;
      tardanzasMins: number;
      faltasDias: number;
      horasExtraMins: number;
    };

    const statsMap = new Map<string, EmployeeStats>();
    const faltasPorDia = new Map<string, number>();
    
    // Almacenaremos las asistencias por empleado y fecha para el cálculo biométrico de faltas
    const asistenciasMap = new Map<string, Set<string>>(); // employee_id -> set of dates YYYY-MM-DD

    // 1. Recopilar asistencias reales
    (asistencias || []).forEach(row => {
      const emp = Array.isArray(row.empleados) ? row.empleados[0] : row.empleados;
      const normName = row.nombre_crudo || (emp ? `${emp.nombres} ${emp.apellidos}` : 'Desconocido');
      const realName = emp ? `${emp.nombres} ${emp.apellidos}` : normName;
      const area = emp?.area || 'Desconocida';
      const sede = emp?.sede || 'Desconocida';
      const empId = emp?.id || normName;

      if (!statsMap.has(empId)) {
        statsMap.set(empId, { nombre: realName, sede, area, tardanzasMins: 0, faltasDias: 0, horasExtraMins: 0 });
      }
      
      if (!asistenciasMap.has(empId)) {
        asistenciasMap.set(empId, new Set());
      }
      asistenciasMap.get(empId)!.add(row.fecha);

      const stats = statsMap.get(empId)!;
      
      if (isBiometrics) {
        // Cálculo biométrico al vuelo
        const horario = emp?.horarios;
        if (horario && row.hora_ingreso) {
          const tardanzaBruta = getMinutesDiff(row.hora_ingreso, horario.hora_ingreso);
          if (tardanzaBruta > horario.minutos_tolerancia) {
            stats.tardanzasMins += tardanzaBruta;
          }
        }
      } else {
        // Modo Excel Clásico
        stats.tardanzasMins += row.minutos_tardanza || 0;
        stats.horasExtraMins += row.minutos_extra || 0;
        
        if (row.es_falta) {
          stats.faltasDias += 1;
          const diaSemana = new Date(row.fecha).toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'UTC' });
          faltasPorDia.set(diaSemana, (faltasPorDia.get(diaSemana) || 0) + 1);
        }
      }
    });

    // 2. Si es Biométrico, calcular las FALTAS viendo quién no vino en sus días laborables
    if (isBiometrics) {
      // Obtener todos los empleados activos
      const { data: todosEmpleados } = await supabase.from('empleados')
        .select('id, nombres, apellidos, area, sede, horarios(dias_laborables)')
        .eq('status', 'Activo');
        
      if (todosEmpleados) {
        // Asumimos el rango del mes actual para el dashboard (1 al día actual)
        const hoy = new Date();
        const diasDelMes: { fechaStr: string, diaNombre: string }[] = [];
        
        for (let i = 1; i <= hoy.getDate(); i++) {
          const d = new Date(hoy.getFullYear(), hoy.getMonth(), i);
          // Omitir domingos por defecto si no queremos contar hasta que haya horarios completos
          // Para ser precisos, usamos el nombre del dia
          const diaNombre = d.toLocaleDateString('es-ES', { weekday: 'long' });
          const diaCapitalizado = diaNombre.charAt(0).toUpperCase() + diaNombre.slice(1);
          const fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          diasDelMes.push({ fechaStr, diaNombre: diaCapitalizado });
        }

        todosEmpleados.forEach(emp => {
          const empId = emp.id;
          const realName = `${emp.nombres} ${emp.apellidos}`;
          const horario = Array.isArray(emp.horarios) ? emp.horarios[0] : emp.horarios;
          // Si no tiene horario, por defecto Lunes a Viernes
          const diasLaborables = horario?.dias_laborables || ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
          
          if (!statsMap.has(empId)) {
            statsMap.set(empId, { nombre: realName, sede: emp.sede, area: emp.area, tardanzasMins: 0, faltasDias: 0, horasExtraMins: 0 });
          }
          
          const stats = statsMap.get(empId)!;
          const asistenciasEmp = asistenciasMap.get(empId) || new Set();

          // Revisar cada día laborable del mes hasta hoy
          diasDelMes.forEach(dia => {
            if (diasLaborables.includes(dia.diaNombre)) {
              if (!asistenciasEmp.has(dia.fechaStr)) {
                // Faltó!
                stats.faltasDias += 1;
                faltasPorDia.set(dia.diaNombre, (faltasPorDia.get(dia.diaNombre) || 0) + 1);
              }
            }
          });
        });
      }
    }

    const allEmployees = Array.from(statsMap.values());
    
    const topTardanzas = [...allEmployees].sort((a, b) => b.tardanzasMins - a.tardanzasMins).slice(0, 5);
    const topFaltas = [...allEmployees].sort((a, b) => b.faltasDias - a.faltasDias).slice(0, 5);
    const topHorasExtra = [...allEmployees].sort((a, b) => b.horasExtraMins - a.horasExtraMins).slice(0, 5);

    const areaStats = new Map<string, { faltas: number, tardanzas: number }>();
    allEmployees.forEach(e => {
      const current = areaStats.get(e.area) || { faltas: 0, tardanzas: 0 };
      current.faltas += e.faltasDias;
      current.tardanzas += e.tardanzasMins;
      areaStats.set(e.area, current);
    });

    const topAreasFaltas = Array.from(areaStats.entries())
      .map(([area, stats]) => ({ area, faltas: stats.faltas }))
      .sort((a, b) => b.faltas - a.faltas)
      .slice(0, 5);

    const topAreasTardanzas = Array.from(areaStats.entries())
      .map(([area, stats]) => ({ area, tardanzas: stats.tardanzas }))
      .sort((a, b) => b.tardanzas - a.tardanzas)
      .slice(0, 5);
      
    const diasFaltasArr = Array.from(faltasPorDia.entries())
      .map(([dia, count]) => ({ dia, count }))
      .sort((a, b) => b.count - a.count);

    const desconocidos = Array.from(statsMap.values())
      .filter(s => s.area === 'Desconocida')
      .map(s => s.nombre)
      .sort();

    return NextResponse.json({
      topTardanzas: topTardanzas.filter(e => e.tardanzasMins > 0),
      topFaltas: topFaltas.filter(e => e.faltasDias > 0),
      topHorasExtra: topHorasExtra.filter(e => e.horasExtraMins > 0),
      topAreasFaltas: topAreasFaltas.filter(a => a.faltas > 0),
      topAreasTardanzas: topAreasTardanzas.filter(a => a.tardanzas > 0),
      diasFaltas: diasFaltasArr,
      desconocidos,
      resumen: {
        totalFaltas: allEmployees.reduce((acc, e) => acc + e.faltasDias, 0),
        totalTardanzasHoras: Math.round(allEmployees.reduce((acc, e) => acc + e.tardanzasMins, 0) / 60),
        totalExtrasHoras: Math.round(allEmployees.reduce((acc, e) => acc + e.horasExtraMins, 0) / 60)
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json({ error: error.message || 'Error al obtener estadísticas' }, { status: 500 });
  }
}
