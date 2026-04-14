/**
 * Safe Query Parameter Validation and Parsing Utility
 * Prevents XSS and parameter injection attacks
 */

/**
 * Allowed query parameters and their valid value whitelists
 */
const ALLOWED_PARAMS = {
  error: ['forbidden', 'unauthorized', 'not_found', 'server_error'] as const,
  tab: ['tickets', 'profile', 'settings'] as const,
  filter: ['open', 'closed', 'all', 'assigned'] as const,
  sort: ['date_asc', 'date_desc', 'priority_asc', 'priority_desc'] as const,
} as const;

/**
 * Get and validate a query parameter value
 * Only returns the value if it's in the whitelist
 * Returns null if parameter is missing or has an invalid value (XSS protection)
 *
 * @example
 * const errorType = getQueryParam('error');
 * if (errorType === 'forbidden') {
 *   // Show forbidden error
 * }
 */
export function getQueryParam<K extends keyof typeof ALLOWED_PARAMS>(
  paramName: K,
): (typeof ALLOWED_PARAMS)[K][number] | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const value = params.get(paramName);

    if (!value) return null;

    // Type-safe whitelist checking
    const allowedValues = ALLOWED_PARAMS[paramName] as readonly string[];
    if (allowedValues.includes(value)) {
      return value as (typeof ALLOWED_PARAMS)[K][number];
    }

    console.warn(`Invalid query parameter: ${paramName}=${value}`);
    return null;
  } catch (error) {
    console.error('Error parsing query parameters:', error);
    return null;
  }
}

/**
 * Build safe query string from validated parameters
 * Only includes parameters that are in the whitelist
 *
 * @example
 * const qs = buildQueryString({ error: 'forbidden', tab: 'tickets' });
 * // Returns: "?error=forbidden&tab=tickets"
 */
export function buildQueryString(
  params: Partial<Record<keyof typeof ALLOWED_PARAMS, string>>,
): string {
  const validParams = new URLSearchParams();

  (Object.keys(params) as Array<keyof typeof ALLOWED_PARAMS>).forEach((key) => {
    const value = params[key];
    if (value && (ALLOWED_PARAMS[key] as readonly string[]).includes(value)) {
      validParams.append(key, value);
    }
  });

  const qs = validParams.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Sanitize user input for display
 * Prevents XSS by escaping HTML special characters
 */
export function sanitizeInput(input: string): string {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validate URL to prevent navigation to malicious sites
 * Only allows relative URLs or known safe domains
 */
export function isSafeURL(url: string): boolean {
  try {
    // Allow relative URLs
    if (url.startsWith('/')) return true;
    if (url.startsWith('./')) return true;
    if (url.startsWith('../')) return true;

    // Parse as absolute URL
    const parsed = new URL(url, window.location.href);

    // Only allow same-origin or whitelisted domains
    if (parsed.origin !== window.location.origin) {
      const whitelistedDomains = [
        'localhost',
        import.meta.env.VITE_API_URL || 'localhost:8000',
      ];
      return whitelistedDomains.some((domain) =>
        parsed.hostname.includes(domain),
      );
    }

    return true;
  } catch {
    return false;
  }
}
