import { QueryClient, QueryClientProvider } from "react-query";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Listings from "./pages/Listings";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <Layout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="listings" element={<Listings />} />
      </Routes>
    </Layout>
    </QueryClientProvider>
  );
}

export default App;
