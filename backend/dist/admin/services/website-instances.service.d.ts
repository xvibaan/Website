export declare class WebsiteInstanceService {
    listInstances(): Promise<{
        id: string;
        instanceName: string;
        status: string;
        primaryDomain: string | null;
        createdAt: Date;
        reseller: {
            id: string;
            businessName: string;
        } | null;
    }[]>;
    getInstance(id: string): Promise<{
        reseller: {
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
        } | undefined;
        domains: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            instanceId: string;
            hostname: string;
            hostnameType: string;
            isPrimary: boolean;
        }[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        resellerId: string;
        instanceName: string;
        primaryDomain: string | null;
        brandingConfig: unknown;
        supportConfig: unknown;
    } | null>;
    createInstance(data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        resellerId: string;
        instanceName: string;
        primaryDomain: string | null;
        brandingConfig: unknown;
        supportConfig: unknown;
    }>;
    updateInstance(id: string, data: any): Promise<{
        id: string;
        resellerId: string;
        instanceName: string;
        status: string;
        primaryDomain: string | null;
        brandingConfig: unknown;
        supportConfig: unknown;
        createdAt: Date;
        updatedAt: Date;
    }>;
    addDomain(instanceId: string, data: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        instanceId: string;
        hostname: string;
        hostnameType: string;
        isPrimary: boolean;
    }>;
    updateDomain(id: string, data: any): Promise<{
        id: string;
        instanceId: string;
        hostname: string;
        hostnameType: string;
        status: string;
        isPrimary: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    removeDomain(id: string): Promise<void>;
}
export declare const websiteInstanceService: WebsiteInstanceService;
