import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { data: asistencias, error } = await supabase
      .from('asistencias')
      .select(`
        *,
        empleados (
          nombres,
          apellidos,
          area,
          sede
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
      return NextResponse.json(emptyResponse, { status: 200 });
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

    asistencias.forEach(row => {
      const normName = row.nombre_crudo;
      const emp = Array.isArray(row.empleados) ? row.empleados[0] : row.empleados;
      
      const realName = emp ? `${emp.nombres} ${emp.apellidos}` : normName;
      const area = emp?.area || 'Desconocida';
      const sede = emp?.sede || 'Desconocida';

      if (!statsMap.has(normName)) {
        statsMap.set(normName, {
          nombre: realName,
          sede: sede,
          area: area,
          tardanzasMins: 0,
          faltasDias: 0,
          horasExtraMins: 0
        });
      }

      const stats = statsMap.get(normName)!;
      
      stats.tardanzasMins += row.minutos_tardanza;
      stats.horasExtraMins += row.minutos_extra;
      
      if (row.es_falta) {
        stats.faltasDias += 1;
        const diaSemana = new Date(row.fecha).toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'UTC' });
        faltasPorDia.set(diaSemana, (faltasPorDia.get(diaSemana) || 0) + 1);
      }
    });

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
      .map(([dia, count]) => ({ dia: dia.charAt(0).toUpperCase() + dia.slice(1), count }))
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
