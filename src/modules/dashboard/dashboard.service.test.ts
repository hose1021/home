import {describe, expect, it} from "vitest";
import {rankBoardMembers, type BoardMember} from "./dashboard.service";

const member = (overrides: Partial<BoardMember>): BoardMember => ({
    userId: "u1",
    ownerId: null,
    fullName: "Test User",
    entrances: "1",
    ...overrides,
});

describe("rankBoardMembers", () => {
    it("keeps one row per user, first row wins", () => {
        const rows = [
            member({userId: "u1", fullName: "Carol"}),
            member({userId: "u2", fullName: "Dave"}),
            member({userId: "u1", fullName: "Carol (dup)"}),
        ];
        const ranked = rankBoardMembers(rows);
        expect(ranked).toHaveLength(2);
        expect(ranked.find((r) => r.userId === "u1")?.fullName).toBe("Carol");
    });

    it("keeps stable input order", () => {
        const rows = [
            member({userId: "u1", fullName: "Zoe"}),
            member({userId: "u2", fullName: "Amy"}),
            member({userId: "u3", fullName: "Mia"}),
        ];
        expect(rankBoardMembers(rows).map((r) => r.userId)).toEqual(["u1", "u2", "u3"]);
    });

    it("returns an empty array for no rows", () => {
        expect(rankBoardMembers([])).toEqual([]);
    });
});
