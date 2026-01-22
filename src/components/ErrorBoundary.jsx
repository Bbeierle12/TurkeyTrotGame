import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    if (this.props.onReload) {
      this.props.onReload();
      return;
    }
    window.location.reload();
  };

  render() {
    const { error, errorInfo } = this.state;

    if (error) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
          <div className="bg-gray-900 border border-red-700/60 rounded-2xl p-6 w-full max-w-3xl">
            <h1 className="text-3xl font-bold text-red-400 mb-2">UI Crashed</h1>
            <p className="text-gray-300 mb-4">A UI error occurred. You can reload to recover.</p>
            <div className="text-red-300 text-sm mb-3">{error.message}</div>
            {error.stack && (
              <pre className="text-xs text-gray-300 bg-black/60 rounded-lg p-3 overflow-auto mb-3 whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
            {errorInfo?.componentStack && (
              <pre className="text-xs text-gray-400 bg-black/40 rounded-lg p-3 overflow-auto mb-4 whitespace-pre-wrap">
                {errorInfo.componentStack}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-500 transition font-bold"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
