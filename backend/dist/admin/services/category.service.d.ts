import { Category, NewCategory } from '../../db/schema/categories';
export declare class CategoryAdminService {
    getCategories(isActive?: boolean): Promise<Category[]>;
    getCategoryById(id: string): Promise<Category | null>;
    createCategory(data: NewCategory, adminUserId: string): Promise<Category>;
    updateCategory(id: string, data: Partial<NewCategory>, adminUserId: string): Promise<Category | null>;
    updateCategoryStatus(id: string, isActive: boolean, adminUserId: string): Promise<Category | null>;
}
export declare const categoryAdminService: CategoryAdminService;
