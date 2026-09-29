export declare class ResellerService {
    listResellers(): Promise<{
        id: string;
        code: string;
        businessName: string;
        contactEmail: string;
        status: string;
        plan: string;
        apiAccessEnabled: boolean;
        createdAt: Date;
        owner: {
            id: string;
            email: string;
        };
    }[]>;
    getReseller(id: string): Promise<{
        id: string;
        code: string;
        businessName: string;
        contactEmail: string;
        status: string;
        plan: string;
        apiAccessEnabled: boolean;
        catalogScope: unknown;
        pricingScope: unknown;
        createdAt: Date;
        owner: {
            id: string;
            email: string;
        };
    }>;
    createReseller(data: {
        businessName: string;
        code: string;
        ownerEmail: string;
        status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
        plan: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        code: string;
        businessName: string;
        ownerId: string;
        contactEmail: string;
        plan: string;
        apiAccessEnabled: boolean;
        apiSecretHash: string | null;
        catalogScope: unknown;
        pricingScope: unknown;
    }>;
    updateReseller(id: string, data: Partial<{
        businessName: string;
        status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
        plan: string;
        apiAccessEnabled: boolean;
    }>): Promise<{
        id: string;
        code: string;
        businessName: string;
        ownerId: string;
        contactEmail: string;
        status: string;
        plan: string;
        apiAccessEnabled: boolean;
        apiSecretHash: string | null;
        catalogScope: unknown;
        pricingScope: unknown;
        createdAt: Date;
        updatedAt: Date;
    }>;
    generateApiToken(id: string): Promise<{
        secret: string;
    }>;
    revokeApiToken(id: string): Promise<void>;
}
export declare const resellerService: ResellerService;
