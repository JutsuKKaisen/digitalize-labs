// Polyfill or safe check for process.env
const env: any = typeof process !== 'undefined' ? process.env : {};

export const API_BASE_URL = env.NEXT_PUBLIC_API_BASE_URL || '';
export const MAX_GRAPH_NODES = Number(env.NEXT_PUBLIC_DEFAULT_MAX_GRAPH_NODES) || 500;
