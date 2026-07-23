"use client";

import { Component, type ErrorInfo, type ReactNode, Suspense } from "react";

type Props = { children: ReactNode; label?: string };

type State = { failed: boolean };

/** Keeps missing/optional GLB/texture failures from white-screening the whole app. */
export class SafeGltfBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[SafeGltfBoundary${this.props.label ? `:${this.props.label}` : ""}]`, error, info.componentStack);
    }
  }

  render() {
    if (this.state.failed) return null;
    return <Suspense fallback={null}>{this.props.children}</Suspense>;
  }
}
