const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const TOKEN_KEY = 'llt_access_token';
export const AUTH_SESSION_EXPIRED_EVENT = 'llt:auth-session-expired';

export class ApiError extends Error {
  constructor(message, status, code, requestId) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, { method = 'GET', body, headers = {}, ...options } = {}) {
  const requestHeaders = new Headers(headers);
  const token = getAccessToken();
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);

  let requestBody = body;
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers: requestHeaders,
    body: requestBody,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    if (response.status === 401 && token) {
      clearAccessToken();
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
