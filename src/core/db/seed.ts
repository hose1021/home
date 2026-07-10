import "dotenv/config";
import {db} from "./index";
import {tenants} from "./schema/tenants";
import {
    buildings,
    managementMembers,
    meetingAgendas,
    meetings,
    payments,
    protocols,
    protocolSignatures
} from "@/core/db/schema";
import {units} from "./schema/units";
import {owners, ownerships} from "./schema/owners";
import {userRoles, users} from "./schema/users";
import {funds} from "./schema/funds";
import {charges, chargeTemplates} from "./schema/charges";
import {votes, votingOptions, votings} from "./schema/votings";
import {budgetItems, budgets} from "./schema/budgets";
import {and, eq} from "drizzle-orm";
import {createUser, hashPassword} from "../auth/auth";
import type {Role} from "../auth/permissions";

const SEED_TENANT_SLUG = process.env.SEED_TENANT_SLUG ?? "demo";
const SEED_TENANT_NAME = process.env.SEED_TENANT_NAME ?? "Demo Residence";
const SEED_TENANT_ADDRESS = process.env.SEED_TENANT_ADDRESS ?? "Baku, Azerbaijan";
const SEED_ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? "admin.admin";
const SEED_ADMIN_FULLNAME = process.env.SEED_ADMIN_FULLNAME ?? "Admin Admin";
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
const SEED_OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "owner123";
const SEED_BUILDING_NAME = process.env.SEED_BUILDING_NAME ?? "Demo Building A";
const SEED_BUILDING_ADDRESS = process.env.SEED_BUILDING_ADDRESS ?? "Baku";

const numberWords = [
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
    "nineteen", "twenty",
];

function numberWord(number: number) {
    return numberWords[number - 1] ?? "extra";
}

const managementUsernames = ["iman.m", "azer.m", "elvina.x", "sevda.x", "mikayil.m"];

async function seed() {
    console.log("Seeding database...");

    const adminUsername = SEED_ADMIN_USERNAME;

    // ─── TENANT ────────────────────────────────────────────────
    let tenant = (await db.select().from(tenants).where(eq(tenants.slug, SEED_TENANT_SLUG)).limit(1))[0];
    if (!tenant) {
        [tenant] = await db.insert(tenants).values({
            slug: SEED_TENANT_SLUG,
            name: SEED_TENANT_NAME,
            address: SEED_TENANT_ADDRESS
        }).returning();
        console.log(`Tenant created: ${tenant.name}`);
    } else {
        console.log(`Tenant: ${tenant.name} — exists`);
    }

    // ─── ADMIN USER ────────────────────────────────────────────
    let admin = (await db.select().from(users).where(eq(users.username, adminUsername)).limit(1))[0];
    if (!admin) {
        admin = await createUser({
            tenantId: tenant.id,
            username: adminUsername,
            fullName: SEED_ADMIN_FULLNAME,
            password: SEED_ADMIN_PASSWORD,
        });
    } else {
        await db
            .update(users)
            .set({
                fullName: SEED_ADMIN_FULLNAME,
                passwordHash: await hashPassword(SEED_ADMIN_PASSWORD),
                isActive: true,
                updatedAt: new Date(),
            })
            .where(eq(users.id, admin.id));
    }
    console.log(`Admin: ${adminUsername} / ${SEED_ADMIN_PASSWORD}`);

    const [adminOwner] = await db
        .select()
        .from(owners)
        .where(eq(owners.userId, admin.id))
        .limit(1);
    if (!adminOwner) {
        await db.insert(owners).values({
            tenantId: tenant.id,
            userId: admin.id,
            fullName: admin.fullName,
            phone: admin.phone,
        });
    }
    await ensureRole(admin.id, tenant.id, "admin");
    await ensureRole(admin.id, tenant.id, "owner");

    // ─── BUILDING + UNITS ──────────────────────────────────────
    let building = (await db.select().from(buildings).where(eq(buildings.tenantId, tenant.id)).limit(1))[0];
    if (!building) {
        [building] = await db.insert(buildings).values({
            tenantId: tenant.id,
            name: SEED_BUILDING_NAME,
            address: SEED_BUILDING_ADDRESS,
            totalFloors: 5,
            totalEntrances: 1,
            totalArea: "2000.00",
            livingArea: "1500.00"
        }).returning();
        console.log("Building created");
    }

    let allUnits = await db.select().from(units).where(eq(units.buildingId, building.id));
    if (allUnits.length === 0) {
        const unitData = Array.from({length: 20}, (_, i) => ({
            tenantId: tenant.id, buildingId: building.id,
            unitNumber: `${(i + 1).toString().padStart(2, "0")}`,
            entrance: 1, floor: Math.floor(i / 4) + 1, type: "residential" as const,
            area: (60 + (i % 5) * 10 + Math.random() * 5).toFixed(2),
        }));
        allUnits = await db.insert(units).values(unitData).returning();
        console.log(`Created ${allUnits.length} units`);
    }

    // ─── OWNERS ────────────────────────────────────────────────
    const ownerNames = [
        "Əli Həsənov", "Leyla Məmmədova", "Ramin Quliyev", "Aygün Əliyeva",
        "Orxan İsmayılov", "Nərminə Hüseynova", "Tural Səfərov", "Səbinə Kərimova",
        "Elçin Bağırov", "Zəhra Rzayeva",
    ];
    const createdOwners = await db.select().from(owners).where(eq(owners.tenantId, tenant.id));
    const demoPasswordHash = await hashPassword(SEED_OWNER_PASSWORD);
    for (const [index, owner] of createdOwners.entries()) {
        if (owner.userId) continue;
        const [user] = await db.insert(users).values({
            tenantId: tenant.id,
            fullName: owner.fullName,
            phone: owner.phone,
            username: `owner.${numberWord(index + 1)}`,
            passwordHash: demoPasswordHash,
        }).returning();
        await db
            .update(owners)
            .set({userId: user.id})
            .where(eq(owners.id, owner.id));
        owner.userId = user.id;
    }

    for (const [index, name] of ownerNames.entries()) {
        if (!createdOwners.some((owner) => owner.fullName === name)) {
            const user = await createUser({
                tenantId: tenant.id,
                fullName: name,
                phone: `+99450${String(1000000 + Math.floor(Math.random() * 9000000)).slice(0, 7)}`,
                username: `owner.${numberWord(index + 1)}`,
                password: SEED_OWNER_PASSWORD,
            });
            const [owner] = await db.select().from(owners).where(eq(owners.userId, user.id)).limit(1);
            createdOwners.push(owner);
        }
    }

    for (const owner of createdOwners) {
        if (!owner.userId) continue;
        const [ownerRole] = await db
            .select()
            .from(userRoles)
            .where(and(
                eq(userRoles.userId, owner.userId),
                eq(userRoles.role, "owner"),
            ))
            .limit(1);
        if (!ownerRole) {
            await db.insert(userRoles).values({
                userId: owner.userId,
                role: "owner",
                scopeTenantId: tenant.id,
            });
        }
    }

    // ─── OWNERSHIPS ────────────────────────────────────────────
    let createdOwnerships = await db.select().from(ownerships).where(eq(ownerships.tenantId, tenant.id));
    if (createdOwnerships.length === 0) {
        const propertyOwners = createdOwners.filter((owner) => ownerNames.includes(owner.fullName));
        createdOwnerships = await db.insert(ownerships).values(
            allUnits.map((u, i) => ({
                tenantId: tenant.id, ownerId: propertyOwners[i % propertyOwners.length].id, unitId: u.id,
                registeredDate: "2024-01-15", isPrimary: true,
            })),
        ).returning();
        console.log(`Created ${createdOwnerships.length} ownerships`);
    }

    const managementData = [
        {fullName: "İman m.", blockLabel: "Blok 1", position: null, sortOrder: 1},
        {fullName: "Azər m.", blockLabel: "Blok 2", position: null, sortOrder: 2},
        {fullName: "Elvina x.", blockLabel: "Blok 2", position: null, sortOrder: 3},
        {fullName: "Sevda x.", blockLabel: "Blok 2", position: "sədr", sortOrder: 4},
        {fullName: "Mikayıl m.", blockLabel: "Blok 5", position: null, sortOrder: 5},
    ];

    for (const [index, member] of managementData.entries()) {
        let owner = createdOwners.find((item) => item.fullName === member.fullName);
        if (!owner) {
            const user = await createUser({
                tenantId: tenant.id,
                fullName: member.fullName,
                username: managementUsernames[index],
                password: SEED_OWNER_PASSWORD,
            });
            [owner] = await db.select().from(owners).where(eq(owners.userId, user.id)).limit(1);
            createdOwners.push(owner);
        }

        const unit = allUnits[index];
        if (unit) {
            const ownershipExists = createdOwnerships.some(
                (item) => item.ownerId === owner.id && item.unitId === unit.id,
            );
            if (!ownershipExists) {
                const [ownership] = await db.insert(ownerships).values({
                    tenantId: tenant.id,
                    ownerId: owner.id,
                    unitId: unit.id,
                    registeredDate: "2024-01-15",
                    isPrimary: false,
                }).returning();
                createdOwnerships.push(ownership);
            }
        }

        const [existingMember] = await db
            .select()
            .from(managementMembers)
            .where(and(
                eq(managementMembers.tenantId, tenant.id),
                eq(managementMembers.fullName, member.fullName),
            ))
            .limit(1);

        if (existingMember) {
            await db
                .update(managementMembers)
                .set({
                    ownerId: owner.id,
                    blockLabel: member.blockLabel,
                    position: member.position,
                    sortOrder: member.sortOrder,
                    isActive: true,
                    updatedAt: new Date(),
                })
                .where(eq(managementMembers.id, existingMember.id));
        } else {
            await db.insert(managementMembers).values({
                tenantId: tenant.id,
                ownerId: owner.id,
                ...member,
            });
        }
        await ensureRole(
            owner.userId,
            tenant.id,
            "management_member",
            member.fullName === "Sevda x.",
        );
        await ensureRole(owner.userId, tenant.id, "owner");
    }

    let commandant = (await db
        .select()
        .from(users)
        .where(eq(users.username, "kamran.aliyev"))
        .limit(1))[0];
    if (!commandant) {
        commandant = await createUser({
            tenantId: tenant.id,
            username: "kamran.aliyev",
            fullName: "Kamran Əliyev",
            password: "commandant123",
        });
    }
    await ensureRole(commandant.id, tenant.id, "commandant");
    await ensureRole(commandant.id, tenant.id, "owner");

    // ─── FUNDS ─────────────────────────────────────────────────
    let createdFunds = await db.select().from(funds).where(eq(funds.tenantId, tenant.id));
    if (createdFunds.length === 0) {
        createdFunds = await db.insert(funds).values([
            {
                tenantId: tenant.id,
                name: "Əsaslı Fond",
                type: "operating",
                targetAmount: "50000.00",
                currentBalance: "25000.00"
            },
            {
                tenantId: tenant.id,
                name: "Ehtiyat Fondu",
                type: "reserve",
                targetAmount: "20000.00",
                currentBalance: "10000.00"
            },
            {
                tenantId: tenant.id,
                name: "Təmir Fondu",
                type: "repair",
                targetAmount: "30000.00",
                currentBalance: "15000.00"
            },
            {
                tenantId: tenant.id,
                name: "Fövqəladə Hallar Fondu",
                type: "emergency",
                targetAmount: "15000.00",
                currentBalance: "5000.00"
            },
        ]).returning();
        console.log(`Created ${createdFunds.length} funds`);
    }

    // ─── CHARGE TEMPLATES (demo monthly rates) ───
    let templates = await db.select().from(chargeTemplates).where(eq(chargeTemplates.tenantId, tenant.id));
    if (templates.length === 0) {
        templates = await db.insert(chargeTemplates).values([
            {
                tenantId: tenant.id,
                name: "Yaşayış sahəsi xidmət haqqı",
                type: "monthly",
                amount: "40.00",
                calculation: "fixed_per_unit",
                fundId: createdFunds[0].id
            },
            {
                tenantId: tenant.id,
                name: "Qeyri-yaşayış sahəsi xidmət haqqı",
                type: "monthly",
                amount: "100.00",
                calculation: "fixed_per_unit",
                fundId: createdFunds[0].id
            },
            {
                tenantId: tenant.id,
                name: "Təmir fondu yığımı",
                type: "monthly",
                amount: "30.00",
                calculation: "fixed_per_unit",
                fundId: createdFunds[2].id
            },
            {
                tenantId: tenant.id,
                name: "Liftə xidmət",
                type: "monthly",
                amount: "120.00",
                calculation: "fixed_per_unit",
                fundId: createdFunds[0].id
            },
        ]).returning();
        console.log(`Created ${templates.length} charge templates`);
    } else {
        for (const tpl of templates) {
            if (tpl.name.includes("Yaşayış")) {
                await db
                    .update(chargeTemplates)
                    .set({amount: "40.00", calculation: "fixed_per_unit"})
                    .where(eq(chargeTemplates.id, tpl.id));
            }
            if (tpl.name.includes("Təmir fondu")) {
                await db
                    .update(chargeTemplates)
                    .set({amount: "30.00", calculation: "fixed_per_unit"})
                    .where(eq(chargeTemplates.id, tpl.id));
            }
        }
        templates = await db.select().from(chargeTemplates).where(eq(chargeTemplates.tenantId, tenant.id));
    }

    // ─── CHARGES (3 months: May, June, July 2026) ─────────────
    let createdCharges = await db.select().from(charges).where(eq(charges.tenantId, tenant.id));
    if (createdCharges.length === 0) {
        const periods = [
            {year: 2026, month: 5, due: "2026-05-15"},
            {year: 2026, month: 6, due: "2026-06-15"},
            {year: 2026, month: 7, due: "2026-07-15"},
        ];
        const rows: typeof createdCharges = [];

        for (const period of periods) {
            for (const u of allUnits) {
                const ownerId = createdOwnerships.find((o) => o.unitId === u.id)?.ownerId;
                if (!ownerId) continue;
                for (const tpl of templates) {
                    const created = await db.insert(charges).values({
                        tenantId: tenant.id, templateId: tpl.id, unitId: u.id, ownerId,
                        amount: tpl.amount, periodYear: period.year, periodMonth: period.month,
                        dueDate: period.due, status: period.month < 7 ? "paid" : "pending", createdBy: admin.id,
                    }).returning();
                    rows.push(created[0]);
                }
            }
        }
        createdCharges = rows;
        console.log(`Created ${createdCharges.length} charges`);
    }

    // ─── PAYMENTS ──────────────────────────────────────────────
    let createdPayments = await db.select().from(payments).where(eq(payments.tenantId, tenant.id));
    if (createdPayments.length === 0) {
        const paid = createdCharges.filter((c) => c.status === "paid");
        const rows: typeof createdPayments = [];
        for (const c of paid) {
            const created = await db.insert(payments).values({
                tenantId: tenant.id, chargeId: c.id, unitId: c.unitId, ownerId: c.ownerId,
                amount: c.amount, periodYear: c.periodYear, periodMonth: c.periodMonth,
                paymentDate: new Date(c.dueDate),
                paymentMethod: "bank_transfer", status: "confirmed", confirmedBy: admin.id,
            }).returning();
            rows.push(created[0]);
        }
        createdPayments = rows;
        console.log(`Created ${createdPayments.length} payments`);
    }

    // ─── MEETING ──────────────────────────────────────────────
    let meeting = (await db.select().from(meetings).where(eq(meetings.tenantId, tenant.id)).limit(1))[0];
    if (!meeting) {
        [meeting] = await db.insert(meetings).values({
            tenantId: tenant.id, title: "İllik ümumi yığıncaq — 2026",
            meetingType: "annual", meetingFormat: "mixed", status: "completed",
            proposedDate: new Date("2026-03-15"), actualDate: new Date("2026-03-20"),
            location: building.address, chairmanId: admin.id, secretaryId: admin.id, createdBy: admin.id,
        }).returning();
        console.log("Meeting: İllik ümumi yığıncaq — 2026");

        await db.insert(meetingAgendas).values([
            {meetingId: meeting.id, title: "2025-ci il hesabatının təsdiqi", sortOrder: 1},
            {meetingId: meeting.id, title: "2026-cı il büdcəsinin təsdiqi", sortOrder: 2},
            {meetingId: meeting.id, title: "Təmir işlərinin planı", sortOrder: 3},
        ]);
        console.log("Meeting agendas created");
    }

    // ─── VOTING ────────────────────────────────────────────────
    let voting = (await db.select().from(votings).where(eq(votings.tenantId, tenant.id)).limit(1))[0];
    if (!voting) {
        [voting] = await db.insert(votings).values({
            tenantId: tenant.id, meetingId: meeting?.id ?? null,
            title: "2026-cı il büdcəsinin təsdiq edilməsi",
            votingType: "absentee", countingMethod: "one_per_owner",
            status: "completed", startDate: new Date("2026-03-01"), endDate: new Date("2026-03-15"),
            quorumRequired: "50.00", quorumAchieved: "85.00",
            supermajority: false, maxVotesPerOwner: 1, createdBy: admin.id,
        }).returning();
        console.log("Voting: 2026 büdcə səsverməsi");

        const opts = await db.insert(votingOptions).values([
            {votingId: voting.id, label: "Lehinə", sortOrder: 1},
            {votingId: voting.id, label: "Əleyhinə", sortOrder: 2},
            {votingId: voting.id, label: "Bitərəf", sortOrder: 3},
        ]).returning();

        const ownerVotes = Array.from(
            new Map(createdOwnerships.map((ownership) => [ownership.ownerId, ownership])).values(),
        );

        await db.insert(votes).values(
            ownerVotes.map((ownership, i) => ({
                votingId: voting.id,
                optionId: i < 8 ? opts[0].id : i < 9 ? opts[1].id : opts[2].id,
                ownerId: ownership.ownerId, unitId: ownership.unitId, voteWeight: "1.00",
                votedBy: admin.id,
            })),
        );
        console.log(`Votes cast: ${ownerVotes.length}`);
    }

    // ─── PROTOCOL ──────────────────────────────────────────────
    let protocol = (await db.select().from(protocols).where(eq(protocols.tenantId, tenant.id)).limit(1))[0];
    if (!protocol) {
        [protocol] = await db.insert(protocols).values({
            tenantId: tenant.id, meetingId: meeting?.id ?? null,
            protocolNumber: "001/2026", status: "signed",
            content: JSON.stringify({
                decisions: ["2025 hesabatı təsdiq edildi", "2026 büdcəsi təsdiq edildi", "Təmir planı təsdiq edildi"],
                votingResults: "8 lehinə, 1 əleyhinə, 1 bitərəf"
            }),
            createdBy: admin.id, signedAt: new Date("2026-03-20"),
        }).returning();
        console.log("Protocol created");

        await db.insert(protocolSignatures).values({
            protocolId: protocol.id,
            userId: admin.id,
            signature: "demo-asan-imza-signature"
        });
        console.log("Protocol signed");
    }

    // ─── BUDGET (2026) — demo smeta ───────────
    let budget = (await db.select().from(budgets).where(eq(budgets.tenantId, tenant.id)).limit(1))[0];
    if (!budget) {
        [budget] = await db.insert(budgets).values({
            tenantId: tenant.id, year: 2026, status: "approved",
            totalIncome: "10000.00", totalExpense: "10000.00",
            approvedBy: admin.id, approvedAt: new Date("2026-03-20"),
        }).returning();
        console.log("Budget 2026 created");

        await db.insert(budgetItems).values([
            // GƏLİRLƏR (Income)
            {
                budgetId: budget.id,
                accountCode: "4010",
                plannedAmount: "8800.00",
                actualAmount: "4400.00",
                notes: "167 Mənzil × 0.40 AZN/m² × 22.000 m² (6 ay)"
            },
            {
                budgetId: budget.id,
                accountCode: "4020",
                plannedAmount: "1200.00",
                actualAmount: "600.00",
                notes: "12 Obyekt × 50-200 AZN (6 ay)"
            },
            // XƏRCLƏR (Expenses)
            {
                budgetId: budget.id,
                accountCode: "5010",
                plannedAmount: "1000.00",
                actualAmount: "600.00",
                notes: "Təsərrüfat müdiri (Komendant) — 6 ay"
            },
            {
                budgetId: budget.id,
                accountCode: "5011",
                plannedAmount: "700.00",
                actualAmount: "420.00",
                notes: "Texnik-fəhlə — 6 ay"
            },
            {
                budgetId: budget.id,
                accountCode: "5020",
                plannedAmount: "1800.00",
                actualAmount: "1080.00",
                notes: "3 nəfər növbəli Mühafizə — 6 ay"
            },
            {
                budgetId: budget.id,
                accountCode: "5012",
                plannedAmount: "1800.00",
                actualAmount: "1080.00",
                notes: "3 nəfər Xadimə — 6 ay"
            },
            {
                budgetId: budget.id,
                accountCode: "5030",
                plannedAmount: "400.00",
                actualAmount: "240.00",
                notes: "Azərişıq (ümumi sahə) — 6 ay"
            },
            {
                budgetId: budget.id,
                accountCode: "5040",
                plannedAmount: "120.00",
                actualAmount: "72.00",
                notes: "Azərsu (ümumi sahə) — 6 ay"
            },
            {
                budgetId: budget.id,
                accountCode: "5100",
                plannedAmount: "1200.00",
                actualAmount: "720.00",
                notes: "10 ədəd Lift — 6 ay"
            },
            {
                budgetId: budget.id,
                accountCode: "5990",
                plannedAmount: "650.00",
                actualAmount: "390.00",
                notes: "Ə/h vergiləri — 6 ay"
            },
            {
                budgetId: budget.id,
                accountCode: "5991",
                plannedAmount: "300.00",
                actualAmount: "180.00",
                notes: "Daimi aylıq təsərrüfat xərcləri — 6 ay"
            },
            {
                budgetId: budget.id,
                accountCode: "5080",
                plannedAmount: "400.00",
                actualAmount: "240.00",
                notes: "Kənar Mühasib xidməti — 6 ay"
            },
            {
                budgetId: budget.id,
                accountCode: "3020",
                plannedAmount: "1630.00",
                actualAmount: "978.00",
                notes: "Rezerv fondu — 6 ay"
            },
        ]);
        console.log("Budget items created");
    }

    console.log(`\n✓ Seed complete!
  Owners:     ${createdOwners.length}
  Ownerships: ${createdOwnerships.length}
  Funds:      ${createdFunds.length}
  Templates:  ${templates.length}
  Charges:    ${createdCharges.length}
  Payments:   ${createdPayments.length}
  Meeting:    ${meeting ? "✓" : "—"}
  Voting:     ${voting ? "✓" : "—"}
  Protocol:   ${protocol ? "✓" : "—"}
  Budget:     ${budget ? "✓" : "—"}`);
    process.exit(0);
}

async function ensureRole(
    userId: string,
    tenantId: string,
    role: Role,
    isChairman = false,
) {
    const [existingRole] = await db
        .select()
        .from(userRoles)
        .where(and(
            eq(userRoles.userId, userId),
            eq(userRoles.role, role),
            eq(userRoles.scopeTenantId, tenantId),
        ))
        .limit(1);

    if (existingRole) {
        if (
            role === "management_member" &&
            existingRole.isChairman !== isChairman
        ) {
            await db
                .update(userRoles)
                .set({isChairman})
                .where(eq(userRoles.id, existingRole.id));
        }
    } else {
        await db.insert(userRoles).values({
            userId,
            role,
            isChairman,
            scopeTenantId: tenantId,
        });
    }
}

seed().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
