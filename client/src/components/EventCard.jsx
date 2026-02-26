import { useState } from 'react';
import StatusBadge from './StatusBadge';
import EmailModal from './EmailModal';

function formatDate(dateTime) {
  if (!dateTime) return 'Date TBA';
  const d = new Date(dateTime);
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EventCard({ event }) {
  const [showModal, setShowModal] = useState(false);

  const placeholderImage = `https://picsum.photos/seed/${event._id}/400/200`;

  return (
    <>
      <article className="glass-card rounded-xl overflow-hidden hover:border-slate-700 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-harbour-950/50 group animate-fade-in flex flex-col">
        {/* Image */}
        <div className="relative h-44 overflow-hidden bg-slate-800">
          <img
            src={event.imageUrl || placeholderImage}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => { e.target.src = placeholderImage; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          <div className="absolute top-3 left-3">
            <StatusBadge status={event.status} />
          </div>
          {event.category && (
            <div className="absolute top-3 right-3">
              <span className="px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded text-xs text-slate-300">
                {event.category}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-display font-semibold text-white text-base leading-snug mb-2 line-clamp-2 group-hover:text-harbour-300 transition-colors">
            {event.title}
          </h3>

          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <svg className="w-3.5 h-3.5 text-harbour-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(event.dateTime)}</span>
            </div>

            {event.venueName && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <svg className="w-3.5 h-3.5 text-coral-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{event.venueName}</span>
              </div>
            )}
          </div>

          {event.description && (
            <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed flex-1">
              {event.description}
            </p>
          )}

          <div className="mt-auto flex items-center justify-between">
            <span className="text-xs text-slate-600 font-mono">{event.sourceName}</span>
            <button
              onClick={() => setShowModal(true)}
              className="bg-harbour-600 hover:bg-harbour-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors active:scale-95"
            >
              GET TICKETS →
            </button>
          </div>
        </div>
      </article>

      {showModal && <EmailModal event={event} onClose={() => setShowModal(false)} />}
    </>
  );
}
