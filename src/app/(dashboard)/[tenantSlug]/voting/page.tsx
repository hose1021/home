import { ensureTenantExists } from "@/core/multi-tenant";
import { db } from "@/core/db";
import { votings, votingOptions, votes } from "@/core/db/schema/votings";
import { eq, sql } from "drizzle-orm";

export default async function VotingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const tenantId = await ensureTenantExists(tenantSlug);

  const votingList = await db
    .select({
      id: votings.id,
      title: votings.title,
      votingType: votings.votingType,
      status: votings.status,
      startDate: votings.startDate,
      endDate: votings.endDate,
    })
    .from(votings)
    .where(eq(votings.tenantId, tenantId))
    .orderBy(votings.startDate);

  const votingData = await Promise.all(
    votingList.map(async (v) => {
      const opts = await db
        .select({ id: votingOptions.id, label: votingOptions.label })
        .from(votingOptions)
        .where(eq(votingOptions.votingId, v.id));

      const results = await Promise.all(
        opts.map(async (o) => {
          const [row] = await db
            .select({ total: sql<string>`coalesce(sum(${votes.voteWeight}::numeric), 0)` })
            .from(votes)
            .where(eq(votes.optionId, o.id));
          return { label: o.label, total: Number(row?.total ?? 0) };
        }),
      );

      return { ...v, results };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Голосования</h1>
          <p className="text-sm text-zinc-500">Управление голосованиями собственников</p>
        </div>
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
          + Создать голосование
        </button>
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
