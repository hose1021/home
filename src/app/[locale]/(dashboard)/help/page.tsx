import {
    type Icon,
    IconBell,
    IconBellRinging,
    IconCash,
    IconHome,
    IconLifebuoy,
    IconLock,
    IconReceipt,
    IconTicket,
    IconUsersGroup,
} from "@tabler/icons-react";
import {getTranslations} from "next-intl/server";
import {Link} from "@/i18n/navigation";

type HelpBlock = {
    key: string;
    icon: Icon;
    href?: string;
};

const blocks: HelpBlock[] = [
    {key: "payments", icon: IconCash},
    {key: "debt", icon: IconReceipt},
    {key: "tickets", icon: IconTicket, href: "/tickets"},
    {key: "news", icon: IconBell, href: "/announcements"},
    {key: "board", icon: IconUsersGroup},
    {key: "units", icon: IconHome},
    {key: "notifications", icon: IconBellRinging, href: "/notifications"},
    {key: "security", icon: IconLock, href: "/settings"},
];

export default async function HelpPage() {
    const t = await getTranslations("help");

    return (
        <div className="page-shell">
            <div className="flex items-start gap-4">
                <span className="chip size-11 shrink-0 text-primary"><IconLifebuoy className="size-5" /></span>
                <div className="min-w-0">
                    <h1 className="page-heading">{t("title")}</h1>
                    <p className="page-description">{t("subtitle")}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
                {blocks.map(({key, icon: IconComponent, href}) => {
                    const tile = (
                        <>
                            <span className="chip size-10 shrink-0 text-primary"><IconComponent className="size-5" /></span>
                            <div className="mt-auto">
                                <h2 className="font-heading text-sm font-bold leading-tight">{t(`blocks.${key}.title`)}</h2>
                                <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-muted-foreground">{t(`blocks.${key}.description`)}</p>
                            </div>
                        </>
                    );
                    const className = "surface-panel flex aspect-square flex-col p-4 text-left sm:p-5";
                    return href ? (
                        <Link key={key} href={href} className={`${className} surface-panel--hover`}>
                            {tile}
                        </Link>
                    ) : (
                        <div key={key} className={className}>{tile}</div>
                    );
                })}
            </div>

            <section className="surface-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="min-w-0">
                    <h2 className="font-heading text-base font-bold">{t("contact.title")}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("contact.text")}</p>
                </div>
                <Link href="/tickets" className="inline-flex h-10 shrink-0 items-center justify-center rounded-[4px] bg-[var(--action)] px-6 text-base font-bold text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.24)] transition-shadow hover:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.36)]">
                    {t("contact.action")}
                </Link>
            </section>
        </div>
    );
}
