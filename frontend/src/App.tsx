import { BookOpen, BookmarkPlus, Library, Link, Plus, Tags } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { api } from "./api";
import type { Book, BookDetail, Resource, ResourceWithPlacements, SourceType } from "./types";

const bookColors = ["#a95f68", "#647f5d", "#4f7a82", "#aa7a43", "#77699b"];
const sourceTypes: SourceType[] = ["article", "paper", "post", "video", "tool", "other"];

type LoadState = "idle" | "loading" | "ready" | "error";
type AppView = "bookshelf" | "resources";

function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceIndex, setResourceIndex] = useState<ResourceWithPlacements[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<AppView>("bookshelf");
  const [resourceSearch, setResourceSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceType | "all">("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [showUnplacedOnly, setShowUnplacedOnly] = useState(false);

  const selectedBook = useMemo(
    () => books.find((book) => book.id === selectedBookId) ?? null,
    [books, selectedBookId],
  );

  const tagOptions = useMemo(
    () =>
      Array.from(
        new Set(resourceIndex.flatMap((resource) => resource.tags.map((tag) => tag.name))),
      ).sort(),
    [resourceIndex],
  );

  const filteredResourceIndex = useMemo(() => {
    const search = resourceSearch.trim().toLowerCase();
    return resourceIndex.filter((resource) => {
      const searchableText = [
        resource.title,
        resource.url,
        resource.description ?? "",
        resource.notes ?? "",
        resource.source_type,
        ...resource.tags.map((tag) => tag.name),
        ...resource.placements.flatMap((placement) => [
          placement.book_title,
          placement.section_title,
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!search || searchableText.includes(search)) &&
        (sourceFilter === "all" || resource.source_type === sourceFilter) &&
        (tagFilter === "all" || resource.tags.some((tag) => tag.name === tagFilter)) &&
        (!showUnplacedOnly || resource.placements.length === 0)
      );
    });
  }, [resourceIndex, resourceSearch, sourceFilter, tagFilter, showUnplacedOnly]);

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

  async function openView(view: AppView) {
    setActiveView(view);
    setError(null);
    if (view === "resources") {
      try {
        setResourceIndex(await api.resourcesWithPlacements());
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load resources");
      }
    }
  }

  async function refreshResourceIndex() {
    if (activeView === "resources") {
      setResourceIndex(await api.resourcesWithPlacements());
    }
  }

  async function selectBook(bookId: number) {
    try {
      setError(null);
      setSelectedBookId(bookId);
      setBookDetail(await api.book(bookId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open book");
    }
  }

  async function createBook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingAction) return;
    const form = event.currentTarget;
    try {
      setPendingAction("book");
      setError(null);
      const data = new FormData(form);
      const color = String(data.get("color") || bookColors[0]);
      const book = await api.createBook({
        title: String(data.get("title")),
        description: String(data.get("description") || ""),
        color,
      });
      form.reset();
      await loadAll(book.id);
      await refreshResourceIndex();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add book");
    } finally {
      setPendingAction(null);
    }
  }

  async function createSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingAction) return;
    if (!selectedBookId) return;
    const form = event.currentTarget;
    try {
      setPendingAction("section");
      setError(null);
      const data = new FormData(form);
      await api.createSection(selectedBookId, { title: String(data.get("title")) });
      form.reset();
      await loadAll(selectedBookId);
      await refreshResourceIndex();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add section");
    } finally {
      setPendingAction(null);
    }
  }

  async function createResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingAction) return;
    const form = event.currentTarget;
    try {
      setPendingAction("resource");
      setError(null);
      const data = new FormData(form);
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
      form.reset();
      await loadAll(selectedBookId);
      await refreshResourceIndex();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save resource");
    } finally {
      setPendingAction(null);
    }
  }

  async function placeResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingAction) return;
    const form = event.currentTarget;
    try {
      setPendingAction("placement");
      setError(null);
      const data = new FormData(form);
      await api.createPlacement({
        resource_id: Number(data.get("resource_id")),
        section_id: Number(data.get("section_id")),
      });
      form.reset();
      await loadAll(selectedBookId);
      await refreshResourceIndex();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not place resource");
    } finally {
      setPendingAction(null);
    }
  }

  async function deletePlacement(placementId: number) {
    try {
      setError(null);
      await api.deletePlacement(placementId);
      await loadAll(selectedBookId);
      await refreshResourceIndex();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove resource");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local library</p>
          <h1>Online Bookshelf</h1>
          <p className="topbar-copy">A quiet place to collect the links worth returning to.</p>
        </div>
        <div className="stats" aria-label="Bookshelf stats">
          <span>{books.length} books</span>
          <span>{resources.length} resources</span>
        </div>
      </header>

      <nav className="view-tabs" aria-label="Primary views">
        <button
          className={activeView === "bookshelf" ? "active" : ""}
          type="button"
          onClick={() => void openView("bookshelf")}
        >
          Bookshelf
        </button>
        <button
          className={activeView === "resources" ? "active" : ""}
          type="button"
          onClick={() => void openView("resources")}
        >
          Resources
        </button>
      </nav>

      {error ? <div className="alert">{error}</div> : null}
      {loadState === "loading" && books.length === 0 ? <div className="loading">Loading shelf...</div> : null}

      {activeView === "bookshelf" ? (
      <section className="layout">
        <aside className="panel shelf-panel" aria-label="Bookshelf">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Shelf</p>
              <h2>Books</h2>
            </div>
            <Library size={22} aria-hidden="true" />
          </div>
          <div className="shelf">
            {books.map((book) => (
              <button
                key={book.id}
                className={`book-spine ${book.id === selectedBookId ? "active" : ""}`}
                style={{ "--book-color": book.color } as React.CSSProperties}
                onClick={() => void selectBook(book.id)}
                title={book.title}
              >
                <span>{book.title}</span>
              </button>
            ))}
            {books.length === 0 ? <p className="shelf-empty">No books yet</p> : null}
          </div>
          <form className="stacked-form form-card" onSubmit={(event) => void createBook(event)}>
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
            <button type="submit" disabled={pendingAction === "book"}>
              <Plus size={16} aria-hidden="true" />
              {pendingAction === "book" ? "Adding..." : "Add"}
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
            <div className="book-header-icon">
              <BookOpen size={34} aria-hidden="true" />
            </div>
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
                          <p className="resource-type">{placement.resource.source_type}</p>
                          <a href={placement.resource.url} target="_blank" rel="noreferrer">
                            {placement.resource.title}
                          </a>
                          <p>{placement.resource.description || placement.resource.url}</p>
                          <div className="tag-list">
                            {placement.resource.tags.map((tag) => (
                              <span key={tag.id}>{tag.name}</span>
                            ))}
                          </div>
                        </div>
                        <button
                          className="icon-button"
                          onClick={() => void deletePlacement(placement.id)}
                          type="button"
                        >
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
          <form className="stacked-form form-card" onSubmit={(event) => void createSection(event)}>
            <h3>New section</h3>
            <input
              name="title"
              placeholder="Foundations"
              required
              disabled={!selectedBookId || pendingAction === "section"}
            />
            <button type="submit" disabled={!selectedBookId || pendingAction === "section"}>
              <BookmarkPlus size={16} aria-hidden="true" />
              {pendingAction === "section" ? "Adding..." : "Add section"}
            </button>
          </form>

          <form className="stacked-form form-card" onSubmit={(event) => void createResource(event)}>
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
            <button type="submit" disabled={pendingAction === "resource"}>
              <Link size={16} aria-hidden="true" />
              {pendingAction === "resource" ? "Saving..." : "Save resource"}
            </button>
          </form>

          <form className="stacked-form form-card" onSubmit={(event) => void placeResource(event)}>
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
            <button
              type="submit"
              disabled={!resources.length || !bookDetail?.sections.length || pendingAction === "placement"}
            >
              <Tags size={16} aria-hidden="true" />
              {pendingAction === "placement" ? "Placing..." : "Place"}
            </button>
          </form>
        </aside>
      </section>
      ) : (
        <section className="resources-view">
          <div className="resource-index-header">
            <div>
              <p className="eyebrow">Resource index</p>
              <h2>All resources</h2>
              <p>Scan everything you have saved and where it lives on the shelf.</p>
            </div>
            <span>{filteredResourceIndex.length} shown</span>
          </div>

          <div className="resource-filters" aria-label="Resource filters">
            <input
              aria-label="Search resources"
              placeholder="Search title, URL, tags, books..."
              value={resourceSearch}
              onChange={(event) => setResourceSearch(event.target.value)}
            />
            <select
              aria-label="Filter by source type"
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as SourceType | "all")}
            >
              <option value="all">All source types</option>
              {sourceTypes.map((sourceType) => (
                <option key={sourceType} value={sourceType}>
                  {sourceType}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by tag"
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
            >
              <option value="all">All tags</option>
              {tagOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <label className="checkbox-filter">
              <input
                type="checkbox"
                checked={showUnplacedOnly}
                onChange={(event) => setShowUnplacedOnly(event.target.checked)}
              />
              Unplaced only
            </label>
          </div>

          <div className="resource-index-list">
            {filteredResourceIndex.map((resource) => (
              <article className="resource-index-row" key={resource.id}>
                <div className="resource-index-main">
                  <p className="resource-type">{resource.source_type}</p>
                  <a href={resource.url} target="_blank" rel="noreferrer">
                    {resource.title}
                  </a>
                  <p>{resource.description || resource.url}</p>
                  <div className="tag-list">
                    {resource.tags.map((tag) => (
                      <span key={tag.id}>{tag.name}</span>
                    ))}
                  </div>
                </div>
                <div className="membership-list" aria-label={`Book memberships for ${resource.title}`}>
                  {resource.placements.length > 0 ? (
                    resource.placements.map((placement) => (
                      <span className="membership-chip" key={placement.placement_id}>
                        {placement.book_title} / {placement.section_title}
                      </span>
                    ))
                  ) : (
                    <span className="membership-chip unplaced">Unplaced</span>
                  )}
                </div>
              </article>
            ))}
            {filteredResourceIndex.length === 0 ? (
              <p className="empty resource-index-empty">No resources match these filters.</p>
            ) : null}
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
