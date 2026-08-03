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

    const empleadosMap = new Map<string, string>();
    empleadosData?.forEach(e => {
      empleadosMap.set(normalizeName(`${e.nombres} ${e.apellidos}`), e.id);
      empleadosMap.set(normalizeName(`${e.apellidos} ${e.nombres}`), e.id);
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
    
    // Helper to extract Time string
    const getTimeString = (val: any): string | null => {
      if (val === null || val === undefined) return null;
      if (val instanceof Date) return `${val.getHours().toString().padStart(2, '0')}:${val.getMinutes().toString().padStart(2, '0')}:00`;
      if (typeof val === 'number') {
        const mins = Math.round(val * 24 * 60);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
      }
      if (typeof val === 'string') {
        const match = val.match(/\d{2}:\d{2}/);
        if (match) return match[0] + ":00";
      }
      return null;
    }

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

    const rowCount = worksheet.rowCount;
    const asistenciasToUpsert: any[] = [];
    
    for (let r = headerRowIndex + 1; r <= rowCount; r++) {
      const row = worksheet.getRow(r);
      const nombreRaw = row.getCell(colMap['NOMBRE'])?.value?.toString().trim();
      if (!nombreRaw) continue;

      const normName = normalizeName(nombreRaw);
      const fechaStr = parseFecha(row.getCell(colMap['FECHA']));
      if (!fechaStr) continue;

      const observacion = row.getCell(obsCol)?.value?.toString().toLowerCase() || '';
      const horarioCell = colMap['HORARIO'] ? row.getCell(colMap['HORARIO']).value?.toString().trim() : '';
      const ingresoCell = colMap['HORA INGRESO'] ? row.getCell(colMap['HORA INGRESO']).value : null;
      const extraMins = colMap['HORA EXTRA'] ? getMinsFromCell(row.getCell(colMap['HORA EXTRA']).value) : 0;

      const empleadoId = empleadosMap.get(normName) || null;
      
      let faltasDias = 0;
      let tardanzasMins = 0;

      const isJustified = feriadosMap.has(fechaStr) || permisosMap.has(`${normName}_${fechaStr}`);

      if (!isJustified) {
        if (observacion.includes('falta')) {
          faltasDias = 1;
        } else if (horarioCell && ingresoCell !== null && ingresoCell !== undefined) {
          const parts = horarioCell.split('-');
          if (parts.length >= 1) {
            const expectedStartMins = getMinsFromCell(parts[0]);
            let actualStartMins = getMinsFromCell(ingresoCell);
            
            if (actualStartMins > expectedStartMins) {
              tardanzasMins = actualStartMins - expectedStartMins;
            }
          }
        }
      }

      asistenciasToUpsert.push({
        empleado_id: empleadoId,
        nombre_crudo: normName, // Usamos el normalizado para mantener consistencia
        fecha: fechaStr,
        horario: horarioCell || null,
        hora_ingreso: getTimeString(ingresoCell),
        minutos_tardanza: tardanzasMins,
        es_falta: faltasDias > 0,
        minutos_extra: extraMins,
        observaciones: observacion
      });
    }

    // 4. Upsert into Supabase in chunks
    const chunkSize = 1000;
    for (let i = 0; i < asistenciasToUpsert.length; i += chunkSize) {
      const chunk = asistenciasToUpsert.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('asistencias')
        .upsert(chunk, { onConflict: 'nombre_crudo, fecha' });
        
      if (error) {
        console.error('Supabase Upsert Error:', error);
        throw error;
      }
    }

    return NextResponse.json({ success: true, count: asistenciasToUpsert.length }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing KPIs:', error);
    return NextResponse.json({ error: error.message || 'Error al guardar los registros en BD' }, { status: 500 });
  }
}
