"use client";

/**
 * SmoothInput — the standard text input for the entire LiftLoop site.
 * Production port of Skiper 106 (Skiper UI). The dev-only DialKit live-tuning
 * panel is removed and spring params are fixed. The native caret is hidden and
 * replaced with a spring-tracked animated caret; a visible gold focus ring
 * (outline-muted3) is preserved for accessibility. Honors prefers-reduced-motion
 * (the caret snaps instead of springing).
 *
 * Ref-forwarding + controlled/uncontrolled support make it a drop-in for
 * react-hook-form `register()` and for plain value/onChange usage.
 *
 * Skiper UI — free tier requires attribution. https://skiper-ui.com
 */

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import React, {
  type ComponentPropsWithoutRef,
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

const FIXED_SPRING = { stiffness: 500, damping: 30, mass: 0.5 } as const;

const inputWrapperClassName = cn(
  "bg-muted2 relative w-full rounded-2xl px-4 py-3.5",
  "border border-border transition-[border-color,box-shadow] duration-200",
  // soft focus ring (no hard offset rectangle) — accessible + smooth
  "has-[:focus-visible]:border-accent has-[:focus-visible]:shadow-[0_0_0_3px_rgba(200,149,108,0.22)]",
);

const inputClassName =
  "w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60";

type InputFieldProps = ComponentPropsWithoutRef<"input"> & {
  wrapperClassName?: string;
};

/** Plain (non-animated) input sharing the same skin — used where the animated
 *  caret is undesirable (e.g. numeric spinners). Prefer SmoothInput by default. */
export const Input = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ className, wrapperClassName, ...props }, ref) => (
    <div className={cn(inputWrapperClassName, "caret-accent", wrapperClassName)}>
      <input ref={ref} className={cn(inputClassName, className)} {...props} />
    </div>
  ),
);
Input.displayName = "Input";

/** Firefox renders the bullet glyph slightly differently; match its metrics.
 *  Guarded so it is safe even if navigator is unavailable. */
const PASSWORD_CHAR =
  typeof navigator !== "undefined" && /firefox|fxios/i.test(navigator.userAgent)
    ? "●"
    : "•";

const isChromiumLike =
  typeof navigator !== "undefined" &&
  /chrome|chromium|crios/i.test(navigator.userAgent);

type SmoothInputType = "text" | "password" | "email" | "tel" | "search" | "url";

export type SmoothInputProps = Omit<InputFieldProps, "type" | "size"> & {
  type?: SmoothInputType;
  /** Container font size in px (the caret + text follow it). Defaults to 16. */
  fontSize?: number;
};

function useMergedRef<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

export const SmoothInput = forwardRef<HTMLInputElement, SmoothInputProps>(
  function SmoothInput(
    {
      className,
      wrapperClassName,
      value,
      defaultValue,
      onChange,
      onBlur,
      type = "text",
      placeholder = "",
      fontSize = 16,
      style,
      ...props
    },
    forwardedRef,
  ) {
    const [internalValue, setInternalValue] = useState(defaultValue ?? "");
    const caretX = useMotionValue(0);
    const caretOpacity = useMotionValue(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const prefersReducedMotion = useReducedMotion();

    const isControlled = value !== undefined;
    const inputValue = isControlled ? String(value) : internalValue;
    const setRef = useMergedRef<HTMLInputElement>(inputRef, forwardedRef);

    const springCaretX = useSpring(
      caretX,
      prefersReducedMotion
        ? { stiffness: 10000, damping: 100, mass: 0.1 }
        : FIXED_SPRING,
    );

    const syncMeasureSpan = () => {
      const input = inputRef.current;
      const measureSpan = measureRef.current;
      if (!input || !measureSpan) return;

      const styles = window.getComputedStyle(input);
      const isPassword = input.type === "password";

      let fs = styles.fontSize;
      if (PASSWORD_CHAR === "•" && isPassword && !isChromiumLike) {
        fs = `${parseFloat(fs) + 6.25}px`;
      }

      measureSpan.style.font = `${styles.fontStyle} ${styles.fontWeight} ${fs} ${styles.fontFamily}`;
      measureSpan.style.letterSpacing = styles.letterSpacing;
      measureSpan.style.fontFeatureSettings = styles.fontFeatureSettings;
      measureSpan.style.fontVariationSettings = styles.fontVariationSettings;
    };

    const measurePrefixWidth = (text: string) => {
      const input = inputRef.current;
      const measureSpan = measureRef.current;
      if (!input || !measureSpan) return null;

      syncMeasureSpan();
      measureSpan.textContent = text;

      const paddingLeft =
        parseFloat(window.getComputedStyle(input).paddingLeft) || 0;

      return text.length > 0
        ? measureSpan.offsetWidth + paddingLeft
        : paddingLeft - 1;
    };

    const scrollCaretIntoView = (
      target: HTMLInputElement,
      absoluteWidth: number,
    ) => {
      const styles = window.getComputedStyle(target);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const maxScroll = Math.max(0, target.scrollWidth - target.clientWidth);
      const visibleRight = target.scrollLeft + target.clientWidth - paddingRight;
      const visibleLeft = target.scrollLeft + paddingLeft;

      if (absoluteWidth > visibleRight) {
        target.scrollLeft = Math.min(
          absoluteWidth - target.clientWidth + paddingRight,
          maxScroll,
        );
        return;
      }
      if (absoluteWidth < visibleLeft) {
        target.scrollLeft = Math.max(0, absoluteWidth - paddingLeft);
      }
    };

    const getCaretIndex = (target: HTMLInputElement) => {
      const selectionStart = target.selectionStart ?? 0;
      const selectionEnd = target.selectionEnd ?? 0;
      if (selectionStart === selectionEnd) return selectionStart;
      return target.selectionDirection === "backward"
        ? selectionStart
        : selectionEnd;
    };

    const updateCaretFromInput = (target: HTMLInputElement) => {
      const selectionStart = target.selectionStart ?? 0;
      const selectionEnd = target.selectionEnd ?? 0;
      const hasSelection = selectionStart !== selectionEnd;
      const caretIndex = getCaretIndex(target);
      const isPassword = target.type === "password";
      const textBeforeCaret = isPassword
        ? PASSWORD_CHAR.repeat(caretIndex)
        : target.value.slice(0, caretIndex);

      const absoluteWidth = measurePrefixWidth(textBeforeCaret);
      if (absoluteWidth === null) return;

      scrollCaretIntoView(target, absoluteWidth);

      const styles = window.getComputedStyle(target);
      const paddingLeft = parseFloat(styles.paddingLeft) || 0;
      const paddingRight = parseFloat(styles.paddingRight) || 0;
      const caretPosition = absoluteWidth - target.scrollLeft;
      const minX = paddingLeft - 1;
      const maxX = target.clientWidth - paddingRight;
      const isCaretVisible = caretPosition >= minX && caretPosition <= maxX + 1;

      caretX.set(Math.min(caretPosition, maxX));

      if (!isCaretVisible || hasSelection) {
        caretOpacity.set(0);
        return;
      }
      caretOpacity.set(1);
    };

    const updateCaretRef = useRef(updateCaretFromInput);
    updateCaretRef.current = updateCaretFromInput;
    const caretOpacityRef = useRef(caretOpacity);
    caretOpacityRef.current = caretOpacity;

    useEffect(() => {
      const input = inputRef.current;
      if (input && document.activeElement === input) {
        updateCaretRef.current(input);
      }
    }, [inputValue, type, fontSize]);

    useEffect(() => {
      const input = inputRef.current;
      const container = containerRef.current;
      if (!input || !container) return;

      const updateCaretIfFocused = () => {
        if (document.activeElement === input) updateCaretRef.current(input);
      };

      const handleSelectionChange = () => {
        if (document.activeElement !== input) return;
        requestAnimationFrame(() => {
          if (document.activeElement === input) updateCaretRef.current(input);
        });
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      document.fonts?.addEventListener("loadingdone", updateCaretIfFocused);
      void document.fonts?.ready.then(updateCaretIfFocused);
      input.addEventListener("scroll", updateCaretIfFocused);

      const resizeObserver = new ResizeObserver(updateCaretIfFocused);
      resizeObserver.observe(container);
      updateCaretIfFocused();

      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
        document.fonts?.removeEventListener("loadingdone", updateCaretIfFocused);
        input.removeEventListener("scroll", updateCaretIfFocused);
        resizeObserver.disconnect();
      };
    }, []);

    return (
      <div className={cn(inputWrapperClassName, wrapperClassName)}>
        <div
          ref={containerRef}
          className="relative grid grid-cols-1 p-0"
          style={{ caretColor: "transparent", fontSize }}
        >
          <input
            {...props}
            ref={setRef}
            type={type}
            placeholder={placeholder}
            className={cn(
              inputClassName,
              "col-start-1 col-end-2 row-start-1 row-end-2 text-inherit",
              className,
            )}
            style={style}
            value={inputValue}
            onChange={(e) => {
              if (!isControlled) setInternalValue(e.target.value);
              onChange?.(e);
              requestAnimationFrame(() => updateCaretRef.current(e.target));
            }}
            onFocus={(e) => {
              props.onFocus?.(e);
              requestAnimationFrame(() => updateCaretRef.current(e.target));
            }}
            onBlur={(e) => {
              caretOpacityRef.current.set(0);
              onBlur?.(e);
            }}
          />
          <span
            ref={measureRef}
            aria-hidden
            className="pointer-events-none invisible absolute top-0 left-0 whitespace-pre"
          />
          <motion.div
            aria-hidden
            className="bg-primary pointer-events-none col-start-1 col-end-2 row-start-1 row-end-2 h-[1.1em] w-0.5 self-center rounded-full"
            style={{ x: springCaretX, opacity: caretOpacity }}
          />
        </div>
      </div>
    );
  },
);

/* ─────────────────────────────────────────────────────────────
   Field — SmoothInput with a visible label, helper text and error
   (design-system/MASTER.md §7). This is the everyday form control.
   ───────────────────────────────────────────────────────────── */

export type FieldProps = SmoothInputProps & {
  label?: string;
  helper?: string;
  error?: string;
  required?: boolean;
  /** Leading icon (SVG) rendered inside the field. */
  icon?: React.ReactNode;
  /** Optional right-aligned adornment (e.g. password toggle, unit). */
  trailing?: React.ReactNode;
  id?: string;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, helper, error, required, icon, trailing, id, className, wrapperClassName, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block font-sans text-sm font-semibold text-foreground"
        >
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="pointer-events-none absolute left-4 z-10 flex text-muted-foreground [&>svg]:size-5">
            {icon}
          </span>
        )}
        <SmoothInput
          id={inputId}
          ref={ref}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helper ? helperId : undefined}
          className={cn(icon && "pl-9", trailing && "pr-9", className)}
          wrapperClassName={cn(
            error && "border-danger has-[:focus-visible]:outline-danger",
            wrapperClassName,
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute right-3 z-10 flex items-center">{trailing}</span>
        )}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 flex items-center gap-1 text-sm text-danger">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="mt-1.5 text-sm text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </div>
  );
});

export default SmoothInput;
