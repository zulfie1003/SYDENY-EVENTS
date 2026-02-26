import { useState } from 'react';
import { emailAPI } from '../services/api';

export default function EmailModal({ event, onClose }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) return setError('Please enter your email address.');
    if (!consent) return setError('Please accept the terms to continue.');

    setLoading(true);
    try {
      const { data } = await emailAPI.capture({ email, consent, eventId: event._id });

      setSuccess(true);

      // Redirect to source after short delay
      setTimeout(() => {
        if (data.sourceUrl) {
          window.open(data.sourceUrl, '_blank', 'noopener,noreferrer');
        }
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card rounded-2xl w-full max-w-md p-6 animate-slide-up shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-display text-xl font-bold text-white">Get Tickets</h3>
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{event.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors ml-4 mt-0.5"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-400 font-medium">All set!</p>
            <p className="text-slate-400 text-sm mt-1">Redirecting to ticket page...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field w-full"
                disabled={loading}
                autoFocus
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="mt-0.5 relative">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  consent
                    ? 'bg-harbour-600 border-harbour-600'
                    : 'border-slate-600 group-hover:border-slate-500'
                }`}>
                  {consent && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-slate-400 leading-relaxed">
                I consent to receive event updates and agree to the{' '}
                <span className="text-harbour-400">Terms of Service</span> and{' '}
                <span className="text-harbour-400">Privacy Policy</span>.
              </span>
            </label>

            {error && (
              <p className="text-coral-400 text-sm bg-coral-500/10 px-3 py-2 rounded-lg border border-coral-500/20">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost flex-1 text-sm"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Tickets
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
