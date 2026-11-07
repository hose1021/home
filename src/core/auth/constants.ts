/** Client-safe credential rules: the form, the action schema and the service all read these. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const USERNAME_PATTERN = /^\p{L}+\.\p{L}+$/u;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 100;
