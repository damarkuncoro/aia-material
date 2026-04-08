import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from "firebase/auth";
import { auth } from "../../infrastructure/firebase/firebase.config";
import { HistoryRepository, HistoryItem } from "../../infrastructure/history/history.repository";

const historyRepo = new HistoryRepository();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = () => auth.signOut();

  return { user, loading, login, logout };
}

export function useHistory(userId: string | undefined) {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!userId) {
      setHistory([]);
      return;
    }
    return historyRepo.subscribe(setHistory);
  }, [userId]);

  const addToHistory = useCallback(async (item: Omit<HistoryItem, "id" | "timestamp">) => {
    await historyRepo.add(item);
  }, []);

  const deleteFromHistory = useCallback(async (id: string) => {
    await historyRepo.delete(id);
  }, []);

  return { history, addToHistory, deleteFromHistory };
}
