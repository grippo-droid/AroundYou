import { formatDistanceToNow } from "date-fns";
import {
  CalendarCheck, CalendarX, CheckCircle, Star, Briefcase, Bell, CheckCheck, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiNotification } from "@/services/api";

const TYPE_CONFIG: Record<
  ApiNotification["type"],
  { icon: React.ElementType; iconColor: string; bgColor: string }
> = {
  booking_confirmed:  { icon: CalendarCheck, iconColor: "text-green-600",  bgColor: "bg-green-100 dark:bg-green-900/40" },
  booking_cancelled:  { icon: CalendarX,     iconColor: "text-red-500",    bgColor: "bg-red-100 dark:bg-red-900/40" },
  booking_completed:  { icon: CheckCircle,   iconColor: "text-blue-500",   bgColor: "bg-blue-100 dark:bg-blue-900/40" },
  new_review:         { icon: Star,          iconColor: "text-amber-500",  bgColor: "bg-amber-100 dark:bg-amber-900/40" },
  application_status: { icon: Briefcase,     iconColor: "text-purple-500", bgColor: "bg-purple-100 dark:bg-purple-900/40" },
};

interface Props {
  notifications: ApiNotification[];
  loading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const NotificationPanel = ({ notifications, loading, onMarkRead, onMarkAllRead }: Props) => {
  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="font-semibold text-sm">Notifications</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-0.5 px-2 text-xs text-muted-foreground"
          onClick={onMarkAllRead}
        >
          <CheckCheck className="h-3.5 w-3.5 mr-1" />
          Mark all read
        </Button>
      </div>

      <ul className="divide-y max-h-[360px] overflow-y-auto">
        {loading ? (
          <li className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </li>
        ) : notifications.length === 0 ? (
          <li className="flex flex-col items-center justify-center py-10 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </li>
        ) : (
          notifications.slice(0, 10).map((n) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.booking_confirmed;
            const Icon = cfg.icon;
            return (
              <li
                key={n._id}
                onClick={() => { if (!n.is_read) onMarkRead(n._id); }}
                className={`flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50 cursor-pointer ${
                  !n.is_read ? "bg-primary/5" : ""
                }`}
              >
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cfg.bgColor}`}>
                  <Icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`leading-snug text-sm ${!n.is_read ? "font-medium" : "text-muted-foreground"}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.is_read && (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </li>
            );
          })
        )}
      </ul>
    </>
  );
};

export default NotificationPanel;
