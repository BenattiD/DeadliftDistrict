import React, { useState, useEffect, useMemo } from 'react';
import { databases, account, APPWRITE_DATABASE_ID, APPWRITE_COLLECTION_ID } from '../lib/appwrite';
import { Workout, SortField, SortConfig, UserProfile } from '../types';
import { Query } from 'appwrite';
import { 
  Dumbbell, 
  LogOut, 
  Search, 
  ArrowUpDown, 
  TrendingUp, 
  Award,
  Clock, 
  Calendar, 
  User, 
  ChevronUp, 
  ChevronDown, 
  Loader2, 
  AlertCircle, 
  RefreshCw,
  SlidersHorizontal,
  Info
} from 'lucide-react';

interface DashboardViewProps {
  user: UserProfile;
  onLogout: () => void;
}

export default function DashboardView({ user, onLogout }: DashboardViewProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'date',
    order: 'desc'
  });
  const [expandedWorkouts, setExpandedWorkouts] = useState<Record<string, boolean>>({});

  // Spotlight state
  const [spotlightWorkout, setSpotlightWorkout] = useState<Workout | null>(null);
  const [isSpotlightExpanded, setIsSpotlightExpanded] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedWorkouts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const selectRandomSpotlight = (list: Workout[]) => {
    if (list.length === 0) {
      setSpotlightWorkout(null);
      return;
    }
    const randomIndex = Math.floor(Math.random() * list.length);
    setSpotlightWorkout(list[randomIndex]);
    setIsSpotlightExpanded(true);
  };

  const handleNextSpotlight = () => {
    if (workouts.length <= 1) return;
    let nextWorkout = spotlightWorkout;
    // Attempt up to 20 times to pick a different one
    let attempts = 0;
    while ((!nextWorkout || nextWorkout.$id === spotlightWorkout?.$id) && attempts < 20) {
      const idx = Math.floor(Math.random() * workouts.length);
      nextWorkout = workouts[idx];
      attempts++;
    }
    setSpotlightWorkout(nextWorkout);
    setIsSpotlightExpanded(true);
  };

  // Fetch data on mount
  const fetchWorkouts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Query the Appwrite database using databases.listDocuments()
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        APPWRITE_COLLECTION_ID,
        [Query.limit(100)]
      );
      
      const documents = response.documents.map((doc: any) => ({
        $id: doc.$id,
        $createdAt: doc.$createdAt,
        $updatedAt: doc.$updatedAt,
        name: doc.name || '',
        description: doc.description || '',
        duration: doc.duration !== undefined ? doc.duration : '',
        creator: doc.creator || '',
        date: doc.date || ''
      }));

      setWorkouts(documents);
      selectRandomSpotlight(documents);
    } catch (err: any) {
      console.error('Appwrite database error:', err);
      setError(
        err?.message || 
        'Could not fetch workouts from Appwrite. Ensure your collection attributes (name, description, duration, creator, date) exist and permissions are set.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const expandAll = () => {
    const newExpanded: Record<string, boolean> = {};
    formattedAndFilteredWorkouts.forEach((w, index) => {
      newExpanded[w.$id || String(index)] = true;
    });
    setExpandedWorkouts(newExpanded);
  };

  const collapseAll = () => {
    setExpandedWorkouts({});
  };

  const handleLogout = async () => {
    try {
      // terminate session via account.deleteSession()
      await account.deleteSession('current');
      onLogout();
    } catch (err: any) {
      console.error('Logout error:', err);
      // Fallback in case there is some connection glitch
      onLogout();
    }
  };

  // Sort and filter logic
  const handleSort = (field: SortField) => {
    let order: 'asc' | 'desc' = 'asc';
    if (sortConfig.field === field && sortConfig.order === 'asc') {
      order = 'desc';
    }
    setSortConfig({ field, order });
  };

  const formattedAndFilteredWorkouts = useMemo(() => {
    // 1. Text filter across any of the text-based columns
    let result = workouts.filter((workout) => {
      const searchLower = searchTerm.toLowerCase();
      if (!searchLower) return true;

      const nameMatch = workout.name?.toLowerCase().includes(searchLower);
      const descMatch = workout.description?.toLowerCase().includes(searchLower);
      const creatorMatch = workout.creator?.toLowerCase().includes(searchLower);
      const dateMatch = workout.date?.toLowerCase().includes(searchLower);
      const durationMatch = String(workout.duration)?.toLowerCase().includes(searchLower);

      return nameMatch || descMatch || creatorMatch || dateMatch || durationMatch;
    });

    // 2. Client-side Sort implementation
    result.sort((a, b) => {
      let aVal = a[sortConfig.field];
      let bVal = b[sortConfig.field];

      if (sortConfig.field === 'duration') {
        const parseDuration = (val: string | number): number => {
          if (typeof val === 'number') return val;
          const num = parseInt(val, 10);
          return isNaN(num) ? 0 : num;
        };
        const numA = parseDuration(aVal);
        const numB = parseDuration(bVal);
        return sortConfig.order === 'asc' ? numA - numB : numB - numA;
      }

      // Safe date comparisons
      if (sortConfig.field === 'date') {
        const timeA = aVal ? new Date(aVal).getTime() : 0;
        const timeB = bVal ? new Date(bVal).getTime() : 0;
        return sortConfig.order === 'asc' ? timeA - timeB : timeB - timeA;
      }

      // Default string fallback sorting
      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();

      if (aStr < bStr) return sortConfig.order === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [workouts, searchTerm, sortConfig]);

  // Derived summaries for user visualization
  const totalDuration = useMemo(() => {
    return workouts.reduce((sum, item) => {
      const durationNum = typeof item.duration === 'number' 
        ? item.duration 
        : parseInt(item.duration, 10);
      return sum + (isNaN(durationNum) ? 0 : durationNum);
    }, 0);
  }, [workouts]);

  const uniqueCreatorsCount = useMemo(() => {
    const creators = workouts.map(item => item.creator).filter(Boolean);
    return new Set(creators).size;
  }, [workouts]);

  // Utility formatters
  const formatDate = (val: string) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return val;
    }
  };

  const formatDurationValue = (val: string | number) => {
    if (val === undefined || val === '') return '—';
    if (typeof val === 'number') return `${val} mins`;
    if (/^\d+$/.test(val)) return `${val} mins`;
    return val;
  };

  return (
    <div id="workout-dashboard-wrapper" className="min-h-screen bg-zinc-950 font-sans text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Top Banner Navigation */}
      <header id="dashboard-header" className="sticky top-0 z-40 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div id="header-logo" className="p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-zinc-100 tracking-tight leading-none">
                Workout Tracker
              </h1>
              <p className="text-xs text-zinc-400 mt-1">
                Appwrite-Synchronized Client Database
              </p>
            </div>
          </div>

          <div id="user-controls" className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end text-sm">
              <span id="user-display-name" className="font-semibold text-zinc-200">
                {user.name || 'Athlete'}
              </span>
              <span id="user-display-email" className="text-xs text-zinc-400 font-mono">
                {user.email}
              </span>
            </div>
            
            <div id="user-badge" className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-black border border-emerald-400/20 shadow-md">
              {(user.name || user.email || 'A').charAt(0).toUpperCase()}
            </div>

            <button
              id="logout-button"
              onClick={handleLogout}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded-xl border border-zinc-700 transition-all text-zinc-300 flex items-center gap-2 text-sm font-medium cursor-pointer"
              title="Terminate Session"
            >
              <LogOut className="w-4 h-4 text-zinc-400" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Spotlight Card */}
        {!loading && !error && spotlightWorkout && (
          <div id="spotlight-section" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 font-display bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
                  ⚡ Workout Spotlight
                </span>
                <span className="text-xs text-zinc-400 hidden sm:inline">Random Spotlit Entry</span>
              </div>
              <button
                id="spotlight-refresh-button"
                onClick={handleNextSpotlight}
                disabled={workouts.length <= 1}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 text-zinc-300 hover:text-emerald-400 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Shuffle spotlight
              </button>
            </div>

            <div 
              id="workout-spotlight-card"
              className="bg-zinc-90 w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] flex flex-col group/card"
            >
              {/* Header Strip: name + duration */}
              <div id="workout-spotlight-card-header" className="bg-zinc-950/60 px-4 py-3.5 border-b border-zinc-850 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 max-w-[65%]">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 animate-pulse"></span>
                  <h4 className="font-bold font-display text-zinc-100 truncate text-sm" title={spotlightWorkout.name}>
                    {spotlightWorkout.name || 'Untitled workout'}
                  </h4>
                </div>
                <div className="text-xs font-mono text-zinc-300 flex items-center gap-1.5 shrink-0 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800">
                  <Clock className="w-3.5 h-3.5 text-emerald-500/60" />
                  <span>{formatDurationValue(spotlightWorkout.duration)}</span>
                </div>
              </div>

              {/* Body: description (4-line preview) */}
              <div id="workout-spotlight-card-body" className="p-4 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 font-display">
                  Exercises / Remarks
                </div>
                <div className="relative">
                  <p className={`text-sm text-zinc-350 leading-relaxed whitespace-pre-wrap break-words ${isSpotlightExpanded ? '' : 'line-clamp-4'}`}>
                    {spotlightWorkout.description || <span className="text-zinc-550 italic text-xs">No description or exercises provided</span>}
                  </p>
                  {spotlightWorkout.description && (spotlightWorkout.description.length > 40 || spotlightWorkout.description.includes('\n') || spotlightWorkout.description.split('\n').length > 4) && (
                    <button
                      id="workout-spotlight-card-toggle"
                      onClick={() => setIsSpotlightExpanded(!isSpotlightExpanded)}
                      className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer select-none"
                    >
                      {isSpotlightExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5 inline" /> Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 inline" /> Expand
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Footer bar: date + creator */}
              <div id="workout-spotlight-card-footer" className="bg-zinc-950/40 px-4 py-3 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                <div className="flex items-center gap-1.5 truncate max-w-[50%]">
                  <div className="w-5 h-5 rounded-md bg-zinc-850 border border-zinc-750 flex items-center justify-center text-[9px] font-bold text-zinc-500 shrink-0">
                    {(spotlightWorkout.creator || 'A').charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate text-zinc-300" title={spotlightWorkout.creator}>
                    {spotlightWorkout.creator || 'Anonymous'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-zinc-450">
                  <Calendar className="w-3.5 h-3.5 text-zinc-550 shrink-0" />
                  <span>{formatDate(spotlightWorkout.date)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Database Connection / Load Issues */}
        {error && (
          <div id="data-error-panel" className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-6 text-amber-200">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 shrink-0 text-amber-400 mt-0.5" />
              <div className="flex-1 space-y-2">
                <h3 className="font-bold font-display text-lg">Appwrite Database Notice</h3>
                <p className="text-sm leading-relaxed text-amber-350">
                  {error}
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={fetchWorkouts}
                    className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Loading DB
                  </button>
                  <div className="text-xs text-zinc-400 flex items-center gap-1.5 bg-zinc-900/60 px-3 py-2 rounded-xl">
                    <Info className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="font-mono">DBID: {APPWRITE_DATABASE_ID.slice(0, 8)}... | COLLID: {APPWRITE_COLLECTION_ID.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Workspace Frame */}
        <div id="table-container" className="bg-zinc-90 w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl shrink-0 p-6 shadow-xl space-y-6">
          
          {/* Controls Bar above table */}
          <div id="controls-bar" className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">
            
            {/* Realtime Search Bar input */}
            <div id="search-wrapper" className="relative flex-1 max-w-md">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                <Search className="w-5 h-5" />
              </span>
              <input
                id="global-search-input"
                type="text"
                placeholder="Filter sessions by name, exercises, creator or time..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-955 border border-zinc-800 bg-zinc-950 text-zinc-200 pl-12 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded-md transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Actions Bar above table */}
            <div className="flex flex-wrap items-center gap-3 justify-between xl:justify-end shrink-0">
              
              {/* Expand / Collapse All description controls */}
              <div id="expand-collapse-all-controls" className="flex items-center gap-1 bg-zinc-950 p-1 border border-zinc-850 rounded-xl">
                <button
                  id="btn-expand-all"
                  onClick={expandAll}
                  className="px-3 py-1.5 hover:bg-zinc-900 active:bg-zinc-950 rounded-lg text-xs font-semibold text-zinc-300 hover:text-emerald-400 transition-all flex items-center gap-1 cursor-pointer select-none"
                  title="Expand all workout exercise descriptions"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  Expand all
                </button>
                <div className="h-4 w-[1px] bg-zinc-800"></div>
                <button
                  id="btn-collapse-all"
                  onClick={collapseAll}
                  className="px-3 py-1.5 hover:bg-zinc-900 active:bg-zinc-950 rounded-lg text-xs font-semibold text-zinc-300 hover:text-emerald-400 transition-all flex items-center gap-1 cursor-pointer select-none"
                  title="Collapse all workout exercise descriptions"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  Collapse all
                </button>
              </div>

              {/* Display Stats Counter */}
              <div className="text-xs text-zinc-400 bg-zinc-950 px-3.5 py-2.5 border border-zinc-850 rounded-xl font-mono flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-550" />
                <span>Showing {formattedAndFilteredWorkouts.length} of {workouts.length} total entries</span>
              </div>

              <button
                id="refresh-button"
                onClick={fetchWorkouts}
                title="Refresh Cache"
                disabled={loading}
                className="p-2.5 bg-zinc-800 hover:bg-zinc-750 active:bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 hover:text-emerald-400 transition-all cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>

          </div>

          {/* Skeletons / Document Table */}
          {loading ? (
            <div id="workout-skeleton-state" className="space-y-4 py-8">
              <div className="flex items-center justify-center gap-3 text-zinc-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-sm font-medium tracking-wide">Syncing with Appwrite Server...</span>
              </div>
              <div className="w-full space-y-3 pt-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex space-x-4 bg-zinc-950/40 p-4 border border-zinc-900 rounded-xl">
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-zinc-800 rounded-md w-3/4"></div>
                      <div className="h-3 bg-zinc-850/80 rounded-md w-1/2"></div>
                    </div>
                    <div className="space-y-2 py-1 w-24">
                      <div className="h-3 bg-zinc-800 rounded-md w-full"></div>
                      <div className="h-3 bg-zinc-800 rounded-md w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : workouts.length === 0 ? (
            /* Database is empty / Seed instruction empty state */
            <div id="empty-state-card" className="border border-dashed border-zinc-800 bg-zinc-950/30 rounded-2xl py-16 px-4 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-zinc-900 border border-zinc-800/80 text-zinc-500 rounded-full mb-4">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold font-display text-zinc-200">No workout sessions found</h4>
              <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
                We successfully authenticated with Appwrite, but your workouts collection is currently empty or has attributes mismatched. Seed entries in your Appwrite console schema.
              </p>
              <div className="mt-6 flex flex-col items-center gap-1.5 font-mono text-xs text-zinc-500 bg-zinc-900 px-4 py-2.5 rounded-xl border border-zinc-850">
                <span>Database Instance ID: {APPWRITE_DATABASE_ID}</span>
                <span>Collection ID: {APPWRITE_COLLECTION_ID}</span>
              </div>
            </div>
          ) : formattedAndFilteredWorkouts.length === 0 ? (
            /* Search yielded no results view */
            <div id="no-search-results" className="border border-zinc-800 bg-zinc-950/20 rounded-2xl py-12 px-4 flex flex-col items-center justify-center text-center">
              <span className="text-zinc-600 text-lg mb-2 mb-3">🔍</span>
              <h4 className="text-md font-semibold text-zinc-300">No matching search results</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                No sessions match "{searchTerm}". Try checking your spelling or adjusting filters to wider ranges.
              </p>
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold rounded-lg text-zinc-300 border border-zinc-700 transition"
              >
                Clear Search Query
              </button>
            </div>
          ) : (
            /* Full Interactive Workouts Data Table (desktop/tablet) and Mobile card-based layout */
            <div id="workouts-display-container" className="space-y-6">
              {/* Desktop Table View - visible on md and up */}
              <div id="workout-table-overflow" className="hidden md:block overflow-x-auto rounded-xl border border-zinc-850">
                <table id="workout-data-table" className="w-full border-collapse text-left text-sm text-zinc-300">
                  <thead className="bg-zinc-950/80 border-b border-zinc-850 text-xs font-semibold uppercase tracking-wider text-zinc-400 font-display">
                    <tr>
                      <th 
                        onClick={() => handleSort('name')} 
                        className="px-6 py-4 cursor-pointer hover:bg-zinc-900/60 transition-colors select-none group"
                      >
                        <div className="flex items-center gap-2">
                          <span>Workout Name</span>
                          {sortConfig.field === 'name' ? (
                            sortConfig.order === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-450 transition-colors" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('description')} 
                        className="px-6 py-4 cursor-pointer hover:bg-zinc-900/60 transition-colors select-none group"
                      >
                        <div className="flex items-center gap-2">
                          <span>Exercises / Description</span>
                          {sortConfig.field === 'description' ? (
                            sortConfig.order === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-450 transition-colors" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('duration')} 
                        className="px-6 py-4 cursor-pointer hover:bg-zinc-900/60 transition-colors select-none group w-40"
                      >
                        <div className="flex items-center gap-2">
                          <span>Duration</span>
                          {sortConfig.field === 'duration' ? (
                            sortConfig.order === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-450 transition-colors" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('creator')} 
                        className="px-6 py-4 cursor-pointer hover:bg-zinc-900/60 transition-colors select-none group w-44"
                      >
                        <div className="flex items-center gap-2">
                          <span>Creator</span>
                          {sortConfig.field === 'creator' ? (
                            sortConfig.order === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-450 transition-colors" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('date')} 
                        className="px-6 py-4 cursor-pointer hover:bg-zinc-900/60 transition-colors select-none group w-48"
                      >
                        <div className="flex items-center gap-2">
                          <span>Date Conducted</span>
                          {sortConfig.field === 'date' ? (
                            sortConfig.order === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-450 transition-colors" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 bg-zinc-900/10">
                    {formattedAndFilteredWorkouts.map((workout, index) => (
                      <tr 
                        key={workout.$id || index}
                        className="hover:bg-zinc-850/40 transition-colors text-zinc-200"
                      >
                        {/* Column 1: Name */}
                        <td className="px-6 py-4.5 font-medium text-zinc-100 max-w-xs truncate">
                          <div className="flex items-center gap-2.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                            <span title={workout.name}>{workout.name || 'Untitled workout'}</span>
                          </div>
                        </td>

                        {/* Column 2: Description */}
                        <td className="px-6 py-4.5 text-sm text-zinc-330 leading-relaxed max-w-md">
                          <div className="relative">
                            <p className={expandedWorkouts[workout.$id || String(index)] ? "whitespace-pre-wrap break-words" : "line-clamp-4 whitespace-pre-wrap break-words"}>
                              {workout.description || <span className="text-zinc-500 italic">No exercises added</span>}
                            </p>
                            {workout.description && (workout.description.length > 40 || workout.description.includes('\n') || workout.description.split('\n').length > 4) && (
                              <button
                                onClick={() => toggleExpand(workout.$id || String(index))}
                                className="mt-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer select-none"
                              >
                                {expandedWorkouts[workout.$id || String(index)] ? (
                                  <>
                                    <ChevronUp className="w-3.5 h-3.5 inline" /> Collapse description
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3.5 h-3.5 inline" /> Expand description
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Column 3: Duration */}
                        <td className="px-6 py-4.5 text-sm font-mono text-zinc-300">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-500/60 shrink-0" />
                            <span>{formatDurationValue(workout.duration)}</span>
                          </div>
                        </td>

                        {/* Column 4: Creator */}
                        <td className="px-6 py-4.5 text-sm max-w-[150px] truncate">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
                              {(workout.creator || 'A').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-zinc-300 font-medium" title={workout.creator}>
                              {workout.creator || 'Anonymous'}
                            </span>
                          </div>
                        </td>

                        {/* Column 5: Date */}
                        <td className="px-6 py-4.5 text-sm font-mono text-zinc-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-emerald-500/60 shrink-0" />
                            <span>{formatDate(workout.date)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card-Based View - visible on screens smaller than md */}
              <div id="workout-mobile-cards" className="block md:hidden space-y-4">
                {formattedAndFilteredWorkouts.map((workout, index) => {
                  const isExpanded = expandedWorkouts[workout.$id || String(index)];
                  const uniqueCardId = `workout-card-${workout.$id || index}`;
                  return (
                    <div 
                      key={workout.$id || index}
                      id={uniqueCardId}
                      className="bg-zinc-90 w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] flex flex-col group/card"
                    >
                      {/* Header Strip: name + duration */}
                      <div id={`${uniqueCardId}-header`} className="bg-zinc-950/60 px-4 py-3.5 border-b border-zinc-850 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 max-w-[65%]">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 animate-pulse"></span>
                          <h4 className="font-bold font-display text-zinc-100 truncate text-sm" title={workout.name}>
                            {workout.name || 'Untitled workout'}
                          </h4>
                        </div>
                        <div className="text-xs font-mono text-zinc-300 flex items-center gap-1.5 shrink-0 bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800">
                          <Clock className="w-3.5 h-3.5 text-emerald-500/60" />
                          <span>{formatDurationValue(workout.duration)}</span>
                        </div>
                      </div>

                      {/* Body: description (4-line preview) */}
                      <div id={`${uniqueCardId}-body`} className="p-4 flex-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5 font-display">
                          Exercises / Remarks
                        </div>
                        <div className="relative">
                          <p className={`text-sm text-zinc-350 leading-relaxed whitespace-pre-wrap break-words ${isExpanded ? '' : 'line-clamp-4'}`}>
                            {workout.description || <span className="text-zinc-550 italic text-xs">No description or exercises provided</span>}
                          </p>
                          {workout.description && (workout.description.length > 40 || workout.description.includes('\n') || workout.description.split('\n').length > 4) && (
                            <button
                              id={`${uniqueCardId}-toggle`}
                              onClick={() => toggleExpand(workout.$id || String(index))}
                              className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer select-none"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-3.5 h-3.5 inline" /> Collapse
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5 inline" /> Expand
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Footer bar: date + creator */}
                      <div id={`${uniqueCardId}-footer`} className="bg-zinc-950/40 px-4 py-3 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                        <div className="flex items-center gap-1.5 truncate max-w-[50%]">
                          <div className="w-5 h-5 rounded-md bg-zinc-850 border border-zinc-750 flex items-center justify-center text-[9px] font-bold text-zinc-500 shrink-0">
                            {(workout.creator || 'A').charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate text-zinc-300" title={workout.creator}>
                            {workout.creator || 'Anonymous'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-zinc-450">
                          <Calendar className="w-3.5 h-3.5 text-zinc-550 shrink-0" />
                          <span>{formatDate(workout.date)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </main>

      {/* Humble credit and platform markers */}
      <footer className="py-6 mt-auto border-t border-zinc-900 bg-zinc-950/60 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Workout Dashboard. Connected directly with Appwrite Cloud SDK.</p>
          <p className="font-mono bg-zinc-900 py-1.5 px-3 rounded-lg border border-zinc-850">
            FRA Cloud Service Ingress Active
          </p>
        </div>
      </footer>
    </div>
  );
}
