import axios from "axios";

const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";
const API_SECRET = process.env.API_SECRET;

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: API_SECRET ? { Authorization: `Bearer ${API_SECRET}` } : {},
});
