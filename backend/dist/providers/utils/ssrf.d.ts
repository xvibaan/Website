/**
 * SSRF Protection Utility for Provider Endpoints
 * Validates configured provider API base URLs against loopback, private RFC1918 ranges,
 * cloud metadata IP addresses, and unsupported protocols.
 */
export declare function validateProviderEndpointUrl(urlStr: string, options?: {
    allowPrivateIps?: boolean;
}): {
    isValid: boolean;
    error?: string;
};
