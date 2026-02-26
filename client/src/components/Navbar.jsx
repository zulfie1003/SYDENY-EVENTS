import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-harbour-500 to-coral-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              SE
            </div>
            <span className="font-display font-bold text-lg text-white">
              Sydney <span className="text-harbour-400">Events</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-slate-300 hover:text-white text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-2 pl-3 border-l border-slate-700">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-7 h-7 rounded-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : null}
                  {!user.avatar && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-harbour-500 to-coral-500 flex items-center justify-center text-white text-xs font-bold">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-slate-400 hidden sm:block">{user.name}</span>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-1"
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="btn-primary text-sm"
              >
                Admin Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
