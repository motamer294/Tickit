import { Component } from 'react'
import type { ReactNode } from 'react'
import { Container, Stack, Button, Alert } from '@mantine/core'
import { Icon } from '@iconify-icon/react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error Boundary caught:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/app'
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container size="md" py="xl">
          <Stack gap="lg">
            <Alert
              icon={<Icon icon="solar:warning-circle-bold-duotone" width={20} />}
              title="Oops! Something went wrong"
              color="red"
            >
              We encountered an unexpected error. The team has been notified.
            </Alert>

            <details style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Error Details (for developers)
              </summary>
              <pre style={{ marginTop: '8px', fontSize: '12px', overflow: 'auto' }}>
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.error?.stack}
              </pre>
            </details>

            <Button
              onClick={this.handleReset}
              leftSection={<Icon icon="solar:home-bold-duotone" width={20} />}
            >
              Return to Dashboard
            </Button>
          </Stack>
        </Container>
      )
    }

    return this.props.children
  }
}
