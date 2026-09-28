const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Whether `value` looks like an email address. */
export const isEmailAddress = (value) => EMAIL.test(String(value || '').trim());
