import {db} from "@/core/db";
import {votes, votingOptions, votings} from "@/core/db/schema/votings";
import {eq, sql} from "drizzle-orm";
import {requireTenantPermission} from "@/core/auth/session";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {IconChecklist, IconPlus} from "@tabler/icons-react";

export default async function VotingPage() {
  const { session, tenantId } = await requireTenantPermission("voting:read");
  const permissions: Permission[] = getPermissionsForRoles(session.user.roles);

  const rows = await db
    .select({
      votingId: votings.id,
      title: votings.title,
      votingType: votings.votingType,
      status: votings.status,
      startDate: votings.startDate,
      endDate: votings.endDate,
      optionId: votingOptions.id,
      optionLabel: votingOptions.label,
      total: sql<string>`coalesce(sum(${votes.voteWeight}::numeric), 0)`.as("total"),
    })
    .from(votings)
    .leftJoin(votingOptions, eq(votingOptions.votingId, votings.id))
    .leftJoin(votes, eq(votes.optionId, votingOptions.id))
    .where(eq(votings.tenantId, tenantId))
    .groupBy(votings.id, votingOptions.id)
    .orderBy(votings.startDate, votingOptions.sortOrder);

  const votingMap = new Map<string, {
    id: string;
    title: string;
    votingType: string;
    status: string;
    startDate: Date;
    endDate: Date;
    results: { label: string; total: number }[];
  }>();

  for (const r of rows) {
    let v = votingMap.get(r.votingId);
    if (!v) {
      v = {
        id: r.votingId,
        title: r.title,
        votingType: r.votingType,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        results: [],
      };
      votingMap.set(r.votingId, v);
    }
    if (r.optionId && r.optionLabel) {
      v.results.push({ label: r.optionLabel, total: Number(r.total ?? 0) });
    }
  }

  const votingData = Array.from(votingMap.values());

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Принятие решений</p>
          <h1 className="page-heading mt-1">Голосования</h1>
          <p className="page-description">Управление голосованиями собственников</p>
        </div>
        {permissions.includes("voting:write") && (
          <Button><IconPlus /> Создать голосование</Button>
        )}
      </div>

      <div className="space-y-3">
        {votingData.map((v) => {
          const totalVotes = v.results.reduce((s, r) => s + r.total, 0);

          return (
            <div key={v.id} className="surface-panel p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">{v.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{v.votingType === "absentee" ? "Заочное" : v.votingType === "mixed" ? "Смешанное" : "Очное"}</span>
                    <span>•</span>
                    <span>1 собственник 1 голос</span>
                    <span>•</span>
                    <Badge variant="secondary" className={v.status === "completed" ? "text-emerald-600" : "text-amber-600"}>{statusLabel(v.status)}</Badge>
                  </div>

                  {v.results.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {v.results.map((r) => (
                        <div key={r.label} className="flex items-center gap-2 text-sm">
                          <span className="w-20 text-muted-foreground">{r.label}</span>
                          <div className="h-2 flex-1 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: totalVotes > 0 ? `${(r.total / totalVotes) * 100}%` : "0%" }}
                            />
                          </div>
                          <span className="w-16 text-right text-xs text-muted-foreground">{r.total.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {votingData.length === 0 && (
          <div className="surface-panel flex flex-col items-center border-dashed px-6 py-16 text-center">
            <IconChecklist className="size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">Голосований пока нет</p>
            <p className="mt-1 text-sm text-muted-foreground">Созданные голосования появятся здесь.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    draft: "Черновик", active: "Активно", paused: "Приостановлено",
    counting: "Подсчёт", completed: "Завершено", cancelled: "Отменено", archived: "Архив",
  };
  return map[s] ?? s;
}
