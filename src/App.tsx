import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { SearchProvider } from './context/SearchContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import WelcomePage from './pages/WelcomePage';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminPage from './pages/AdminPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ChatbotWidget from './components/ChatbotWidget';
import { logI18nAuditOnce } from './lib/i18nAudit';

// ISSUE 0(e): report any language missing a translation key or a voice mapping once
// at startup, so gaps are visible in the console during QA instead of silent.
logI18nAuditOnce();

function AppContent() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 selection:bg-blue-500 selection:text-white">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/search" element={<HomePage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
      <ChatbotWidget />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <SearchProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </SearchProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
