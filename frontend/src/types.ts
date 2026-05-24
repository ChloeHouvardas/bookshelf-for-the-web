export type SourceType = "article" | "paper" | "post" | "video" | "tool" | "other";

export type Tag = {
  id: number;
  name: string;
};

export type Book = {
  id: number;
  title: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

export type Resource = {
  id: number;
  url: string;
  title: string;
  description: string | null;
  notes: string | null;
  source_type: SourceType;
  tags: Tag[];
  created_at: string;
  updated_at: string;
};

export type Placement = {
  id: number;
  resource: Resource;
  section_id: number;
  position: number;
  created_at: string;
  updated_at: string;
};

export type Section = {
  id: number;
  book_id: number;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
  placements: Placement[];
};

export type BookDetail = Book & {
  sections: Section[];
};

export type Bookshelf = {
  books: Book[];
  resources_count: number;
};

