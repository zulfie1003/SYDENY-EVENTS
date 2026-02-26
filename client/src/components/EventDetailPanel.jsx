import { useState } from 'react';
import StatusBadge from './StatusBadge';
import { adminAPI } from '../services/api';

function formatDate(d) {
  if (!d) return 'Not specified';
  return new Date(d).toLocaleString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function EventDetailPanel({ event, onClose, onUpdate }) {
  const [importNotes, setImportNotes] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    setError('');
    setImporting(true);
    try {
      const { data } = await adminAPI.importEvent(event._id, { importNotes });
      onUpdate(data.event);
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const { data } = await adminAPI.updateStatus(event._id, newStatus);
      onUpdate(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Status update failed');
    }
  };

  const placeholderImage = `https://picsum.photos/seed/${event._id}/600/300`;

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 flex-shrink-0">
        <h3 className="font-display font-semibold text-white text-sm truncate pr-4">{event.title}</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Image */}
        <div className="h-44 bg-slate-800 overflow-hidden">
          <img
            src={event.imageUrl || placeholderImage}
            alt={event.title}
            className="w-full h-full object-cover"
            onError={e => { e.target.src = placeholderImage; }}
          />
        </div>

        <div className="p-4 space-y-4">
          {/* Status & Actions */}
          <div className="flex items-center justify-between">
            <StatusBadge status={event.status} />
            <select
              value={event.status}
              onChange={e => handleStatusChange(e.target.value)}
              className="input-field text-xs py-1"
            >
              <option value="new">new</option>
              <option value="updated">updated</option>
              <option value="inactive">inactive</option>
              <option value="imported">imported</option>
            </select>
          </div>

          {/* Details */}
          <div className="space-y-3 text-sm">
            {event.dateTime && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Date & Time</p>
                <p className="text-slate-200">{formatDate(event.dateTime)}</p>
              </div>
            )}
            {event.venueName && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Venue</p>
                <p className="text-slate-200">{event.venueName}</p>
              </div>
            )}
            {event.address && event.address !== event.venueName && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Address</p>
                <p className="text-slate-200">{event.address}</p>
              </div>
            )}
            {event.category && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Category</p>
                <p className="text-slate-200">{event.category}</p>
              </div>
            )}
            {event.description && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Description</p>
                <p className="text-slate-300 text-xs leading-relaxed line-clamp-4">{event.description}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Source</p>
              <p className="text-slate-400 text-xs">{event.sourceName}</p>
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-harbour-400 text-xs hover:underline truncate block"
              >
                View source →
              </a>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Last Scraped</p>
              <p className="text-slate-400 text-xs font-mono">
                {event.lastScrapedAt ? new Date(event.lastScrapedAt).toLocaleString('en-AU') : 'N/A'}
              </p>
            </div>

            {event.status === 'imported' && (
              <div className="bg-harbour-500/10 border border-harbour-500/20 rounded-lg p-3 space-y-1">
                <p className="text-xs text-harbour-400 font-semibold">Imported</p>
                {event.importedBy && (
                  <p className="text-xs text-slate-400">by {event.importedBy.name}</p>
                )}
                {event.importedAt && (
                  <p className="text-xs text-slate-500 font-mono">{new Date(event.importedAt).toLocaleString('en-AU')}</p>
                )}
                {event.importNotes && (
                  <p className="text-xs text-slate-400 italic">"{event.importNotes}"</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import action */}
      {event.status !== 'imported' && (
        <div className="p-4 border-t border-slate-800 flex-shrink-0 space-y-3">
          <textarea
            value={importNotes}
            onChange={e => setImportNotes(e.target.value)}
            placeholder="Import notes (optional)..."
            className="input-field w-full text-xs resize-none h-16"
          />
          {error && <p className="text-coral-400 text-xs">{error}</p>}
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full btn-primary text-sm flex items-center justify-center gap-2"
          >
            {importing ? (
              <><span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" /> Importing...</>
            ) : (
              <>Import to Platform</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
