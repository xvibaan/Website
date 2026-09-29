import { Product, NewProduct } from '../../db/schema/products';
import { ProductVariant, NewProductVariant } from '../../db/schema/product-variants';
export interface AdminProductVariantDetail extends ProductVariant {
    discountPercent: number | null;
}
export interface AdminProductDetail extends Product {
    categoryName: string | null;
    categorySlug: string | null;
    providerName: string | null;
    providerCode: string | null;
    discountPercent: number | null;
    variants: AdminProductVariantDetail[];
    resources: any[];
}
export declare class ProductAdminService {
    getProducts(query: {
        page: number;
        limit: number;
        categoryId?: string;
        providerId?: string;
        status?: string;
        search?: string;
    }): Promise<{
        products: (Product & {
            categoryName: string | null;
            providerName: string | null;
            providerCode: string | null;
            discountPercent: number | null;
        })[];
        total: number;
    }>;
    getProductById(id: string): Promise<AdminProductDetail | null>;
    createProduct(data: NewProduct, adminUserId: string): Promise<Product>;
    updateProduct(id: string, data: Partial<NewProduct>, adminUserId: string): Promise<Product | null>;
    updateProductStatus(id: string, status: 'ACTIVE' | 'DISABLED' | 'OUT_OF_STOCK' | 'DISCONTINUED', adminUserId: string): Promise<Product | null>;
    getVariants(productId: string): Promise<AdminProductVariantDetail[]>;
    createVariant(productId: string, data: Omit<NewProductVariant, 'productId'>, adminUserId: string): Promise<AdminProductVariantDetail>;
    updateVariant(productId: string, variantId: string, data: Partial<NewProductVariant>, adminUserId: string): Promise<AdminProductVariantDetail>;
    updateVariantStatus(productId: string, variantId: string, isActive: boolean, adminUserId: string): Promise<AdminProductVariantDetail>;
    deleteVariant(productId: string, variantId: string, adminUserId: string): Promise<{
        success: boolean;
        deletedVariantId: string;
    }>;
}
export declare const productAdminService: ProductAdminService;
