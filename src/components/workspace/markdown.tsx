"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Chat + approval-item markdown renderer.
 *
 * Mirrors the typographic rhythm of the surrounding product surface:
 *   - zinc-200 body, tighter leading, compact margins
 *   - code in JetBrains Mono with a dark glass surface
 *   - tables with subtle zinc-900 borders
 *   - links highlighted with a muted underline instead of a full-color bump
 *     so prose feels professional, not demo-ish
 *
 * GFM enabled so tables, task-lists, and strikethrough all render.
 * Dangerously no HTML — Claude output is treated as untrusted prose.
 */
export function Markdown({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={`markdown-body text-[13.5px] leading-[1.65] text-zinc-200 ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          p({ children }) {
            return <p className="mb-3 last:mb-0">{children}</p>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-100 underline decoration-zinc-700 underline-offset-[3px] transition-colors hover:decoration-zinc-400"
              >
                {children}
              </a>
            );
          },
          ul({ children }) {
            return <ul className="mb-3 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="mb-3 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-zinc-200 marker:text-zinc-600">{children}</li>;
          },
          h1({ children }) {
            return <h1 className="mb-2 mt-4 text-[17px] font-bold text-zinc-50">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="mb-2 mt-4 text-[15px] font-bold text-zinc-100">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="mb-1 mt-3 text-[13.5px] font-semibold text-zinc-100">{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="mb-3 border-l-2 border-zinc-700 pl-3 text-zinc-400 italic last:mb-0">
                {children}
              </blockquote>
            );
          },
          code(props) {
            // Detect whether this is inline vs fenced. remark-rehype gives
            // inline code a `className` of undefined; block code ends up
            // nested inside <pre>. We render both cases distinctly.
            const {
              node: _node,
              className: langClass,
              children,
              ...rest
            } = props as typeof props & {
              node?: unknown;
              className?: string;
            };
            const text = String(children ?? "");
            const isBlock = langClass?.startsWith("language-");
            if (isBlock) {
              return (
                <code
                  className="block overflow-x-auto rounded-lg border border-zinc-800 bg-[#0b0b0b] p-3 font-mono text-[12.5px] leading-relaxed text-zinc-200"
                  {...rest}
                >
                  {text}
                </code>
              );
            }
            return (
              <code
                className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[11.5px] text-zinc-100"
                {...rest}
              >
                {text}
              </code>
            );
          },
          pre({ children }) {
            return <pre className="mb-3 last:mb-0">{children}</pre>;
          },
          table({ children }) {
            return (
              <div className="mb-3 overflow-x-auto last:mb-0">
                <table className="min-w-full border-collapse text-[12.5px]">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-zinc-900/60">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="border-b border-zinc-800 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border-b border-zinc-900/60 px-3 py-2 text-zinc-300">
                {children}
              </td>
            );
          },
          hr() {
            return <hr className="my-4 border-zinc-900" />;
          },
          strong({ children }) {
            return <strong className="font-semibold text-zinc-50">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic">{children}</em>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
