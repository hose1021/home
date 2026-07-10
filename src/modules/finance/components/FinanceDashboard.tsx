"use client";

import {useState} from "react";
import {Tabs, TabsList, TabsTrigger, TabsContent} from "@/components/ui/tabs";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Table, TableHeader, TableBody, TableRow, TableHead, TableCell} from "@/components/ui/table";
import {ChargeGenerateDialog} from "./ChargeGenerateForm";
import {PaymentDialog} from "./PaymentForm";
import {FundCreateDialog, FUND_TYPES} from "./FundCreateForm";

type ChargeRow = {
  id: string;
  amount: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  status: string;
  unitNumber: string | null;
  entrance: number | null;
  floor: number | null;
  ownerName: string | null;
  templateName: string | null;
};

type PaymentRow = {
  id: string;
  amount: string;
  periodYear: number;
  periodMonth: number;
  paymentDate: Date;
  paymentMethod: string;
  referenceNo: string | null;
  status: string;
  notes: string | null;
  unitNumber: string | null;
  entrance: number | null;
  floor: number | null;
  ownerName: string | null;
};

type Fund = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  targetAmount: string | null;
  currentBalance: string;
};

type UnitOption = {
  id: string;
  unitNumber: string;
  entrance: number;
  floor: number;
  ownerName: string | null;
  ownerId: string | null;
};

const MONTHS = ["", "Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

const CHARGE_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "К оплате", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  paid: { label: "Оплачено", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  partially_paid: { label: "Частично", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  overdue: { label: "Просрочено", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  cancelled: { label: "Отменено", className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" },
};

const PAYMENT_METHODS: Record<string, string> = {
  cash: "Наличные",
  bank_transfer: "Банк. перевод",
  card: "Карта",
  e_manat: "E-Manat",
  pos_terminal: "POS-терминал",
};

const FUND_TYPE_LABELS: Record<string, string> = Object.fromEntries(FUND_TYPES.map((f) => [f.value, f.label]));

export function FinanceDashboard({
  slug,
  summary,
  charges,
  payments,
  funds,
  templates,
  units,
  canGenerateCharges,
  canRegisterPayments,
  canManageFunds,
}: {
  slug: string;
  summary: {
    totalCharged: string;
    totalPaid: string;
    totalDebt: string;
    fundCount: number;
  };
  charges: ChargeRow[];
  payments: PaymentRow[];
  funds: Fund[];
  templates: { id: string; name: string; amount: string }[];
  units: UnitOption[];
  canGenerateCharges: boolean;
  canRegisterPayments: boolean;
  canManageFunds: boolean;
}) {
  const [chargeOpen, setChargeOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Финансы</h1>
          <p className="text-sm text-zinc-500">Учёт начислений, платежей и фондов</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-sm text-zinc-500">Всего начислено</p>
            <p className="mt-1 text-xl font-bold">{Number(summary.totalCharged).toFixed(2)} ₼</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-sm text-zinc-500">Поступило</p>
            <p className="mt-1 text-xl font-bold text-green-600">{Number(summary.totalPaid).toFixed(2)} ₼</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-sm text-zinc-500">Задолженность</p>
            <p className="mt-1 text-xl font-bold text-red-600">{Number(summary.totalDebt).toFixed(2)} ₼</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-sm text-zinc-500">Фондов</p>
            <p className="mt-1 text-xl font-bold">{summary.fundCount} шт.</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="charges">
        <TabsList>
          <TabsTrigger value="charges">Начисления</TabsTrigger>
          <TabsTrigger value="payments">Платежи</TabsTrigger>
          <TabsTrigger value="funds">Фонды</TabsTrigger>
        </TabsList>

        <TabsContent value="charges" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">{charges.length} записей</p>
            {canGenerateCharges && (
              <Button onClick={() => setChargeOpen(true)} size="sm">+ Начислить</Button>
            )}
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Период</TableHead>
                  <TableHead>Квартира</TableHead>
                  <TableHead>Собственник</TableHead>
                  <TableHead>Шаблон</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Срок</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{MONTHS[c.periodMonth]} {c.periodYear}</TableCell>
                    <TableCell className="text-sm">
                      {c.unitNumber ? `Б${c.entrance}/Э${c.floor}/${c.unitNumber}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{c.ownerName ?? "—"}</TableCell>
                    <TableCell className="text-sm">{c.templateName ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{Number(c.amount).toFixed(2)} ₼</TableCell>
                    <TableCell className="text-sm text-zinc-500">{c.dueDate}</TableCell>
                    <TableCell>
                      <Badge className={CHARGE_STATUS[c.status]?.className ?? ""}>
                        {CHARGE_STATUS[c.status]?.label ?? c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {charges.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-zinc-400 py-8">Нет начислений</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">{payments.length} записей</p>
            {canRegisterPayments && (
              <Button onClick={() => setPaymentOpen(true)} size="sm">+ Платёж</Button>
            )}
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Квартира</TableHead>
                  <TableHead>Собственник</TableHead>
                  <TableHead>Период</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                  <TableHead>Способ</TableHead>
                  <TableHead>Референс</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm text-zinc-500">
                      {new Date(p.paymentDate).toLocaleDateString("ru")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.unitNumber ? `Б${p.entrance}/Э${p.floor}/${p.unitNumber}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{p.ownerName ?? "—"}</TableCell>
                    <TableCell className="text-sm">{MONTHS[p.periodMonth]} {p.periodYear}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{Number(p.amount).toFixed(2)} ₼</TableCell>
                    <TableCell className="text-sm">{PAYMENT_METHODS[p.paymentMethod] ?? p.paymentMethod}</TableCell>
                    <TableCell className="text-sm text-zinc-500">{p.referenceNo ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "confirmed" ? "default" : "secondary"}>
                        {p.status === "confirmed" ? "Подтверждён" : p.status === "rejected" ? "Отклонён" : p.status === "refunded" ? "Возврат" : p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-zinc-400 py-8">Нет платежей</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="funds" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">{funds.length} фондов</p>
            {canManageFunds && (
              <Button onClick={() => setFundOpen(true)} size="sm">+ Фонд</Button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {funds.map((f) => (
              <Card key={f.id} className="py-4">
                <CardHeader className="px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{f.name}</CardTitle>
                    <Badge variant="secondary">{FUND_TYPE_LABELS[f.type] ?? f.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 space-y-2">
                  {f.description && <p className="text-sm text-zinc-500">{f.description}</p>}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Баланс</span>
                    <span className="font-bold text-lg">{Number(f.currentBalance).toFixed(2)} ₼</span>
                  </div>
                  {f.targetAmount && Number(f.targetAmount) > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Цель: {Number(f.targetAmount).toFixed(2)} ₼</span>
                        <span>{Math.min(100, (Number(f.currentBalance) / Number(f.targetAmount)) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className="h-2 rounded-full bg-green-500"
                          style={{ width: `${Math.min(100, (Number(f.currentBalance) / Number(f.targetAmount)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {funds.length === 0 && (
              <p className="text-sm text-zinc-400 col-span-2 py-8 text-center">Нет фондов</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ChargeGenerateDialog slug={slug} templates={templates} open={chargeOpen} onOpenChange={setChargeOpen} />
      <PaymentDialog slug={slug} units={units} open={paymentOpen} onOpenChange={setPaymentOpen} />
      <FundCreateDialog slug={slug} open={fundOpen} onOpenChange={setFundOpen} />
    </div>
  );
}
