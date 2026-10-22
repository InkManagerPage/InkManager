import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

export const registerService = async (formData) => {
    const result = { data: null, error: null };

    try {
        const response = await axios.post(`${API_URL}/register-artist`, formData);
        result.data = response.data;
    } catch (error) {
        result.error = error.response?.data?.error || error.message || 'Ocurrió un error inesperado';
    }

    return result;
}