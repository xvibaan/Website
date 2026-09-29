/**
 * SSRF Protection Utility for Provider Endpoints
 * Validates configured provider API base URLs against loopback, private RFC1918 ranges,
 * cloud metadata IP addresses, and unsupported protocols.
 */
export function validateProviderEndpointUrl(
  urlStr: string,
  options?: { allowPrivateIps?: boolean }
): { isValid: boolean; error?: string } {
  if (!urlStr || typeof urlStr !== 'string') {
    return { isValid: false, error: 'Provider endpoint URL is required' };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, error: 'Only HTTP and HTTPS protocols are permitted' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Always block cloud instance metadata addresses
  if (
    hostname === '169.254.169.254' ||
    hostname === 'metadata.google.internal' ||
    hostname === 'instance-data'
  ) {
    return { isValid: false, error: 'Access to cloud instance metadata services is forbidden' };
  }

  // Block private IP addresses, loopback, and local domain names unless explicitly allowed
  if (!options?.allowPrivateIps) {
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1'
    ) {
      return { isValid: false, error: 'Local and internal hostnames are forbidden for external provider endpoints' };
    }

    // Check IPv4 private networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16)
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [_, o1, o2] = ipv4Match.map(Number);
      if (
        o1 === 10 ||
        o1 === 127 ||
        (o1 === 172 && o2 >= 16 && o2 <= 31) ||
        (o1 === 192 && o2 === 168) ||
        (o1 === 169 && o2 === 254)
      ) {
        return { isValid: false, error: 'Private IP addresses are forbidden for external provider endpoints' };
      }
    }
  }

  return { isValid: true };
}
