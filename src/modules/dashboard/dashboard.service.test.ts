import {describe, expect, it} from "vitest";
import {dedupeBoardMembers, type BoardMember} from "./dashboard.service";

const member = (overrides: Partial<BoardMember>): BoardMember => ({
    id: "u1",
    ownerId: null,
    fullName: "Test User",
    entrances: "1",
    ...overrides,
});

describe("dedupeBoardMembers", () => {
    it("keeps one row per user, first row wins", () => {
        const rows = [
            member({id: "u1", fullName: "Carol"}),
            member({id: "u2", fullName: "Dave"}),
            member({id: "u1", fullName: "Carol (dup)"}),
        ];
        const ranked = dedupeBoardMembers(rows);
        expect(ranked).toHaveLength(2);
        expect(ranked.find((r) => r.id === "u1")?.fullName).toBe("Carol");
    });

    it("keeps stable input order", () => {
        const rows = [
            member({id: "u1", fullName: "Zoe"}),
            member({id: "u2", fullName: "Amy"}),
            member({id: "u3", fullName: "Mia"}),
        ];
        expect(dedupeBoardMembers(rows).map((r) => r.id)).toEqual(["u1", "u2", "u3"]);
    });
});
