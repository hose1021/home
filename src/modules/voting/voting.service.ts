import {eq, sql} from "drizzle-orm";
import {db} from "@/core/db";
import type {VotingStatus, VotingType} from "@/core/db/schema/enums";
import {votes, votingOptions, votings} from "@/core/db/schema/votings";
import {DomainError} from "@/core/errors/app-error";

export type VotingResultItem = {label: string; total: number};

export type VotingWithResults = {
  id: string;
  title: string;
  votingType: VotingType;
  status: VotingStatus;
  startDate: Date;
  endDate: Date;
  results: VotingResultItem[];
};

export async function listVotingsWithResults(tenantId: string): Promise<VotingWithResults[]> {
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

  const byId = new Map<string, VotingWithResults>();
  for (const row of rows) {
    let voting = byId.get(row.votingId);
    if (!voting) {
      voting = {
        id: row.votingId,
        title: row.title,
        votingType: row.votingType,
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        results: [],
      };
      byId.set(row.votingId, voting);
    }
    if (row.optionId && row.optionLabel) {
      voting.results.push({label: row.optionLabel, total: Number(row.total ?? 0)});
    }
  }

  return Array.from(byId.values());
}

export async function createVoting(tenantId: string, userId: string, input: {
  title: string;
  votingType: VotingType;
  startDate: Date;
  endDate: Date;
  quorumRequired: string;
  options: string[];
}) {
  if (input.endDate < input.startDate) throw new DomainError("invalidDateRange");

  const [voting] = await db.insert(votings).values({
    tenantId,
    title: input.title.trim(),
    votingType: input.votingType,
    countingMethod: "one_per_owner",
    status: "draft",
    startDate: input.startDate,
    endDate: input.endDate,
    quorumRequired: input.quorumRequired,
    createdBy: userId,
  }).returning();
  if (!voting) throw new DomainError("votingNotFound");

  if (input.options.length > 0) {
    await db.insert(votingOptions).values(
      input.options.map((label, index) => ({votingId: voting.id, label, sortOrder: index})),
    );
  }

  return voting;
}
