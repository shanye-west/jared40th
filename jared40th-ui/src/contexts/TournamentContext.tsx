/**
 * TournamentContext - Provides shared tournament data to avoid duplicate subscriptions.
 * Subscribes once to the active tournament and shares with all child components.
 */

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from "react";
import { doc, onSnapshot, collection, query, where, limit, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { TournamentDoc, CourseDoc } from "../types";

interface TournamentContextValue {
  tournament: TournamentDoc | null;
  loading: boolean;
  error: string | null;
  courses: Record<string, CourseDoc>;
  addCourse: (course: CourseDoc) => void;
  /** Fetch and cache a course by ID */
  getCourse: (courseId: string) => Promise<CourseDoc | null>;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [tournament, setTournament] = useState<TournamentDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Record<string, CourseDoc>>({});

  // Subscribe to the active tournament
  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsub = onSnapshot(
      query(collection(db, "tournaments"), where("active", "==", true), limit(1)),
      (snap) => {
        if (snap.empty) {
          setTournament(null);
        } else {
          const d = snap.docs[0];
          setTournament({ id: d.id, ...d.data() } as TournamentDoc);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Tournament subscription error:", err);
        setError("Unable to load tournament.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const addCourse = useCallback((course: CourseDoc) => {
    if (course.id) {
      setCourses((prev) => {
        if (prev[course.id]) return prev;
        return { ...prev, [course.id]: course };
      });
    }
  }, []);

  const getCourse = useCallback(async (courseId: string): Promise<CourseDoc | null> => {
    // Check cache first
    const cached = courses[courseId];
    if (cached) return cached;

    // Fetch from Firestore
    const snap = await getDoc(doc(db, "courses", courseId));
    if (!snap.exists()) return null;
    const course = { id: snap.id, ...snap.data() } as CourseDoc;
    addCourse(course);
    return course;
  }, [courses, addCourse]);

  const value = useMemo(
    () => ({ tournament, loading, error, courses, addCourse, getCourse }),
    [tournament, loading, error, courses, addCourse, getCourse]
  );

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournamentContext(): TournamentContextValue {
  const ctx = useContext(TournamentContext);
  if (!ctx) {
    throw new Error("useTournamentContext must be used within a TournamentProvider");
  }
  return ctx;
}
