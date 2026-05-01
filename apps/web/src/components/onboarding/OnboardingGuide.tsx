import { useEffect, useMemo, useState } from "react";
import { HelpCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

type TourStep = {
  route: string;
  selector: string;
  title: string;
  detail: string;
};

const STEPS: TourStep[] = [
  {
    route: "/",
    selector: '[data-tour="home-search"]',
    title: "Home Search",
    detail:
      "Start on Home. Search places or intent here to quickly get trusted suggestions.",
  },
  {
    route: "/explore",
    selector: '[data-tour="nav-explore"]',
    title: "Explore",
    detail: "Start here to browse trusted places by category and province.",
  },
  {
    route: "/explore",
    selector: '[data-tour="place-view-trusted"]',
    title: "View Trusted",
    detail: "Open a place card to see full trust, fair price, and cultural context.",
  },
  {
    route: "/place/p1",
    selector: '[data-tour="save-itinerary"]',
    title: "Save Slot",
    detail: "Pick date, time (24h), and duration (30-minute steps) for this place.",
  },
  {
    route: "/itinerary",
    selector: '[data-tour="itinerary-calendar"]',
    title: "Plan Timeline",
    detail: "Drag places into each day and adjust time with arrows.",
  },
  {
    route: "/itinerary",
    selector: '[data-tour="itinerary-sync-google"]',
    title: "Sync Google Calendar",
    detail: "Create Google Calendar events from your saved timeline.",
  },
  {
    route: "/itinerary",
    selector: '[data-tour="itinerary-download-ics"]',
    title: "Download .ics",
    detail: "Export your trip as an ICS file for any calendar app.",
  },
];

const TOUR_STATE_KEY = "allway_tour_state_v1";

export function OnboardingGuide() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const step = STEPS[stepIndex];

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(TOUR_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { open?: boolean; stepIndex?: number };
      if (typeof parsed.open === "boolean") setOpen(parsed.open);
      if (
        typeof parsed.stepIndex === "number" &&
        parsed.stepIndex >= 0 &&
        parsed.stepIndex < STEPS.length
      ) {
        setStepIndex(parsed.stepIndex);
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(
      TOUR_STATE_KEY,
      JSON.stringify({ open, stepIndex }),
    );
  }, [open, stepIndex]);

  useEffect(() => {
    if (!open) return;
    if (location.pathname !== step.route) navigate(step.route);
  }, [open, step.route, location.pathname, navigate]);

  useEffect(() => {
    if (!open) return;
    let ticks = 0;
    const timer = window.setInterval(() => {
      const node = document.querySelector(step.selector) as HTMLElement | null;
      if (!node) {
        ticks += 1;
        if (ticks > 20) {
          setRect(null);
          window.clearInterval(timer);
        }
        return;
      }
      node.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      setRect(node.getBoundingClientRect());
      window.clearInterval(timer);
    }, 120);
    return () => window.clearInterval(timer);
  }, [open, stepIndex, step.selector, location.pathname]);

  const tooltipStyle = useMemo(() => {
    if (!rect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const top = Math.min(window.innerHeight - 220, rect.bottom + 14);
    const left = Math.min(window.innerWidth - 360, Math.max(12, rect.left));
    return { top: `${top}px`, left: `${left}px` };
  }, [rect]);

  const next = () => {
    if (stepIndex >= STEPS.length - 1) {
      setOpen(false);
      setStepIndex(0);
      sessionStorage.removeItem(TOUR_STATE_KEY);
      return;
    }
    setStepIndex((v) => v + 1);
  };

  return (
    <>
      <button
        onClick={() => {
          setStepIndex(0);
          setOpen(true);
        }}
        className="relative grid h-9 w-9 place-items-center rounded-full bg-surface-soft text-foreground transition-colors hover:bg-surface-muted"
        aria-label="Start guided tutorial"
        title="Start guided tutorial"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[120]">
          <div className="absolute inset-0 bg-black/65" />
          {rect && (
            <div
              className="pointer-events-none absolute rounded-lg border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
              style={{
                top: rect.top - 6,
                left: rect.left - 6,
                width: rect.width + 12,
                height: rect.height + 12,
              }}
            />
          )}
          <div
            className="absolute w-[340px] rounded-lg border border-border bg-background p-4 shadow-2xl"
            style={tooltipStyle}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Step {stepIndex + 1} / {STEPS.length}
            </p>
            <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {rect ? step.detail : "Preparing this step..."}
            </p>
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => {
                  setOpen(false);
                  sessionStorage.removeItem(TOUR_STATE_KEY);
                }}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
              >
                Skip
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStepIndex((v) => Math.max(0, v - 1))}
                  disabled={stepIndex === 0}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={next}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  {stepIndex === STEPS.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
