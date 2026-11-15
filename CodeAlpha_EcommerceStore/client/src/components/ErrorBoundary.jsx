import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-paper px-5">
          <div className="w-full max-w-md border border-line bg-surface p-8 text-center">
            <p className="eyebrow">Something broke</p>
            <h1 className="mt-3 text-3xl">The page came apart.</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Refresh to try again. If it keeps happening, the API may be offline.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 h-11 bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-brand"
            >
              Reload the page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
