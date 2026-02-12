"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiClient = void 0;
const axios_1 = __importDefault(require("axios"));
const API_BASE_URL = process.env.API_URL || "http://localhost:3005/api";
const API_SECRET = process.env.API_SECRET;
exports.apiClient = axios_1.default.create({
    baseURL: API_BASE_URL,
    headers: API_SECRET ? { Authorization: `Bearer ${API_SECRET}` } : {},
});
