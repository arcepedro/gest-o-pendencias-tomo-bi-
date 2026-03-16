import { read, utils } from 'xlsx';
import { Occurrence, ActionPlan, Unit } from '../types';

const OCCURRENCES_URL = 'https://ifudxfllenrtbhollajq.supabase.co/storage/v1/object/sign/planilha/OCORRENCIA_TOMO%20BI.xlsx?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80MzYxYzhmMC1mYjlhLTRlOGItOTFiYi0wZDVhNjdkMDE2YzEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwbGFuaWxoYS9PQ09SUkVOQ0lBX1RPTU8gQkkueGxzeCIsImlhdCI6MTc3MzY1NzYyMiwiZXhwIjoxODA1MTkzNjIyfQ.3FpFUYdW1DVAu8CqAQefXi_61Huh1jvyQHuOp-Kerho';
const ACTION_PLANS_URL = 'https://ifudxfllenrtbhollajq.supabase.co/storage/v1/object/sign/planilha/planotomobi.xlsx?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80MzYxYzhmMC1mYjlhLTRlOGItOTFiYi0wZDVhNjdkMDE2YzEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwbGFuaWxoYS9wbGFub3RvbW9iaS54bHN4IiwiaWF0IjoxNzczNjU5MTcxLCJleHAiOjE4MDUxOTUxNzF9.AldImi-GT_kbarVm_2V3BBkg07zUv9dZ3FCV-FWnzAc';

// Helper to parse Excel dates
const parseExcelDate = (value: any): string => {
  if (value === undefined || value === null || value === '') return '';
  
  // If it's already a Date object (from xlsx cellDates: true)
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    return value.toISOString();
  }
  
  // If it's a number (Excel serial date) or a string that is purely a number
  const numValue = Number(value);
  if (!isNaN(numValue) && typeof value !== 'boolean' && String(value).trim() !== '') {
    // Excel base date is Dec 30, 1899. 
    // 25569 is the number of days between 1899-12-30 and 1970-01-01
    const date = new Date(Math.round((numValue - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';

    // Extract DD/MM/YYYY or DD-MM-YY anywhere in the string (ignores time)
    const dmyMatch = trimmed.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      let year = parseInt(dmyMatch[3], 10);
      
      if (year < 100) year += 2000;
      
      // Use Date.UTC to prevent timezone shifts when formatting later
      const date = new Date(Date.UTC(year, month, day));
      if (!isNaN(date.getTime())) return date.toISOString();
    }

    // Try standard JS parsing as fallback
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  console.warn('Invalid date value encountered, returning empty string:', value);
  return '';
};

// Helper to normalize boolean values
const parseBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'sim' || lower === 'yes' || lower === 'true' || lower === 'concluído' || lower === 'concluido';
  }
  return false;
};

// Helper to normalize IDs (remove .0, trim, etc)
const normalizeId = (id: any): string => {
  if (id === undefined || id === null) return '';
  let str = String(id).trim();
  if (str.endsWith('.0')) str = str.slice(0, -2);
  return str;
};

// Helper to normalize units
const normalizeUnit = (val: any): Unit => {
  const str = String(val || '').toLowerCase().trim();
  if (str.includes('narandiba')) return Unit.NARANDIBA;
  if (str.includes('paraguacu') || str.includes('paraguaçu')) return Unit.PARAGUACU;
  if (str.includes('sp')) return Unit.SP;
  return Unit.NARANDIBA;
};

// Helper to fetch and parse a single spreadsheet
const fetchWorkbook = async (url: string) => {
  if (!url) return null;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch spreadsheet from ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  return read(arrayBuffer, { type: 'array', cellDates: true });
};

export const fetchSpreadsheetData = async (): Promise<{ occurrences: Occurrence[], actionPlans: ActionPlan[] }> => {
  try {
    // Fetch both spreadsheets in parallel
    const [occWorkbook, apWorkbook] = await Promise.all([
      fetchWorkbook(OCCURRENCES_URL),
      fetchWorkbook(ACTION_PLANS_URL)
    ]);

    if (!occWorkbook && !apWorkbook) {
      return { occurrences: [], actionPlans: [] };
    }

    const findHeaderRow = (sheet: any, keywords: string[]) => {
      const range = utils.decode_range(sheet['!ref'] || 'A1');
      let bestRow = 0;
      let maxScore = 0;
      for (let r = range.s.r; r <= Math.min(range.e.r, 20); r++) {
        const rowData: string[] = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = sheet[utils.encode_cell({r, c})];
          if (cell) rowData.push(String(cell.v).toLowerCase());
        }
        let score = 0;
        keywords.forEach(k => {
          if (rowData.some(v => v.includes(k))) score++;
        });
        if (score > maxScore) {
          maxScore = score;
          bestRow = r;
        }
      }
      return bestRow;
    };

    let occurrences: Occurrence[] = [];
    if (occWorkbook) {
      const sheetName = occWorkbook.SheetNames[0];
      const sheet = occWorkbook.Sheets[sheetName];
      const headerRow = findHeaderRow(sheet, ['número', 'numero', 'ocorrência', 'ocorrencia', 'fazenda', 'categoria']);
      const data = utils.sheet_to_json<any>(sheet, { range: headerRow });
      
      occurrences = data.map((row, index) => {
        const keys = Object.keys(row);
        const numberKey = keys.find(k => k.toLowerCase().includes('número') || k.toLowerCase().includes('numero') || k.toLowerCase() === 'nº' || k.toLowerCase() === 'id');
        const unitKey = keys.find(k => k.toLowerCase().includes('usina') || k.toLowerCase().includes('unidade'));
        const creatorKey = keys.find(k => k.toLowerCase().includes('criado'));
        const supervisorKey = keys.find(k => k.toLowerCase().includes('responsável') || k.toLowerCase().includes('responsavel'));
        const farmKey = keys.find(k => k.toLowerCase().includes('fazenda'));
        const plotKey = keys.find(k => k.toLowerCase().includes('talhão') || k.toLowerCase().includes('talhao'));
        const sectorKey = keys.find(k => k.toLowerCase().includes('setor'));
        const categoryKey = keys.find(k => k.toLowerCase().trim() === 'categoria');
        const subcategoryKey = keys.find(k => k.toLowerCase().includes('subcategoria'));
        const observationKey = keys.find(k => k.toLowerCase().includes('observação') || k.toLowerCase().includes('observacao') || k.toLowerCase().includes('descrição') || k.toLowerCase().includes('descricao'));
        const isCompletedKey = keys.find(k => k.toLowerCase().includes('concluída') || k.toLowerCase().includes('concluido') || k.toLowerCase() === 'status');
        const createdAtKey = keys.find(k => {
          const low = k.toLowerCase();
          return (low.includes('data') && low.includes('cria')) || low === 'data';
        });
        const completedAtKey = keys.find(k => {
          const low = k.toLowerCase();
          return (low.includes('concl') && !low.includes('concluída') && !low.includes('concluido')) || low.includes('data conclusão');
        });
        const isDeletedKey = keys.find(k => k.toLowerCase().includes('excluída') || k.toLowerCase().includes('excluida'));

        // Skip empty rows or rows without a valid ID/Number
        const idValue = numberKey ? row[numberKey] : null;
        if (idValue === null || idValue === undefined || String(idValue).trim() === '') return null;

        return {
          id: String(index),
          number: normalizeId(idValue),
          unit: String(unitKey ? row[unitKey] : '').trim(),
          creator: String(creatorKey ? row[creatorKey] : 'Unknown').trim(),
          supervisor: String(supervisorKey ? row[supervisorKey] : 'Unassigned').trim(),
          farm: String(farmKey ? row[farmKey] : '').trim(),
          plot: normalizeId(plotKey ? row[plotKey] : ''),
          sector: String(sectorKey ? row[sectorKey] : '').trim(),
          category: String(categoryKey ? row[categoryKey] : '').trim(),
          subcategory: String(subcategoryKey ? row[subcategoryKey] : '').trim(),
          observation: String(observationKey ? row[observationKey] : '').trim(),
          isCompleted: isCompletedKey ? parseBoolean(row[isCompletedKey]) : false,
          createdAt: createdAtKey && row[createdAtKey] ? parseExcelDate(row[createdAtKey]) : '',
          completedAt: completedAtKey && row[completedAtKey] ? parseExcelDate(row[completedAtKey]) : '',
          isDeleted: isDeletedKey ? parseBoolean(row[isDeletedKey]) : false,
          rawData: row,
        } as Occurrence;
      }).filter((o): o is Occurrence => o !== null);
    }

    let actionPlans: ActionPlan[] = [];
    if (apWorkbook) {
      const sheetName = apWorkbook.SheetNames[0];
      const sheet = apWorkbook.Sheets[sheetName];
      const headerRow = findHeaderRow(sheet, ['início', 'inicio', 'fim', 'descrição', 'descricao', 'ocorrência', 'ocorrencia']);
      const data = utils.sheet_to_json<any>(sheet, { range: headerRow });

      actionPlans = data.map((row, index) => {
        const keys = Object.keys(row);
        const idKey = keys.find(k => k.toLowerCase().trim() === 'id');
        const occurrenceKey = keys.find(k => k.toLowerCase().trim() === 'id ocorrencia' || k.toLowerCase().trim() === 'id ocorrência') ||
                              keys.find(k => k.toLowerCase().includes('ocorrência') || k.toLowerCase().includes('ocorrencia')) ||
                              keys.find(k => k.toLowerCase() === 'id' || k.toLowerCase() === 'nº');
        const descriptionKey = keys.find(k => k.toLowerCase().includes('descrição') || k.toLowerCase().includes('descricao') || k.toLowerCase().includes('detalhe'));
        
        const unitKey = keys.find(k => k.toLowerCase().includes('usina') || k.toLowerCase().includes('unidade'));
        const creatorKey = keys.find(k => k.toLowerCase().includes('criado'));
        const supervisorKey = keys.find(k => k.toLowerCase().includes('responsável') || k.toLowerCase().includes('responsavel'));
        const createdAtKey = keys.find(k => {
          const low = k.toLowerCase();
          return (low.includes('data') && low.includes('cria')) || low === 'data';
        });
        const startDateKey = keys.find(k => k.toLowerCase().trim() === 'início' || k.toLowerCase().trim() === 'inicio') || 
                             keys.find(k => k.toLowerCase().includes('início') || k.toLowerCase().includes('inicio'));
        const endDateKey = keys.find(k => k.toLowerCase().trim() === 'fim' || k.toLowerCase().trim() === 'prazo') || 
                           keys.find(k => k.toLowerCase().includes('fim') || k.toLowerCase().includes('prazo'));
        const isCompletedKey = keys.find(k => k.toLowerCase().includes('concluída') || k.toLowerCase().includes('concluido') || k.toLowerCase() === 'status');
        const farmKey = keys.find(k => k.toLowerCase().includes('fazenda'));
        const plotKey = keys.find(k => k.toLowerCase().includes('talhão') || k.toLowerCase().includes('talhao'));

        // Skip empty rows
        if ((!idKey || !row[idKey]) && (!occurrenceKey || !row[occurrenceKey])) return null;

        return {
          id: idKey ? String(row[idKey]) : String(index),
          occurrenceId: normalizeId(occurrenceKey ? row[occurrenceKey] : ''),
          unit: String(unitKey ? row[unitKey] : '').trim(),
          creator: String(creatorKey ? row[creatorKey] : 'Unknown').trim(),
          supervisor: String(supervisorKey ? row[supervisorKey] : 'Unassigned').trim(),
          createdAt: createdAtKey && row[createdAtKey] ? parseExcelDate(row[createdAtKey]) : '',
          startDate: startDateKey && row[startDateKey] ? parseExcelDate(row[startDateKey]) : '',
          endDate: endDateKey && row[endDateKey] ? parseExcelDate(row[endDateKey]) : '',
          description: String(descriptionKey ? row[descriptionKey] : '').trim(),
          isCompleted: isCompletedKey ? parseBoolean(row[isCompletedKey]) : false,
          farm: String(farmKey ? row[farmKey] : '').trim(),
          plot: normalizeId(plotKey ? row[plotKey] : ''),
          rawData: row,
        } as ActionPlan;
      }).filter((ap): ap is ActionPlan => ap !== null);
    }

    return { occurrences, actionPlans };
  } catch (error) {
    console.error('Error fetching spreadsheet data:', error);
    throw error;
  }
};
