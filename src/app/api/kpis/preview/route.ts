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

    if (file.size === 0) {
      return NextResponse.json({ error: 'El archivo Excel está vacío o corrupto (0.00 MB). Por favor, intenta guardar tu Excel con otro nombre y súbelo nuevamente.' }, { status: 400 });
    }

    // 1. Fetch data from Supabase
    const { data: empleadosData, error: empleadosError } = await supabase.from('empleados').select('*');
    if (empleadosError) throw empleadosError;

    const { data: feriadosData } = await supabase.from('feriados').select('*');
    const { data: permisosData } = await supabase.from('permisos').select('*').eq('estado', 'APROBADO');
    const { data: vacacionesData } = await supabase.from('vacaciones').select('*').eq('estado', 'APROBADO');

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
    const originalNamesMap = new Map<string, string>(); // Para mostrar el nombre real si existe
    
    empleadosData?.forEach(e => {
      const norm1 = normalizeName(`${e.nombres} ${e.apellidos}`);
      const norm2 = normalizeName(`${e.apellidos} ${e.nombres}`);
      const realName = `${e.apellidos}, ${e.nombres}`;
      
      empleadosMap.set(norm1, e.id);
      empleadosMap.set(norm2, e.id);
      
      originalNamesMap.set(norm1, realName);
      originalNamesMap.set(norm2, realName);
    });

    const feriadosMap = new Map<string, string>();
    feriadosData?.forEach((f) => feriadosMap.set(f.fecha, f.descripcion || 'Feriado'));

    const permisosMap = new Map<string, string>();
    permisosData?.forEach((p) => permisosMap.set(`${normalizeName(p.nombre_trabajador)}_${p.fecha_permiso}`, p.motivo || 'Permiso Aprobado'));

    const vacacionesMap = new Map<string, string>();
    if (vacacionesData) {
      vacacionesData.forEach((v: any) => {
        const start = new Date(v.fecha_inicio);
        const end = new Date(v.fecha_fin);
        // Map all days in between
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          vacacionesMap.set(`${normalizeName(v.nombre_trabajador)}_${dateStr}`, v.motivo || 'Vacaciones');
        }
      });
    }

    // 2. Read the Excel file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = new ExcelJS.Workbook();
    
    try {
      await workbook.xlsx.load(buffer as any);
    } catch (e) {
      return NextResponse.json({ error: 'El archivo no es un Excel válido o está corrupto. Asegúrate de que tenga extensión .xlsx' }, { status: 400 });
    }
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: 'El archivo Excel no tiene hojas' }, { status: 400 });
    }

    // 3. Find header row
    const possibleCols = ['NOMBRE', 'FECHA', 'HORARIO', 'HORA INGRESO', 'OBSERVACION', 'OBSERVACIONES', 'DESCRIPCION', 'HORA EXTRA', 'HORA NO LABORADA', 'TARDANZA', 'TARDANZAS', 'MINUTOS TARDANZA'];
    let headerRowIndex = -1;
    let colMap: Record<string, number> = {};

    for (let r = 1; r <= 20; r++) {
      const row = worksheet.getRow(r);
      const tempMap: Record<string, number> = {};

      row.eachCell((cell, colNumber) => {
        const value = cell.value?.toString().replace(/\s+/g, ' ').trim().toUpperCase();
        if (value && possibleCols.includes(value)) tempMap[value] = colNumber;
      });

      if (tempMap['NOMBRE'] && tempMap['FECHA'] && (tempMap['OBSERVACIONES'] || tempMap['OBSERVACION'] || tempMap['DESCRIPCION'])) {
        colMap = tempMap;
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return NextResponse.json({ error: `No se encontraron las columnas necesarias en el Excel (NOMBRE, FECHA, OBSERVACIONES o DESCRIPCION).` }, { status: 400 });
    }

    const obsCol = colMap['OBSERVACIONES'] || colMap['OBSERVACION'] || colMap['DESCRIPCION'];

    // Helper: convert time value to minutes
    const getMinsFromCell = (val: any): number | null => {
      if (val === null || val === undefined || val === '') return null;
      if (val instanceof Date) return val.getHours() * 60 + val.getMinutes();
      if (typeof val === 'number') return Math.round(val * 24 * 60);
      if (typeof val === 'string') {
        const parts = val.trim().split(':');
        if (parts.length < 2) return null;
        const hours = parseInt(parts[0], 10);
        const mins  = parseInt(parts[1], 10);
        if (isNaN(hours) || isNaN(mins)) return null;
        return hours * 60 + (hours < 0 ? -mins : mins);
      }
      return null;
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
    const faltasPreview: any[] = [];
    const tardanzasPreview: any[] = [];
    const permisosPreview: any[] = [];
    const feriadosPreview: any[] = [];
    const vacacionesPreview: any[] = [];
    
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
      const extraMins = colMap['HORA EXTRA'] ? (getMinsFromCell(row.getCell(colMap['HORA EXTRA']).value) || 0) : 0;
      const tardanzaCol = colMap['TARDANZA'] || colMap['TARDANZAS'] || colMap['MINUTOS TARDANZA'];

      const empleadoId = empleadosMap.get(normName) || null;
      const displayName = originalNamesMap.get(normName) || nombreRaw;
      
      let faltasDias = 0;
      let tardanzasMins = 0;

      const motivoFeriado = feriadosMap.get(fechaStr);
      const motivoPermiso = permisosMap.get(`${normName}_${fechaStr}`);
      const motivoVacacion = vacacionesMap.get(`${normName}_${fechaStr}`);
      const isJustified = !!motivoFeriado || !!motivoPermiso || !!motivoVacacion;

      if (motivoPermiso && !motivoFeriado) {
        permisosPreview.push({
          nombre: displayName,
          fecha: fechaStr,
          motivo: motivoPermiso
        });
      }
      
      if (motivoVacacion && !motivoFeriado && !motivoPermiso) {
        vacacionesPreview.push({
          nombre: displayName,
          fecha: fechaStr,
          motivo: motivoVacacion
        });
      }

      if (motivoFeriado && (observacion.includes('falta') || !horarioCell)) {
        feriadosPreview.push({
          nombre: displayName,
          fecha: fechaStr,
          motivo: motivoFeriado
        });
      }

      if (!isJustified) {
        if (observacion.includes('falta')) {
          faltasDias = 1;
          faltasPreview.push({
            nombre: displayName,
            fecha: fechaStr
          });
        } else {
          // Priority to direct Tardanza column from Excel
          if (tardanzaCol && row.getCell(tardanzaCol).value != null) {
            tardanzasMins = getMinsFromCell(row.getCell(tardanzaCol).value) || 0;
            if (tardanzasMins > 0) {
              tardanzasPreview.push({
                nombre: displayName,
                fecha: fechaStr,
                minutos: tardanzasMins,
                hora_ingreso: getTimeString(ingresoCell) || '(Ver Excel)'
              });
            }
          } else if (horarioCell && ingresoCell !== null && ingresoCell !== undefined) {
            // Fallback: Calculate from HORA INGRESO and HORARIO
            const parts = horarioCell.split('-');
            if (parts.length >= 1) {
              const expectedStartMins = getMinsFromCell(parts[0]);
              let actualStartMins = getMinsFromCell(ingresoCell);
              
              if (expectedStartMins !== null && actualStartMins !== null && actualStartMins > expectedStartMins) {
                tardanzasMins = actualStartMins - expectedStartMins;
                tardanzasPreview.push({
                  nombre: displayName,
                  fecha: fechaStr,
                  minutos: tardanzasMins,
                  hora_ingreso: getTimeString(ingresoCell)
                });
              }
            }
          }
        }
      }

      asistenciasToUpsert.push({
        empleado_id: empleadoId,
        nombre_crudo: normName,
        fecha: fechaStr,
        horario: horarioCell || null,
        hora_ingreso: getTimeString(ingresoCell),
        minutos_tardanza: tardanzasMins,
        es_falta: faltasDias > 0,
        minutos_extra: extraMins,
        observaciones: observacion
      });
    }

    return NextResponse.json({ 
      success: true, 
      count: asistenciasToUpsert.length,
      faltasPreview,
      tardanzasPreview,
      permisosPreview,
      feriadosPreview,
      vacacionesPreview,
      asistenciasToUpsert 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error previewing KPIs:', error);
    return NextResponse.json({ error: error.message || 'Error al procesar el archivo Excel.' }, { status: 500 });
  }
}
