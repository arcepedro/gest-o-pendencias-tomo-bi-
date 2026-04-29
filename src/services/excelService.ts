import { read, utils } from 'xlsx';
import { Occurrence, ActionPlan, Unit } from '../types';

const OCCURRENCES_URL = 'https://ifudxfllenrtbhollajq.supabase.co/storage/v1/object/sign/planilha/OCORRENCIA_TOMO%20BI.xlsx?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80MzYxYzhmMC1mYjlhLTRlOGItOTFiYi0wZDVhNjdkMDE2YzEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwbGFuaWxoYS9PQ09SUkVOQ0lBX1RPTU8gQkkueGxzeCIsImlhdCI6MTc3NzQ2OTIxNSwiZXhwIjoxODA5MDA1MjE1fQ.8hWmWnoSP7D73e6-mxt40LuYZCc3DZLuQGf4qAEfd7g';
const ACTION_PLANS_URL = 'https://ifudxfllenrtbhollajq.supabase.co/storage/v1/object/sign/planilha/planotomobi.xlsx?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80MzYxYzhmMC1mYjlhLTRlOGItOTFiYi0wZDVhNjdkMDE2YzEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwbGFuaWxoYS9wbGFub3RvbW9iaS54bHN4IiwiaWF0IjoxNzc3NDY5MjM4LCJleHAiOjE4MDkwMDUyMzh9.IvUD0-rpLBiMwb4QBDKhNbeXEebLHtDZG69gxhsrqt8';
const COMPLETED_URL = 'https://ifudxfllenrtbhollajq.supabase.co/storage/v1/object/sign/planilha/CONCLUIDA%20TOMO%20BI.xlsx?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80MzYxYzhmMC1mYjlhLTRlOGItOTFiYi0wZDVhNjdkMDE2YzEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwbGFuaWxoYS9DT05DTFVJREEgVE9NTyBCSS54bHN4IiwiaWF0IjoxNzc1NDkzNzgwLCJleHAiOjE4MDcwMjk3ODB9.XdzJ6VmfL_DEwa9Ux-8CBURUys2DDJ-ynl7fkuiZeeE';

// Helper to parse Excel dates
const parseExcelDate = (value: any): string => {
  if (value === undefined || value === null || value === '') return '';
  
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    return value.toISOString();
  }
  
  const numValue = Number(value);
  if (!isNaN(numValue) && typeof value !== 'boolean' && String(value).trim() !== '') {
    const date = new Date(Math.round((numValue - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';

    const dmyMatch = trimmed.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      let year = parseInt(dmyMatch[3], 10);
      
      if (year < 100) year += 2000;
      
      const date = new Date(Date.UTC(year, month, day));
      if (!isNaN(date.getTime())) return date.toISOString();
    }

    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
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

// Helper to normalize IDs
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
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to fetch spreadsheet from ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  return read(arrayBuffer, { type: 'array', cellDates: true });
};

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

const parseOccurrencesFromWorkbook = (workbook: any): Occurrence[] => {
  let occurrences: Occurrence[] = [];
  workbook.SheetNames.forEach((sheetName: string) => {
    const sheet = workbook.Sheets[sheetName];
    const headerRow = findHeaderRow(sheet, ['número', 'numero', 'ocorrência', 'ocorrencia', 'fazenda', 'categoria', 'id', 'unidade', 'data', 'supervisor', 'responsável', 'responsavel']);
    const data = utils.sheet_to_json<any>(sheet, { range: headerRow });
    
    const sheetOccurrences = data.map((row, index) => {
      const keys = Object.keys(row);
      
      const unitKey = keys.find(k => k.toUpperCase() === 'UNIDADE');
      const numberKey = keys.find(k => {
        const up = k.toUpperCase();
        return up === 'ID' || up === 'NÚMERO' || up === 'NUMERO' || k.toLowerCase() === 'id ocorrência' || k.toLowerCase() === 'id ocorrencia';
      });
      const farmKey = keys.find(k => k.toUpperCase() === 'FAZENDA');
      const plotKey = keys.find(k => k.toUpperCase() === 'TALHÃO' || k.toUpperCase() === 'TALHAO');
      const createdAtKey = keys.find(k => {
        const up = k.toUpperCase();
        return up === 'DATA CRIAÇÃO' || up === 'DATA CRIACAO' || up === 'DATA' || up === 'DATA DA OCORRÊNCIA' || up === 'DATA DA OCORRENCIA';
      });
      const statusKey = keys.find(k => k.toUpperCase() === 'STATUS');
      const categoryKey = keys.find(k => k.toUpperCase() === 'CATEGORIA');
      const subcategoryKey = keys.find(k => k.toUpperCase() === 'SUBCATEGORIA');
      const observationKey = keys.find(k => k.toUpperCase() === 'OBSERVAÇÃO' || k.toUpperCase() === 'OBSERVACAO' || k.toLowerCase().includes('descrição') || k.toLowerCase().includes('descricao'));
      const creatorKey = keys.find(k => k.toUpperCase() === 'CRIADO POR');
      const supervisorKey = keys.find(k => k.toUpperCase() === 'RESPONSÁVEL' || k.toUpperCase() === 'RESPONSAVEL');
      const actionPlanStatusKey = keys.find(k => k.toUpperCase() === 'STATUS PLANO DE AÇÃO' || k.toUpperCase() === 'STATUS PLANO DE ACAO');

      const sectorKey = keys.find(k => k.toLowerCase().includes('setor'));
      const completedAtKey = keys.find(k => {
        const low = k.toLowerCase();
        return (low.includes('concl') && !low.includes('concluída') && !low.includes('concluido')) || low.includes('data conclusão');
      });
      const isDeletedKey = keys.find(k => k.toLowerCase().trim() === 'excluída' || k.toLowerCase().trim() === 'excluida');

      const hasData = Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
      if (!hasData) return null;

      const idValue = numberKey ? row[numberKey] : null;
      const number = idValue !== null && idValue !== undefined && String(idValue).trim() !== '' 
        ? normalizeId(idValue) 
        : `ID-${sheetName}-${index + 1}`;

      const statusValue = statusKey ? String(row[statusKey]).toLowerCase() : '';
      const isCompleted = statusValue.includes('concluído') || statusValue.includes('concluido') || statusValue.includes('fechado');

      return {
        id: `${sheetName}-${index}`,
        number,
        unit: String(unitKey ? row[unitKey] : '').trim(),
        creator: String(creatorKey ? row[creatorKey] : 'Unknown').trim(),
        supervisor: String(supervisorKey ? row[supervisorKey] : 'Unassigned').trim(),
        farm: String(farmKey ? row[farmKey] : '').trim(),
        plot: normalizeId(plotKey ? row[plotKey] : ''),
        sector: String(sectorKey ? row[sectorKey] : '').trim(),
        category: String(categoryKey ? row[categoryKey] : '').trim(),
        subcategory: String(subcategoryKey ? row[subcategoryKey] : '').trim(),
        observation: String(observationKey ? row[observationKey] : '').trim(),
        isCompleted: isCompleted,
        createdAt: createdAtKey && row[createdAtKey] ? parseExcelDate(row[createdAtKey]) : '',
        completedAt: completedAtKey && row[completedAtKey] ? parseExcelDate(row[completedAtKey]) : '',
        isDeleted: isDeletedKey ? parseBoolean(row[isDeletedKey]) : false,
        actionPlanStatus: actionPlanStatusKey ? String(row[actionPlanStatusKey] || '').trim() : '',
        rawData: row,
      } as Occurrence;
    }).filter((o): o is Occurrence => o !== null);
    
    occurrences = [...occurrences, ...sheetOccurrences];
  });
  return occurrences;
};

export const fetchSpreadsheetData = async (): Promise<{ occurrences: Occurrence[], actionPlans: ActionPlan[] }> => {
  try {
    const [occWorkbook, apWorkbook, compWorkbook] = await Promise.all([
      fetchWorkbook(OCCURRENCES_URL),
      fetchWorkbook(ACTION_PLANS_URL),
      fetchWorkbook(COMPLETED_URL)
    ]);

    if (!occWorkbook && !apWorkbook && !compWorkbook) {
      return { occurrences: [], actionPlans: [] };
    }

    let occurrences: Occurrence[] = [];
    if (occWorkbook) {
      occurrences = parseOccurrencesFromWorkbook(occWorkbook);
    }

    if (compWorkbook) {
      const completedOccurrences = parseOccurrencesFromWorkbook(compWorkbook).map(o => ({
        ...o,
        isCompleted: true,
        id: `comp-${o.id}`
      }));
      occurrences = [...occurrences, ...completedOccurrences];
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
