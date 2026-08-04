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

    // 1. Fetch holidays and approved permissions from Supabase
    const { data: feriadosData, error: feriadosError } = await supabase
      .from('feriados')
      .select('*');

    if (feriadosError) throw feriadosError;

    const { data: permisosData, error: permisosError } = await supabase
      .from('permisos')
      .select('*')
      .eq('estado', 'APROBADO');

    const { data: vacacionesData } = await supabase.from('vacaciones').select('*').eq('estado', 'APROBADO');

    if (permisosError) throw permisosError;

    // Build lookup maps
    const feriadosMap = new Map<string, string>();
    feriadosData?.forEach((f) => feriadosMap.set(f.fecha, f.descripcion));

    // Helper to normalize names (e.g. "Santiago Pazos Garcia" and "PAZOS GARCIA, SANTIAGO" both become "GARCIA PAZOS SANTIAGO")
    const normalizeName = (name: string) => {
      if (!name) return '';
      return name
        .toUpperCase()
        .replace(/[,.]/g, '') // Remove commas and dots
        .split(/\s+/) // Split by whitespace
        .filter(w => w.length > 0)
        .sort() // Sort alphabetically to ignore order
        .join(' ');
    };

    const permisosMap = new Map<string, string>();
    permisosData?.forEach((p) =>
      permisosMap.set(`${normalizeName(p.nombre_trabajador)}_${p.fecha_permiso}`, p.motivo)
    );

    const vacacionesMap = new Map<string, string>();
    if (vacacionesData) {
      vacacionesData.forEach((v: any) => {
        const start = new Date(v.fecha_inicio);
        const end = new Date(v.fecha_fin);
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
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: 'Excel file has no worksheets' }, { status: 400 });
    }

    // 3. Dynamically find header row (search first 20 rows)
    const requiredCols = ['NOMBRE', 'FECHA', 'HORA LABORADA', 'HORA EXTRA', 'HORA NO LABORADA', 'DESCRIPCION'];
    let headerRowIndex = -1;
    let colMap: Record<string, number> = {};
    let missingCols: string[] = [...requiredCols];

    for (let r = 1; r <= 20; r++) {
      const row = worksheet.getRow(r);
      const tempMap: Record<string, number> = {};

      row.eachCell((cell, colNumber) => {
        const value = cell.value?.toString().replace(/\s+/g, ' ').trim().toUpperCase();
        if (value) tempMap[value] = colNumber;
      });

      const currentMissing = requiredCols.filter(col => !tempMap[col]);
      if (currentMissing.length < missingCols.length) {
        missingCols = currentMissing;
        colMap = tempMap;
        headerRowIndex = r;
      }
      if (missingCols.length === 0) break;
    }

    if (missingCols.length > 0) {
      return NextResponse.json({ error: `Missing columns: ${missingCols.join(', ')}` }, { status: 400 });
    }

    // 4. Helper: convert any Excel time value to minutes
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

    // Format minutes as HH:MM:SS string (matching Excel style)
    const minutesToTimeStr = (totalMins: number): string => {
      const isNeg = totalMins < 0;
      const abs = Math.abs(totalMins);
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      return `${isNeg ? '-' : ''}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
    };

    // Helper: parse fecha cell to YYYY-MM-DD string
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

    // 5. Collect all data rows grouped by worker
    const rowCount = worksheet.rowCount;
    type WorkerGroup = { nombre: string; rows: number[] };
    const groups: WorkerGroup[] = [];
    let currentGroup: WorkerGroup | null = null;

    for (let r = headerRowIndex + 1; r <= rowCount; r++) {
      const row  = worksheet.getRow(r);
      const nombre = row.getCell(colMap['NOMBRE']).value?.toString().trim();
      if (!nombre) continue;

      if (!currentGroup || nombre !== currentGroup.nombre) {
        currentGroup = { nombre, rows: [] };
        groups.push(currentGroup);
      }

      currentGroup.rows.push(r);
    }

    // 6. Write DESCRIPCION for each row
    for (const group of groups) {
      const lastRow = group.rows[group.rows.length - 1];
      let forgivenNotWorkedMins = 0;

      for (const r of group.rows) {
        const row      = worksheet.getRow(r);
        const nombre   = row.getCell(colMap['NOMBRE']).value?.toString().trim() ?? '';
        const fechaStr = parseFecha(row.getCell(colMap['FECHA']));
        const descCell = row.getCell(colMap['DESCRIPCION']);
        const observacionActual = descCell.value?.toString() ?? '';
        const horarioCell = getMinsFromCell(row.getCell(colMap['HORA LABORADA']).value);

        const normName = normalizeName(nombre);
        const labels: string[] = [];

        let isForgiven = false;

        const motivoFeriado = feriadosMap.get(fechaStr);
        const motivoPermiso = permisosMap.get(`${normName}_${fechaStr}`);
        const motivoVacacion = vacacionesMap.get(`${normName}_${fechaStr}`);

        if (motivoVacacion) {
          labels.push(`VACACIONES: ${motivoVacacion}`);
          isForgiven = true;
        } else if (motivoFeriado && (observacionActual.includes('FALTA') || !horarioCell)) {
          labels.push(`FERIADO NACIONAL: ${motivoFeriado}`);
          isForgiven = true;
        } else if (motivoPermiso) {
          labels.push(`PERMISO RRHH: ${motivoPermiso}`);
          isForgiven = true;
        }

        if (isForgiven && r !== lastRow) {
          forgivenNotWorkedMins += getMinsFromCell(row.getCell(colMap['HORA NO LABORADA']).value);
        }

        // On the LAST row of this worker → add balance (Columna L - (Columna M - Perdonadas))
        if (r === lastRow) {
          const valL = getMinsFromCell(row.getCell(colMap['HORA EXTRA']).value); // Columna L
          const valM = getMinsFromCell(row.getCell(colMap['HORA NO LABORADA']).value); // Columna M
          const finalNotWorked = valM - forgivenNotWorkedMins;
          const balance = valL - finalNotWorked;
          labels.push(minutesToTimeStr(balance));
        }

        if (labels.length > 0) {
          descCell.value = labels.join(' | ');
        }

        row.commit();
      }
    }

    // 7. Return the processed Excel (no new rows added)
    const newBuffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(newBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Reporte_Procesado.xlsx"',
      },
    });

  } catch (error: any) {
    console.error('Error processing Excel:', error);
    return NextResponse.json({ error: error.message || 'Error processing Excel' }, { status: 500 });
  }
}
