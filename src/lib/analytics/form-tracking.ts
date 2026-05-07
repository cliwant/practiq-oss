/**
 * Form field-level telemetry (Tier 5).
 *
 * Usage: wrap a <form> with `useFormTracking(formId)` to get props that
 * fire `form_field_focused` / `form_field_blurred` / `form_validation_failed`
 * / `form_submitted` on the underlying fields. Drop-off analysis falls
 * out: SQL `last form_field_focused before exit` per visitor.
 */
"use client";

import { useEffect, useRef } from "react";
import { trackClient } from "./track-client";

export function useFormTracking(formId: string) {
  const ref = useRef<HTMLFormElement | null>(null);
  const focusStartRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const form = ref.current;
    if (!form) return;

    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!t || !t.name) return;
      focusStartRef.current.set(t.name, Date.now());
      trackClient({
        type: "form_field_focused",
        properties: { form_id: formId, field_name: t.name },
      });
    };
    const onBlur = (e: FocusEvent) => {
      const t = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!t || !t.name) return;
      const start = focusStartRef.current.get(t.name) ?? Date.now();
      const elapsed = Date.now() - start;
      const hasValue = !!t.value && t.value.length > 0;
      const hasError =
        "validity" in t && !(t as HTMLInputElement).validity.valid;
      trackClient({
        type: "form_field_blurred",
        properties: {
          form_id: formId,
          field_name: t.name,
          has_value: hasValue,
          has_error: hasError,
          time_focused_ms: elapsed,
        },
      });
    };
    const onInvalid = (e: Event) => {
      const t = e.target as HTMLInputElement | null;
      if (!t || !t.name) return;
      trackClient({
        type: "form_validation_failed",
        properties: {
          form_id: formId,
          field_name: t.name,
          reason: t.validationMessage || "invalid",
        },
      });
    };
    const onSubmit = () => {
      trackClient({
        type: "form_submitted",
        properties: { form_id: formId },
      });
    };

    form.addEventListener("focusin", onFocus);
    form.addEventListener("focusout", onBlur);
    form.addEventListener("invalid", onInvalid, true);
    form.addEventListener("submit", onSubmit);
    return () => {
      form.removeEventListener("focusin", onFocus);
      form.removeEventListener("focusout", onBlur);
      form.removeEventListener("invalid", onInvalid, true);
      form.removeEventListener("submit", onSubmit);
    };
  }, [formId]);

  return ref;
}
