export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code: string = "BAD_REQUEST",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string) {
    super(`${entity} not found`, 404, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class TenantMismatchError extends AppError {
  constructor() {
    super("Tenant mismatch", 403, "TENANT_MISMATCH");
  }
}

/** ADR-0001 boundary: map a DomainError code to a next-intl message at the action layer; rethrow everything else. */
export function translateDomainError(err: unknown, t: (key: string) => string): never {
  if (err instanceof DomainError) throw new Error(t(err.code));
  throw err;
}

export class DomainError extends AppError {
  constructor(
    code: string,
    message: string,
    statusCode: number = 400,
  ) {
    super(message, statusCode, code);
    this.name = "DomainError";
  }
}

export class ValidationError extends AppError {
  constructor(errors: Record<string, string[]>) {
    super("Validation failed", 422, "VALIDATION_ERROR");
    this.errors = errors;
  }
  errors: Record<string, string[]>;
}
