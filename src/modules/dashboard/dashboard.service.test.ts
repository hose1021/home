import {describe, expect, it} from "vitest";
import {rankBoardMembers, type BoardMember} from "./dashboard.service";

const member = (overrides: Partial<BoardMember>): BoardMember => ({
    userId: "u1",
    ownerId: null,
    fullName: "Test User",
    role: "management_member",
    entrances: "1",
    ...overrides,
});

describe("rankBoardMembers", () => {
    it("puts the commandant first", () => {
        const rows = [
            member({userId: "u2", fullName: "Adele Smith"}),
            member({userId: "u1", fullName: "Commandant Doe", role: "commandant"}),
            member({userId: "u3", fullName: "Bob Jones"}),
        ];
        const ranked = rankBoardMembers(rows);
        expect(ranked.map((r) => r.userId)).toEqual(["u1", "u2", "u3"]);
        expect(ranked[0].role).toBe("commandant");
    });

    it("keeps one row per user, commandant row winning over management_member", () => {
        const rows = [
            member({userId: "u1", fullName: "Carol"}),
            member({userId: "u2", fullName: "Dave"}),
            member({userId: "u1", fullName: "Carol", role: "commandant"}),
        ];
        const ranked = rankBoardMembers(rows);
        expect(ranked).toHaveLength(2);
        const carol = ranked.find((r) => r.userId === "u1")!;
        expect(carol.role).toBe("commandant");
        expect(carol.fullName).toBe("Carol");
    });

    it("keeps first row when a duplicate user has no commandant role", () => {
        const rows = [
            member({userId: "u1", fullName: "First Row"}),
            member({userId: "u1", fullName: "Second Row"}),
        ];
        const ranked = rankBoardMembers(rows);
        expect(ranked).toHaveLength(1);
        expect(ranked[0].fullName).toBe("First Row");
    });

    it("keeps stable order among equal-rank members", () => {
        const rows = [
            member({userId: "u1", fullName: "Zoe"}),
            member({userId: "u2", fullName: "Amy"}),
            member({userId: "u3", fullName: "Mia"}),
        ];
        const ranked = rankBoardMembers(rows);
        expect(ranked.map((r) => r.userId)).toEqual(["u1", "u2", "u3"]);
    });

    it("returns an empty array for no rows", () => {
        expect(rankBoardMembers([])).toEqual([]);
    });
});
