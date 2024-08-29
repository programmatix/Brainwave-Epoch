import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error("Error occurred:", error, errorInfo);
  }

  render() {
    if ((this.state as any).hasError) {
      // You can render any custom fallback UI
      return <h1>Something went wrong.</h1>;
    }

    return (this.props as any).children; 
  }
}

export default ErrorBoundary;
