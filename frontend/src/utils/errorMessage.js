/**
 * Extracts the most useful, specific error message from an API error.
 *
 * The backend's validation middleware returns a generic "Validation
 * failed." top-level message plus a field-level `errors` array — without
 * this helper, users would see that generic message instead of the actual
 * problem (e.g. "Enter a valid phone number."). Falls back gracefully for
 * non-validation errors and network failures.
 */
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const data = err?.response?.data;

  if (data?.errors?.length > 0) {
    return data.errors[0].message;
  }
  if (data?.message) {
    return data.message;
  }
  if (err?.message === 'Network Error') {
    return "Can't reach the server. Check your connection and try again.";
  }
  return fallback;
}
