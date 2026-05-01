import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Brain, Database, ShieldAlert, CheckCircle, Clock, Search, Filter } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { getRiskFlags, getAILogs, getDataJobs, queryKeys } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Tab = 'risk' | 'ai-logs' | 'data-jobs';

const sevTone: Record<string, string> = {
  high: 'bg-destructive-soft text-destructive',
  medium: 'bg-warning-soft text-warning',
  low: 'bg-trust-soft text-trust',
};

const statusTone: Record<string, string> = {
  open: 'bg-destructive-soft text-destructive',
  in_review: 'bg-warning-soft text-warning',
  resolved: 'bg-trust-soft text-trust',
  completed: 'bg-trust-soft text-trust',
  running: 'bg-primary-soft text-primary',
  failed: 'bg-destructive-soft text-destructive',
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('risk');

  const riskFlags = useQuery({ queryKey: queryKeys.riskFlags, queryFn: getRiskFlags });
  const aiLogs = useQuery({ queryKey: queryKeys.aiLogs, queryFn: getAILogs });
  const dataJobs = useQuery({ queryKey: queryKeys.dataJobs, queryFn: getDataJobs });

  return (
    <PageShell>
      <section className="container py-8 md:py-12">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin Control Panel</p>
          <h1 className="mt-1 text-3xl font-[650] tracking-tight md:text-4xl">System Oversight</h1>
          <p className="mt-2 text-sm text-muted-foreground">Monitor risk flags, model confidence, and ingestion health.</p>
        </header>

        <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
          <TabButton active={activeTab === 'risk'} onClick={() => setActiveTab('risk')} icon={<ShieldAlert className="h-4 w-4" />} label="Risk Queue" count={riskFlags.data?.length} />
          <TabButton active={activeTab === 'ai-logs'} onClick={() => setActiveTab('ai-logs')} icon={<Brain className="h-4 w-4" />} label="AI Logs" count={aiLogs.data?.length} />
          <TabButton active={activeTab === 'data-jobs'} onClick={() => setActiveTab('data-jobs')} icon={<Database className="h-4 w-4" />} label="Data Jobs" count={dataJobs.data?.length} />
        </div>

        <div className="min-h-[400px]">
          {activeTab === 'risk' && <RiskTable data={riskFlags.data || []} />}
          {activeTab === 'ai-logs' && <AILogsTable data={aiLogs.data || []} />}
          {activeTab === 'data-jobs' && <DataJobsTable data={dataJobs.data || []} />}
        </div>
      </section>
    </PageShell>
  );
}

function TabButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
        active ? 'border-primary text-primary bg-primary-soft/50' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-soft/50'
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className={cn('ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold font-mono', active ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-muted-foreground')}>
          {count}
        </span>
      )}
    </button>
  );
}

function RiskTable({ data }: { data: any[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-surface-soft/80 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">Place</th>
            <th className="px-4 py-3 font-semibold">Province</th>
            <th className="px-4 py-3 font-semibold">Severity</th>
            <th className="px-4 py-3 font-semibold">Reason</th>
            <th className="px-4 py-3 text-right font-semibold font-mono">Reports</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {data.map((f) => (
            <tr key={f.id} className="border-t border-border hover:bg-surface-soft/50 transition-colors">
              <td className="px-4 py-3">
                <div className="font-semibold">{f.placeName}</div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">{f.placeId}</div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{f.province}</td>
              <td className="px-4 py-3">
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', sevTone[f.severity])}>{f.severity}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{f.reason}</td>
              <td className="px-4 py-3 text-right font-mono font-medium">{f.reportsCount}</td>
              <td className="px-4 py-3">
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', statusTone[f.status])}>{f.status.replace('_', ' ')}</span>
              </td>
              <td className="px-4 py-3">
                <Button size="sm" variant="outline" className="h-7 text-xs">Review</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AILogsTable({ data }: { data: any[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-surface-soft/80 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">Module</th>
            <th className="px-4 py-3 font-semibold">Trace (Input to Output)</th>
            <th className="px-4 py-3 font-semibold">Confidence</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Attribution</th>
          </tr>
        </thead>
        <tbody>
          {data.map((log) => (
            <tr key={log.id} className="border-t border-border hover:bg-surface-soft/50 transition-colors">
              <td className="px-4 py-3">
                <span className="rounded bg-surface-muted px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{log.module}</span>
              </td>
              <td className="px-4 py-3 max-w-md">
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground line-clamp-1 italic italic">" {log.inputSnippet} "</div>
                  <div className="font-medium line-clamp-1">→ {log.outputSnippet}</div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-muted">
                    <div className={cn('h-full', log.confidence > 0.9 ? 'bg-trust' : 'bg-warning')} style={{ width: `${log.confidence * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-mono font-bold">{(log.confidence * 100).toFixed(0)}%</span>
                </div>
              </td>
              <td className="px-4 py-3">
                {log.flagged ? (
                  <span className="inline-flex items-center gap-1 text-destructive font-bold text-[10px] uppercase tracking-wider">
                    <AlertTriangle className="h-3 w-3" /> Flagged
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-trust font-bold text-[10px] uppercase tracking-wider">
                    <CheckCircle className="h-3 w-3" /> Clean
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {log.attributionSources.map((s: string) => (
                    <span key={s} className="text-[9px] font-mono border border-border px-1 rounded bg-background">{s}</span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataJobsTable({ data }: { data: any[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-surface-soft/80 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">Job Name</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Last Run</th>
            <th className="px-4 py-3 text-right font-semibold font-mono">Processed</th>
            <th className="px-4 py-3 font-semibold">Health</th>
          </tr>
        </thead>
        <tbody>
          {data.map((job) => (
            <tr key={job.id} className="border-t border-border hover:bg-surface-soft/50 transition-colors">
              <td className="px-4 py-3 font-semibold">{job.name}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {job.status === 'running' && <Clock className="h-3 w-3 animate-spin text-primary" />}
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', statusTone[job.status])}>
                    {job.status}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(job.lastRunISO).toLocaleString()}</td>
              <td className="px-4 py-3 text-right font-mono font-medium">{job.itemsProcessed}</td>
              <td className="px-4 py-3">
                {job.errors.length > 0 ? (
                  <span className="text-destructive text-[10px] font-bold uppercase tracking-wider">{job.errors.length} Errors</span>
                ) : (
                  <span className="text-trust text-[10px] font-bold uppercase tracking-wider">Healthy</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
