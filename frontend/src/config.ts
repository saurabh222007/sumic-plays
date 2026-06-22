// Fallback to localhost if the environment variable is not set (e.g. during local development)
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
