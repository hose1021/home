import {IconChecklist} from "@tabler/icons-react";
import {getTranslations} from "next-intl/server";
import {Badge} from "@/components/ui/badge";
import {sessionAllows} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {VOTING_STATUS_TONE, VOTING_TYPE_KEYS} from "@/modules/voting/voting.constants";
import {listVotingsWithResults} from "@/modules/voting/voting.service";
import {VotingCreateButton} from "./voting-create-button";

export default async function VotingPage() {
  const t = await getTranslations("voting");
  const {session, tenantId} = await requireTenantPermission("voting:read");
  const canManage = sessionAllows(session, "voting:write");

  const votingData = await listVotingsWithResults(tenantId);

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="page-heading mt-1">{t("title")}</h1>
          <p className="page-description">{t("description")}</p>
        </div>
        {canManage && <VotingCreateButton />}
      </div>

      <div className="space-y-3">
        {votingData.map((v) => {
          const totalVotes = v.results.reduce((sum, r) => sum + r.total, 0);

          return (
            <div key={v.id} className="surface-panel p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">{v.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{t(`type.${VOTING_TYPE_KEYS[v.votingType]}`)}</span>
                    <span>•</span>
                    <span>{t("oneOwnerOneVote")}</span>
                    <span>•</span>
                    <Badge variant="secondary" className={VOTING_STATUS_TONE[v.status]}>{t(`status.${v.status}`)}</Badge>
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
            <p className="mt-3 font-medium">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("emptyDescription")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
