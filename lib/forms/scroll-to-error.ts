import type { FieldErrors } from "react-hook-form";

// When a form fails validation on submit, react-hook-form just sets
// `errors` and re-renders — it doesn't bring the invalid field into view.
// On a long form (event request, registration) the first missing/invalid
// field is very often scrolled out of view, so the submit looks like it
// silently did nothing. These two helpers fix that: find the first error
// in react-hook-form's `errors` tree, then scroll/focus the matching
// field.
//
// Wire it in as the `onInvalid` callback of `handleSubmit`:
//   <form onSubmit={handleSubmit(onSubmit, focusFirstInvalidField)}>
// and pass `shouldFocusError: false` to `useForm` so this is the only
// thing driving focus (react-hook-form's own default would otherwise
// race it).

// Walks the `errors` object (which mirrors the form's shape — nested
// objects for grouped fields like `quote1.contactEmail`, arrays for
// field arrays like `suppliers.0.name`) and returns the dotted path of
// the first error, in the same order the fields are defined/rendered.
// This matches exactly how react-hook-form names a field registered via
// `register(\`suppliers.${index}.name\`)` — the `name` HTML attribute it
// sets is that exact string — so the path doubles as a DOM lookup key.
export function findFirstErrorFieldName(
  errors: FieldErrors | Record<string, unknown>
): string | null {
  function isLeaf(node: unknown): node is { message: string } {
    return (
      !!node &&
      typeof node === "object" &&
      typeof (node as Record<string, unknown>).message === "string"
    );
  }

  function walk(node: unknown, path: string[]): string[] | null {
    if (isLeaf(node)) return path;
    if (!node || typeof node !== "object") return null;
    const obj = node as Record<string, unknown>;
    // `ref` holds a live DOM node and `types` is a map of sub-errors for
    // a single field (not a deeper field path) — never recurse into
    // either. Object.keys on an array-like error (e.g. a field array)
    // visits numeric indices in order, then any extra own property such
    // as `.root` (the array-level error, e.g. "at least one required")
    // — exactly the order we want to search in.
    for (const key of Object.keys(obj)) {
      if (key === "ref" || key === "types") continue;
      const found = walk(obj[key], [...path, key]);
      if (found) return found;
    }
    return null;
  }

  const path = walk(errors, []);
  return path && path.length > 0 ? path.join(".") : null;
}

// Scrolls to and focuses the form field matching `name`. Looks first for
// a real form control registered with that exact `name` (covers every
// `register()`-bound input/select/textarea, including radio groups —
// `getElementsByName` returns all of them, so the first one in the DOM
// is used). Falls back to any element marked with a matching
// `data-field-name`, for custom controls that aren't wired through
// `register()` (a checkbox list driven by `setValue`, a file input whose
// value is swapped for a storage path before submit).
export function scrollToErrorField(name: string | null) {
  if (!name || typeof document === "undefined") return;

  function locate(n: string): HTMLElement | null {
    const byName = document.getElementsByName(n);
    if (byName.length > 0) return byName[0];
    return document.querySelector<HTMLElement>(`[data-field-name="${n}"]`);
  }

  // A field-array-level error (e.g. "at least one item required") is
  // reported on a synthetic `.root` key with no matching input — fall
  // back to whatever marks the array's section as a whole.
  const target = locate(name) ?? locate(name.replace(/\.root$/, ""));
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "center" });

  // Focus slightly after kicking off the scroll, so the browser doesn't
  // jump straight to the field's pre-scroll position instead of
  // following the smooth scroll.
  window.setTimeout(() => {
    const focusable =
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
        ? target
        : target.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            "input, select, textarea"
          );
    focusable?.focus({ preventScroll: true });
  }, 300);
}

// Convenience wrapper for the common case — pass straight to
// `handleSubmit`'s `onInvalid` callback.
export function focusFirstInvalidField(
  errors: FieldErrors | Record<string, unknown>
) {
  scrollToErrorField(findFirstErrorFieldName(errors));
}
