import { Link, useLocation } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isDashboard = location.pathname === "/" || location.pathname === "";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-surface-700/60 bg-surface-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 text-surface-100 hover:text-brand-400 transition-colors">
              <span className="text-xl font-semibold tracking-tight">Web Scrap</span>
              <span className="text-surface-500 text-sm font-normal">Dashboard</span>
            </Link>
            <nav className="flex gap-1">
              <Link
                to="/"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDashboard ? "bg-surface-700/60 text-brand-400" : "text-surface-400 hover:text-surface-100"
                }`}
              >
                Overview
              </Link>
              <Link
                to="/listings"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !isDashboard ? "bg-surface-700/60 text-brand-400" : "text-surface-400 hover:text-surface-100"
                }`}
              >
                Listings
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-surface-800 py-4 text-center text-surface-500 text-sm">
        <span>Data from ETL pipeline · API on Cloudflare Workers</span>
        <span className="mx-2">·</span>
        <span>Built by <a href="https://github.com/HessiKz" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 transition-colors font-medium">HessiKz</a></span>
      </footer>
    </div>
  );
}
