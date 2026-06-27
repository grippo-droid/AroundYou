import { useState, useEffect, useCallback } from "react";
import type { Business } from "@/types";

const STORAGE_KEY = "nearme_bookmarks";
const SYNC_EVENT = "nearme_bookmarks_changed";

function readStorage(): Record<string, Business> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Record<string, Business>>(readStorage);

  // Stay in sync when another component or tab changes the bookmarks
  useEffect(() => {
    const sync = () => setBookmarks(readStorage());
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener("storage", sync); // cross-tab support
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isBookmarked = useCallback(
    (id: string) => Boolean(bookmarks[id]),
    [bookmarks]
  );

  const toggle = useCallback((business: Business) => {
    setBookmarks((prev) => {
      const next = { ...prev };
      if (next[business._id]) {
        delete next[business._id];
      } else {
        next[business._id] = business;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(SYNC_EVENT));
      return next;
    });
  }, []);

  return {
    isBookmarked,
    toggle,
    bookmarkedList: Object.values(bookmarks) as Business[],
  };
}
