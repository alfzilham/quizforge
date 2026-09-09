import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Aksi halaman (tombol, dll.) — dipakai mulai Tahap 2. */
  children?: ReactNode;
};

/** Header standar per halaman konten (DESIGN.md §2). */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex items-center gap-2">{children}</div>
      ) : null}
    </header>
  );
}
