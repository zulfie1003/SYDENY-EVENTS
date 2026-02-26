import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p className="font-mono text-harbour-500 text-sm mb-3">404</p>
      <h1 className="font-display text-4xl font-bold text-white mb-4">Page not found</h1>
      <p className="text-slate-400 mb-8">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">Back to Home</Link>
    </div>
  );
}
