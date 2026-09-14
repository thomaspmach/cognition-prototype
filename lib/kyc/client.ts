export async function kycRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (!response.ok) {
    const body: unknown = await response.json();
    const message = typeof body === "object" && body !== null && "error" in body
      && typeof body.error === "string" ? body.error : "Request failed. Please retry.";
    throw new Error(message);
  }
  return response.json();
}
