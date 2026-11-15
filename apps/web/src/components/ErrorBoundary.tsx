import { Component, type ReactNode } from "react";
import { ErrorScreen } from "./ui/ErrorScreen";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ErrorScreen
        title="Something went wrong"
        message="The page could not be shown. Your edits are saved: reload the page to continue."
        onRetry={() => window.location.reload()}
      />
    );
  }
}
