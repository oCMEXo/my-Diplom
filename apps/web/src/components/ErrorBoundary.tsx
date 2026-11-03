import { Component, type ReactNode } from "react";
import { ErrorScreen } from "./ui/ErrorScreen";

/** A failed render shows an explanation and a way out rather than an empty page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ErrorScreen
        title="Что-то пошло не так"
        message="Страница не смогла отобразиться. Ваши правки сохранены: обновите страницу, чтобы продолжить."
        onRetry={() => window.location.reload()}
      />
    );
  }
}
