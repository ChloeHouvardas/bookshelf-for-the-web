import { BookOpen, BookmarkPlus, Library, Link, Plus, Tags } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { api } from "./api";
import type { Book, BookDetail, Resource, SourceType } from "./types";

const bookColors = ["#b76e79", "#6f8f72", "#4e7c8a", "#b88b4a", "#7c6e9f"];
const sourceTypes: SourceType[] = ["article", "paper", "post", "video", "tool", "other"];

type LoadState = "idle" | "loading" | "ready" | "error";

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const selectedBook = useMemo(
    () => books.find((book) => book.id === selectedBookId) ?? null,
    [books, selectedBookId],
  );

  const loadAll = useCallback(async (nextBookId: number | null) => {
    setLoadState("loading");
    setError(null);
    try {
      const [bookshelf, nextResources] = await Promise.all([api.bookshelf(), api.resources()]);
      setBooks(bookshelf.books);
      setResources(nextResources);
      const targetBookId = nextBookId ?? bookshelf.books[0]?.id ?? null;
      setSelectedBookId(targetBookId);
      setBookDetail(targetBookId ? await api.book(targetBookId) : null);
      setLoadState("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load bookshelf");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void loadAll(null);
  }, [loadAll]);

  async function selectBook(bookId: number) {
    setSelectedBookId(bookId);
    setBookDetail(await api.book(bookId));
  }

  async function createBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const color = String(data.get("color") || bookColors[0]);
    const book = await api.createBook({
      title: String(data.get("title")),
      description: String(data.get("description") || ""),
      color,
    });
    event.currentTarget.reset();
    await loadAll(book.id);
  }

  async function createSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBookId) return;
    const data = new FormData(event.currentTarget);
    await api.createSection(selectedBookId, { title: String(data.get("title")) });
    event.currentTarget.reset();
    await loadAll(selectedBookId);
  }

  async function createResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const tagNames = String(data.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    await api.createResource({
      url: String(data.get("url")),
      title: String(data.get("title")),
      description: String(data.get("description") || ""),
      notes: String(data.get("notes") || ""),
      source_type: String(data.get("source_type")) as SourceType,
      tag_names: tagNames,
    });
    event.currentTarget.reset();
    await loadAll(selectedBookId);
  }

  async function placeResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await api.createPlacement({
      resource_id: Number(data.get("resource_id")),
      section_id: Number(data.get("section_id")),
    });
    event.currentTarget.reset();
    await loadAll(selectedBookId);
  }

  async function deletePlacement(placementId: number) {
    await api.deletePlacement(placementId);
    await loadAll(selectedBookId);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local library</p>
          <h1>Online Bookshelf</h1>
        </div>
        <div className="stats" aria-label="Bookshelf stats">
          <span>{books.length} books</span>
          <span>{resources.length} resources</span>
        </div>
      </header>

      {error ? <div className="alert">{error}</div> : null}
      {loadState === "loading" && books.length === 0 ? <div className="loading">Loading shelf...</div> : null}

      <section className="layout">
        <aside className="panel shelf-panel" aria-label="Bookshelf">
          <div className="panel-heading">
            <Library size={20} aria-hidden="true" />
            <h2>Books</h2>
          </div>
          <div className="shelf">
            {books.map((book) => (
              <button
                key={book.id}
                className={`book-spine ${book.id === selectedBookId ? "active" : ""}`}
                style={{ "--book-color": book.color } as React.CSSProperties}
                onClick={() => void selectBook(book.id)}
              >
                <span>{book.title}</span>
              </button>
            ))}
          </div>
          <form className="stacked-form" onSubmit={(event) => void createBook(event)}>
            <h3>Add book</h3>
            <input name="title" placeholder="Book title" required maxLength={120} />
            <input name="description" placeholder="Short description" maxLength={500} />
            <div className="swatches">
              {bookColors.map((color) => (
                <label key={color} title={color}>
                  <input name="color" type="radio" value={color} defaultChecked={color === bookColors[0]} />
                  <span style={{ background: color }} />
                </label>
              ))}
            </div>
            <button type="submit">
              <Plus size={16} aria-hidden="true" />
              Add
            </button>
          </form>
        </aside>

        <section className="workspace">
          <div className="book-header">
            <div>
              <p className="eyebrow">Table of contents</p>
              <h2>{selectedBook?.title ?? "Create your first book"}</h2>
              <p>{selectedBook?.description || "Group resources into sections you can scan later."}</p>
            </div>
            <BookOpen size={36} aria-hidden="true" />
          </div>

          {bookDetail ? (
            <div className="sections">
              {bookDetail.sections.map((section) => (
                <article className="section-block" key={section.id}>
                  <div className="section-title">
                    <h3>{section.title}</h3>
                    <span>{section.placements.length}</span>
                  </div>
                  <div className="resource-list">
                    {section.placements.map((placement) => (
                      <div className="resource-row" key={placement.id}>
                        <div>
                          <a href={placement.resource.url} target="_blank" rel="noreferrer">
                            {placement.resource.title}
                          </a>
                          <p>{placement.resource.description || placement.resource.url}</p>
                          <div className="tag-list">
                            <span>{placement.resource.source_type}</span>
                            {placement.resource.tags.map((tag) => (
                              <span key={tag.id}>{tag.name}</span>
                            ))}
                          </div>
                        </div>
                        <button className="icon-button" onClick={() => void deletePlacement(placement.id)}>
                          Remove
                        </button>
                      </div>
                    ))}
                    {section.placements.length === 0 ? <p className="empty">No resources yet.</p> : null}
                  </div>
                </article>
              ))}
              {bookDetail.sections.length === 0 ? <p className="empty">Add a section to start this book.</p> : null}
            </div>
          ) : (
            <p className="empty">Your shelf is ready for its first book.</p>
          )}
        </section>

        <aside className="panel actions-panel" aria-label="Actions">
          <form className="stacked-form" onSubmit={(event) => void createSection(event)}>
            <h3>New section</h3>
            <input name="title" placeholder="Foundations" required disabled={!selectedBookId} />
            <button type="submit" disabled={!selectedBookId}>
              <BookmarkPlus size={16} aria-hidden="true" />
              Add section
            </button>
          </form>

          <form className="stacked-form" onSubmit={(event) => void createResource(event)}>
            <h3>New resource</h3>
            <input name="title" placeholder="Resource title" required maxLength={240} />
            <input name="url" placeholder="https://..." required type="url" />
            <textarea name="description" placeholder="Why it matters" maxLength={1000} />
            <textarea name="notes" placeholder="Your notes" maxLength={4000} />
            <select name="source_type" defaultValue="article">
              {sourceTypes.map((sourceType) => (
                <option key={sourceType} value={sourceType}>
                  {sourceType}
                </option>
              ))}
            </select>
            <input name="tags" placeholder="ai, basics, paper" />
            <button type="submit">
              <Link size={16} aria-hidden="true" />
              Save resource
            </button>
          </form>

          <form className="stacked-form" onSubmit={(event) => void placeResource(event)}>
            <h3>Place resource</h3>
            <select name="resource_id" required disabled={resources.length === 0}>
              <option value="">Choose resource</option>
              {resources.map((resource) => (
                <option key={resource.id} value={resource.id}>
                  {resource.title}
                </option>
              ))}
            </select>
            <select name="section_id" required disabled={!bookDetail?.sections.length}>
              <option value="">Choose section</option>
              {bookDetail?.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
            <button type="submit" disabled={!resources.length || !bookDetail?.sections.length}>
              <Tags size={16} aria-hidden="true" />
              Place
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}

export default App;
