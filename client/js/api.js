export const API_URL = '/api';

export async function fetchAPI(endpoint, method = 'GET', body = null) {
    try {
        const token = localStorage.getItem('auth_token');
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        // Adjuntar token si existe
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        if (body) {
            options.body = JSON.stringify(body);
        }
        const res = await fetch(`${API_URL}${endpoint}`, options);

        // Si el servidor responde 401, forzar re-login
        if (res.status === 401) {
            localStorage.removeItem('auth_token');
            if (window.showSecurityOverlay) {
                window.showSecurityOverlay();
            }
            throw new Error('Sesión expirada o no autorizada.');
        }

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || `Error HTTP ${res.status}`);
        }
        return await res.json();
    } catch (err) {
        console.error('Error de API:', err);
        alert(`Error: ${err.message}`);
        throw err;
    }
}

// Helpers de Seguridad
export async function login(username, password) {
    const data = await fetchAPI('/auth/login', 'POST', { username, password });
    if (data.token) {
        localStorage.setItem('auth_token', data.token);
    }
    return data;
}

export async function requestOTP(username) {
    return await fetchAPI('/auth/otp-request', 'POST', { username });
}

export async function verifyOTPAndReset(username, otp, newPassword) {
    return await fetchAPI('/auth/otp-verify', 'POST', { username, otp, newPassword });
}

export async function logout() {
    try {
        await
            fetchAPI('/auth/logout', 'POST');
    }
    catch (err) {
        console.warn('Error al cerrar sesión', err);
    } finally {
        localStorage.removeItem('auth_token');
        alert('Sesion Cerrada correctamente.')
        if (window.showView) {
            window.showView('dashboard');
        }
    }
}




export async function checkAuth() {
    try {
        const data = await fetchAPI('/auth/check');
        return data.authenticated;
    } catch {
        return false;
    }
}

// Bind al objeto global
window.login = login;
window.requestOTP = requestOTP;
window.verifyOTPAndReset = verifyOTPAndReset;
window.checkAuth = checkAuth;
window.logout = logout;

// --- Regularización de Inventario ---

export async function getRegularizacionPicking() {
    return await fetchAPI('/inventario/regularizacion/picking');
}

export async function getRegularizacionMontacarguista() {
    return await fetchAPI('/inventario/regularizacion/montacarguista');
}

export async function aplicarAjustesRegularizacion(payload) {
    return await fetchAPI('/inventario/regularizacion/aplicar', 'POST', payload);
}
