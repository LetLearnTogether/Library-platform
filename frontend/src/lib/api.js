const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
export const AUTH_SESSION_EXPIRED_EVENT = 'llt:auth-session-expired';
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
let csrfToken = null;

sessionStorage.removeItem('llt_access_token');

function getCsrfCookie() {
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('__Host-lt_csrf=') || entry.startsWith('lt_csrf='));
  return cookie?.slice(cookie.indexOf('=') + 1) || csrfToken;
}

export function setCsrfToken(token) {
  csrfToken = token || null;
}

export class ApiError extends Error {
  constructor(message, status, code, requestId) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export async function apiRequest(path, { method = 'GET', body, headers = {}, ...options } = {}) {
  const requestHeaders = new Headers(headers);
  const requestMethod = method.toUpperCase();
  const csrfToken = getCsrfCookie();
  if (UNSAFE_METHODS.has(requestMethod) && csrfToken) {
    requestHeaders.set('X-CSRF-Token', csrfToken);
  }

  let requestBody = body;
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method: requestMethod,
    headers: requestHeaders,
    body: requestBody,
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    if (response.status === 401 && !['/auth/login', '/auth/google', '/auth/register'].includes(path)) {
      setCsrfToken(null);
      window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(
      data?.message || `Request failed with status ${response.status}.`,
      response.status,
      data?.error_code || 'REQUEST_FAILED',
      data?.request_id || response.headers.get('X-Request-ID'),
    );
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get('Content-Type') || '';
  return contentType.includes('application/json') ? response.json() : response;
}

export function getDocumentContentUrl(documentId, disposition = 'inline') {
  return `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/content?disposition=${disposition}`;
}

export function getVerificationUrl(token) {
  return `/verify/${encodeURIComponent(token)}`;
}

export function getVerificationQrUrl(token) {
  return `${API_BASE_URL}/verification/${encodeURIComponent(token)}/qr`;
}

export async function downloadDocument(documentId, disposition = 'inline') {
  const response = await apiRequest(`/documents/${encodeURIComponent(documentId)}/content?disposition=${disposition}`);
  if (!(response instanceof Response)) throw new Error('Document file could not be opened.');
  return response;
}
