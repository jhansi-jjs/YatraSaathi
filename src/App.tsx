import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminPage from './pages/AdminPage';
import SplashScreen from './components/SplashScreen';
import OnboardingModal from './components/OnboardingModal';
import ChatbotWidget from './components/ChatbotWidget';

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleSplashFinish = () => {
    setShowSplash(false);
    const onboarded = localStorage.getItem('yatra_onboarded');
    if (!onboarded) {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingClose = () => {
    localStorage.setItem('yatra_onboarded', 'true');
    setShowOnboarding(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <OnboardingModal isOpen={showOnboarding} onClose={handleOnboardingClose} />

      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<ResultsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
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
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}
