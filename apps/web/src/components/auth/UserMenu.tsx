import { useState } from 'react';
import { LogOut, User, LogIn, ShieldCheck, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function UserMenu() {
  const t = useT();
  const { user, login, logout, isLoggingIn } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) {
    return (
      <>
        <Button
          variant="default"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="rounded-full px-4 shadow-sm"
        >
          {t('cta.login')}
        </Button>

        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="card-spotlight w-full max-w-sm rounded-card border border-border bg-card p-8 shadow-2xl animate-in zoom-in-95 duration-300">
              <header className="mb-8 text-center">
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-[650] tracking-tight">{t('auth.title')}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t('auth.subtitle')}</p>
              </header>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-12 justify-start gap-4 rounded-xl border-border/50 hover:border-primary hover:bg-primary-soft transition-all"
                  disabled={isLoggingIn}
                  onClick={() => login('traveler').then(() => setIsOpen(false))}
                >
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-semibold">{t('role.traveler')}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Standard Access</p>
                  </div>
                  {isLoggingIn && <Loader2 className="ml-auto h-4 w-4 animate-spin text-primary" />}
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-12 justify-start gap-4 rounded-xl border-border/50 hover:border-trust hover:bg-trust-soft transition-all"
                  disabled={isLoggingIn}
                  onClick={() => login('admin').then(() => setIsOpen(false))}
                >
                  <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-semibold">{t('role.admin')}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">System Oversight</p>
                  </div>
                  {isLoggingIn && <Loader2 className="ml-auto h-4 w-4 animate-spin text-trust" />}
                </Button>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="mt-6 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden flex-col items-end mr-1 md:flex">
        <p className="text-xs font-bold leading-none">{user.name}</p>
        <p className="text-[10px] text-muted-foreground font-mono">{user.email}</p>
      </div>
      <button
        onClick={logout}
        className="group relative grid h-9 w-9 place-items-center rounded-full bg-surface-soft transition-all hover:bg-destructive-soft hover:text-destructive"
        aria-label={t('cta.logout')}
      >
        <User className="h-4 w-4 group-hover:hidden" />
        <LogOut className="hidden h-4 w-4 group-hover:block" />
        
        {/* Subtle status indicator */}
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-trust" />
      </button>
    </div>
  );
}
