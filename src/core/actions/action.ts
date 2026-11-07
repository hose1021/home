import {revalidatePath} from "next/cache";
import {getTranslations} from "next-intl/server";
import type {z} from "zod";
import type {Permission} from "@/core/auth/permissions";
import {requireTenantContext, requireTenantPermission, type Session} from "@/core/auth/session";
import {DomainError, ForbiddenError} from "@/core/errors/app-error";

export type ActionContext = {session: Session; tenantId: string};

type Revalidate<Input, Result> =
  | readonly string[]
  | ((input: Input, result: Result) => readonly string[]);

type ActionConfig<Schema extends z.ZodTypeAny, Result> = {
  /** Omitted only for self-service actions that need a session but no module permission. */
  permission?: Permission;
  schema: Schema;
  /** next-intl namespace that holds one message per DomainError code. */
  errors: string;
  revalidate?: Revalidate<z.infer<Schema>, Result>;
  /** Extra ownership rule that runs after the permission check. */
  authorize?: (ctx: ActionContext, input: z.infer<Schema>) => Promise<void> | void;
  handler: (ctx: ActionContext, input: z.infer<Schema>) => Promise<Result>;
};

const translateForbidden = async () => {
  const t = await getTranslations("errors");
  return new Error(t("forbidden"));
};

/**
 * One server-action pipeline: validate, guard, run, translate a domain or authorization failure
 * to a localized error, then invalidate the pages that render the changed data.
 */
export async function runAction<Schema extends z.ZodTypeAny, Result>(
  config: ActionConfig<Schema, Result>,
  raw: z.input<Schema>,
): Promise<Result> {
  const input = config.schema.parse(raw);
  let result: Result;
  try {
    const ctx = config.permission
      ? await requireTenantPermission(config.permission)
      : await requireTenantContext();
    if (ctx.session.viewAs) {
      const t = await getTranslations("errors");
      throw new Error(t("readOnlyView"));
    }
    if (config.authorize) await config.authorize(ctx, input);
    result = await config.handler(ctx, input);
  } catch (error) {
    if (error instanceof ForbiddenError) throw await translateForbidden();
    if (error instanceof DomainError) {
      const t = await getTranslations(config.errors);
      throw new Error(t(error.code));
    }
    throw error;
  }

  const paths = typeof config.revalidate === "function"
    ? config.revalidate(input, result)
    : config.revalidate ?? [];
  for (const path of paths) revalidatePath(path);
  return result;
}
