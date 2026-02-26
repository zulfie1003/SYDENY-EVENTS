import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import EventCard from '../components/EventCard';
import { eventsAPI } from '../services/api';

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const CATEGORIES = ['Music', 'Arts & Culture', 'Food & Drink', 'Sport', 'Family', 'Arts & Theatre', 'Tourism', 'General'];

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await eventsAPI.getAll({
        page,
        limit: 12,
        search: search || undefined,
        category: category || undefined,
        city: 'Sydney',
      });
      setEvents(data.events);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <header className="relative overflow-hidden py-20 px-4 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-harbour-950/40 to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-harbour-500/10 border border-harbour-500/20 rounded-full px-4 py-1.5 text-xs font-mono text-harbour-400 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-harbour-400 animate-pulse" />
            Live events updated hourly
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-black text-white mb-4 leading-tight">
            What's on in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-harbour-400 to-coral-400">
              Sydney
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Discover the best concerts, festivals, art shows, and more — aggregated from Sydney's top event platforms.
          </p>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="glass-card rounded-xl p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search events, venues..."
              className="input-field w-full pl-9"
            />
          </div>

          <select
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="input-field sm:w-48"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl h-72 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">No events found</p>
            <p className="text-slate-600 text-sm mt-1">Try adjusting your search or check back later</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-slate-500 text-sm">
                <span className="text-white font-medium">{pagination?.total || 0}</span> events found
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {events.map(event => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-slate-400 text-sm font-mono">
                  {page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-8 text-center">
        <p className="text-slate-600 text-xs font-mono">
          Sydney Events Platform · Events scraped from public sources · Not affiliated with any venue
        </p>
      </footer>
    </div>
  );
}
