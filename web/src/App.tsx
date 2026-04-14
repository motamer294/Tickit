import RootRouter from '@/routes/RootRouter'
import { MantineProvider } from '@/providers/MantineProvider'
import ReactQueryProvider from '@/providers/ReactQueryProvider'
import { WebSocketProvider } from '@/providers/WebSocketProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <ReactQueryProvider>
        <MantineProvider>
          <WebSocketProvider>
            <RootRouter />
          </WebSocketProvider>
        </MantineProvider>
      </ReactQueryProvider>
    </ErrorBoundary>
  )
}
