import type {ReactNode} from "react";
import {FinanceNav} from "@/modules/finance/components/finance-nav";

export default function FinanceLayout({children}: {children: ReactNode}) {
    return (
        <div className="page-shell">
            <FinanceNav />
            {children}
        </div>
    );
}
