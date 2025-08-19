import { Switch, Route } from 'wouter';
import { useAuthStore } from './store/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settlements from './pages/Settlements';
import Offers from './pages/Offers';
import Analytics from './pages/Analytics';
import Layout from './components/Layout';

function AuthenticatedApp() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/settlements" component={Settlements} />
        <Route path="/offers" component={Offers} />
        <Route path="/analytics" component={Analytics} />
      </Switch>
    </Layout>
  );
}

function App() {
  const { merchant, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-mesh flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8">
          <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full mx-auto"></div>
          <p className="text-white text-center mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return <Login />;
  }

  return <AuthenticatedApp />;
}

export default App;