/**
 * Domain failures carry a stable machine code. The action pipeline translates that code to a
 * localized message at the server boundary; services never hold user-facing text.
 */
export class DomainError extends Error {
  constructor(
    public code: string,
    message: string = code,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}
