// CafeML API Client
// Backend: http://localhost:5000

const API_BASE = 'http://localhost:5000/api';

// Fetch wrapper with error handling
async function fetchApi(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'API Error' }));
            throw new Error(error.detail || error.message || 'API Error');
        }

        return response.json();
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}

// Dashboard API
export const dashboardApi = {
    getSummary: () => fetchApi('/dashboard'),
    getProducts: () => fetchApi('/products'),
    getDailySales: () => fetchApi('/sales/daily'),
};

// Forecast API
export const forecastApi = {
    getSalesForecast: (days = 7) => fetchApi(`/forecast/sales?days=${days}`),
    getProductForecast: (productId, days = 7) => fetchApi(`/forecast/product/${productId}?days=${days}`),
    retrain: () => fetchApi('/forecast/retrain', { method: 'POST' }),
};

// Segmentation API
export const segmentApi = {
    getSummary: () => fetchApi('/segments'),
    getCustomerSegment: (customerId) => fetchApi(`/segments/${customerId}`),
    getCustomersBySegment: (segment, limit = 50) =>
        fetchApi(`/segments/customers?segment=${encodeURIComponent(segment)}&limit=${limit}`),
};

// Recommendation API
export const recommendApi = {
    getForCustomer: (customerId, top = 5) =>
        fetchApi(`/recommendations/customer/${customerId}?top=${top}`),
    getRelatedProducts: (productId, top = 5) =>
        fetchApi(`/recommendations/product/${productId}?top=${top}`),
};

// Admin API
export const adminApi = {
    seed: () => fetchApi('/seed', { method: 'POST' }),
    reset: () => fetchApi('/reset', { method: 'DELETE' }),
};

export default {
    dashboard: dashboardApi,
    forecast: forecastApi,
    segment: segmentApi,
    recommend: recommendApi,
    admin: adminApi,
};
