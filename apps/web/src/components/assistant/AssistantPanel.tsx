import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, X, Send, ShieldAlert, MapPin, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { postChat, getPlace } from '@/lib/api/client';
import type { ChatMessage, ChatResponseVM, ChatSuggestedAction } from '@/lib/api/types';

interface AssistantTurn {
  user: ChatMessage;
  response?: ChatResponseVM;
  loading?: boolean;
}

const SEED_PROMPTS_EN = [
  'Is Ao Bo Thong Lang trusted?',
  'Find quieter alternatives near Hua Hin',
  'Are prices fair at Pan Nam Ron?',
  'Etiquette tips for visiting temples',
];
const SEED_PROMPTS_TH = [
  'อ่าวบ่อทองหลางน่าเชื่อถือไหม',
  'หาที่เที่ยวเงียบ ๆ แถวหัวหิน',
  'ราคาที่ปั่นน้ำร้อนเป็นธรรมไหม',
  'มารยาทการเข้าวัดมีอะไรบ้าง',
];

export function AssistantPanel({ currentPlaceId }: { currentPlaceId?: string } = {}) {
  const t = useT();
  const lang = useAppStore((s) => s.language);
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const idx = turns.length;
    setTurns((prev) => [...prev, { user: userMsg, loading: true }]);

    const history: ChatMessage[] = turns.flatMap((t) =>
      t.response ? [t.user, { role: 'assistant', content: t.response.reply } as ChatMessage] : [t.user],
    );

    try {
      const response = await postChat({
        messages: [...history, userMsg],
        context: { currentPlaceId, pagePath: location.pathname },
      });
      setTurns((prev) => prev.map((t, i) => (i === idx ? { user: userMsg, response, loading: false } : t)));
    } catch {
      setTurns((prev) =>
        prev.map((t, i) =>
          i === idx
            ? {
                user: userMsg,
                loading: false,
                response: {
                  reply: lang === 'th' ? 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง' : 'Something went wrong. Please try again.',
                },
              }
            : t,
        ),
      );
    }
  };

  const onAction = async (action: ChatSuggestedAction, placeIds?: string[]) => {
    const id = placeIds?.[0];
    switch (action) {
      case 'Open Place Detail':
      case 'View Trust Sources':
        if (id) navigate(`/place/${encodeURIComponent(id)}`);
        break;
      case 'View Fair Price':
      case 'View Cultural Context':
        if (id) navigate(`/place/${encodeURIComponent(id)}#${action.includes('Price') ? 'fair-price' : 'cultural'}`);
        break;
      case 'Find Safer Detours':
        navigate('/recommendations');
        break;
      case 'Report Risk':
        if (id) navigate(`/place/${encodeURIComponent(id)}#report`);
        else navigate('/admin');
        break;
    }
    setOpen(false);
  };

  const seeds = lang === 'th' ? SEED_PROMPTS_TH : SEED_PROMPTS_EN;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={lang === 'th' ? 'ผู้ช่วย AI' : 'AI Assistant'}
        className={cn(
          'fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        )}
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{lang === 'th' ? 'ผู้ช่วย AI' : 'AI Assistant'}</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border bg-surface-soft/60 p-4">
            <SheetTitle className="flex items-center gap-2 text-base">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
              </span>
              {lang === 'th' ? 'ผู้ช่วย AI (สำหรับสอบถามเพิ่มเติม)' : 'AI Assistant (supportive)'}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {lang === 'th'
                ? 'ใช้เพื่อสอบถามเรื่องความน่าเชื่อถือและบริบทวัฒนธรรม ไม่ใช่การรับประกันความปลอดภัย'
                : 'Ask follow-up questions about trust, fair price, and culture. Not a guarantee of safety.'}
            </SheetDescription>
          </SheetHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {turns.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {lang === 'th' ? 'ลองถาม' : 'Try asking'}
                </p>
                <div className="flex flex-col gap-2">
                  {seeds.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-soft"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {turns.map((turn, i) => (
                <TurnView
                  key={i}
                  turn={turn}
                  lang={lang}
                  onAction={(a) => onAction(a, turn.response?.linkedPlaceIds)}
                />
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-border bg-background p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder={
                  lang === 'th'
                    ? 'ถามเรื่องสถานที่ ราคา หรือมารยาท...'
                    : 'Ask about a place, pricing, or etiquette...'
                }
                className="min-h-[40px] flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                maxLength={500}
              />
              <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              {lang === 'th'
                ? 'คำตอบเป็นการช่วยตัดสินใจ ไม่ใช่การรับประกันความปลอดภัย'
                : 'Responses are supportive guidance — not a guarantee of safety.'}
            </p>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

function TurnView({
  turn,
  lang,
  onAction,
}: {
  turn: AssistantTurn;
  lang: 'en' | 'th';
  onAction: (action: ChatSuggestedAction) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
        {turn.user.content}
      </div>

      {turn.loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {lang === 'th' ? 'กำลังคิด...' : 'Thinking...'}
        </div>
      )}

      {turn.response && <ResponseCard response={turn.response} lang={lang} onAction={onAction} />}
    </div>
  );
}

function ResponseCard({
  response,
  lang,
  onAction,
}: {
  response: ChatResponseVM;
  lang: 'en' | 'th';
  onAction: (action: ChatSuggestedAction) => void;
}) {
  const text = lang === 'th' && response.replyTh ? response.replyTh : response.reply;

  const riskBadge = (() => {
    switch (response.riskHint) {
      case 'high_risk':
        return { label: lang === 'th' ? 'ความเสี่ยงสูง' : 'High risk', tone: 'bg-destructive/10 text-destructive' };
      case 'review_suggested':
        return { label: lang === 'th' ? 'แนะนำให้ตรวจสอบ' : 'Review suggested', tone: 'bg-warning/10 text-warning-foreground' };
      case 'not_guaranteed_safety':
        return { label: lang === 'th' ? 'ไม่รับประกันความปลอดภัย' : 'Not guaranteed safety', tone: 'bg-warning/10 text-warning-foreground' };
      case 'low_risk':
        return { label: lang === 'th' ? 'ความเสี่ยงต่ำ' : 'Low risk', tone: 'bg-success/10 text-success-foreground' };
      default:
        return null;
    }
  })();

  return (
    <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-card p-4 shadow-sm transition-all duration-300 animate-in fade-in zoom-in-95">
      {riskBadge && (
        <div
          className={cn(
            'mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            riskBadge.tone,
          )}
        >
          <ShieldAlert className="h-3 w-3" aria-hidden />
          {riskBadge.label}
        </div>
      )}

      <p className="text-sm font-medium leading-relaxed text-foreground">{text}</p>

      {/* Structured reasoning for AI decisions */}
      <div className="mt-4 rounded-lg bg-surface-soft/50 border border-border/50 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-local-value" />
          {lang === 'th' ? 'ทำไมถึงแนะนำ?' : 'Why this?'}
        </p>
        <ul className="space-y-1.5">
          <li className="text-xs text-foreground flex gap-2">
            <span className="text-trust">•</span>
            <span>{lang === 'th' ? 'ผ่านการตรวจสอบจาก TAT Registry' : 'Verified via TAT Registry'}</span>
          </li>
          <li className="text-xs text-foreground flex gap-2">
            <span className="text-trust">•</span>
            <span>{lang === 'th' ? 'ราคาสอดคล้องกับค่าเฉลี่ยพื้นที่' : 'Pricing consistent with area average'}</span>
          </li>
        </ul>
      </div>

      {response.linkedPlaceIds && response.linkedPlaceIds.length > 0 && (
        <LinkedPlaces ids={response.linkedPlaceIds} />
      )}

      {response.suggestedActions && response.suggestedActions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-3">
          {response.suggestedActions.map((a) => (
            <button
              key={a}
              onClick={() => onAction(a)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm active:scale-95"
            >
              {translateAction(a, lang)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LinkedPlaces({ ids }: { ids: string[] }) {
  const navigate = useNavigate();
  const lang = useAppStore((s) => s.language);
  const [places, setPlaces] = useState<{ id: string; name: string; province: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(ids.map((id) => getPlace(id))).then((res) => {
      if (cancelled) return;
      setPlaces(
        res
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map((p) => ({
            id: p.id,
            name: lang === 'th' && p.nameTh ? p.nameTh : p.name,
            province: lang === 'th' && p.provinceNameTh ? p.provinceNameTh : p.provinceName,
          })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [ids, lang]);

  if (places.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      {places.map((p) => (
        <button
          key={p.id}
          onClick={() => navigate(`/place/${encodeURIComponent(p.id)}`)}
          className="flex w-full items-center gap-2 rounded-md bg-surface-soft px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-primary-soft"
        >
          <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="font-medium">{p.name}</span>
          <span className="ml-auto text-muted-foreground">{p.province}</span>
        </button>
      ))}
    </div>
  );
}

function translateAction(a: ChatSuggestedAction, lang: 'en' | 'th'): string {
  if (lang !== 'th') return a;
  switch (a) {
    case 'Open Place Detail': return 'เปิดรายละเอียดสถานที่';
    case 'View Fair Price': return 'ดูราคาที่เป็นธรรม';
    case 'View Cultural Context': return 'ดูบริบทวัฒนธรรม';
    case 'View Trust Sources': return 'ดูแหล่งความน่าเชื่อถือ';
    case 'Find Safer Detours': return 'หาเส้นทางที่ปลอดภัยกว่า';
    case 'Report Risk': return 'แจ้งความเสี่ยง';
  }
}
