"use client";

import { useState, type FormEvent } from "react";

interface NewsletterSignupProps {
  postSlug?: string;
}

/**
 * NewsletterSignup — compact inline email capture card for blog posts.
 * POSTs to /api/newsletter with { email, source, postSlug } and shows
 * a success message on 2xx. On failure, keeps the form mounted so the
 * reader can retry.
 */
export function NewsletterSignup({ postSlug }: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          source: "blog",
          postSlug: postSlug ?? "general",
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  };

  if (status === "success") {
    return (
      <div className="bento-card p-6 mt-12">
        <div className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-bold">
          Newsletter
        </div>
        <h3 className="text-lg font-bold text-zinc-100 mb-2">You&apos;re in.</h3>
        <p className="text-sm text-zinc-300">
          Welcome aboard. Check your inbox to confirm.
        </p>
      </div>
    );
  }

  return (
    <div className="bento-card p-6 mt-12">
      <div className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2 font-bold">
        Newsletter
      </div>
      <h3 className="text-lg font-bold text-zinc-100 mb-2">Get insights weekly</h3>
      <p className="text-sm text-zinc-400 mb-4">
        Practical, AI-native ideas for boutique firms managing many clients. No fluff.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email" data-ph-no-capture
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="input-premium flex-1 py-2 px-4 text-sm"
          disabled={status === "submitting"}
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn-premium py-2 px-5 text-xs whitespace-nowrap"
        >
          {status === "submitting" ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      {status === "error" && errorMessage && (
        <p className="text-xs text-red-400 mt-3" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
