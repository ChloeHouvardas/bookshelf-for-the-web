import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

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
    if (url.endsWith("/resources/with-placements")) {
      return Promise.resolve(
        new Response(
          JSON.stringify([
            {
              id: 1,
              url: "https://example.com/resource",
              title: "Placed Resource",
              description: "Useful reference",
              notes: null,
              source_type: "article",
              tags: [{ id: 1, name: "ai" }],
              created_at: "2026-05-24T00:00:00",
              updated_at: "2026-05-24T00:00:00",
              placements: [
                {
                  placement_id: 10,
                  book_id: 2,
                  book_title: "AI Basics",
                  section_id: 3,
                  section_title: "Foundations",
                },
              ],
            },
            {
              id: 2,
              url: "https://example.com/unplaced",
              title: "Loose Resource",
              description: null,
              notes: null,
              source_type: "paper",
              tags: [],
              created_at: "2026-05-24T00:00:00",
              updated_at: "2026-05-24T00:00:00",
              placements: [],
            },
          ]),
          { status: 200 },
        ),
      );
    }
    return Promise.resolve(new Response(JSON.stringify({ detail: "not found" }), { status: 404 }));
  }),
);

describe("App", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the bookshelf shell", async () => {
    render(<App />);
    expect(await screen.findByText("Online Bookshelf")).toBeInTheDocument();
    expect(screen.getByText("Add book")).toBeInTheDocument();
  });

  it("renders resource memberships in the resources tab", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Resources" }));

    expect(await screen.findByText("Placed Resource")).toBeInTheDocument();
    expect(screen.getByText("AI Basics / Foundations")).toBeInTheDocument();
    expect(screen.getByText("Loose Resource")).toBeInTheDocument();
    expect(screen.getByText("Unplaced")).toBeInTheDocument();
  });
});
