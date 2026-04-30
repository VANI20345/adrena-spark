import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useLanguageContext } from "@/contexts/LanguageContext";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BookingTimeRange = { start: string; end: string };

function parseHHMMToMinutes(value: string) {
  const [h, m] = value.split(":").map((x) => Number(x));
  return h * 60 + m;
}

function minutesToHHMM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function BookingTimeRangeSelector({
  serviceId,
  selectedDate,
  availableFrom,
  availableTo,
  stepMinutes = 30,
  maxConcurrent = 1,
  value,
  onChange,
}: {
  serviceId: string;
  selectedDate: Date | undefined;
  availableFrom: string;
  availableTo: string;
  stepMinutes?: number;
  maxConcurrent?: number;
  value: BookingTimeRange | null;
  onChange: (range: BookingTimeRange | null) => void;
}) {
  const { t, language } = useLanguageContext();
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Array<{ start: string; end: string }>>([]);

  const startValue = value?.start ?? "";
  const endValue = value?.end ?? "";

  const formatTime12h = (timeHHMM: string) => {
    const [h, m] = timeHHMM.split(":").map((x) => Number(x));
    const d = new Date(1970, 0, 1, h, m, 0);
    return d.toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    const loadBookings = async () => {
      if (!selectedDate) return;
      setLoading(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const { data, error } = await supabase
          .from("service_bookings")
          .select("start_time,end_time")
          .eq("service_id", serviceId)
          .eq("service_date", dateStr)
          .in("status", ["pending", "pending_payment", "confirmed"]);

        if (error) throw error;

        const normalized = (data ?? [])
          .filter((b) => b.start_time && b.end_time)
          .map((b) => ({
            start: String(b.start_time).slice(0, 5),
            end: String(b.end_time).slice(0, 5),
          }));

        setBookings(normalized);
      } catch (e) {
        console.error("Failed to load service bookings", e);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [selectedDate, serviceId]);

  const timeOptions = useMemo(() => {
    const from = parseHHMMToMinutes(availableFrom.slice(0, 5));
    const to = parseHHMMToMinutes(availableTo.slice(0, 5));

    const opts: Array<{ value: string; label: string; minutes: number; isBlocked: boolean }> = [];
    for (let m = from; m <= to; m += stepMinutes) {
      const v = minutesToHHMM(m);
      // Check if this start time is blocked (all capacity used for any possible end time)
      const nextSlot = minutesToHHMM(m + stepMinutes);
      const isBlocked = bookings.filter(b => {
        const bs = parseHHMMToMinutes(b.start);
        const be = parseHHMMToMinutes(b.end);
        return bs < (m + stepMinutes) && be > m;
      }).length >= maxConcurrent;
      
      opts.push({ value: v, label: formatTime12h(v), minutes: m, isBlocked });
    }
    return opts;
  }, [availableFrom, availableTo, stepMinutes, language, bookings, maxConcurrent]);

  const countOverlaps = (startHHMM: string, endHHMM: string) => {
    const start = parseHHMMToMinutes(startHHMM);
    const end = parseHHMMToMinutes(endHHMM);

    return bookings.reduce((count, b) => {
      const bs = parseHHMMToMinutes(b.start);
      const be = parseHHMMToMinutes(b.end);
      return bs < end && be > start ? count + 1 : count;
    }, 0);
  };

  const endOptions = useMemo(() => {
    if (!startValue) return [] as typeof timeOptions;

    const startMinutes = parseHHMMToMinutes(startValue);
    return timeOptions.filter((o) => o.minutes > startMinutes);
  }, [startValue, timeOptions]);

  const endDisabled = (endHHMM: string) => {
    if (!startValue) return true;
    const overlap = countOverlaps(startValue, endHHMM);
    return overlap >= maxConcurrent;
  };

  const startDisabled = (startHHMM: string) => {
    // A start time is disabled if ALL possible end times are blocked
    const startMinutes = parseHHMMToMinutes(startHHMM);
    const possibleEnds = timeOptions.filter(o => o.minutes > startMinutes);
    if (possibleEnds.length === 0) return true;
    
    return possibleEnds.every(endOpt => {
      const overlap = countOverlaps(startHHMM, endOpt.value);
      return overlap >= maxConcurrent;
    });
  };

  if (!selectedDate) {
    return (
      <div className="text-center py-4 text-muted-foreground">{t("serviceBooking.selectDateFirst")}</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {t("serviceBooking.availableSlots")}
        </h4>
        <Badge variant="secondary">
          {Math.max(maxConcurrent - (startValue && endValue ? countOverlaps(startValue, endValue) : 0), 0)} {t("serviceBooking.available")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>{t("serviceBooking.startTime")}</Label>
          <Select
            value={startValue}
            onValueChange={(v) => {
              onChange({ start: v, end: "" });
            }}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("serviceBooking.startTime")} />
            </SelectTrigger>
            <SelectContent>
              {timeOptions
                .slice(0, Math.max(timeOptions.length - 1, 0))
                .map((o) => {
                  const disabled = startDisabled(o.value);
                  return (
                    <SelectItem key={o.value} value={o.value} disabled={disabled}>
                      {o.label} {disabled ? `(${t("serviceBooking.fullyBooked")})` : ''}
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("serviceBooking.endTime")}</Label>
          <Select
            value={endValue}
            onValueChange={(v) => {
              if (!startValue) return;
              onChange({ start: startValue, end: v });
            }}
            disabled={loading || !startValue}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("serviceBooking.endTime")} />
            </SelectTrigger>
            <SelectContent>
              {endOptions.map((o) => {
                const disabled = endDisabled(o.value);
                return (
                  <SelectItem key={o.value} value={o.value} disabled={disabled}>
                    {o.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {startValue && endValue && endDisabled(endValue) ? (
        <p className="text-sm text-destructive">{t("serviceBooking.slotTakenDesc")}</p>
      ) : null}
    </div>
  );
}
