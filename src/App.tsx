import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Filter, 
  Search, 
  ChevronRight,
  User,
  MapPin,
  Calendar,
  MoreVertical,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  FileText,
  Eye,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { Occurrence, ActionPlan, Unit, SupervisorStats } from './types';
import { fetchSpreadsheetData } from './services/excelService';

const CURRENT_DATE = new Date();

export default function App() {
  const [activeTab, setActiveTab] = useState<'occurrences' | 'actionPlans' | 'dashboard' | 'completed'>('dashboard');
  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [selectedSupervisorDetail, setSelectedSupervisorDetail] = useState<string | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('All');
  const [selectedDay, setSelectedDay] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedFarm, setSelectedFarm] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All');
  const [selectedDaysRemaining, setSelectedDaysRemaining] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSpreadsheetData();
      setOccurrences(data.occurrences);
      setActionPlans(data.actionPlans);
    } catch (err) {
      setError('Falha ao carregar dados da planilha. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setTimeout(() => setShowSplash(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const supervisors = useMemo(() => {
    const names = Array.from(new Set(occurrences.map(o => o.supervisor)));
    return ['All', ...names.filter(Boolean).sort()];
  }, [occurrences]);

  const units = useMemo(() => {
    return ['All', 'SP'];
  }, [occurrences]);

  const years = useMemo(() => {
    const allDates = [
      ...occurrences.map(o => new Date(o.createdAt)),
      ...actionPlans.map(ap => new Date(ap.createdAt))
    ];
    const uniqueYears = Array.from(new Set(allDates.map(d => d.getFullYear()))).sort((a, b) => b - a);
    return ['All', ...uniqueYears.map(String)];
  }, [occurrences, actionPlans]);

  const farms = useMemo(() => {
    const names = Array.from(new Set(occurrences.map(o => o.farm)));
    return ['All', ...names.filter(Boolean)].sort();
  }, [occurrences]);

  const categories = useMemo(() => {
    const names = Array.from(new Set(occurrences.map(o => o.category)));
    return ['All', ...names.filter(Boolean)].sort();
  }, [occurrences]);

  const subcategories = useMemo(() => {
    const names = Array.from(new Set(occurrences.map(o => o.subcategory)));
    return ['All', ...names.filter(Boolean)].sort();
  }, [occurrences]);

  const months = [
    { value: 'All', label: 'Todos Meses' },
    { value: '0', label: 'Janeiro' },
    { value: '1', label: 'Fevereiro' },
    { value: '2', label: 'Março' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Maio' },
    { value: '5', label: 'Junho' },
    { value: '6', label: 'Julho' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Setembro' },
    { value: '9', label: 'Outubro' },
    { value: '10', label: 'Novembro' },
    { value: '11', label: 'Dezembro' },
  ];

  const days = ['All', ...Array.from({ length: 31 }, (_, i) => String(i + 1))];

  const occurrenceDateMap = useMemo(() => {
    const map: Record<string, string> = {};
    occurrences.forEach(o => {
      map[o.number] = o.createdAt;
    });
    return map;
  }, [occurrences]);

  const resetFilters = () => {
    setSelectedUnit('All');
    setSelectedYear('All');
    setSelectedMonth('All');
    setSelectedDay('All');
    setSelectedSupervisors([]);
    setSelectedFarm('All');
    setSelectedCategory('All');
    setSelectedSubcategory('All');
    setSelectedDaysRemaining('All');
    setSearchQuery('');
    setSelectedSupervisorDetail(null);
  };

  const occurrenceMap = useMemo(() => {
    const map: Record<string, Occurrence> = {};
    occurrences.forEach(o => {
      map[o.number] = o;
    });
    return map;
  }, [occurrences]);

  // Helper to safely format dates for display
  const formatDateSafe = (dateStr: string | undefined | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      // Use UTC to avoid timezone shifts that can change the day
      return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (e) {
      return '-';
    }
  };

  const filteredOccurrences = useMemo(() => {
    return occurrences.filter(o => {
      const date = new Date(o.createdAt);
      const matchesSupervisor = selectedSupervisors.length === 0 || selectedSupervisors.includes(o.supervisor);
      const matchesUnit = selectedUnit === 'All' || o.unit === selectedUnit;
      const matchesYear = selectedYear === 'All' || String(date.getFullYear()) === selectedYear;
      const matchesMonth = selectedMonth === 'All' || String(date.getMonth()) === selectedMonth;
      const matchesDay = selectedDay === 'All' || String(date.getDate()) === selectedDay;
      const matchesFarm = selectedFarm === 'All' || o.farm === selectedFarm;
      const matchesCategory = selectedCategory === 'All' || o.category === selectedCategory;
      const matchesSubcategory = selectedSubcategory === 'All' || o.subcategory === selectedSubcategory;
      
      const matchesSearch = (o.number || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (o.observation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (o.farm || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (o.supervisor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (o.plot || '').toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSupervisor && matchesUnit && matchesYear && matchesMonth && matchesDay && 
             matchesFarm && matchesCategory && matchesSubcategory && matchesSearch;
    });
  }, [occurrences, selectedSupervisors, selectedUnit, selectedYear, selectedMonth, selectedDay, selectedFarm, selectedCategory, selectedSubcategory, searchQuery]);

  const filteredActionPlans = useMemo(() => {
    return actionPlans.filter(ap => {
      const occurrenceDate = occurrenceDateMap[ap.occurrenceId] || ap.createdAt;
      const date = new Date(occurrenceDate);
      const matchesSupervisor = selectedSupervisors.length === 0 || selectedSupervisors.includes(ap.supervisor);
      const matchesUnit = selectedUnit === 'All' || ap.unit === selectedUnit;
      const matchesYear = selectedYear === 'All' || String(date.getFullYear()) === selectedYear;
      const matchesMonth = selectedMonth === 'All' || String(date.getMonth()) === selectedMonth;
      const matchesDay = selectedDay === 'All' || String(date.getDate()) === selectedDay;

      const occ = occurrenceMap[ap.occurrenceId];
      const matchesFarm = selectedFarm === 'All' || (occ && occ.farm === selectedFarm);
      const matchesCategory = selectedCategory === 'All' || (occ && occ.category === selectedCategory);
      const matchesSubcategory = selectedSubcategory === 'All' || (occ && occ.subcategory === selectedSubcategory);

      const matchesSearch = (ap.occurrenceId || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (ap.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (ap.supervisor || '').toLowerCase().includes(searchQuery.toLowerCase());

      const diasRestantesKey = ap.rawData ? Object.keys(ap.rawData).find(k => k.toLowerCase() === 'dias_restantes') : null;
      const diasRestantesValue = diasRestantesKey ? ap.rawData![diasRestantesKey] : null;
      const diasRestantes = (diasRestantesValue !== null && diasRestantesValue !== undefined && !isNaN(Number(diasRestantesValue))) ? Number(diasRestantesValue) : null;
      
      let matchesDaysRemaining = true;
      if (selectedDaysRemaining !== 'All') {
        if (diasRestantes === null) {
          matchesDaysRemaining = false; // If filter is active but no data, hide it
        } else {
          if (selectedDaysRemaining === 'vencido') matchesDaysRemaining = diasRestantes <= 0;
          else if (selectedDaysRemaining === '0-5') matchesDaysRemaining = diasRestantes > 0 && diasRestantes <= 5;
          else if (selectedDaysRemaining === '6-15') matchesDaysRemaining = diasRestantes > 5 && diasRestantes <= 15;
          else if (selectedDaysRemaining === '16+') matchesDaysRemaining = diasRestantes > 15;
        }
      }

      return matchesSupervisor && matchesUnit && matchesYear && matchesMonth && matchesDay && 
             matchesFarm && matchesCategory && matchesSubcategory && matchesSearch && matchesDaysRemaining;
    });
  }, [actionPlans, occurrenceDateMap, occurrenceMap, selectedSupervisors, selectedUnit, selectedYear, selectedMonth, selectedDay, selectedFarm, selectedCategory, selectedSubcategory, searchQuery, selectedDaysRemaining]);

  const supervisorStats = useMemo(() => {
    return supervisors
      .filter(s => s !== 'All' && (selectedSupervisors.length === 0 || selectedSupervisors.includes(s)))
      .map(name => {
        const supOccurrences = occurrences.filter(o => {
          const date = new Date(o.createdAt);
          const matchesUnit = selectedUnit === 'All' || o.unit === selectedUnit;
          const matchesYear = selectedYear === 'All' || String(date.getFullYear()) === selectedYear;
          const matchesMonth = selectedMonth === 'All' || String(date.getMonth()) === selectedMonth;
          const matchesDay = selectedDay === 'All' || String(date.getDate()) === selectedDay;
          const matchesFarm = selectedFarm === 'All' || o.farm === selectedFarm;
          const matchesCategory = selectedCategory === 'All' || o.category === selectedCategory;
          const matchesSubcategory = selectedSubcategory === 'All' || o.subcategory === selectedSubcategory;
          
          return o.supervisor === name && 
                 matchesUnit && matchesYear && matchesMonth && matchesDay &&
                 matchesFarm && matchesCategory && matchesSubcategory;
        });

        const supPlans = actionPlans.filter(ap => {
          const occurrenceDate = occurrenceDateMap[ap.occurrenceId] || ap.createdAt;
          const date = new Date(occurrenceDate);
          const matchesUnit = selectedUnit === 'All' || ap.unit === selectedUnit;
          const matchesYear = selectedYear === 'All' || String(date.getFullYear()) === selectedYear;
          const matchesMonth = selectedMonth === 'All' || String(date.getMonth()) === selectedMonth;
          const matchesDay = selectedDay === 'All' || String(date.getDate()) === selectedDay;
          const matchesFarm = selectedFarm === 'All' || ap.farm === selectedFarm;
          const matchesCategory = selectedCategory === 'All' || ap.category === selectedCategory;
          const matchesSubcategory = selectedSubcategory === 'All' || ap.subcategory === selectedSubcategory;
          
          return ap.supervisor === name && 
                 matchesUnit && matchesYear && matchesMonth && matchesDay &&
                 matchesFarm && matchesCategory && matchesSubcategory;
        });
        
        if (supOccurrences.length === 0 && supPlans.length === 0) return null;

        return {
          name,
          totalOccurrences: supOccurrences.length,
          pendingOccurrences: supOccurrences.filter(o => !o.isCompleted).length,
          totalActionPlans: supPlans.length,
          pendingActionPlans: supPlans.filter(ap => !ap.isCompleted).length
        };
      }).filter(Boolean) as SupervisorStats[];
  }, [supervisors, occurrences, actionPlans, occurrenceDateMap, selectedUnit, selectedYear, selectedMonth, selectedDay, selectedSupervisors, selectedFarm, selectedCategory, selectedSubcategory]);

  const pieData = useMemo(() => {
    if (!selectedSupervisorDetail) return [];
    
    const supOccurrences = occurrences.filter(o => {
      const date = new Date(o.createdAt);
      const matchesUnit = selectedUnit === 'All' || o.unit === selectedUnit;
      const matchesYear = selectedYear === 'All' || String(date.getFullYear()) === selectedYear;
      const matchesMonth = selectedMonth === 'All' || String(date.getMonth()) === selectedMonth;
      const matchesDay = selectedDay === 'All' || String(date.getDate()) === selectedDay;
      const matchesFarm = selectedFarm === 'All' || o.farm === selectedFarm;
      const matchesCategory = selectedCategory === 'All' || o.category === selectedCategory;
      const matchesSubcategory = selectedSubcategory === 'All' || o.subcategory === selectedSubcategory;
      
      return o.supervisor === selectedSupervisorDetail && 
             matchesUnit && matchesYear && matchesMonth && matchesDay &&
             matchesFarm && matchesCategory && matchesSubcategory;
    });

    const categoryCounts: Record<string, number> = {};
    
    supOccurrences.forEach(o => {
      categoryCounts[o.category] = (categoryCounts[o.category] || 0) + 1;
    });
    
    return Object.entries(categoryCounts).map(([name, value]) => ({ name, value }));
  }, [selectedSupervisorDetail, occurrences, selectedUnit, selectedYear, selectedMonth, selectedDay, selectedFarm, selectedCategory, selectedSubcategory]);

  const COLORS = ['#00f2ff', '#bc13fe', '#ff00ff', '#ff4500', '#ff8c00', '#007fff', '#ff1493', '#9400d3', '#ff0000', '#ffff00'];

  const dashboardStats = useMemo(() => {
    const pendingOccurrences = filteredOccurrences.filter(o => !o.isCompleted).length;
    const totalOccurrences = pendingOccurrences;
    const completedOccurrences = filteredOccurrences.filter(o => o.isCompleted).length;
    const totalSupervisors = new Set(filteredOccurrences.map(o => o.supervisor)).size;
    const totalPlots = new Set(filteredOccurrences.map(o => o.plot)).size;
    const pendingActionPlans = filteredActionPlans.filter(ap => !ap.isCompleted).length;
    const totalActionPlans = pendingActionPlans;
    const completedActionPlans = filteredActionPlans.filter(ap => ap.isCompleted).length;
    
    return { 
      totalOccurrences, 
      pendingOccurrences, 
      completedOccurrences, 
      totalSupervisors, 
      totalPlots, 
      totalActionPlans,
      pendingActionPlans,
      completedActionPlans
    };
  }, [filteredOccurrences, filteredActionPlans]);

  const occurrencesBySupervisor = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOccurrences.filter(o => !o.isCompleted).forEach(o => {
      counts[o.supervisor] = (counts[o.supervisor] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredOccurrences]);

  const occurrencesByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOccurrences.forEach(o => {
      counts[o.category] = (counts[o.category] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredOccurrences]);

  const occurrencesBySubcategory = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOccurrences.forEach(o => {
      counts[o.subcategory] = (counts[o.subcategory] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredOccurrences]);

  const topPlots = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOccurrences.forEach(o => {
      const key = `${o.farm} - ${o.plot}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredOccurrences]);

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden">
        {/* Glows */}
        <motion.div 
          animate={{ scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[400px] h-[400px] bg-[#76b82a] rounded-full blur-[100px] opacity-40" 
        />

        {/* Texture */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}
        />

        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative flex items-center justify-center rounded-[25%] overflow-hidden shadow-[0_0_50px_rgba(118,184,42,0.2)] bg-[#1a1a1a] w-48 h-48 mb-12 border border-white/5"
          >
            <img 
              src="https://ifudxfllenrtbhollajq.supabase.co/storage/v1/object/sign/CONTROLE%20DE%20ABASTECIMENTO%20COCAL%20LOTS/logo%20cocal%20sem%20texto.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80MzYxYzhmMC1mYjlhLTRlOGItOTFiYi0wZDVhNjdkMDE2YzEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJDT05UUk9MRSBERSBBQkFTVEVDSU1FTlRPIENPQ0FMIExPVFMvbG9nbyBjb2NhbCBzZW0gdGV4dG8ucG5nIiwiaWF0IjoxNzc2MjU4MzQ1LCJleHAiOjE4MDc3OTQzNDV9.0Ps4DZ7NlfnnEyoVcygmv_Jet_nifWZC6V-d-BJhLAk" 
              alt="Logo" 
              className="w-32 h-32 object-contain"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center text-center"
          >
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Gestão de Pendências</h1>
            <p className="text-[10px] uppercase tracking-widest font-black text-[#76b82a] mt-2">TOMO BI</p>
          </motion.div>

          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.5, delay: 1, ease: "easeInOut" }}
            className="w-48 h-[3px] bg-gradient-to-r from-transparent via-[#76b82a] to-transparent mt-8 mb-8"
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
            className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40"
          >
            INICIANDO SISTEMA...
          </motion.p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark flex flex-col items-center justify-center text-white overflow-hidden relative">
        {/* Futuristic Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-24 h-24 bg-accent/10 rounded-3xl flex items-center justify-center mb-8 border border-accent/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,78,59,0.1)]"
          >
            <div className="w-16 h-16 bg-transparent rounded-2xl flex items-center justify-center relative overflow-hidden">
              <img 
                src="https://ifudxfllenrtbhollajq.supabase.co/storage/v1/object/sign/planilha/Captura%20de%20tela%202026-03-24%20111819.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80MzYxYzhmMC1mYjlhLTRlOGItOTFiYi0wZDVhNjdkMDE2YzEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwbGFuaWxoYS9DYXB0dXJhIGRlIHRlbGEgMjAyNi0wMy0yNCAxMTE4MTkucG5nIiwiaWF0IjoxNzc0MzYyMDMzLCJleHAiOjE4MDU4OTgwMzN9.oubsKPfUSCKiH_aXrfTOdLKD0llwDLdWiDIZujFM7C8" 
                alt="Logo" 
                className="w-full h-full object-contain scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
          
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-2xl font-black tracking-tighter italic text-white uppercase">Sincronizando Sistemas</h2>
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin text-white" size={20} />
              <span className="text-xs uppercase tracking-[0.3em] font-black text-white/60">Acessando Banco de Dados</span>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 1 }}
            className="mt-16 flex flex-col items-center"
          >
            <div className="h-[1px] w-12 bg-accent/30 mb-4" />
            <p className="text-[10px] uppercase tracking-[0.4em] font-black text-white/40">Desenvolvido por Pedro Arce</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-dark flex flex-col items-center justify-center text-white">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-bold">Erro de Conexão</h2>
        <p className="text-sm opacity-60 mt-2 mb-6">{error}</p>
        <button 
          onClick={loadData}
          className="px-6 py-2 bg-gradient-to-r from-accent to-emerald-800 text-white rounded-full hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg shadow-accent/20 flex items-center gap-2 border border-accent/30"
        >
          <RefreshCw size={16} /> Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#76b82a]/20 selection:text-white">
      {/* Sidebar / Navigation (Mobile Slide-over) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
          />
        )}
      </AnimatePresence>

      <nav className={`fixed left-0 top-0 h-full w-72 bg-black/90 text-white/60 p-6 flex flex-col z-[70] shadow-[20px_0_50px_rgba(0,0,0,0.5)] border-r border-white/10 overflow-y-auto backdrop-blur-xl transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-10">
          <div className="flex flex-col items-center text-center w-full">
            <div className="relative group mb-6">
              <div className="absolute -inset-2 bg-gradient-to-r from-[#76b82a] to-[#008000] rounded-[25%] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-24 h-24 bg-[#1a1a1a] rounded-[25%] flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(118,184,42,0.2)] border border-white/5 group-hover:scale-105 transition-transform duration-500">
                <img 
                  src="https://ifudxfllenrtbhollajq.supabase.co/storage/v1/object/sign/CONTROLE%20DE%20ABASTECIMENTO%20COCAL%20LOTS/logo%20cocal%20sem%20texto.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV80MzYxYzhmMC1mYjlhLTRlOGItOTFiYi0wZDVhNjdkMDE2YzEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJDT05UUk9MRSBERSBBQkFTVEVDSU1FTlRPIENPQ0FMIExPVFMvbG9nbyBjb2NhbCBzZW0gdGV4dG8ucG5nIiwiaWF0IjoxNzc2MjU4MzQ1LCJleHAiOjE4MDc3OTQzNDV9.0Ps4DZ7NlfnnEyoVcygmv_Jet_nifWZC6V-d-BJhLAk" 
                  alt="Logo" 
                  className="w-16 h-16 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">Gestão de Pendências</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-[1px] w-4 bg-[#76b82a]/30" />
              <p className="text-[9px] uppercase tracking-widest font-black text-[#76b82a]">TOMO BI</p>
              <div className="h-[1px] w-4 bg-[#76b82a]/30" />
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-6 right-6 p-2 text-white/40 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-2 mb-8">
          <button 
            onClick={() => {
              setActiveTab('dashboard');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 border ${activeTab === 'dashboard' ? 'bg-white/10 text-white border-white/20 shadow-lg' : 'bg-white/5 border-transparent text-white/40 hover:text-white hover:bg-white/10'}`}
          >
            <LayoutDashboard size={18} className={activeTab === 'dashboard' ? 'text-[#76b82a]' : ''} />
            <span className="text-sm font-black uppercase tracking-tight">Dashboard</span>
          </button>
          <button 
            onClick={() => {
              setActiveTab('occurrences');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 border ${activeTab === 'occurrences' ? 'bg-white/10 text-white border-white/20 shadow-lg' : 'bg-white/5 border-transparent text-white/40 hover:text-white hover:bg-white/10'}`}
          >
            <AlertCircle size={18} className={activeTab === 'occurrences' ? 'text-[#76b82a]' : ''} />
            <span className="text-sm font-black uppercase tracking-tight">Ocorrências</span>
          </button>
          <button 
            onClick={() => {
              setActiveTab('actionPlans');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 border ${activeTab === 'actionPlans' ? 'bg-white/10 text-white border-white/20 shadow-lg' : 'bg-white/5 border-transparent text-white/40 hover:text-white hover:bg-white/10'}`}
          >
            <ClipboardList size={18} className={activeTab === 'actionPlans' ? 'text-[#76b82a]' : ''} />
            <span className="text-sm font-black uppercase tracking-tight">Planos de Ação</span>
          </button>
          <button 
            onClick={() => {
              setActiveTab('completed');
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 border ${activeTab === 'completed' ? 'bg-white/10 text-white border-white/20 shadow-lg' : 'bg-white/5 border-transparent text-white/40 hover:text-white hover:bg-white/10'}`}
          >
            <CheckCircle2 size={18} className={activeTab === 'completed' ? 'text-[#76b82a]' : ''} />
            <span className="text-sm font-black uppercase tracking-tight">Concluído</span>
          </button>
        </div>

        <div className="border-t border-white/10 pt-6 space-y-4">
          <h3 className="text-[10px] uppercase tracking-widest font-black text-white/40 mb-2">Filtros</h3>
          
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/40 block mb-1">Unidade</label>
            <select 
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-[#76b82a]/50 text-white cursor-pointer appearance-none"
            >
              {units.map(u => (
                <option key={u} value={u} className="bg-black">{u === 'All' ? 'Todas Unidades' : u}</option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] uppercase font-black text-white/40 tracking-widest block">Responsáveis</label>
            <div className="max-h-48 overflow-y-auto space-y-1 bg-accent/5 border border-accent/10 rounded-2xl p-4 custom-scrollbar">
              {supervisors.filter(s => s !== 'All').map(s => (
                <label key={s} className="flex items-center gap-3 cursor-pointer group py-1">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox"
                      checked={selectedSupervisors.includes(s)}
                      onChange={() => {
                        if (selectedSupervisors.includes(s)) {
                          setSelectedSupervisors(selectedSupervisors.filter(item => item !== s));
                        } else {
                          setSelectedSupervisors([...selectedSupervisors, s]);
                        }
                      }}
                      className="peer appearance-none w-4 h-4 rounded border border-accent/20 bg-transparent checked:bg-accent checked:border-accent transition-all cursor-pointer"
                    />
                    <CheckCircle2 size={10} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                  <span className="text-[10px] font-black text-white/40 group-hover:text-white transition-colors uppercase tracking-tight truncate">{s}</span>
                </label>
              ))}
            </div>
            {selectedSupervisors.length > 0 && (
              <button 
                onClick={() => setSelectedSupervisors([])}
                className="text-[10px] font-black text-white/60 uppercase tracking-widest hover:underline px-2"
              >
                Limpar Seleção ({selectedSupervisors.length})
              </button>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/40 tracking-widest block">Fazenda</label>
            <select 
              value={selectedFarm}
              onChange={(e) => setSelectedFarm(e.target.value)}
              className="w-full bg-accent/5 border border-accent/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-accent text-white/80 cursor-pointer appearance-none"
            >
              {farms.map(f => (
                <option key={f} value={f} className="bg-sidebar">{f === 'All' ? 'Todas Fazendas' : f}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/40 tracking-widest block">Categoria</label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-accent/5 border border-accent/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-accent text-white/80 cursor-pointer appearance-none"
            >
              {categories.map(c => (
                <option key={c} value={c} className="bg-sidebar">{c === 'All' ? 'Todas Categorias' : c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/40 tracking-widest block">Subcategoria</label>
            <select 
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              className="w-full bg-accent/5 border border-accent/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-accent text-white/80 cursor-pointer appearance-none"
            >
              {subcategories.map(s => (
                <option key={s} value={s} className="bg-sidebar">{s === 'All' ? 'Todas Subcategorias' : s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-white/40 tracking-widest block">Dias Restantes</label>
            <select 
              value={selectedDaysRemaining}
              onChange={(e) => setSelectedDaysRemaining(e.target.value)}
              className="w-full bg-accent/5 border border-accent/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-accent text-white/80 cursor-pointer appearance-none"
            >
              <option value="All" className="bg-sidebar">Todos os Prazos</option>
              <option value="vencido" className="bg-sidebar">Vencidos (≤ 0)</option>
              <option value="0-5" className="bg-sidebar">Crítico (1-5 dias)</option>
              <option value="6-15" className="bg-sidebar">Alerta (6-15 dias)</option>
              <option value="16+" className="bg-sidebar">No Prazo (16+ dias)</option>
            </select>
          </div>

          <div className="pt-6">
            <button 
              onClick={() => {
                setSelectedUnit('All');
                setSelectedSupervisors([]);
                setSelectedFarm('All');
                setSelectedCategory('All');
                setSelectedSubcategory('All');
                setSelectedDaysRemaining('All');
                setSelectedDay('All');
                setSelectedMonth('All');
                setSelectedYear('All');
                setSearchQuery('');
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl border border-accent/10 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-accent/5 hover:border-accent/30 transition-all group"
            >
              <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" /> Limpar Filtros
            </button>
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-accent/10">
          <div className="flex items-center gap-4 px-4 py-4 bg-accent/5 rounded-2xl border border-accent/5 group hover:border-accent/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-sidebar flex items-center justify-center border border-accent/10 group-hover:scale-110 transition-transform">
              <User size={18} className="text-white" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[8px] uppercase font-black text-white/30 tracking-widest">Acesso Autorizado</span>
              <span className="text-[10px] font-black truncate text-white/80 uppercase tracking-tight">{process.env.USER_EMAIL || 'Usuario'}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="min-h-screen bg-black relative max-w-[1200px] w-[90%] mx-auto">
        {/* Background glow */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#76b82a]/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#76b82a]/5 rounded-full blur-[150px]" />
        </div>
        {/* Header */}
        <header className="bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 py-6 flex justify-between items-center sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-white/40 hover:text-white transition-colors"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">
                {activeTab === 'dashboard' ? 'Dashboard Geral' : 
                 activeTab === 'occurrences' ? 'Ocorrências Agrícolas' : 
                 activeTab === 'actionPlans' ? 'Planos de Ação' : 'Itens Concluídos'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-[#76b82a] animate-pulse" />
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">
                  {CURRENT_DATE.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={loadData}
              className="p-2 text-white/40 hover:text-white transition-colors"
              title="Atualizar Dados"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        <div className="p-4">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && !selectedSupervisorDetail && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl group hover:bg-white/10 transition-all duration-500">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#76b82a]/10 text-[#76b82a] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <AlertCircle size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-black text-white/40">Total Ocorrências</p>
                        <h4 className="text-3xl font-black text-white italic tracking-tighter">{dashboardStats.totalOccurrences}</h4>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl group hover:bg-white/10 transition-all duration-500">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#76b82a]/10 text-[#76b82a] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ClipboardList size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-black text-white/40">Total Planos</p>
                        <h4 className="text-3xl font-black text-white italic tracking-tighter">{dashboardStats.totalActionPlans}</h4>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-sidebar/40 backdrop-blur-xl border border-accent/10 p-8 rounded-3xl shadow-2xl">
                    <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tighter italic">Ocorrências por Responsável</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={occurrencesBySupervisor} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(6,78,59,0.1)" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fontWeight: 900, fill: '#ffffff', opacity: 0.5 }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--color-sidebar)', border: '1px solid rgba(6,78,59,0.1)', borderRadius: '12px' }}
                            itemStyle={{ color: 'var(--color-accent)', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                            {occurrencesBySupervisor.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-sidebar/40 backdrop-blur-xl border border-accent/10 p-8 rounded-3xl shadow-2xl">
                    <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tighter italic">Distribuição por Categoria</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={occurrencesByCategory}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {occurrencesByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--color-sidebar)', border: '1px solid rgba(6,78,59,0.1)', borderRadius: '12px' }}
                          />
                          <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#ffffff' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <div className="bg-sidebar/40 backdrop-blur-xl border border-accent/10 p-8 rounded-3xl shadow-2xl">
                    <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tighter italic">Principais Subcategorias</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={occurrencesBySubcategory}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(6,78,59,0.1)" />
                          <XAxis dataKey="name" tick={{ fontSize: 8, fontWeight: 900, fill: '#ffffff', opacity: 0.5 }} interval={0} angle={-15} textAnchor="end" />
                          <YAxis tick={{ fontSize: 10, fontWeight: 900, fill: '#ffffff', opacity: 0.5 }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--color-sidebar)', border: '1px solid rgba(6,78,59,0.1)', borderRadius: '12px' }}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>
                            {occurrencesBySubcategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Detailed Table (Bottom) */}
                <div className="bg-sidebar/40 backdrop-blur-xl border border-accent/10 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="p-6 border-b border-accent/10 flex justify-between items-center bg-accent/5">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Tabela Detalhada de Ocorrências</h3>
                    <button 
                      onClick={() => setActiveTab('occurrences')}
                      className="text-[10px] font-black text-white uppercase tracking-widest hover:underline"
                    >
                      Ver todas
                    </button>
                  </div>
                  
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-accent/5 border-b border-accent/10 text-white/40">
                          <th className="p-5 text-[10px] uppercase tracking-widest font-black">Nº</th>
                          <th className="p-5 text-[10px] uppercase tracking-widest font-black">Responsável</th>
                          <th className="p-5 text-[10px] uppercase tracking-widest font-black">Localização</th>
                          <th className="p-5 text-[10px] uppercase tracking-widest font-black">Problema</th>
                          <th className="p-5 text-[10px] uppercase tracking-widest font-black">Observação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-accent/10">
                        {filteredOccurrences.slice(0, 10).map((occ) => (
                          <tr key={occ.id} className="hover:bg-accent/5 transition-colors group">
                            <td className="p-5 font-mono text-xs font-black text-white/40">{occ.number}</td>
                            <td className="p-5 text-sm text-white font-black">{occ.supervisor}</td>
                            <td className="p-5 flex flex-col items-start">
                              <div className="text-sm font-black text-white uppercase tracking-tight">{occ.farm}</div>
                              <div className="text-[10px] text-white/60 uppercase font-black tracking-widest">Talhão: {occ.plot}</div>
                            </td>
                            <td className="p-5">
                              <div className="text-sm font-black text-white uppercase tracking-tight">{occ.category}</div>
                              <div className="text-[10px] text-white/60 italic">{occ.subcategory}</div>
                            </td>
                            <td className="p-5 text-xs text-white/60 max-w-xs truncate font-medium">
                              {occ.observation}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden divide-y divide-accent/10">
                    {filteredOccurrences.slice(0, 5).map((occ) => (
                      <div key={occ.id} className="p-5 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono font-black text-white/40">Nº {occ.number}</span>
                          <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{occ.supervisor}</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-tight">{occ.category}</h4>
                          <p className="text-[10px] text-white/40 italic">{occ.subcategory}</p>
                        </div>
                        <div className="flex gap-4">
                          <div>
                            <p className="text-[8px] uppercase font-black text-white/40 tracking-widest">Fazenda</p>
                            <p className="text-[10px] font-black text-accent uppercase">{occ.farm}</p>
                          </div>
                          <div>
                            <p className="text-[8px] uppercase font-black text-white/40 tracking-widest">Talhão</p>
                            <p className="text-[10px] font-black text-accent uppercase">{occ.plot}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

          {selectedSupervisorDetail && (
            <motion.div
              key="supervisor-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-sidebar/40 backdrop-blur-xl border border-accent/10 rounded-3xl p-8 shadow-2xl"
            >
              <button 
                onClick={() => setSelectedSupervisorDetail(null)}
                className="mb-6 flex items-center gap-2 text-white/60 hover:text-white font-black uppercase text-[10px] tracking-widest transition-colors"
              >
                <ChevronRight className="rotate-180" size={16} /> Voltar ao Dashboard
              </button>
              
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-8">{selectedSupervisorDetail}</h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-accent/5 p-8 rounded-3xl border border-accent/10">
                  <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tighter italic">Distribuição por Categoria</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--color-sidebar)', border: '1px solid rgba(6,78,59,0.1)', borderRadius: '12px' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tighter italic">Ocorrências</h3>
                    <div className="grid gap-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      {filteredOccurrences.filter(o => o.supervisor === selectedSupervisorDetail).map(occ => (
                        <div key={occ.id} className="p-4 bg-sidebar rounded-2xl border border-accent/5 hover:border-accent/30 transition-all">
                          <p className="font-black text-white uppercase tracking-tight text-sm">Nº {occ.number} - {occ.category}</p>
                          <p className="text-xs text-white/60 italic mt-1">{occ.observation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tighter italic">Planos de Ação</h3>
                    <div className="grid gap-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                      {filteredActionPlans.filter(ap => ap.supervisor === selectedSupervisorDetail).map(ap => (
                        <div key={ap.id} className="p-4 bg-sidebar rounded-2xl border border-accent/5 hover:border-accent/30 transition-all">
                          <p className="font-black text-white uppercase tracking-tight text-sm">Ocorrência: {ap.occurrenceId}</p>
                          <p className="text-xs text-white/60 italic mt-1">{ap.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'occurrences' && (
            <motion.div 
              key="occurrences"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {filteredOccurrences.filter(o => !o.isCompleted).length === 0 ? (
                <div className="p-20 text-center bg-sidebar/40 backdrop-blur-xl border border-accent/10 rounded-3xl">
                  <AlertCircle size={48} className="mx-auto text-white/20 mb-4" />
                  <p className="text-white/40 font-black uppercase tracking-widest">Nenhuma ocorrência pendente encontrada</p>
                  <button 
                    onClick={resetFilters}
                    className="mt-4 text-accent hover:underline font-black uppercase tracking-widest text-xs"
                  >
                    Limpar Filtros
                  </button>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block bg-black/40 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#76b82a]/10 border-b border-white/5 text-white/80">
                            <th className="p-5 text-[10px] uppercase tracking-widest font-black">Id Ocorrência</th>
                            <th className="p-5 text-[10px] uppercase tracking-widest font-black">Responsável</th>
                            <th className="p-5 text-[10px] uppercase tracking-widest font-black">Data Criação</th>
                            <th className="p-5 text-[10px] uppercase tracking-widest font-black">Observação</th>
                            <th className="p-5 text-[10px] uppercase tracking-widest font-black">Status</th>
                            <th className="p-5 text-[10px] uppercase tracking-widest font-black">Fazenda</th>
                            <th className="p-5 text-[10px] uppercase tracking-widest font-black">Talhão</th>
                            <th className="p-5 text-[10px] uppercase tracking-widest font-black">Setor</th>
                            <th className="p-5 text-[10px] uppercase tracking-widest font-black text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredOccurrences.filter(o => !o.isCompleted).map((occ) => (
                            <tr key={occ.id} className="hover:bg-white/5 transition-colors group cursor-pointer">
                              <td className="p-5 font-mono text-sm font-black text-white/60">{occ.number}</td>
                              <td className="p-5 text-sm text-white font-black">{occ.supervisor}</td>
                              <td className="p-5 text-xs text-white/60 font-mono font-black">{formatDateSafe(occ.createdAt)}</td>
                              <td className="p-5 text-xs text-white/60 line-clamp-2 max-w-[200px]">{occ.observation || '-'}</td>
                              <td className="p-5">
                                <span className="text-[10px] px-2 py-1 bg-white/5 text-white/60 rounded-md font-black border border-white/10 uppercase tracking-widest whitespace-nowrap">
                                  {occ.actionPlanStatus || 'Pendente'}
                                </span>
                              </td>
                              <td className="p-5 text-sm font-black text-white uppercase tracking-tight">{occ.farm}</td>
                              <td className="p-5 text-sm font-black text-white uppercase tracking-tight">{occ.plot}</td>
                              <td className="p-5 text-sm font-black text-white uppercase tracking-tight">{occ.sector || '-'}</td>
                              <td className="p-5 text-right">
                                <button 
                                  onClick={() => setSelectedOccurrence(occ)}
                                  className="p-2 hover:bg-[#76b82a]/20 rounded-xl text-white/40 hover:text-white transition-all hover:scale-110"
                                >
                                  <Eye size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4">
                    {filteredOccurrences.filter(o => !o.isCompleted).map((occ) => (
                      <div 
                        key={occ.id} 
                        onClick={() => setSelectedOccurrence(occ)}
                        className="bg-white/5 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-4 hover:bg-white/10 transition-all active:scale-[0.98]"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-mono font-black text-white/40 uppercase tracking-widest">Nº {occ.number}</span>
                            <h4 className="text-sm font-black text-white uppercase tracking-tight">{occ.category}</h4>
                          </div>
                          <span className={`text-[8px] px-2 py-1 rounded-md font-black border uppercase tracking-widest whitespace-nowrap ${
                            occ.actionPlanStatus?.toLowerCase().includes('concluído') || occ.actionPlanStatus?.toLowerCase().includes('concluido')
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : occ.actionPlanStatus?.toLowerCase().includes('andamento')
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                : 'bg-white/5 text-white/40 border-white/10'
                          }`}>
                            {occ.actionPlanStatus || '-'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-[8px] uppercase font-black text-white/40 tracking-widest mb-0.5">Fazenda</p>
                            <p className="text-[10px] font-black text-accent uppercase">{occ.farm}</p>
                          </div>
                          <div>
                            <p className="text-[8px] uppercase font-black text-white/40 tracking-widest mb-0.5">Talhão</p>
                            <p className="text-[10px] font-black text-accent uppercase">{occ.plot}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-accent/5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
                              <User size={12} className="text-white" />
                            </div>
                            <span className="text-[9px] font-black text-white/60 uppercase tracking-tight">{occ.supervisor}</span>
                          </div>
                          <span className="text-[9px] font-mono font-black text-white/30">
                            {new Date(occ.createdAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'actionPlans' && (
            <motion.div 
              key="actionPlans"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {filteredActionPlans.filter(ap => !ap.isCompleted).length === 0 ? (
                <div className="p-20 text-center bg-sidebar/40 backdrop-blur-xl border border-accent/10 rounded-3xl">
                  <ClipboardList size={48} className="mx-auto text-white/20 mb-4" />
                  <p className="text-white/40 font-black uppercase tracking-widest">Nenhum plano de ação pendente encontrado</p>
                  <button 
                    onClick={resetFilters}
                    className="mt-4 text-accent hover:underline font-black uppercase tracking-widest text-xs"
                  >
                    Limpar Filtros
                  </button>
                </div>
              ) : (
                <>
                  <div className="hidden lg:block bg-black/40 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#76b82a]/10 border-b border-white/5 text-white/80">
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Dias_restantes</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Responsável</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Data Início</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Descrição</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Status</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Fazenda</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Talhão</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredActionPlans.filter(ap => !ap.isCompleted).map((ap) => {
                            const occ = occurrenceMap[ap.occurrenceId];
                            return (
                              <tr key={ap.id} className="hover:bg-white/5 transition-colors group cursor-pointer">
                                <td className="p-3 font-mono text-sm font-black text-white/60">{ap.rawData?.['Dias_restantes'] ?? ap.rawData?.['Dias restantes'] ?? ap.rawData?.['Prazo'] ?? (ap.endDate ? Math.ceil((new Date(ap.endDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)) : '-')}</td>
                                <td className="p-3 text-sm text-white font-black">{ap.supervisor || (occ?.supervisor || '-')}</td>
                                <td className="p-3 text-xs text-white/60 font-mono font-black">{formatDateSafe(ap.startDate)}</td>
                                <td className="p-3 text-xs text-white/60 line-clamp-2 max-w-[200px]">{ap.description}</td>
                                <td className="p-3">
                                  <span className="text-[10px] px-2 py-1 bg-amber-500/10 text-amber-500 rounded-md font-black border border-amber-500/20 uppercase tracking-widest whitespace-nowrap">
                                    Pendente
                                  </span>
                                </td>
                                <td className="p-3 text-sm font-black text-white uppercase tracking-tight">{ap.farm || occ?.farm || '-'}</td>
                                <td className="p-3 text-sm font-black text-white uppercase tracking-tight">{ap.plot || occ?.plot || '-'}</td>
                                <td className="p-3 text-right">
                                  <button 
                                    onClick={() => setSelectedOccurrence(occ)}
                                    className="p-2 hover:bg-[#76b82a]/20 rounded-xl text-white/40 hover:text-white transition-all hover:scale-110"
                                  >
                                    <Eye size={18} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="lg:hidden space-y-4">
                    {filteredActionPlans.filter(ap => !ap.isCompleted).map((ap) => {
                      const occ = occurrenceMap[ap.occurrenceId];
                      return (
                        <div key={ap.id} className="bg-white/5 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-4 hover:bg-white/10 transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-mono font-black text-white/40 uppercase tracking-widest">Dias_restantes: {ap.rawData?.['Dias_restantes'] ?? ap.rawData?.['Dias restantes'] ?? ap.rawData?.['Prazo'] ?? (ap.endDate ? Math.ceil((new Date(ap.endDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)) : '-')}</span>
                            <span className="text-[10px] px-2 py-1 bg-amber-500/10 text-amber-500 rounded-md font-black border border-amber-500/20 uppercase tracking-widest">Pendente</span>
                          </div>
                          <h4 className="text-sm font-black text-white uppercase tracking-tight mb-2">{ap.description}</h4>
                          <div className="flex justify-between text-[10px] font-black text-white/60 uppercase tracking-widest">
                            <span>{ap.farm || occ?.farm || '-'}</span>
                            <span>{ap.plot || occ?.plot || '-'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'completed' && (
            <motion.div 
              key="completed"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Completed Occurrences Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                  Ocorrências Concluídas
                </h3>
                {filteredOccurrences.filter(o => o.isCompleted).length === 0 ? (
                  <div className="p-10 text-center bg-sidebar/40 backdrop-blur-xl border border-accent/10 rounded-3xl">
                    <p className="text-white/40 font-black uppercase tracking-widest text-xs">Nenhuma ocorrência concluída encontrada</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOccurrences.filter(o => o.isCompleted).map((occ) => (
                      <div 
                        key={occ.id} 
                        onClick={() => setSelectedOccurrence(occ)}
                        className="bg-white/5 backdrop-blur-2xl border border-white/5 rounded-[1.5rem] p-5 shadow-lg hover:bg-white/10 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-mono font-black text-white/40 uppercase tracking-widest">Nº {occ.number}</span>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        </div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight mb-2">{occ.category}</h4>
                        <div className="flex justify-between items-center text-[9px] text-white/40 font-black uppercase tracking-widest">
                          <span>{occ.farm}</span>
                          <span>{formatDateSafe(occ.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed Action Plans Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                  Planos de Ação Concluídos
                </h3>
                {filteredActionPlans.filter(ap => ap.isCompleted).length === 0 ? (
                  <div className="p-10 text-center bg-sidebar/40 backdrop-blur-xl border border-accent/10 rounded-3xl">
                    <p className="text-white/40 font-black uppercase tracking-widest text-xs">Nenhum plano de ação concluído encontrado</p>
                  </div>
                ) : (
                  <div className="hidden lg:block bg-black/40 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#76b82a]/10 border-b border-white/5 text-white/80">
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Id Ocorrência</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Responsável</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Data Conclusão</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Descrição</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Status</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Fazenda</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Talhão</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black">Setor</th>
                            <th className="p-3 text-[10px] uppercase tracking-widest font-black text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredActionPlans.filter(ap => ap.isCompleted).map((ap) => {
                            const occ = occurrenceMap[ap.occurrenceId];
                            return (
                              <tr key={ap.id} className="hover:bg-white/5 transition-colors group cursor-pointer">
                                <td className="p-3 font-mono text-sm font-black text-white/60">{ap.occurrenceId}</td>
                                <td className="p-3 text-sm text-white font-black">{ap.supervisor || (occ?.supervisor || '-')}</td>
                                <td className="p-3 text-xs text-white/60 font-mono font-black">{formatDateSafe(ap.endDate)}</td>
                                <td className="p-3 text-xs text-white/60 line-clamp-2 max-w-[200px]">{ap.description}</td>
                                <td className="p-3">
                                  <span className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md font-black border border-emerald-500/20 uppercase tracking-widest whitespace-nowrap">
                                    Concluído
                                  </span>
                                </td>
                                <td className="p-3 text-sm font-black text-white uppercase tracking-tight">{ap.farm || occ?.farm || '-'}</td>
                                <td className="p-3 text-sm font-black text-white uppercase tracking-tight">{ap.plot || occ?.plot || '-'}</td>
                                <td className="p-3 text-sm font-black text-white uppercase tracking-tight">{occ?.sector || '-'}</td>
                                <td className="p-3 text-right">
                                  <button 
                                    onClick={() => setSelectedOccurrence(occ)}
                                    className="p-2 hover:bg-[#76b82a]/20 rounded-xl text-white/40 hover:text-white transition-all hover:scale-110"
                                  >
                                    <Eye size={18} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {selectedOccurrence && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-black border border-white/10 rounded-[2rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#76b82a] to-transparent opacity-50"></div>
              
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-8 flex items-center gap-3">
                <div className="w-2 h-8 bg-[#76b82a] rounded-full"></div>
                Detalhes da Ocorrência
              </h2>
              
              <div className="space-y-8 text-white/60">
                {/* Top Section: ID and Status */}
                <div className="grid grid-cols-2 gap-6 pb-6 border-b border-accent/10">
                  <div>
                    <span className="text-[10px] uppercase font-black text-white/40 tracking-widest block mb-1">ID Ocorrência</span>
                    <span className="text-xl font-black text-white uppercase tracking-tighter italic">{selectedOccurrence.number}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-white/40 tracking-widest block mb-1">Excluída / Ativa</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${selectedOccurrence.isCompleted ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                      <span className={`text-sm font-black uppercase tracking-tight ${selectedOccurrence.isCompleted ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {selectedOccurrence.isCompleted ? 'Concluída' : 'Ativa'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle Section: Main Info */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-[10px] uppercase font-black text-white/40 tracking-widest block mb-1">Unidade</span>
                    <span className="text-sm font-black text-white uppercase tracking-tight">{selectedOccurrence.unit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-white/40 tracking-widest block mb-1">Fazenda</span>
                    <span className="text-sm font-black text-white uppercase tracking-tight">{selectedOccurrence.farm}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-white/40 tracking-widest block mb-1">Talhão</span>
                    <span className="text-sm font-black text-white uppercase tracking-tight">{selectedOccurrence.plot}</span>
                  </div>
                  {selectedOccurrence.sector && (
                    <div>
                      <span className="text-[10px] uppercase font-black text-white/40 tracking-widest block mb-1">Setor</span>
                      <span className="text-sm font-black text-white uppercase tracking-tight">{selectedOccurrence.sector}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] uppercase font-black text-white/40 tracking-widest block mb-1">Criador</span>
                    <span className="text-sm font-black text-white uppercase tracking-tight">{selectedOccurrence.creator}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-white/40 tracking-widest block mb-1">Status Plano de Ação</span>
                    <span className={`text-[10px] px-2 py-1 rounded-md font-black border uppercase tracking-widest whitespace-nowrap inline-block ${
                      selectedOccurrence.actionPlanStatus?.toLowerCase().includes('concluído') || selectedOccurrence.actionPlanStatus?.toLowerCase().includes('concluido')
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : selectedOccurrence.actionPlanStatus?.toLowerCase().includes('andamento')
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : 'bg-white/5 text-white/40 border-white/10'
                    }`}>
                      {selectedOccurrence.actionPlanStatus || '-'}
                    </span>
                  </div>
                </div>

                {/* Bottom Section: Three Key Fields */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-accent/10">
                  <div>
                    <span className="text-[10px] uppercase font-black text-white/40 tracking-widest block mb-1">Responsável</span>
                    <span className="text-xs font-black text-white uppercase tracking-tight">{selectedOccurrence.supervisor}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-white/40 tracking-widest block mb-1">Criação</span>
                    <span className="text-xs font-black text-white uppercase tracking-tight">{formatDateSafe(selectedOccurrence.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-white/40 tracking-widest block mb-1">Conclusão</span>
                    <span className="text-xs font-black text-white uppercase tracking-tight">{formatDateSafe(selectedOccurrence.completedAt)}</span>
                  </div>
                </div>

                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[10px] uppercase font-black text-white/40 tracking-widest block mb-3">Observação</span>
                  <p className="text-sm text-white/80 italic leading-relaxed">{selectedOccurrence.observation || 'Sem observações.'}</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedOccurrence(null)}
                className="mt-10 w-full py-4 bg-[#76b82a] text-white rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-[#008000] transition-all shadow-xl active:scale-95"
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </main>
  </div>
);
}
