"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

interface DatePickerProps {
  selectedDate: string;
  gameDates?: string[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function DatePicker({ selectedDate, gameDates = [] }: DatePickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const selected = new Date(selectedDate + "T12:00:00");
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const gameDateSet = new Set(gameDates);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const selectDate = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    router.push(`/games?date=${dateStr}`);
    setOpen(false);
  };

  const goToday = () => {
    router.push(`/games?date=${todayStr}`);
    setOpen(false);
  };

  const displayDate = selected.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const goDay = (offset: number) => {
    const d = new Date(selected);
    d.setDate(d.getDate() + offset);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    router.push(`/games?date=${dateStr}`);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => goDay(-1)}
        className="flex items-center justify-center h-9 w-9 border border-white/[0.08] hover:border-indigo-500/25 hover:text-indigo-400 text-text-muted transition-all rounded-lg"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="relative inline-block">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 py-2 border border-indigo-500/15 bg-indigo-500/5 hover:border-indigo-500/25 transition-all rounded-lg"
        >
          <Calendar className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-sm font-semibold font-stat text-indigo-300">{displayDate}</span>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className="absolute right-0 top-full mt-2 z-50 p-4 rounded-xl"
              style={{
                width: 300,
                background: "linear-gradient(145deg, rgba(14, 18, 30, 0.98) 0%, rgba(6, 8, 13, 0.96) 100%)",
                border: "1px solid rgba(129, 140, 248, 0.15)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.7), 0 0 30px rgba(99,102,241,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth} className="p-1 text-text-muted hover:text-indigo-400 transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[12px] font-bold font-stat text-text-primary uppercase tracking-wider">
                  {MONTHS[viewMonth]} {viewYear}
                </span>
                <button onClick={nextMonth} className="p-1 text-text-muted hover:text-indigo-400 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0 mb-1">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-[9px] text-text-muted/40 font-bold uppercase tracking-wider py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isSelected = dateStr === selectedDate;
                  const isToday = dateStr === todayStr;
                  const hasGame = gameDateSet.has(dateStr);

                  return (
                    <button
                      key={day}
                      onClick={() => selectDate(day)}
                      className={`relative h-8 text-[11px] font-stat transition-all rounded ${
                        isSelected
                          ? "bg-indigo-500/20 text-indigo-300 font-bold"
                          : hasGame
                            ? "text-text-primary hover:bg-indigo-500/10 hover:text-indigo-300"
                            : "text-text-muted/30 hover:text-text-muted/60"
                      } ${isToday ? "ring-1 ring-indigo-400/30" : ""}`}
                    >
                      {day}
                      {hasGame && !isSelected && (
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-indigo-400/60" />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={goToday}
                className="w-full mt-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400/70 hover:text-indigo-400 border border-indigo-500/10 hover:border-indigo-500/25 transition-all rounded-lg"
              >
                Today
              </button>
            </div>
          </>
        )}
      </div>
      <button
        onClick={() => goDay(1)}
        className="flex items-center justify-center h-9 w-9 border border-white/[0.08] hover:border-indigo-500/25 hover:text-indigo-400 text-text-muted transition-all rounded-lg"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
