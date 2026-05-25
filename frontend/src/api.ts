import type { Book, BookDetail, Bookshelf, Resource, ResourceWithPlacements, SourceType } from "./types";

function getApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000";
  }

  return `${window.location.protocol}//${window.location.hostname}:8000`;
}

const API_BASE_URL = getApiBaseUrl();

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
  } catch {
    throw new Error(`Could not reach the API at ${API_BASE_URL}`);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(body.detail ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  bookshelf: () => request<Bookshelf>("/bookshelf"),
  book: (bookId: number) => request<BookDetail>(`/books/${bookId}`),
  books: () => request<Book[]>("/books"),
  createBook: (payload: { title: string; description?: string; color: string }) =>
    request<Book>("/books", { method: "POST", body: JSON.stringify(payload) }),
  createSection: (bookId: number, payload: { title: string; position?: number }) =>
    request(`/books/${bookId}/sections`, { method: "POST", body: JSON.stringify(payload) }),
  resources: () => request<Resource[]>("/resources"),
  resourcesWithPlacements: () => request<ResourceWithPlacements[]>("/resources/with-placements"),
  createResource: (payload: {
    url: string;
    title: string;
    description?: string;
    notes?: string;
    source_type: SourceType;
    tag_names: string[];
  }) => request<Resource>("/resources", { method: "POST", body: JSON.stringify(payload) }),
  createPlacement: (payload: { resource_id: number; section_id: number }) =>
    request("/placements", { method: "POST", body: JSON.stringify(payload) }),
  deletePlacement: (placementId: number) =>
    request(`/placements/${placementId}`, { method: "DELETE" }),
};
