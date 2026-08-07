import Link from "next/link";
import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`container ${className}`.trim()}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function ButtonLink({
  href,
  children,
  secondary = false,
  small = false,
  external = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  small?: boolean;
  external?: boolean;
}) {
  const className = `button ${secondary ? "button-secondary" : ""} ${small ? "button-small" : ""}`.trim();
  if (external || href.startsWith("http") || href.startsWith("#")) {
    return <a className={className} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>{children}</a>;
  }
  return <Link className={className} href={href}>{children}</Link>;
}

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      {items.map((item, index) => item.href
        ? <Link href={item.href} key={`${item.href}-${item.label}`}>{item.label}</Link>
        : <span aria-current={index === items.length - 1 ? "page" : undefined} key={item.label}>{item.label}</span>)}
    </nav>
  );
}

export function PageHero({ eyebrow, title, intro, breadcrumbLabel = eyebrow }: { eyebrow: string; title: string; intro: string; breadcrumbLabel?: string }) {
  return (
    <section className="page-hero">
      <Container className="stack-lg">
        <Breadcrumbs items={[{ label: breadcrumbLabel }]} />
        <div className="stack">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1>{title}</h1>
          <p className="lede">{intro}</p>
        </div>
      </Container>
    </section>
  );
}
