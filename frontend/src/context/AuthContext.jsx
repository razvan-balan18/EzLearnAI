import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = 'http://localhost:5000/api/auth';

// Helper function to set axios auth header
const setAuthHeader = (token) => {
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
};

// Set auth header immediately on module load (before any components render)
const storedToken = localStorage.getItem('token');
if (storedToken) {
  setAuthHeader(storedToken);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(storedToken);
  const [loading, setLoading] = useState(true);

  // Configure axios default header when token changes
  useEffect(() => {
    setAuthHeader(token);
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  // Load user data on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/me`);
          setUser(response.data.user);
        } catch (error) {
          console.error('Failed to load user:', error);
          // Token is invalid, clear it
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const register = async (name, email, password) => {
    const response = await axios.post(`${API_URL}/register`, {
      name,
      email,
      password
    });
    
    setToken(response.data.token);
    setUser(response.data.user);
    return response.data;
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/login`, {
      email,
      password
    });
    
    setToken(response.data.token);
    setUser(response.data.user);
    return response.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
