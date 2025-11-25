import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import PullToRefresh from "./PullToRefresh";

type LayoutProps = {
  title: string;
  series?: string; // "rowdyCup" | "christmasClassic"
  showBack?: boolean;
  tournamentLogo?: string;
  children: React.ReactNode;
};

export default function Layout({ title, series, tournamentLogo, children }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Parse title to extract year (if present at start) and main name
  const { year, mainTitle } = useMemo(() => {
    const match = title.match(/^(\d{4})\s+(.+)$/);
    if (match) {
      return { year: match[1], mainTitle: match[2] };
    }
    return { year: null, mainTitle: title };
  }, [title]);

  // --- THEME ENGINE ---
  useEffect(() => {
    if (series === "christmasClassic") {
      document.body.classList.add("theme-christmas");
    } else {
      document.body.classList.remove("theme-christmas");
    }
  }, [series]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = () => setMenuOpen(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menuOpen]);

  return (
    <>
      {/* STICKY HEADER */}
      <header className="app-header">
        {/* Left: Tournament Logo (links to home) */}
        <div style={{ display: "flex", alignItems: "center", minWidth: 48 }}>
          {tournamentLogo ? (
            <Link to="/" aria-label="Home">
              <img 
                src={tournamentLogo} 
                alt="Tournament Logo" 
                style={{ height: 44, width: "auto", objectFit: "contain" }} 
              />
            </Link>
          ) : (
            <div style={{ width: 44 }}></div>
          )}
        </div>

        {/* Center: Tournament Title (year small on top, main title below) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", lineHeight: 1.1 }}>
          {year && (
            <div style={{ fontSize: "0.65rem", fontWeight: 600, opacity: 0.85, letterSpacing: "0.05em" }}>
              {year}
            </div>
          )}
          <div style={{ fontSize: "1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {mainTitle}
          </div>
        </div>

        {/* Right: Hamburger Menu */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", minWidth: 48, position: "relative" }}>
          <button 
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} 
            className="btn-back" 
            aria-label="Menu"
            style={{ padding: 8 }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div 
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 8,
                background: "white",
                borderRadius: 8,
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                minWidth: 180,
                zIndex: 100,
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Link 
                to="/" 
                style={{ display: "block", padding: "12px 16px", color: "#0f172a", textDecoration: "none", fontWeight: 600, borderBottom: "1px solid #e2e8f0" }}
                onClick={() => setMenuOpen(false)}
              >
                🏠 Home
              </Link>
              <Link 
                to="/teams" 
                style={{ display: "block", padding: "12px 16px", color: "#0f172a", textDecoration: "none", fontWeight: 600 }}
                onClick={() => setMenuOpen(false)}
              >
                👥 Team Rosters
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* WRAP CONTENT IN PULL-TO-REFRESH */}
      <PullToRefresh>
        <main className="app-container">
          {children}
        </main>
      </PullToRefresh>
    </>
  );
}