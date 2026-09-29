export interface SafeAdminCustomer {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    wallet: {
        id: string;
        balance: string;
        currency: string;
        status: string;
    } | null;
}
export declare class CustomerAdminService {
    getCustomers(query: {
        page: number;
        limit: number;
        search?: string;
        role?: 'customer' | 'admin';
        isActive?: boolean;
    }): Promise<{
        customers: SafeAdminCustomer[];
        total: number;
    }>;
    getCustomerById(id: string): Promise<SafeAdminCustomer | null>;
    updateCustomerStatus(id: string, isActive: boolean, reason: string | undefined, adminUserId: string): Promise<SafeAdminCustomer | null>;
}
export declare const customerAdminService: CustomerAdminService;
