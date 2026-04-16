import RootRouter from '@/routes/RootRouter'
import { MantineProvider } from '@/providers/MantineProvider'
import ReactQueryProvider from '@/providers/ReactQueryProvider'
import { WebSocketProvider } from '@/providers/WebSocketProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function App() {
  return (
    <MantineProvider>
      <ReactQueryProvider>
        <ErrorBoundary>
          <WebSocketProvider>
            <RootRouter />
          </WebSocketProvider>
        </ErrorBoundary>
      </ReactQueryProvider>
    </MantineProvider>
  )
}
