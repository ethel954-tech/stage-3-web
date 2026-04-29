/**
 * Insighta Labs+ API Helper
 * Handles cross-site authentication with JWT cookies + Bearer tokens
 */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://stage-3-backend-production.up.railway.app';

/**
 * Fetch with authentication credentials and error handling.
 * Automatically includes:
 * - credentials: 'include' (for cookies)
 * - X-API-Version: 1 (required header)
 * - Error logging
 */
async function apiCall(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    
    // Merge default options
    const defaultOptions = {
        credentials: 'include',  // ✅ Send cookies cross-site
        headers: {
            'X-API-Version': '1',
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    console.log(`[API] ${finalOptions.method || 'GET'} ${url}`);

    try {
        const response = await fetch(url, finalOptions);

        // Log response for debugging
        if (!response.ok) {
            console.warn(`[API] Status ${response.status} for ${url}`);
            console.log(`[API Response Headers]`, {
                'content-type': response.headers.get('content-type'),
                'set-cookie': response.headers.get('set-cookie') ? '(present)' : 'none',
            });
        }

        const data = await response.json();

        if (!response.ok) {
            console.error(`[API Error] ${response.status}:`, data);
            throw new Error(data.message || `HTTP ${response.status}`);
        }

        console.log(`[API] Success:`, data);
        return data;
    } catch (error) {
        console.error(`[API Exception] ${error.message}`, error);
        throw error;
    }
}

/**
 * Login via GitHub OAuth
 */
async function loginWithGitHub() {
    try {
        const response = await fetch(`${API_BASE}/auth/github?client_type=web`, {
            credentials: 'include',
        });
        
        // GitHub OAuth returns a redirect, which the browser will follow
        if (!response.ok) {
            throw new Error(`Login failed: ${response.status}`);
        }
    } catch (error) {
        console.error('[LOGIN] Error:', error);
        throw error;
    }
}

/**
 * Get CSRF token (if needed for forms)
 */
async function getCsrfToken() {
    try {
        const data = await apiCall('/auth/csrf');
        return data.csrf_token;
    } catch (error) {
        console.warn('[CSRF] Could not get token:', error.message);
        return null;
    }
}

/**
 * Check authentication status
 */
async function checkAuth() {
    try {
        const data = await apiCall('/auth/me');
        if (data.data) {
            console.log(`[AUTH] User authenticated: @${data.data.username}`);
            return data.data;
        }
    } catch (error) {
        console.log(`[AUTH] Not authenticated:`, error.message);
        return null;
    }
}

/**
 * Logout
 */
async function logout() {
    try {
        await apiCall('/auth/logout', { method: 'POST' });
        console.log('[AUTH] Logged out');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('[LOGOUT] Error:', error);
        // Still redirect on error
        window.location.href = 'index.html';
    }
}

/**
 * Refresh access token
 */
async function refreshAccessToken() {
    try {
        const data = await apiCall('/auth/refresh', { method: 'POST' });
        console.log('[AUTH] Token refreshed');
        return data;
    } catch (error) {
        console.error('[REFRESH] Failed:', error);
        // If refresh fails, redirect to login
        window.location.href = 'index.html';
        throw error;
    }
}

/**
 * Fetch profiles list
 */
async function fetchProfiles(page = 1, limit = 10, filters = {}) {
    const params = new URLSearchParams({ page, limit, ...filters });
    return apiCall(`/api/profiles?${params}`, { method: 'GET' });
}

/**
 * Search profiles
 */
async function searchProfiles(query, page = 1, limit = 10) {
    const params = new URLSearchParams({ q: query, page, limit });
    return apiCall(`/api/profiles/search?${params}`, { method: 'GET' });
}

/**
 * Ensure user is authenticated, redirect if not
 */
async function requireAuth() {
    const user = await checkAuth();
    if (!user) {
        console.log('[AUTH] Redirecting to login');
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

// Debug: Log API_BASE on page load
console.log(`[API] Backend URL: ${API_BASE}`);
console.log(`[API] Cross-site enabled for: Netlify <-> Railway`);
