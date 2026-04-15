import React from 'react';

interface State { error: Error | null }
interface Props { children: React.ReactNode }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = { error: null };
  }

  static getDerivedStateFromError(e: Error): State {
    return { error: e };
  }

  render() {
    const s = (this as any).state as State;
    const p = (this as any).props as Props;
    if (s.error) {
      return (
        <div style={{ padding: 24, background: '#1a1a1a', color: '#fff', fontFamily: 'monospace', height: '100vh', overflow: 'auto' }}>
          <h2 style={{ color: '#f87171' }}>エラー: {s.error.message}</h2>
          <pre style={{ color: '#6b7280', whiteSpace: 'pre-wrap', fontSize: 11 }}>{s.error.stack}</pre>
          <button onClick={() => (this as any).setState({ error: null })} style={{ marginTop: 16, padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>戻る</button>
        </div>
      );
    }
    return p.children;
  }
}
