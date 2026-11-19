
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

let refreshPromise: Promise<string | null> | null = null;

function clearSession() {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("refresh_token");
  sessionStorage.removeItem("current_user");
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = sessionStorage.getItem("refresh_token");

  if (!refreshToken) {
    clearSession();
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (!response.ok) {
      clearSession();
      return null;
    }

    const data = await response.json();

    if (!data.access_token) {
      clearSession();
      return null;
    }

    sessionStorage.setItem("access_token", data.access_token);

    return data.access_token;
  } catch (error) {
    // Keep the session if the server is temporarily unreachable.
    throw error;
  }
}

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_URL}${endpoint}`;

  const headers = new Headers(options.headers);
  const accessToken = sessionStorage.getItem("access_token");

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Only attempt renewal once for an expired access token.
  if (
    response.status === 401 &&
    !endpoint.includes("/api/auth/refresh")
  ) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const newAccessToken = await refreshPromise;

    if (!newAccessToken) {
      if (typeof window !== "undefined") {
        window.location.assign("/login");
      }

      return response;
    }

    const retryHeaders = new Headers(options.headers);
    retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);

    response = await fetch(url, {
      ...options,
      headers: retryHeaders,
    });

    if (response.status === 401) {
      clearSession();

      if (typeof window !== "undefined") {
        window.location.assign("/login");
      }
    }
  }

  return response;
}
