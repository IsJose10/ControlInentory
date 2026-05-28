export const API_URL = '/api';

export async function fetchAPI(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        if (body) {
            options.body = JSON.stringify(body);
        }
        const res = await fetch(`${API_URL}${endpoint}`, options);
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
