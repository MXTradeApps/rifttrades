import './App.css';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import Support from './pages/Support.jsx';
import BinderCollection from './pages/BinderCollection.jsx';
import SharedBinder from './pages/SharedBinder.jsx';
import TradeHistory from './pages/TradeHistory.jsx';
import SetList from './pages/SetList.jsx';
import SetDetail from './pages/SetDetail.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { EntitlementProvider } from './contexts/EntitlementContext.jsx';
import { CardDetailProvider } from './contexts/CardDetailContext.jsx';
import { CardDetailHost } from './components/cardDetail/CardDetailModal.jsx';

function App() {
    return (
        <AuthProvider>
            <EntitlementProvider>
                <CardDetailProvider>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/sets" element={<SetList />} />
                        <Route path="/sets/:setId" element={<SetDetail />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="/support" element={<Support />} />
                        <Route path="/binder" element={<BinderCollection isWanted={false} />} />
                        <Route path="/wants" element={<BinderCollection isWanted={true} />} />
                        <Route path="/b/:token" element={<SharedBinder />} />
                        <Route path="/history" element={<TradeHistory />} />
                    </Routes>
                    <CardDetailHost />
                </CardDetailProvider>
            </EntitlementProvider>
        </AuthProvider>
    );
}

export default App;
