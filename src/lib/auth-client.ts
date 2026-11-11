export const EXPECTED_CHEF_PIN = "R&O2hAd!62GtyXsT";

/**
 * Normalizes password inputs: trims outer whitespace.
 */
export function normalizePin(input: string | null | undefined): string {
  if (!input) return "";
  return String(input).trim();
}

export function isPinValid(input: string | null | undefined): boolean {
  return normalizePin(input) === EXPECTED_CHEF_PIN;
}

const CHEF_STORAGE_KEY = "zoks_chef_session_v2";
const CHEF_PIN_STORAGE_KEY = "zoks_chef_pin_v2";
const CUSTOMER_SESSION_KEY = "zoks_customer_id_v2";

export function saveChefAuth(token: string, pin = "R&O2hAd!62GtyXsT") {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHEF_STORAGE_KEY, token);
    localStorage.setItem(CHEF_PIN_STORAGE_KEY, normalizePin(pin));
  } catch {
    // Ignore storage errors
  }
}

export function getStoredChefToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CHEF_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getStoredChefPin(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CHEF_PIN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearChefAuth() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CHEF_STORAGE_KEY);
    localStorage.removeItem(CHEF_PIN_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function getChefHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getStoredChefToken();
  const pin = getStoredChefPin() || EXPECTED_CHEF_PIN;

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (pin) {
    headers["x-chef-pin"] = pin;
  }

  return headers;
}

export function getOrCreateCustomerId(): string {
  if (typeof window === "undefined") return "cust_anon";
  try {
    let id = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (!id) {
      id = `cust_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(CUSTOMER_SESSION_KEY, id);
    }
    return id;
  } catch {
    return "cust_fallback";
  }
}
