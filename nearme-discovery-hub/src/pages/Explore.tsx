import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { getBusinesses, searchBusinessesSemantic, searchUsers, SEMANTIC_QUERY_MAX_LENGTH } from "@/services/api";
import type { SearchUser } from "@/services/api";
import { categories } from "@/services/mockData";
import BusinessCard from "@/components/BusinessCard";
import BusinessMap from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, User as UserIcon, Users, ChevronLeft, Map as MapIcon, LayoutGrid, AlertCircle, RefreshCw, Loader2, MapPin, MapPinOff, Sparkles, Info } from "lucide-react";
import type { Business, BusinessCategory } from "@/types";
import { cn, haversineDistance, formatDistance } from "@/lib/utils";
import { useGeolocation } from "@/hooks/useGeolocation";

const sortOptions = [
  { label: "Nearby", value: "nearby" as const },
  { label: "New", value: "new" as const },
  { label: "Popular", value: "popular" as const },
];

const PAGE_SIZE = 6;
// Show the "warming up" hint if a smart search takes longer than this.
const SLOW_SMART_SEARCH_MS = 3000;

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState<BusinessCategory | undefined>(
    (searchParams.get("category") as BusinessCategory) || undefined
  );
  const [activeSort, setActiveSort] = useState<"nearby" | "new" | "popular">("nearby");
  const searchQuery = searchParams.get("search") || "";
  // Smart (semantic) search only applies to a typed query; ?mode=smart without one is a normal listing.
  const isSmart = searchParams.get("mode") === "smart" && searchQuery.trim() !== "";
  const [degraded, setDegraded] = useState(false);
  const [slowSearch, setSlowSearch] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "map">(
    () => (localStorage.getItem("exploreViewMode") as "grid" | "map") || "grid"
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Synchronous guard — prevents duplicate calls before React state flush
  const fetchingRef = useRef(false);
  // Always-current count — lets loadMore read businesses.length without being in its dep array
  const businessCountRef = useRef(0);
  businessCountRef.current = businesses.length;

  const setViewModePersisted = (mode: "grid" | "map") => {
    setViewMode(mode);
    localStorage.setItem("exploreViewMode", mode);
  };

  const geoState = useGeolocation();

  // User Search State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<SearchUser[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  // Filter change (or retry): reset list and fetch first page
  useEffect(() => {
    fetchingRef.current = false;
    setLoading(true);
    setError(null);
    setBusinesses([]);
    setHasMore(true);
    setDegraded(false);
    setSlowSearch(false);

    if (isSmart) {
      // One ranked batch — no categories, sorting or pagination on the semantic endpoint.
      setHasMore(false);
      if (searchQuery.length > SEMANTIC_QUERY_MAX_LENGTH) {
        setError(`Smart search works with up to ${SEMANTIC_QUERY_MAX_LENGTH} characters. Try a shorter description.`);
        setLoading(false);
        return;
      }
      const controller = new AbortController();
      const slowTimer = setTimeout(() => setSlowSearch(true), SLOW_SMART_SEARCH_MS);
      searchBusinessesSemantic(searchQuery, { signal: controller.signal })
        .then((data) => {
          setBusinesses(data.businesses);
          setDegraded(data.degraded);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setError(
            isAxiosError(err) && err.code === "ECONNABORTED"
              ? "Smart search took too long to respond. Try again, or use keyword search."
              : "Smart search failed. Check your connection and try again."
          );
        })
        .finally(() => {
          clearTimeout(slowTimer);
          if (!controller.signal.aborted) {
            setSlowSearch(false);
            setLoading(false);
          }
        });
      // Cancel an in-flight request when the query/mode changes, so a slow
      // earlier response can't overwrite newer results.
      return () => {
        controller.abort();
        clearTimeout(slowTimer);
      };
    }

    getBusinesses({ category: activeCategory, sort: activeSort, search: searchQuery, skip: 0, limit: PAGE_SIZE })
      .then((data) => {
        setBusinesses(data.businesses);
        setHasMore(data.hasMore);
      })
      .catch(() => setError("Could not load businesses. Check your connection and try again."))
      .finally(() => setLoading(false));
  }, [activeCategory, activeSort, searchQuery, isSmart, reloadKey]);

  const setSearchMode = (mode: "keyword" | "smart") => {
    const next = new URLSearchParams(searchParams);
    if (mode === "smart") next.set("mode", "smart");
    else next.delete("mode");
    setSearchParams(next);
  };

  // Append next page — used by the IntersectionObserver
  const loadMore = useCallback(() => {
    if (isSmart || fetchingRef.current || !hasMore || loading) return;
    fetchingRef.current = true;
    setLoadingMore(true);
    getBusinesses({
      category: activeCategory,
      sort: activeSort,
      search: searchQuery,
      skip: businessCountRef.current,
      limit: PAGE_SIZE,
    })
      .then((data) => {
        setBusinesses((prev) => {
          const seen = new Set(prev.map((b) => b._id));
          return [...prev, ...data.businesses.filter((b) => !seen.has(b._id))];
        });
        setHasMore(data.hasMore);
      })
      .catch(() => setError("Could not load more businesses. Try again."))
      .finally(() => {
        fetchingRef.current = false;
        setLoadingMore(false);
      });
  }, [isSmart, hasMore, loading, activeCategory, activeSort, searchQuery]);

  // Wire IntersectionObserver to sentinel div
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const businessesWithDistance = useMemo(() => {
    if (geoState.lat === null || geoState.lng === null) return businesses;

    const userLat = geoState.lat;
    const userLng = geoState.lng;

    const withDist = businesses.map((b) => {
      if (!b.location?.lat) return b;
      const km = haversineDistance(userLat, userLng, b.location.lat, b.location.lng);
      return { ...b, distance: formatDistance(km) };
    });

    // Smart results are ranked by relevance — re-sorting by distance would discard that.
    if (activeSort === "nearby" && !isSmart) {
      return [...withDist].sort((a, b) => {
        const da = a.location?.lat
          ? haversineDistance(userLat, userLng, a.location.lat, a.location.lng)
          : 9999;
        const db = b.location?.lat
          ? haversineDistance(userLat, userLng, b.location.lat, b.location.lng)
          : 9999;
        return da - db;
      });
    }
    return withDist;
  }, [businesses, geoState.lat, geoState.lng, activeSort, isSmart]);

  // In degraded mode, offer a category the query mentions (e.g. "quiet cafe…" → Cafe).
  const mentionedCategory = useMemo(() => {
    const words = searchQuery.toLowerCase().split(/[^a-z]+/);
    return categories.find((c) => words.includes(c.name.toLowerCase()))?.name;
  }, [searchQuery]);

  // Debounced User Search
  useEffect(() => {
    if (!userQuery.trim()) {
      setUserResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const users = await searchUsers(userQuery);
        setUserResults(users);
      } catch (error) {
        console.error("User search failed", error);
      } finally {
        setUserSearchLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [userQuery]);

  return (
    <main className="container py-8 flex gap-8 relative items-start min-h-[80vh]">
      {/* Sidebar Toggle Button (Visible when closed) */}
      {!isSidebarOpen && (
        <Button
          variant="outline"
          size="icon"
          className="fixed left-4 top-24 z-30 md:static md:top-auto md:left-auto shrink-0"
          onClick={() => setIsSidebarOpen(true)}
          title="Find People"
        >
          <Users className="h-4 w-4" />
        </Button>
      )}

      {/* Collapsible Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-80 bg-background border-r p-6 shadow-lg transition-transform duration-300 ease-in-out md:static md:shadow-none md:border-r-0 md:p-0 md:h-auto",
          isSidebarOpen ? "translate-x-0 md:w-80 md:block md:translate-x-0" : "-translate-x-full md:hidden md:w-0"
        )}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Find People
          </h3>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-9"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* User Results List */}
        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)]">
          {userSearchLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">Searching...</div>
          ) : userResults.length > 0 ? (
            userResults.map((user) => (
              <div
                key={user._id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                onClick={() => navigate(`/profile/${user._id}`)}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate capitalize">{user.role}</p>
                </div>
              </div>
            ))
          ) : userQuery && (
            <div className="text-sm text-muted-foreground text-center py-4">No users found</div>
          )}
        </div>
      </aside>

      {/* Main Content: Business Explore */}
      <section className="flex-1 w-full min-w-0">
        <h1 className="font-display text-3xl font-bold mb-1">
          {searchQuery ? `Results for "${searchQuery}"` : "Explore Nearby"}
        </h1>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <p className="text-muted-foreground">
            {isSmart ? `${businesses.length} matches` : `${businesses.length} businesses found`}
          </p>

          {/* Keyword / Smart toggle — only meaningful when there's a query */}
          {searchQuery && (
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              <Button
                size="sm"
                variant={!isSmart ? "default" : "ghost"}
                className="h-7 px-3"
                onClick={() => setSearchMode("keyword")}
              >
                <Search className="h-4 w-4 mr-2" />
                Keyword
              </Button>
              <Button
                size="sm"
                variant={isSmart ? "default" : "ghost"}
                className="h-7 px-3"
                onClick={() => setSearchMode("smart")}
                title="Describe what you need in your own words"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Smart
              </Button>
            </div>
          )}
        </div>

        {/* Smart search unavailable — results came from keyword search instead */}
        {isSmart && degraded && !loading && !error && (
          <div className="flex items-start gap-2 rounded-lg border bg-muted/50 px-4 py-3 mb-6 text-sm">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <p>
              Smart search is unavailable right now — showing keyword matches instead.
            </p>
          </div>
        )}

        {/* Sort and View tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Smart results are ranked by relevance, so sorting doesn't apply */}
            {!isSmart && (
              <div className="flex gap-1">
                {sortOptions.map((s) => (
                  <Button
                    key={s.value}
                    size="sm"
                    variant={activeSort === s.value ? "default" : "outline"}
                    onClick={() => setActiveSort(s.value)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            )}
            {!geoState.loading && (
              <span
                className={`flex items-center gap-1 text-xs ${
                  geoState.lat !== null ? "text-emerald-600" : "text-muted-foreground"
                }`}
              >
                {geoState.lat !== null ? (
                  <MapPin className="h-3 w-3" />
                ) : (
                  <MapPinOff className="h-3 w-3" />
                )}
                {geoState.lat !== null ? "Using your location" : "Location unavailable"}
              </span>
            )}
          </div>

          <div className="flex gap-1 bg-muted p-1 rounded-lg self-start sm:self-auto">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              className="h-7 px-3"
              onClick={() => setViewModePersisted("grid")}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Grid
            </Button>
            <Button
              size="sm"
              variant={viewMode === "map" ? "default" : "ghost"}
              className="h-7 px-3"
              onClick={() => setViewModePersisted("map")}
            >
              <MapIcon className="h-4 w-4 mr-2" />
              Map
            </Button>
          </div>
        </div>

        {/* Category chips — the semantic endpoint has no category filter */}
        <div className={cn("flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide", isSmart && "hidden")}>
          <Button
            size="sm"
            variant={!activeCategory ? "default" : "outline"}
            onClick={() => setActiveCategory(undefined)}
            className="shrink-0"
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.name}
              size="sm"
              variant={activeCategory === cat.name ? "default" : "outline"}
              onClick={() => setActiveCategory(activeCategory === cat.name ? undefined : cat.name)}
              className="shrink-0"
            >
              {cat.icon} {cat.name}
            </Button>
          ))}
        </div>

        {/* Grid or Map View */}
        {loading ? (
          <>
            {slowSearch && (
              <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Warming up smart search — the first search can take up to a minute.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[4/5] rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          </>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-lg">Something went wrong</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              {isSmart && (
                <Button variant="ghost" onClick={() => setSearchMode("keyword")}>
                  <Search className="h-4 w-4 mr-2" />
                  Use keyword search
                </Button>
              )}
            </div>
          </div>
        ) : businesses.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20 gap-4 text-muted-foreground">
            {isSmart && degraded ? (
              <>
                <p>
                  No keyword matches for "{searchQuery}". Keyword search looks for exact words —
                  try something shorter, like a business name or category.
                </p>
                {mentionedCategory && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Explore only reads ?category on mount, so set the filter directly.
                      setActiveCategory(mentionedCategory);
                      setSearchParams(new URLSearchParams());
                    }}
                  >
                    Browse {mentionedCategory}
                  </Button>
                )}
              </>
            ) : isSmart ? (
              <>
                <p>No close matches for "{searchQuery}". Try describing it differently.</p>
                <Button variant="outline" onClick={() => setSearchMode("keyword")}>
                  <Search className="h-4 w-4 mr-2" />
                  Try keyword search
                </Button>
              </>
            ) : searchQuery ? (
              <>
                <p>No businesses found for "{searchQuery}".</p>
                <Button variant="outline" onClick={() => setSearchMode("smart")}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Try smart search
                </Button>
              </>
            ) : (
              <p>No businesses found. Try adjusting your filters.</p>
            )}
          </div>
        ) : viewMode === "map" ? (
          <div
            className="w-full rounded-xl overflow-hidden border"
            style={{ height: "calc(100vh - 160px)" }}
          >
            <BusinessMap
              businesses={businessesWithDistance}
              userLocation={geoState.lat !== null ? [geoState.lat, geoState.lng!] : null}
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {businessesWithDistance.map((b) => (
                <BusinessCard key={b._id} business={b} />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-8">
                {loadingMore && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
              </div>
            )}
            {!hasMore && (
              <p className="text-center text-sm text-muted-foreground py-8">
                {isSmart
                  ? "These are the closest matches. Looking for a specific name? Try keyword search."
                  : "You've seen all businesses"}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default Explore;
