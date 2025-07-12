import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Profile from './pages/profile/Index'
import OauthSuccess from './pages/auth/OauthSuccess'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/oauth-success" element={<OauthSuccess />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
} 