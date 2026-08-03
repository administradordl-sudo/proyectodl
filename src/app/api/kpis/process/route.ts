import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { supabase } from '@/lib/supabase';
import { parse, format } from 'date-fns';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 1. Fetch data from Supabase
    const { data: empleadosData, error: empleadosError } = await supabase.from('empleados').select('*');
    if (empleadosError) throw empleadosError;

    const { data: feriadosData } = await supabase.from('feriados').select('*');
    const { data: permisosData } = await supabase.from('permisos').select('*').eq('estado', 'APROBADO');

    const normalizeName = (name: string) => {
      if (!name) return '';
      return name
        .toUpperCase()
        .replace(/[,.]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 0)
        .sort()
        .join(' ');
    };

    const empleadosMap = new Map<string, any>();
    empleadosData?.forEach(e => {
      empleadosMap.set(normalizeName(`${e.nombres} ${e.apellidos}`), e);
      empleadosMap.set(normalizeName(`${e.apellidos} ${e.nombres}`), e);
    });

    const feriadosMap = new Set<string>();
    feriadosData?.forEach((f) => feriadosMap.add(f.fecha));

    const permisosMap = new Set<string>();
    permisosData?.forEach((p) => permisosMap.add(`${normalizeName(p.nombre_trabajador)}_${p.fecha_permiso}`));

    // 2. Read the Excel file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: 'Excel file has no worksheets' }, { status: 400 });
    }

    // 3. Find header row
    const possibleCols = ['NOMBRE', 'FECHA', 'HORARIO', 'HORA INGRESO', 'OBSERVACION', 'OBSERVACIONES', 'HORA EXTRA', 'HORA NO LABORADA'];
    let headerRowIndex = -1;
    let colMap: Record<string, number> = {};

    for (let r = 1; r <= 20; r++) {
      const row = worksheet.getRow(r);
      const tempMap: Record<string, number> = {};

      row.eachCell((cell, colNumber) => {
        const value = cell.value?.toString().replace(/\s+/g, ' ').trim().toUpperCase();
        if (value && possibleCols.includes(value)) tempMap[value] = colNumber;
      });

      if (tempMap['NOMBRE'] && tempMap['FECHA'] && (tempMap['OBSERVACIONES'] || tempMap['OBSERVACION'])) {
        colMap = tempMap;
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return NextResponse.json({ error: `No se encontraron las columnas necesarias en el Excel.` }, { status: 400 });
    }

    // Combine OBSERVACIONES/OBSERVACION
    const obsCol = colMap['OBSERVACIONES'] || colMap['OBSERVACION'];

    // Helper: convert time value to minutes
    const getMinsFromCell = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (val instanceof Date) return val.getHours() * 60 + val.getMinutes();
      if (typeof val === 'number') return Math.round(val * 24 * 60);
      if (typeof val === 'string') {
        const parts = val.trim().split(':');
        if (parts.length < 2) return 0;
        const hours = parseInt(parts[0], 10) || 0;
        const mins  = parseInt(parts[1], 10) || 0;
        return hours * 60 + (hours < 0 ? -mins : mins);
      }
      return 0;
    };

    const parseFecha = (cell: ExcelJS.Cell): string => {
      if (cell.value instanceof Date) return format(cell.value, 'yyyy-MM-dd');
      if (typeof cell.value === 'string') {
        try {
          return format(parse(cell.value.trim(), 'dd/MM/yyyy', new Date()), 'yyyy-MM-dd');
        } catch {
          return cell.value;
        }
      }
      return '';
    };

    // Data structures for KPIs
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

    const rowCount = worksheet.rowCount;
    
    for (let r = headerRowIndex + 1; r <= rowCount; r++) {
      const row = worksheet.getRow(r);
      const nombreRaw = row.getCell(colMap['NOMBRE'])?.value?.toString().trim();
      if (!nombreRaw) continue;

      const normName = normalizeName(nombreRaw);
      const fechaStr = parseFecha(row.getCell(colMap['FECHA']));
      const observacion = row.getCell(obsCol)?.value?.toString().toLowerCase() || '';
      
      const horarioCell = colMap['HORARIO'] ? row.getCell(colMap['HORARIO']).value?.toString().trim() : '';
      const ingresoCell = colMap['HORA INGRESO'] ? row.getCell(colMap['HORA INGRESO']).value : null;
      
      const extraMins = colMap['HORA EXTRA'] ? getMinsFromCell(row.getCell(colMap['HORA EXTRA']).value) : 0;

      // Ensure employee exists in stats map
      if (!statsMap.has(normName)) {
        const emp = empleadosMap.get(normName);
        statsMap.set(normName, {
          nombre: emp ? `${emp.nombres} ${emp.apellidos}` : nombreRaw, // Use original if not found
          sede: emp?.sede || 'Desconocida',
          area: emp?.area || 'Desconocida',
          tardanzasMins: 0,
          faltasDias: 0,
          horasExtraMins: 0
        });
      }
      
      const stats = statsMap.get(normName)!;
      stats.horasExtraMins += extraMins;

      // Check justification (feriado or permiso)
      const isJustified = feriadosMap.has(fechaStr) || permisosMap.has(`${normName}_${fechaStr}`);

      if (!isJustified) {
        // 1. Falta
        if (observacion.includes('falta')) {
          stats.faltasDias += 1;
          
          // Add to daily absences chart
          const diaSemana = new Date(fechaStr).toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'UTC' });
          faltasPorDia.set(diaSemana, (faltasPorDia.get(diaSemana) || 0) + 1);
        } 
        // 2. Tardanza
        else if (horarioCell && ingresoCell !== null && ingresoCell !== undefined) {
          // Parse horario (e.g. "07:30 - 17:00")
          const parts = horarioCell.split('-');
          if (parts.length >= 1) {
            const expectedStartMins = getMinsFromCell(parts[0]);
            let actualStartMins = getMinsFromCell(ingresoCell);
            
            // Handle edge case where HORA INGRESO cell returns 0 (which means 00:00) when it was blank or 00:00
            // In the image, '00:00' was red. If they arrived at 00:00, that's weird. But we get mins.
            // Actually, if they didn't clock in, it usually says empty or 00:00. But wait, if they didn't clock in, it's a 'falta'. 
            // We already checked for 'falta'. So this is someone who arrived.
            
            if (actualStartMins > expectedStartMins) {
              const delay = actualStartMins - expectedStartMins;
              stats.tardanzasMins += delay;
            }
          }
        }
      }
    }

    // Calculate aggregated KPIs
    const allEmployees = Array.from(statsMap.values());
    
    // Rankings
    const topTardanzas = [...allEmployees].sort((a, b) => b.tardanzasMins - a.tardanzasMins).slice(0, 5);
    const topFaltas = [...allEmployees].sort((a, b) => b.faltasDias - a.faltasDias).slice(0, 5);
    const topHorasExtra = [...allEmployees].sort((a, b) => b.horasExtraMins - a.horasExtraMins).slice(0, 5);

    // Group by Area
    const areaStats = new Map<string, { faltas: number, tardanzas: number }>();
    allEmployees.forEach(e => {
      const current = areaStats.get(e.area) || { faltas: 0, tardanzas: 0 };
      current.faltas += e.faltasDias;
      current.tardanzas += e.tardanzasMins;
      areaStats.set(e.area, current);
    });

    const topAreasFaltas = Array.from(areaStats.entries())
      .map(([area, faltas, tardanzas]) => ({ area, faltas: areaStats.get(area)!.faltas }))
      .sort((a, b) => b.faltas - a.faltas)
      .slice(0, 5);

    const topAreasTardanzas = Array.from(areaStats.entries())
      .map(([area, faltas, tardanzas]) => ({ area, tardanzas: areaStats.get(area)!.tardanzas }))
      .sort((a, b) => b.tardanzas - a.tardanzas)
      .slice(0, 5);
      
    const diasFaltasArr = Array.from(faltasPorDia.entries())
      .map(([dia, count]) => ({ dia: dia.charAt(0).toUpperCase() + dia.slice(1), count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      topTardanzas: topTardanzas.filter(e => e.tardanzasMins > 0),
      topFaltas: topFaltas.filter(e => e.faltasDias > 0),
      topHorasExtra: topHorasExtra.filter(e => e.horasExtraMins > 0),
      topAreasFaltas: topAreasFaltas.filter(a => a.faltas > 0),
      topAreasTardanzas: topAreasTardanzas.filter(a => a.tardanzas > 0),
      diasFaltas: diasFaltasArr,
      resumen: {
        totalFaltas: allEmployees.reduce((acc, e) => acc + e.faltasDias, 0),
        totalTardanzasHoras: Math.round(allEmployees.reduce((acc, e) => acc + e.tardanzasMins, 0) / 60),
        totalExtrasHoras: Math.round(allEmployees.reduce((acc, e) => acc + e.horasExtraMins, 0) / 60)
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing KPIs:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar KPIs' }, { status: 500 });
  }
}
