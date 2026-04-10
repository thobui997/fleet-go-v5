import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '2rem',
            maxWidth: '600px',
            margin: '2rem auto',
            fontFamily: 'system-ui',
          }}
        >
          <h1 style={{ color: '#dc2626' }}>Something went wrong</h1>
          <p>The application encountered an unexpected error.</p>
          <pre
            style={{
              background: '#f5f5f5',
              padding: '1rem',
              borderRadius: '0.5rem',
              overflow: 'auto',
            }}
          >
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
