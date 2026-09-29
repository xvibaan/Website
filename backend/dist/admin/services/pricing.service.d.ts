export interface ProductPricingItem {
    productId: string;
    name: string;
    slug: string;
    categoryName: string | null;
    providerName: string | null;
    sellingPrice: string;
    costPrice: string;
    currency: string;
    margin: string;
    marginPercentage: string;
    status: string;
    updatedAt: Date;
}
export declare class PricingAdminService {
    getPricingOverview(query: {
        page: number;
        limit: number;
        categoryId?: string;
        providerId?: string;
        search?: string;
    }): Promise<{
        pricing: ProductPricingItem[];
        total: number;
    }>;
    updatePricing(productId: string, data: {
        sellingPrice: string;
        costPrice?: string;
        currency?: string;
    }, adminUserId: string): Promise<ProductPricingItem | null>;
}
export declare const pricingAdminService: PricingAdminService;
