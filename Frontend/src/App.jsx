import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import HomePage from './HomePage/HomePage';
import PlayRelax from './Playrelax/Playrelax';
import LandingPage from './LandingPage';
import ProtectedRoute from './ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/play-relax"
          element={
            <ProtectedRoute>
              <PlayRelax />
            </ProtectedRoute>
          }
        />
        <Route path="/reservation" element={<div>Reservation Page (Under Construction)</div>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;