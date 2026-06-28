import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Search, MapPin, Menu, X, Briefcase, MessageSquare, LogOut, Bell, Rss, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ModeToggle } from "@/components/mode-toggle";
import NotificationPanel from "@/components/NotificationPanel";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/services/api";
import type { ApiNotification } from "@/services/api";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Poll unread count every 30 s while logged in
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // silently ignore — network blip shouldn't break the UI
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(id);
  }, [user, fetchUnreadCount]);

  // When the panel opens: fetch notifications + mark all read simultaneously
  const handleNotifOpenChange = async (open: boolean) => {
    setNotifOpen(open);
    if (!open) return;
    setNotifLoading(true);
    try {
      const [notifs] = await Promise.all([
        getNotifications(),
        markAllNotificationsRead(),
      ]);
      setNotifications(notifs.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // keep whatever we have
    } finally {
      setNotifLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/explore?search=${encodeURIComponent(search.trim())}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo — mark only on mobile, full lockup on sm+ */}
        <span className="hidden sm:block shrink-0"><Logo size={34} /></span>
        <span className="sm:hidden shrink-0"><Logo size={32} withWordmark={false} /></span>

        {/* Search — desktop */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cafes, salons, medicals near you"
              className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </form>

        {/* Location */}
        <button className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <MapPin className="h-4 w-4 text-primary" />
          <span>Bangalore</span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/explore">Explore</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/feed"><Rss className="h-4 w-4 mr-1" />Feed</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/jobs"><Briefcase className="h-4 w-4 mr-1" />Jobs</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/messages"><MessageSquare className="h-4 w-4 mr-1" />Messages</Link>
          </Button>

          {/* Notifications Bell */}
          <Popover open={notifOpen} onOpenChange={handleNotifOpenChange}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <NotificationPanel
                notifications={notifications}
                loading={notifLoading}
                onMarkRead={handleMarkRead}
                onMarkAllRead={handleMarkAllRead}
              />
            </PopoverContent>
          </Popover>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatars/01.png" alt={user.name} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.phone}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                {(user.role === "business" || user.role === "admin") && (
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                )}
                {user.role === "admin" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="text-primary">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          )}

          <div className="ml-2">
            <ModeToggle />
          </div>
        </nav>

        {/* Mobile hamburger */}
        <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-card p-4 space-y-3 animate-fade-in">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search businesses..."
                className="pl-10 bg-muted/50 border-0"
              />
            </div>
          </form>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Bangalore</span>
          </div>
          <nav className="flex flex-col gap-1">
            <Button variant="ghost" className="justify-start" asChild onClick={() => setMenuOpen(false)}>
              <Link to="/explore">Explore</Link>
            </Button>
            <Button variant="ghost" className="justify-start gap-2" asChild onClick={() => setMenuOpen(false)}>
              <Link to="/feed"><Rss className="h-4 w-4" />Feed</Link>
            </Button>
            <Button variant="ghost" className="justify-start" asChild onClick={() => setMenuOpen(false)}>
              <Link to="/jobs">Jobs</Link>
            </Button>
            <Button variant="ghost" className="justify-start" asChild onClick={() => setMenuOpen(false)}>
              <Link to="/messages">Messages</Link>
            </Button>
            <Button
              variant="ghost"
              className="justify-start gap-2"
              onClick={() => { setMenuOpen(false); setNotifOpen(true); }}
            >
              <Bell className="h-4 w-4" />
              Notifications
              {unreadCount > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
            {user && (user.role === "business" || user.role === "admin") && (
              <Button variant="ghost" className="justify-start" asChild onClick={() => setMenuOpen(false)}>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            )}
            {user ? (
              <>
                <div className="px-4 py-2 text-sm font-medium text-muted-foreground">
                  Signed in as {user.name}
                </div>
                <Button
                  variant="ghost"
                  className="justify-start text-red-500 hover:text-red-500 hover:bg-red-50"
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </Button>
              </>
            ) : (
              <Button className="mt-2" asChild onClick={() => setMenuOpen(false)}>
                <Link to="/login">Sign In</Link>
              </Button>
            )}
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <span className="text-sm font-medium">Theme</span>
              <ModeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
