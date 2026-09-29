import { Resource, NewResource } from '../../db/schema/resources';
export interface AdminResourceDetail extends Resource {
    productName: string | null;
}
export declare class ResourceAdminService {
    getResources(query: {
        page: number;
        limit: number;
        type?: string;
        status?: string;
        productId?: string;
    }): Promise<{
        resources: AdminResourceDetail[];
        total: number;
    }>;
    getResourceById(id: string): Promise<AdminResourceDetail | null>;
    createResource(data: NewResource, adminUserId: string): Promise<Resource>;
    updateResource(id: string, data: Partial<NewResource>, adminUserId: string): Promise<Resource | null>;
    updateResourceStatus(id: string, status: 'ACTIVE' | 'DISABLED', adminUserId: string): Promise<Resource | null>;
    deleteResource(id: string, adminUserId: string): Promise<boolean>;
}
export declare const resourceAdminService: ResourceAdminService;
