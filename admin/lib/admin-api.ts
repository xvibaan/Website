/**
 * Centralized Master Admin API Client
 * Strictly communicates with Fastify Master Backend via `/api/v1/admin/*`
 */

export interface AdminApiResponse<T = any> {
  success?: boolean;
  data?: T;
  [key: string]: any;
}

export interface AdminErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  issues?: Record<string, string[]>;
}

class AdminApiClient {
  private baseUrl: string;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';
    const envUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    if (isProd && !envUrl) {
      throw new Error('CRITICAL CONFIGURATION ERROR: NEXT_PUBLIC_BACKEND_API_URL is required in production.');
    }
    this.baseUrl = `${envUrl || "http://localhost:4000"}/api/v1/admin`;
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
      delete headers['Content-Type'];
    } else if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Pass session cookies
    });

    let data: any;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }
    } else {
      const text = await res.text();
      data = { message: text };
    }

    if (!res.ok) {
      const error: AdminErrorResponse = {
        statusCode: res.status,
        error: data?.error || (res.status === 401 ? 'Unauthorized' : res.status === 403 ? 'Forbidden' : 'Error'),
        message: data?.message || data?.detail || `Request failed with status ${res.status}`,
        issues: data?.issues,
      };
      throw error;
    }

    return data;
  }

  // Dashboard
  async getDashboard() {
    return this.request<{
      success: boolean;
      timestamp: string;
      metrics: {
        customers: { total: number; active: number; inactive: number };
        catalog: { totalCategories: number; activeCategories: number; totalProducts: number; activeProducts: number };
        wallets: { totalWallets: number; activeWallets: number; totalLiability: string };
        payments: { totalTransactions: number; completedCount: number; failedCount: number; pendingCount: number };
        providers: { total: number; healthy: number; unhealthy: number; disabled: number };
        orders: any;
        financial?: {
          grossSales: string;
          refunds: string;
          netSales: string;
          completedSales: string;
          processingSales: string;
          providerCost: string;
          grossProfit: string;
          currency: string;
        };
      };
    }>('/dashboard');
  }

  // Customers
  async getCustomers(params?: { search?: string; isActive?: boolean; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.request<{
      success: boolean;
      customers: Array<{
        id: string;
        email: string;
        role: string;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
        wallet?: {
          id: string;
          balance: string;
          currency: string;
          status: string;
        } | null;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/customers${qs ? `?${qs}` : ''}`);
  }

  async getCustomer(id: string) {
    return this.request<{
      success: boolean;
      customer: {
        id: string;
        email: string;
        role: string;
        isActive: boolean;
        createdAt: string;
        updatedAt: string;
        wallet?: {
          id: string;
          balance: string;
          currency: string;
          status: string;
        } | null;
      };
    }>(`/customers/${id}`);
  }

  async updateCustomerStatus(id: string, isActive: boolean, reason?: string) {
    return this.request<{
      success: boolean;
      customer: {
        id: string;
        email: string;
        role: string;
        isActive: boolean;
      };
    }>(`/customers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive, reason }),
    });
  }

  // Backend System Health Check
  async checkHealth(): Promise<{ status: string }> {
    const isProd = process.env.NODE_ENV === 'production';
    const envUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    if (isProd && !envUrl) {
      throw new Error('CRITICAL CONFIGURATION ERROR: NEXT_PUBLIC_BACKEND_API_URL is required in production.');
    }
    const backendHost = envUrl || "http://localhost:4000";
    const res = await fetch(`${backendHost}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Health check failed with status ${res.status}`);
    }
    return res.json();
  }

  // Categories
  async getCategories(params?: { isActive?: boolean }) {
    const query = params?.isActive !== undefined ? `?isActive=${params.isActive}` : '';
    return this.request<{
      success: boolean;
      categories: Array<{
        id: string;
        slug: string;
        name: string;
        description: string | null;
        icon: string | null;
        isActive: boolean;
        sortOrder: number;
        createdAt: string;
        updatedAt: string;
      }>;
    }>(`/categories${query}`);
  }

  async createCategory(data: {
    slug: string;
    name: string;
    description?: string;
    icon?: string;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return this.request<{
      success: boolean;
      category: any;
    }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(
    id: string,
    data: {
      slug?: string;
      name?: string;
      description?: string;
      icon?: string;
      isActive?: boolean;
      sortOrder?: number;
    }
  ) {
    return this.request<{
      success: boolean;
      category: any;
    }>(`/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateCategoryStatus(id: string, isActive: boolean) {
    return this.request<{
      success: boolean;
      category: any;
    }>(`/categories/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  // Products
  async getProducts(params?: { categoryId?: string; status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set('categoryId', params.categoryId);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return this.request<{
      success: boolean;
      products: Array<{
        id: string;
        categoryId: string;
        providerId: string | null;
        providerProductId: string | null;
        name: string;
        slug: string;
        description: string | null;
        sellingPrice: string;
        costPrice: string | null;
        currency: string;
        status: string;
        specs: any;
        sortOrder: number;
        createdAt: string;
        updatedAt: string;
        categoryName?: string;
        providerName?: string;
      }>;
    }>(`/products${qs ? `?${qs}` : ''}`);
  }

  async getProduct(id: string) {
    return this.request<{
      success: boolean;
      product: any;
    }>(`/products/${id}`);
  }

  async createProduct(data: {
    name: string;
    slug: string;
    categoryId: string;
    providerId?: string | null;
    providerProductId?: string | null;
    description?: string;
    shortDescription?: string | null;
    imageUrl?: string | null;
    originalPrice?: string | null;
    sellingPrice: string;
    costPrice?: string | null;
    currency?: string;
    status?: string;
    specs?: any;
    sortOrder?: number;
  }) {
    return this.request<{
      success: boolean;
      product: any;
    }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: Partial<{
    name: string;
    slug: string;
    categoryId: string;
    providerId: string | null;
    providerProductId: string | null;
    description: string;
    shortDescription: string | null;
    imageUrl: string | null;
    originalPrice: string | null;
    sellingPrice: string;
    costPrice: string | null;
    currency: string;
    status: string;
    specs: any;
    sortOrder: number;
  }>) {
    return this.request<{
      success: boolean;
      product: any;
    }>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateProductStatus(id: string, status: string) {
    return this.request<{
      success: boolean;
      product: any;
    }>(`/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Product Variants
  async getVariants(productId: string) {
    return this.request<{
      success: boolean;
      variants: Array<{
        id: string;
        productId: string;
        name: string;
        duration: string;
        originalPrice: string | null;
        sellingPrice: string;
        costPrice: string | null;
        specs: any;
        stock: number;
        isActive: boolean;
        sortOrder: number;
        createdAt: string;
        updatedAt: string;
      }>;
    }>(`/products/${productId}/variants`);
  }

  async createVariant(productId: string, data: {
    name: string;
    duration: string;
    originalPrice?: string | null;
    sellingPrice: string;
    costPrice?: string | null;
    specs?: any;
    stock?: number;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    return this.request<{
      success: boolean;
      variant: any;
    }>(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVariant(productId: string, variantId: string, data: Partial<{
    name: string;
    duration: string;
    originalPrice: string | null;
    sellingPrice: string;
    costPrice: string | null;
    specs: any;
    stock: number;
    isActive: boolean;
    sortOrder: number;
  }>) {
    return this.request<{
      success: boolean;
      variant: any;
    }>(`/products/${productId}/variants/${variantId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateVariantStatus(productId: string, variantId: string, isActive: boolean) {
    return this.request<{
      success: boolean;
      variant: any;
    }>(`/products/${productId}/variants/${variantId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async deleteVariant(productId: string, variantId: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/products/${productId}/variants/${variantId}`, {
      method: 'DELETE',
    });
  }

  // Pricing
  async getPricing() {
    return this.request<{
      success: boolean;
      pricing: Array<{
        productId: string;
        name: string;
        slug: string;
        category: string;
        provider: string;
        costPrice: string;
        sellingPrice: string;
        currency: string;
        margin: string;
        marginPercentage: string;
        status: string;
      }>;
    }>('/pricing');
  }

  async updatePricing(productId: string, data: { sellingPrice: string; costPrice?: string }) {
    return this.request<{
      success: boolean;
      pricing: any;
    }>(`/pricing/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Resources
  async getResources(params?: { productId?: string; type?: string; status?: string }) {
    const query = new URLSearchParams();
    if (params?.productId) query.set('productId', params.productId);
    if (params?.type) query.set('type', params.type);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return this.request<{
      success: boolean;
      resources: Array<{
        id: string;
        productId: string | null;
        name: string;
        type: string;
        purpose: string | null;
        url: string;
        status: string;
        sortOrder: number;
        createdAt: string;
        updatedAt: string;
      }>;
    }>(`/resources${qs ? `?${qs}` : ''}`);
  }

  async createResource(data: {
    productId?: string | null;
    name: string;
    type: string;
    purpose?: string;
    url: string;
    status?: string;
    sortOrder?: number;
  }) {
    return this.request<{
      success: boolean;
      resource: any;
    }>('/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateResource(id: string, data: Partial<{
    productId: string | null;
    name: string;
    type: string;
    purpose: string;
    url: string;
    status: string;
    sortOrder: number;
  }>) {
    return this.request<{
      success: boolean;
      resource: any;
    }>(`/resources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateResourceStatus(id: string, status: string) {
    return this.request<{
      success: boolean;
      resource: any;
    }>(`/resources/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteResource(id: string) {
    return this.request<{
      success: boolean;
      message: string;
    }>(`/resources/${id}`, {
      method: 'DELETE',
    });
  }

  // Product Media Upload & Management (Phase 3C)
  async uploadMedia(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<{
      success: boolean;
      url: string;
      key: string;
      filename: string;
      size: number;
      mimetype: string;
    }>('/media/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteMedia(key: string) {
    const cleanKey = encodeURIComponent(key);
    return this.request<{
      success: boolean;
      message: string;
      key: string;
    }>(`/media/${cleanKey}`, {
      method: 'DELETE',
    });
  }

  // Wallets
  async getWallets(params?: { search?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.request<{
      success: boolean;
      wallets: Array<{
        id: string;
        userId: string;
        userEmail?: string;
        balance: string;
        currency: string;
        status: string;
        createdAt: string;
        updatedAt: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/wallets${qs ? `?${qs}` : ''}`);
  }

  async getWallet(userId: string) {
    return this.request<{
      success: boolean;
      wallet: any;
      ledger: Array<{
        id: string;
        walletId: string;
        entryType: string;
        amount: string;
        currency: string;
        balanceBefore: string;
        balanceAfter: string;
        referenceType: string;
        referenceId: string | null;
        description: string;
        createdAt: string;
      }>;
      totalLedgerEntries: number;
    }>(`/wallets/${userId}`);
  }

  async adjustWallet(userId: string, data: {
    amount: string;
    direction: 'credit' | 'debit';
    reason: string;
    idempotencyKey?: string;
  }) {
    return this.request<{
      success: boolean;
      wallet: any;
      ledgerEntry: any;
    }>(`/wallets/${userId}/adjust`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async reconcileWallet(userId: string) {
    return this.request<{
      success: boolean;
      reconciliation: {
        walletId: string;
        cachedBalance: string;
        ledgerCalculatedBalance: string;
        isMatched: boolean;
        difference: string;
        totalCredits: string;
        totalDebits: string;
        entryCount: number;
      };
    }>(`/wallets/${userId}/reconcile`);
  }

  // Payments
  async getPayments(params?: { status?: string; purpose?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.purpose) query.set('purpose', params.purpose);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.request<{
      success: boolean;
      payments: Array<{
        id: string;
        userId: string;
        userEmail?: string;
        amount: string;
        currency: string;
        status: string;
        purpose: string;
        gateway: string;
        gatewayReference: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/payments${qs ? `?${qs}` : ''}`);
  }

  async getPayment(id: string) {
    return this.request<{
      success: boolean;
      payment: any;
      refunds: any[];
    }>(`/payments/${id}`);
  }

  // Providers
  async getProviders() {
    return this.request<{
      success: boolean;
      providers: Array<{
        id: string;
        code: string;
        name: string;
        adapterType: string;
        baseUrl: string | null;
        state: string;
        healthStatus: string;
        isCredentialsConfigured: boolean;
        lastHealthCheckAt: string | null;
        lastSuccessfulRequestAt: string | null;
        lastErrorAt: string | null;
        lastErrorMessage: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
    }>('/providers');
  }

  async testProviderConnection(id: string) {
    return this.request<{
      success: boolean;
      message: string;
      latencyMs: number;
    }>(`/providers/${id}/test-connection`, {
      method: 'POST',
    });
  }

  async runProviderHealthCheck(id: string) {
    return this.request<{
      success: boolean;
      healthStatus: string;
      latencyMs?: number;
      error?: string;
    }>(`/providers/${id}/health-check`, {
      method: 'POST',
    });
  }

  async getProviderHealthLogs(id: string, limit = 20) {
    return this.request<{
      success: boolean;
      logs: Array<{
        id: string;
        providerId: string;
        status: string;
        latencyMs: number | null;
        errorMessage: string | null;
        checkedAt: string;
      }>;
    }>(`/providers/${id}/health-logs?limit=${limit}`);
  }

  async updateProviderState(id: string, state: string, reason?: string) {
    return this.request<{
      success: boolean;
      provider: any;
    }>(`/providers/${id}/state`, {
      method: 'PATCH',
      body: JSON.stringify({ state, reason }),
    });
  }

  async syncProviderCatalog(id: string) {
    return this.request<{
      success: boolean;
      provider: { id: string; code: string; name: string };
      syncedAt: string;
      totalItems: number;
      mappedItemsCount: number;
      items: Array<{
        providerProductId: string;
        name: string;
        description: string;
        category: string;
        costPrice: string;
        currency: string;
        inStock: boolean;
        isMapped: boolean;
        mappedProduct: any;
      }>;
    }>(`/providers/${id}/sync-catalog`, {
      method: 'POST',
    });
  }

  async getProviderCatalog(id: string) {
    return this.request<{
      success: boolean;
      provider: { id: string; code: string; name: string };
      totalItems: number;
      items: Array<{
        providerProductId: string;
        name: string;
        description: string;
        category: string;
        costPrice: string;
        currency: string;
        inStock: boolean;
      }>;
    }>(`/providers/${id}/catalog`);
  }

  async getProviderOrders(id: string) {
    return this.request<{
      success: boolean;
      total: number;
      orders: Array<{
        orderItemId: string;
        orderId: string;
        productNameSnapshot: string;
        variantNameSnapshot: string | null;
        priceAtPurchase: string;
        providerCostSnapshot: string | null;
        providerProductId: string | null;
        quantity: number;
        fulfillmentStatus: string;
        createdAt: string;
        orderTotalAmount: string;
        orderStatus: string;
        orderReference: string;
        userId: string;
      }>;
    }>(`/providers/${id}/orders`);
  }

  // Analytics
  async getAnalyticsSummary(params?: string | { timeRange?: string; startDate?: string; endDate?: string; providerId?: string }) {
    let qs = '';
    if (typeof params === 'string') {
      const mapped =
        params.toLowerCase() === '7d'
          ? 'LAST_7_DAYS'
          : params.toLowerCase() === '30d'
          ? 'LAST_30_DAYS'
          : params.toLowerCase() === 'all'
          ? 'ALL_TIME'
          : params.toUpperCase();
      qs = `?timeRange=${mapped}`;
    } else if (params) {
      const sp = new URLSearchParams();
      if (params.timeRange) sp.set('timeRange', params.timeRange);
      if (params.startDate) sp.set('startDate', params.startDate);
      if (params.endDate) sp.set('endDate', params.endDate);
      if (params.providerId) sp.set('providerId', params.providerId);
      const str = sp.toString();
      if (str) qs = `?${str}`;
    }
    return this.request<{
      success: boolean;
      timeRange: string;
      analytics: any;
      summary: any;
    }>(`/analytics/summary${qs}`);
  }

  async getProviderWiseAnalytics(params?: { timeRange?: string; startDate?: string; endDate?: string }) {
    const sp = new URLSearchParams();
    if (params?.timeRange) sp.set('timeRange', params.timeRange);
    if (params?.startDate) sp.set('startDate', params.startDate);
    if (params?.endDate) sp.set('endDate', params.endDate);
    const qs = sp.toString();
    return this.request<{
      success: boolean;
      timeRange: string;
      dateWindow: { startDate: string; endDate: string };
      providers: Array<{
        providerId: string;
        providerName: string;
        providerCode: string;
        status: string;
        totalOrders: number;
        unitsSold: number;
        grossSales: string;
        refunds: string;
        netSales: string;
        completedSales: string;
        processingSales: string;
        providerCost: string;
        grossProfit: string;
        statusBreakdown: { completed: number; processing: number; refunded: number; failed: number };
      }>;
      consolidation: {
        sumProviderGrossSales: string;
        sumProviderRefunds: string;
        sumProviderNetSales: string;
        sumProviderCompletedSales: string;
        sumProviderCost: string;
        sumProviderProfit: string;
        currency: string;
        isReconciled: boolean;
      };
    }>(`/analytics/providers-breakdown${qs ? `?${qs}` : ''}`);
  }

  async getDailySalesAnalytics(params?: { timeRange?: string; startDate?: string; endDate?: string; providerId?: string }) {
    const sp = new URLSearchParams();
    if (params?.timeRange) sp.set('timeRange', params.timeRange);
    if (params?.startDate) sp.set('startDate', params.startDate);
    if (params?.endDate) sp.set('endDate', params.endDate);
    if (params?.providerId) sp.set('providerId', params.providerId);
    const qs = sp.toString();
    return this.request<{
      success: boolean;
      timeRange: string;
      totalDays: number;
      days: Array<{
        date: string;
        totalOrders: number;
        grossSales: string;
        refunds: string;
        netSales: string;
        completedSales: string;
        processingSales: string;
        providerCost: string;
        grossProfit: string;
      }>;
    }>(`/analytics/daily-sales${qs ? `?${qs}` : ''}`);
  }

  async getProductAnalytics(params?: { timeRange?: string; startDate?: string; endDate?: string; providerId?: string }) {
    const sp = new URLSearchParams();
    if (params?.timeRange) sp.set('timeRange', params.timeRange);
    if (params?.startDate) sp.set('startDate', params.startDate);
    if (params?.endDate) sp.set('endDate', params.endDate);
    if (params?.providerId) sp.set('providerId', params.providerId);
    const qs = sp.toString();
    return this.request<{
      success: boolean;
      timeRange: string;
      totalProducts: number;
      products: Array<{
        productId: string | null;
        productName: string;
        providerId: string | null;
        providerName: string;
        ordersCount: number;
        unitsSold: number;
        grossSales: string;
        refunds: string;
        netSales: string;
        providerCost: string;
        grossProfit: string;
      }>;
    }>(`/analytics/products-breakdown${qs ? `?${qs}` : ''}`);
  }

  async getVariantAnalytics(params?: { timeRange?: string; startDate?: string; endDate?: string; productId?: string }) {
    const sp = new URLSearchParams();
    if (params?.timeRange) sp.set('timeRange', params.timeRange);
    if (params?.startDate) sp.set('startDate', params.startDate);
    if (params?.endDate) sp.set('endDate', params.endDate);
    if (params?.productId) sp.set('productId', params.productId);
    const qs = sp.toString();
    return this.request<{
      success: boolean;
      timeRange: string;
      totalVariants: number;
      variants: Array<{
        productName: string;
        variantName: string;
        ordersCount: number;
        unitsSold: number;
        grossSales: string;
        providerCost: string;
        grossProfit: string;
      }>;
    }>(`/analytics/variants-breakdown${qs ? `?${qs}` : ''}`);
  }

  async getOrderStatusAnalytics(params?: { timeRange?: string; startDate?: string; endDate?: string }) {
    const sp = new URLSearchParams();
    if (params?.timeRange) sp.set('timeRange', params.timeRange);
    if (params?.startDate) sp.set('startDate', params.startDate);
    if (params?.endDate) sp.set('endDate', params.endDate);
    const qs = sp.toString();
    return this.request<{
      success: boolean;
      timeRange: string;
      totalOrders: number;
      statuses: Array<{
        status: string;
        count: number;
        volume: string;
        percentage: string;
      }>;
    }>(`/analytics/order-statuses${qs ? `?${qs}` : ''}`);
  }

  async getWalletAnalytics() {
    return this.request<{
      success: boolean;
      walletAnalytics: {
        totalWallets: number;
        activeWallets: number;
        lockedWallets: number;
        totalLiability: string;
        flowBreakdown?: {
          deposits: { count: number; volume: string };
          orderDebits: { count: number; volume: string };
          refundCredits: { count: number; volume: string };
          adjustments: { count: number; volume: string };
        };
        depositVolumeTotal?: string;
        depositCountTotal?: number;
      };
    }>('/analytics/wallet');
  }

  async getPaymentAnalytics(params?: { timeRange?: string; startDate?: string; endDate?: string }) {
    const sp = new URLSearchParams();
    if (params?.timeRange) sp.set('timeRange', params.timeRange);
    if (params?.startDate) sp.set('startDate', params.startDate);
    if (params?.endDate) sp.set('endDate', params.endDate);
    const qs = sp.toString();
    return this.request<{
      success: boolean;
      paymentAnalytics: {
        totalTransactions: number;
        statusBreakdown: {
          completed: number;
          pending: number;
          failed: number;
        };
        completedVolume: string;
        pendingVolume?: string;
        failedVolume?: string;
        totalRefundedVolume?: string;
        refundCount?: number;
      };
    }>(`/analytics/payments${qs ? `?${qs}` : ''}`);
  }

  async getProviderAnalytics() {
    return this.request<{
      success: boolean;
      providerAnalytics: {
        total: number;
        enabled: number;
        maintenance: number;
        disabled: number;
        healthy: number;
        unhealthy: number;
        degraded: number;
        unknown: number;
      };
    }>('/analytics/providers');
  }

  // Settings
  async getSettings() {
    return this.request<{
      success: boolean;
      settings: Record<string, { value: string; description: string | null; updatedAt: string }>;
    }>('/settings');
  }

  async updateSettings(settings: Record<string, string>) {
    return this.request<{
      success: boolean;
      settings: Record<string, { value: string; description: string | null; updatedAt: string }>;
    }>('/settings', {
      method: 'PATCH',
      body: JSON.stringify({ settings }),
    });
  }

  // Audit Logs
  async getAuditLogs(params?: { action?: string; entityType?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);
    if (params?.entityType) query.set('entityType', params.entityType);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.request<{
      success: boolean;
      logs: Array<{
        id: string;
        adminUserId: string;
        adminEmail?: string;
        action: string;
        entityType: string;
        entityId: string | null;
        details: any;
        ipAddress: string | null;
        createdAt: string;
      }>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/audit-logs${qs ? `?${qs}` : ''}`);
  }

  // Orders (Phase 8 Planned Notice)
  async getOrders() {
    return this.request<{
      status: string;
      message: string;
      phase: string;
      orders: any[];
    }>('/orders');
  }
}

export const adminApi = new AdminApiClient();
