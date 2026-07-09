const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const JWT_KEY = "ub_counseling_jwt";

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

  // Set Content-Type to JSON if not already set and body is present
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
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
};
