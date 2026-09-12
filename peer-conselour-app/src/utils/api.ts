// =======================================================
// ENVIRONMENT CONFIGURATION - SINGLE SOURCE OF TRUTH
// Toggle comments to switch environments:
// =======================================================

// ✅ DEVELOPMENT (local)
// export const BASE_URL = "http://localhost:8080";

// 🚀 PRODUCTION (host server)
export const BASE_URL = "https://api-konseling.ub.ac.id";

// =======================================================

export const JWT_KEY = "_secure_session_token_ub_counseling_state_v1_";

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = new Headers(options.headers || {});

  // Retrieve token from localStorage if available
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(JWT_KEY);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // Set Content-Type to JSON if not already set, body is present, and body is not FormData
  if (options.body && !(typeof FormData !== "undefined" && options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  let data: any = null;
  const contentType = response.headers.get("Content-Type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage = (data && data.error) || response.statusText || "Request failed";
    throw new ApiError(errorMessage, response.status, data);
  }

  return data;
}

export const api = {
  get: (path: string, options?: RequestInit) =>
    request(path, { ...options, method: "GET" }),

  post: (path: string, body: any, options?: RequestInit) =>
    request(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: (path: string, body: any, options?: RequestInit) =>
    request(path, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: (path: string, options?: RequestInit) =>
    request(path, { ...options, method: "DELETE" }),

  // Upload multipart/form-data (do NOT set Content-Type — browser sets it with boundary)
  upload: (path: string, formData: FormData) =>
    request(path, { method: "POST", body: formData as any }),
};
