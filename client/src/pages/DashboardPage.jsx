import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { adminAPI } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import EventDetailPanel from '../components/EventDetailPanel';

const STATUSES = ['', 'new', 'updated', 'inactive', 'imported'];

function StatCard({ label, value, color }) {
  return (
    <div className={`glass-card rounded-xl p-4 border-l-2 ${color}`}>
      <p className="text-xs text-slate-500 font-mono uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-display font-bold text-white">{value ?? '–'}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState(null);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [city, setCity] = useState('Sydney');
  const [page, setPage] = useState(1);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getEvents({
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
        city: city || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setEvents(data.events);
      setPagination(data.pagination);
      setStatusCounts(data.statusCounts || {});
    } catch (err) {
      console.error('Fetch events error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, city, dateFrom, dateTo]);

  const fetchStats = async () => {
    try {
      const { data } = await adminAPI.getStats();
      setStats(data);
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchStats(); }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleTriggerScrape = async () => {
    setScraping(true);
    try {
      await adminAPI.triggerScrape();
      setTimeout(() => {
        fetchEvents();
        fetchStats();
        setScraping(false);
      }, 5000);
    } catch (err) {
      console.error(err);
      setScraping(false);
    }
  };

  const handleEventUpdate = (updated) => {
    setEvents(prev => prev.map(e => e._id === updated._id ? updated : e));
    setSelectedEvent(updated);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-harbour-500 to-coral-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">SE</div>
            <span className="font-display font-bold text-white hidden sm:block">Sydney <span className="text-harbour-400">Events</span></span>
          </Link>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400 text-sm">Admin Dashboard</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerScrape}
            disabled={scraping}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
          >
            <svg className={`w-3.5 h-3.5 ${scraping ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {scraping ? 'Scraping...' : 'Scrape Now'}
          </button>
          <div className="flex items-center gap-2">
            {user?.avatar && <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full" />}
            <span className="text-xs text-slate-500 hidden sm:block">{user?.name}</span>
            <button onClick={logout} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Sign out</button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        <div className={`flex-1 overflow-auto flex flex-col ${selectedEvent ? 'hidden lg:flex' : ''}`}>
          <div className="p-4 sm:p-6 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              <StatCard label="New" value={statusCounts.new} color="border-emerald-500" />
              <StatCard label="Updated" value={statusCounts.updated} color="border-amber-500" />
              <StatCard label="Inactive" value={statusCounts.inactive} color="border-slate-500" />
              <StatCard label="Imported" value={statusCounts.imported} color="border-harbour-500" />
              <StatCard label="Email Subs" value={stats?.totalEmails} color="border-coral-500" />
            </div>

            {/* Filters */}
            <div className="glass-card rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search title, venue..."
                    className="input-field w-full pl-8 text-xs"
                  />
                </div>

                <select
                  value={status}
                  onChange={e => { setStatus(e.target.value); setPage(1); }}
                  className="input-field text-xs"
                >
                  <option value="">All Statuses</option>
                  {STATUSES.filter(Boolean).map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                  className="input-field text-xs"
                  placeholder="From date"
                />

                <input
                  type="date"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setPage(1); }}
                  className="input-field text-xs"
                  placeholder="To date"
                />
              </div>
            </div>

            {/* Table */}
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left">
                      <th className="px-4 py-3 text-xs font-mono text-slate-500 uppercase tracking-wider">Event</th>
                      <th className="px-4 py-3 text-xs font-mono text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                      <th className="px-4 py-3 text-xs font-mono text-slate-500 uppercase tracking-wider hidden md:table-cell">Venue</th>
                      <th className="px-4 py-3 text-xs font-mono text-slate-500 uppercase tracking-wider hidden lg:table-cell">Source</th>
                      <th className="px-4 py-3 text-xs font-mono text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-xs font-mono text-slate-500 uppercase tracking-wider hidden sm:table-cell">Scraped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      [...Array(8)].map((_, i) => (
                        <tr key={i} className="border-b border-slate-800/50">
                          {[...Array(6)].map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-4 bg-slate-800 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : events.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                          No events found matching your filters
                        </td>
                      </tr>
                    ) : (
                      events.map(event => (
                        <tr
                          key={event._id}
                          onClick={() => setSelectedEvent(event)}
                          className={`border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors ${
                            selectedEvent?._id === event._id ? 'bg-harbour-950/30' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {event.imageUrl && (
                                <img
                                  src={event.imageUrl}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover flex-shrink-0 hidden sm:block"
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                              )}
                              <span className="text-slate-200 font-medium text-xs line-clamp-2 max-w-[200px]">
                                {event.title}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 hidden sm:table-cell whitespace-nowrap">
                            {formatDate(event.dateTime)}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell max-w-[150px] truncate">
                            {event.venueName || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">
                            {event.sourceName}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={event.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 font-mono hidden sm:table-cell whitespace-nowrap">
                            {event.lastScrapedAt ? new Date(event.lastScrapedAt).toLocaleDateString('en-AU') : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
                  <p className="text-xs text-slate-500">
                    {pagination.total} total · Page {page} of {pagination.pages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="text-xs btn-ghost py-1.5 px-3 disabled:opacity-40"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                      disabled={page === pagination.pages}
                      className="text-xs btn-ghost py-1.5 px-3 disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sources breakdown */}
            {stats?.sources?.length > 0 && (
              <div className="glass-card rounded-xl p-4">
                <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">Events by Source</p>
                <div className="space-y-2">
                  {stats.sources.map(s => (
                    <div key={s._id} className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">{s._id}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-harbour-500 rounded-full"
                            style={{ width: `${Math.min(100, (s.count / (stats.sources[0]?.count || 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 font-mono w-8 text-right">{s.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedEvent && (
          <div className="w-full lg:w-96 flex-shrink-0 h-full overflow-hidden">
            <EventDetailPanel
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
              onUpdate={handleEventUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
