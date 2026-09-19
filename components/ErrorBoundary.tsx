import React from 'react';

// Turns "blank white screen" into a readable message. Nothing is cleared or reset here --
// the player's save is left exactly as it was.
type Props = { children?: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  // Declared explicitly: this project has no @types/react, so React.Component's own
  // props/state typings aren't available to tsc.
  declare props: Props;
  declare state: State;

  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { message, stack } = this.state.error;
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Geriatric Park hit a snag</h2>
        <p style={{ marginBottom: 12, lineHeight: 1.4 }}>
          Your progress is safe. Nothing was deleted. Please tap Reload, and if it keeps happening, send the text below to the developer.
        </p>
        <button onClick={() => window.location.reload()} style={{ padding: '12px 20px', fontWeight: 800, borderRadius: 12, border: 'none', background: '#4f46e5', color: '#fff', marginBottom: 16 }}>
          Reload
        </button>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, background: '#f1f5f9', color: '#0f172a', padding: 12, borderRadius: 8 }}>
          {message}{'\n\n'}{(stack || '').split('\n').slice(0, 6).join('\n')}
        </pre>
      </div>
    );
  }
}
