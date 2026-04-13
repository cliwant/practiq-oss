"use client";

import { useState } from "react";
import { Twitter, Linkedin, Link2, Check } from "lucide-react";

interface SocialShareProps {
  url: string;
  title: string;
}

/**
 * SocialShare — three inline icon buttons for sharing the current post:
 * X (Twitter), LinkedIn, and a "copy link" button with transient confirm state.
 */
export function SocialShare({ url, title }: SocialShareProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const twitterHref = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[social-share] clipboard error:", err);
    }
  };

  const iconClass =
    "bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-lg p-2 transition-colors";

  return (
    <div className="flex items-center gap-2" aria-label="Share this post">
      <a
        href={twitterHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X (Twitter)"
        className={iconClass}
      >
        <Twitter className="w-4 h-4" />
      </a>
      <a
        href={linkedinHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on LinkedIn"
        className={iconClass}
      >
        <Linkedin className="w-4 h-4" />
      </a>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Link copied" : "Copy link"}
        className={iconClass}
      >
        {copied ? (
          <Check className="w-4 h-4 text-emerald-400" />
        ) : (
          <Link2 className="w-4 h-4" />
        )}
      </button>
      {copied && (
        <span className="text-xs text-zinc-400" aria-live="polite">
          Copied!
        </span>
      )}
    </div>
  );
}
