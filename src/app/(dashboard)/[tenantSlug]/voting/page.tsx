import {ensureTenantExists} from "@/core/multi-tenant";
import {db} from "@/core/db";
import {votes, votingOptions, votings} from "@/core/db/schema/votings";
import {eq, sql} from "drizzle-orm";
import {getSession} from "@/core/auth/session";
import {getPermissionsForRoles, type Permission} from "@/core/auth/permissions";

export default async function VotingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenantId = await ensureTenantExists(tenantSlug);
  const session = await getSession();
  const permissions: Permission[] = session
    ? getPermissionsForRoles(session.user.roles)
    : [];

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Голосования</h1>
          <p className="text-sm text-zinc-500">Управление голосованиями собственников</p>
        </div>
        {permissions.includes("voting:write") && (
          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
            + Создать голосование
          </button>
        )}
      </div>

      <div className="space-y-3">
        {votingData.map((v) => {
          const totalVotes = v.results.reduce((s, r) => s + r.total, 0);

          return (
            <div key={v.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">{v.title}</h3>
                  <div className="mt-1 flex gap-3 text-xs text-zinc-400">
                    <span>{v.votingType === "absentee" ? "Заочное" : v.votingType === "mixed" ? "Смешанное" : "Очное"}</span>
                    <span>•</span>
                    <span>1 собственник 1 голос</span>
                    <span>•</span>
                    <span className={v.status === "completed" ? "text-green-600" : "text-amber-600"}>{statusLabel(v.status)}</span>
                  </div>

                  {v.results.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {v.results.map((r) => (
                        <div key={r.label} className="flex items-center gap-2 text-sm">
                          <span className="w-20 text-zinc-500">{r.label}</span>
                          <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <div
                              className="h-2 rounded-full bg-zinc-900 dark:bg-zinc-100"
                              style={{ width: totalVotes > 0 ? `${(r.total / totalVotes) * 100}%` : "0%" }}
                            />
                          </div>
                          <span className="w-16 text-right text-xs text-zinc-400">{r.total.toFixed(1)}</span>
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
          <p className="text-sm text-zinc-400">Нет проведённых голосований</p>
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
