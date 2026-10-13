import React from 'react';
import { ASSESSMENT_OPTIONS } from '../lib/product-lines/assessment-catalog';
import { OZGUN_PRODUCT } from '../lib/fixed-forms/ozgun-kids';

/** Fixed forms need an assigned code; teacher assignment records cover adaptive profiles. */
export function AssessmentProductOptions({includeFixed = true}: {includeFixed?: boolean}) {
  return <>{ASSESSMENT_OPTIONS.filter(option => includeFixed || option.value !== OZGUN_PRODUCT)
    .map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</>;
}
