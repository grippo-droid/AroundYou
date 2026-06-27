import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getBusinessAvailability, setBusinessAvailability, getBusinessById } from "@/services/api";
import type { DayScheduleInput } from "@/services/api";
import { toast } from "sonner";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

const DEFAULT_SCHEDULES: DayScheduleInput[] = DAY_NAMES.map((_, i) => ({
  day: i,
  start_time: "09:00",
  end_time: "18:00",
  is_active: i < 5, // Mon-Fri on by default
}));

const ManageAvailability = () => {
  const { id: businessId } = useParams<{ id: string }>();
  const [businessName, setBusinessName] = useState("");
  const [schedules, setSchedules] = useState<DayScheduleInput[]>(DEFAULT_SCHEDULES);
  const [slotDuration, setSlotDuration] = useState(60);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    Promise.all([
      getBusinessById(businessId),
      getBusinessAvailability(businessId),
    ]).then(([biz, avail]) => {
      if (biz) setBusinessName(biz.name);
      if (avail) {
        // Merge fetched data with defaults (ensure all 7 days present)
        const merged = DEFAULT_SCHEDULES.map((def) => {
          const saved = avail.schedules.find((s) => s.day === def.day);
          return saved ? { ...def, ...saved } : def;
        });
        setSchedules(merged);
        setSlotDuration(avail.slot_duration);
        setIsActive(avail.is_active);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [businessId]);

  const updateSchedule = (day: number, field: keyof DayScheduleInput, value: string | boolean) => {
    setSchedules((prev) =>
      prev.map((s) => (s.day === day ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      await setBusinessAvailability(businessId, {
        schedules,
        slot_duration: slotDuration,
        is_active: isActive,
      });
      toast.success("Availability saved!");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to save — please try again");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <main className="container py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Manage Availability</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {businessName || "Your business"} — set when customers can book appointments
          </p>
        </div>
      </div>

      {/* Online booking toggle */}
      <div className="border rounded-xl p-4 bg-card mb-6 flex items-center justify-between">
        <div>
          <p className="font-medium">Online Booking</p>
          <p className="text-sm text-muted-foreground">Allow customers to book appointments online</p>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      {/* Slot duration */}
      <div className="border rounded-xl p-4 bg-card mb-6">
        <p className="font-medium mb-3">Appointment Duration</p>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSlotDuration(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                slotDuration === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Day-by-day schedule */}
      <div className="border rounded-xl overflow-hidden bg-card mb-8">
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="font-medium text-sm">Weekly Schedule</p>
        </div>
        <div className="divide-y">
          {schedules.map((s) => (
            <div key={s.day} className={`px-4 py-3.5 flex items-center gap-4 ${!s.is_active ? "opacity-50" : ""}`}>
              {/* Day toggle */}
              <div className="flex items-center gap-3 w-32 shrink-0">
                <Switch
                  checked={s.is_active}
                  onCheckedChange={(v) => updateSchedule(s.day, "is_active", v)}
                />
                <span className="text-sm font-medium">{DAY_NAMES[s.day].slice(0, 3)}</span>
              </div>

              {s.is_active ? (
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <input
                    type="time"
                    value={s.start_time}
                    onChange={(e) => updateSchedule(s.day, "start_time", e.target.value)}
                    className="border rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <input
                    type="time"
                    value={s.end_time}
                    onChange={(e) => updateSchedule(s.day, "end_time", e.target.value)}
                    className="border rounded-lg px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
                    {computeSlotCount(s.start_time, s.end_time, slotDuration)} slots/day
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <Button size="lg" onClick={handleSave} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" /> Save Availability
          </>
        )}
      </Button>
    </main>
  );
};

function computeSlotCount(start: string, end: string, duration: number): number {
  const toMins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const diff = toMins(end) - toMins(start);
  return diff <= 0 ? 0 : Math.floor(diff / duration);
}

export default ManageAvailability;
