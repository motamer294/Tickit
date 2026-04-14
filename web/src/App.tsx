import RootRouter from '@/routes/RootRouter'
import { MantineProvider } from '@/providers/MantineProvider'
import ReactQueryProvider from '@/providers/ReactQueryProvider'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <ReactQueryProvider>
        <MantineProvider>
          <RootRouter />
        </MantineProvider>
      </ReactQueryProvider>
    </ErrorBoundary>
  )
}
