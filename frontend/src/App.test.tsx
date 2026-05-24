import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

vi.stubGlobal(
  "fetch",
  vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/bookshelf")) {
      return Promise.resolve(
        new Response(JSON.stringify({ books: [], resources_count: 0 }), { status: 200 }),
      );
    }
    if (url.endsWith("/resources")) {
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    }
    return Promise.resolve(new Response(JSON.stringify({ detail: "not found" }), { status: 404 }));
  }),
);

describe("App", () => {
  it("renders the bookshelf shell", async () => {
    render(<App />);
    expect(await screen.findByText("Online Bookshelf")).toBeInTheDocument();
    expect(screen.getByText("Add book")).toBeInTheDocument();
  });
});

