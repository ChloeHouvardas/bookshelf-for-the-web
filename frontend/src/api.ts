import type { Book, BookDetail, Bookshelf, Resource, SourceType } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

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

