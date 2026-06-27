import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getBusinesses, searchUsers } from "@/services/api";
import type { SearchUser } from "@/services/api";
import { categories } from "@/services/mockData";
import BusinessCard from "@/components/BusinessCard";
import BusinessMap from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, User as UserIcon, Users, ChevronLeft, Map as MapIcon, LayoutGrid, AlertCircle, RefreshCw, Loader2, MapPin, MapPinOff } from "lucide-react";
import type { Business, BusinessCategory } from "@/types";
import { cn, haversineDistance, formatDistance } from "@/lib/utils";
import { useGeolocation } from "@/hooks/useGeolocation";

const sortOptions = [
  { label: "Nearby", value: "nearby" as const },
  { label: "New", value: "new" as const },
  { label: "Popular", value: "popular" as const },
];

const PAGE_SIZE = 6;

const Explore = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeCategory, setActiveCategory] = useState<BusinessCategory | undefined>(
    (searchParams.get("category") as BusinessCategory) || undefined
  );
  const [activeSort, setActiveSort] = useState<"nearby" | "new" | "popular">("nearby");
  const searchQuery = searchParams.get("search") || "";
  const [viewMode, setViewMode] = useState<"grid" | "map">(
    () => (localStorage.getItem("exploreViewMode") as "grid" | "map") || "grid"
  );

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

  // Filter change: always reset to page 0 and replace results
  useEffect(() => {
    setLoading(true);
    setError(null);
    setPage(0);
    setHasMore(true);
    getBusinesses({ category: activeCategory, sort: activeSort, search: searchQuery, skip: 0, limit: PAGE_SIZE })
      .then((data) => {
        setBusinesses(data);
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch(() => setError("Could not load businesses. Check your connection and try again."))
      .finally(() => setLoading(false));
  }, [activeCategory, activeSort, searchQuery]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    getBusinesses({ category: activeCategory, sort: activeSort, search: searchQuery, skip: nextPage * PAGE_SIZE, limit: PAGE_SIZE })
      .then((data) => {
        setBusinesses((prev) => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
        setPage(nextPage);
      })
      .catch(() => setError("Could not load more businesses. Try again."))
      .finally(() => setLoadingMore(false));
  };

  const businessesWithDistance = useMemo(() => {
    if (geoState.lat === null || geoState.lng === null) return businesses;

    const userLat = geoState.lat;
    const userLng = geoState.lng;

    const withDist = businesses.map((b) => {
      if (!b.location?.lat) return b;
      const km = haversineDistance(userLat, userLng, b.location.lat, b.location.lng);
      return { ...b, distance: formatDistance(km) };
    });

    if (activeSort === "nearby") {
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
  }, [businesses, geoState.lat, geoState.lng, activeSort]);

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
        <p className="text-muted-foreground mb-6">
          {businesses.length} businesses found
        </p>

        {/* Sort and View tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
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

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[4/5] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-lg">Something went wrong</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setError(null);
                setLoading(true);
                setPage(0);
                setHasMore(true);
                getBusinesses({ category: activeCategory, sort: activeSort, search: searchQuery, skip: 0, limit: PAGE_SIZE })
                  .then((data) => {
                    setBusinesses(data);
                    setHasMore(data.length === PAGE_SIZE);
                  })
                  .catch(() => setError("Could not load businesses. Check your connection and try again."))
                  .finally(() => setLoading(false));
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No businesses found. Try adjusting your filters.
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
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="min-w-[140px]"
                >
                  {loadingMore ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default Explore;
