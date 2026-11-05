import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * App-wide error boundary. Any render/runtime crash (e.g. a transient null during
 * logout redirects, a failed lazy chunk) is caught here and shown as a friendly
 * recovery screen instead of a blank white page. `resetKey` (the current route)
 * auto-clears the error when the user navigates, so a one-off crash on one page
 * never sticks.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; resetKey?: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Caught by ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-dvh place-items-center px-6">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent-strong">
              <span className="font-display text-2xl font-extrabold">!</span>
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-foreground">
              Something hiccuped
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We hit an unexpected error. Head back home and try again.
            </p>
            <a
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-navy-light"
            >
              Go home
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
