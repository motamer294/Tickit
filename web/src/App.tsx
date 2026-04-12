import RootRouter from '@/routes/RootRouter'
import { MantineProvider } from '@/providers/MantineProvider'
import ReactQueryProvider from '@/providers/ReactQueryProvider'

export default function App() {
  return (
    <ReactQueryProvider>
      <MantineProvider>
        <RootRouter />
      </MantineProvider>
    </ReactQueryProvider>
  )
}
