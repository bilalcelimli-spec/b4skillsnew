import { AppError } from '../errors/app-error';

const normalized = (value: string) => {
  const name = value.trim().toLowerCase();
  return name === 'general' ? 'general english' : name;
};

/** A redeemed code assigns a product even when the institution also has a license. */
export function productForRedeemedCode(
  requested: string | undefined,
  code: { productLine: string; expiresAt?: Date | null } | null,
  now = Date.now(),
) {
  if (!code) return requested;
  if (code.expiresAt && code.expiresAt.getTime() < now) {
    throw AppError.forbidden('Exam code has expired');
  }
  if (requested && normalized(requested) !== normalized(code.productLine)) {
    throw AppError.forbidden('Exam code is assigned to a different assessment');
  }
  return code.productLine === 'General' ? 'General English' : code.productLine;
}
