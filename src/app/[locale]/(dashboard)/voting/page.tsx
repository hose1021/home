import {db} from "@/core/db";
import {votes, votingOptions, votings} from "@/core/db/schema/votings";
import {eq, sql} from "drizzle-orm";
import {requireTenantPermission} from "@/core/auth/session";
import {Badge} from "@/components/ui/badge";
import {IconChecklist} from "@tabler/icons-react";
import {getTranslations} from "next-intl/server";

export default async function VotingPage() {
  const t = await getTranslations();
  const { tenantId } = await requireTenantPermission("voting:read");

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
          <p className="text-sm text-muted-foreground">{t("voting.eyebrow")}</p>
          <h1 className="page-heading mt-1">{t("voting.title")}</h1>
          <p className="page-description">{t("voting.description")}</p>
        </div>

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
                    <span>{v.votingType === "absentee" ? t("voting.type.absentee") : v.votingType === "mixed" ? t("voting.type.mixed") : t("voting.type.inPerson")}</span>
                    <span>•</span>
                    <span>{t("voting.oneOwnerOneVote")}</span>
                    <span>•</span>
                    <Badge variant="secondary" className={v.status === "completed" ? "text-emerald-600" : "text-amber-600"}>{statusLabel(t, v.status)}</Badge>
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
            <p className="mt-3 font-medium">{t("voting.emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("voting.emptyDescription")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_KEY_BY_STATUS: Record<string, string> = {
  draft: "voting.status.draft",
  active: "voting.status.active",
  paused: "voting.status.paused",
  counting: "voting.status.counting",
  completed: "voting.status.completed",
  cancelled: "voting.status.cancelled",
  archived: "voting.status.archived",
};

function statusLabel(t: (key: string) => string, s: string) {
  const key = STATUS_KEY_BY_STATUS[s];
  return key ? t(key) : s;
}
