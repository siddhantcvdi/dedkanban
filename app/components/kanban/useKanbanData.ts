import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import {
  Board, ThemeMode,
  ACTIVE_BOARD_KEY, THEME_KEY, TODAY_BOARD_ID, TODAY_COL_TODO_ID,
  TODAY_COLUMNS, DEFAULT_BOARDS,
} from "./types";

export function useKanbanData() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>("");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [boardsLoaded, setBoardsLoaded] = useState(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    setThemeMode((savedTheme === "light" || savedTheme === "dark") ? savedTheme : "light");

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setUid(null);
        setBoardsLoaded(true);
        setMounted(true);
        return;
      }

      setUser(firebaseUser);
      setUid(firebaseUser.uid);
      setMounted(true);

      try {
        const userDoc = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userDoc);
        const savedActive = localStorage.getItem(ACTIVE_BOARD_KEY);

        if (snap.exists()) {
          const loadedBoards: Board[] = snap.data().boards ?? DEFAULT_BOARDS;
          const hasToday = loadedBoards.some((b) => b.id === TODAY_BOARD_ID);
          const finalBoards = (hasToday ? loadedBoards : [{ id: TODAY_BOARD_ID, name: "Today", columns: TODAY_COLUMNS }, ...loadedBoards])
            .map((b) => b.id === TODAY_BOARD_ID && !b.columns.some((c) => c.id === TODAY_COL_TODO_ID)
              ? { ...b, columns: TODAY_COLUMNS }
              : b
            );
          const activeId = savedActive && finalBoards.find((b) => b.id === savedActive)
            ? savedActive : finalBoards[0].id;
          setBoards(finalBoards);
          setActiveBoardId(activeId);
        } else {
          setBoards(DEFAULT_BOARDS);
          setActiveBoardId(DEFAULT_BOARDS[0].id);
          await setDoc(userDoc, { boards: DEFAULT_BOARDS });
        }
      } catch (err) {
        console.error("[kanban] Firestore error", err);
        setBoards(DEFAULT_BOARDS);
        setActiveBoardId(DEFAULT_BOARDS[0].id);
      }
      setBoardsLoaded(true);
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!mounted || !uid || !boardsLoaded) return;
    localStorage.setItem(ACTIVE_BOARD_KEY, activeBoardId);
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(async () => {
      setSyncing(true);
      await setDoc(doc(db, "users", uid), { boards });
      setSyncing(false);
    }, 800);
  }, [boards, activeBoardId, mounted, uid, boardsLoaded]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(THEME_KEY, themeMode);
    document.documentElement.classList.toggle("dark", themeMode === "dark");
    const color = themeMode === "dark" ? "#282828" : "#E6E4D7";
    document.querySelectorAll("meta[name='theme-color']").forEach((el) => {
      (el as HTMLMetaElement).content = color;
    });
  }, [themeMode, mounted]);

  async function handleGoogleSignIn() {
    setSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() { await signOut(auth); }

  return {
    boards, setBoards,
    activeBoardId, setActiveBoardId,
    themeMode, setThemeMode,
    mounted,
    user, uid,
    syncing, signingIn,
    boardsLoaded,
    handleGoogleSignIn, handleSignOut,
  };
}
