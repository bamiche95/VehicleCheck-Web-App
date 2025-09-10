// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import BASE_URL from '../config';
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check login status on mount
  useEffect(() => {
    fetch(`${BASE_URL}/api/profile`, {
      credentials: 'include', // send cookie
    })
      .then(res => {
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
})
.then(data => {
  setUser(data);
  setLoading(false);
})
.catch(() => {
  setUser(null);
  setLoading(false);
});

  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
