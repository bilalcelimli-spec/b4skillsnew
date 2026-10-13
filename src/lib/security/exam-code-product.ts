import { resolveAssessmentProduct } from '../product-lines/assessment-catalog';
import { AppError } from '../errors/app-error';

const normalized = (value: string) => resolveAssessmentProduct(value) ?? value.trim().toLowerCase();

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
  return resolveAssessmentProduct(code.productLine) ?? code.productLine;
}
