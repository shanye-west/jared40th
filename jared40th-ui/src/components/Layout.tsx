import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  ChevronLeft,
  Menu,
  X,
  Home,
  Users,
  Trophy,
  Wifi,
} from "lucide-react";
import PullToRefresh from "./PullToRefresh";
import OfflineImage from "./OfflineImage";
import { ViewTransitionLink } from "./ViewTransitionLink";
import { useOnlineStatusWithHistory } from "../hooks/useOnlineStatus";
import { useLayout } from "../contexts/LayoutContext";
import { useViewTransitionDirection, supportsViewTransitions } from "../hooks/useViewTransition";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

type LayoutProps = {
  title: string;
  series?: string;
  showBack?: boolean;
  tournamentLogo?: string;
  children: React.ReactNode;
};

type LayoutShellProps = {
  children?: React.ReactNode;
};

export function LayoutShell({ children }: LayoutShellProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isOnline, wasOffline } = useOnlineStatusWithHistory();
  const { config } = useLayout();
  const { title, showBack, tournamentLogo } = config;
  const location = useLocation();

  useViewTransitionDirection();

  const handleBack = () => {
    if (supportsViewTransitions() && (document as any).startViewTransition) {
      (document as any).startViewTransition(() => {
        navigate(-1);
      });
    } else {
      navigate(-1);
    }
  };

  const { year, mainTitle } = useMemo(() => {
    const match = title.match(/^(\d{4})\s+(.+)$/);
    if (match) return { year: match[1], mainTitle: match[2] };
    return { year: null, mainTitle: title };
  }, [title]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = () => setMenuOpen(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const pageContent = children ?? <Outlet />;

  useEffect(() => {
    try { window.scrollTo({ top: 0, left: 0 }); } catch {}
  }, [location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className="app-header">
        <div className="flex items-center gap-2">
          {showBack && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-white/90 hover:bg-white/10 hover:text-white"
              aria-label="Go Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <ViewTransitionLink to="/" aria-label="Home" className="flex items-center">
            <OfflineImage
              src={tournamentLogo}
              alt="Tournament Logo"
              fallbackIcon="⛳"
              fallbackSrc="/images/rowdycup-logo.svg"
              style={{ height: 40, width: 40, objectFit: "contain" }}
            />
          </ViewTransitionLink>
        </div>

        <div className="flex flex-1 flex-col items-center text-center leading-tight">
          {year && (
            <div className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-white/70">
              {year}
            </div>
          )}
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-white drop-shadow-sm sm:text-base">
            {mainTitle}
          </div>
        </div>

        <div className="relative flex min-w-[48px] items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="text-white/90 hover:bg-white/10 hover:text-white"
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {menuOpen && (
            <div
              className="absolute right-0 top-[calc(100%+0.6rem)] w-64 origin-top-right animate-menu-open"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="border border-white/30 bg-white/95 shadow-2xl backdrop-blur">
                <div className="space-y-1 p-2">
                  <Button asChild variant="ghost" className="w-full justify-start gap-2 text-slate-700 hover:bg-slate-100">
                    <ViewTransitionLink to="/" onClick={closeMenu}>
                      <Home className="h-4 w-4 text-slate-500" />
                      Home
                    </ViewTransitionLink>
                  </Button>
                  <Button asChild variant="ghost" className="w-full justify-start gap-2 text-slate-700 hover:bg-slate-100">
                    <ViewTransitionLink to="/teams" onClick={closeMenu}>
                      <Users className="h-4 w-4 text-slate-500" />
                      Teams
                    </ViewTransitionLink>
                  </Button>
                  <Button asChild variant="ghost" className="w-full justify-start gap-2 text-slate-700 hover:bg-slate-100">
                    <ViewTransitionLink to="/games" onClick={closeMenu}>
                      <Trophy className="h-4 w-4 text-slate-500" />
                      Games
                    </ViewTransitionLink>
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </header>

      <PullToRefresh>
        {wasOffline && isOnline && (
          <div className="flex items-center justify-center gap-2 bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white shadow-sm">
            <Wifi className="h-4 w-4" />
            <span>Back online — syncing changes</span>
          </div>
        )}

        <main className="app-container">{pageContent}</main>
      </PullToRefresh>
    </>
  );
}

export default function Layout({ title, series, showBack, tournamentLogo, children }: LayoutProps) {
  const { config, setConfig } = useLayout();

  useLayoutEffect(() => {
    if (title === "Loading...") {
      setConfig({
        title: config.title,
        series: config.series,
        tournamentLogo: config.tournamentLogo,
        showBack: showBack ?? config.showBack,
      });
      return;
    }
    setConfig({ title, series, showBack, tournamentLogo });
  }, [title, series, showBack, tournamentLogo, setConfig, config]);

  return <>{children}</>;
}
