export interface GoogleIdentity {
    googleId: string;
    email: string;
    emailVerified: boolean;
}
declare class GoogleOAuthService {
    private getConfig;
    isConfigured(): boolean;
    getRedirectUri(): string;
    createState(callbackPath: string): string;
    verifyState(state: string): boolean;
    getCallbackPath(state: string): string | null;
    private isSafeCallbackPath;
    generateAuthorizationUrl(state: string): string;
    verifyAuthorizationCode(code: string): Promise<GoogleIdentity>;
}
export declare const googleOAuthService: GoogleOAuthService;
export {};
