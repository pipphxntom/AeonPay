import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './queryClient';
import { User } from '@shared/schema';

interface AuthResponse {
  token: string;
  user: User;
}

export function useAuth() {
  return useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async (): Promise<User | null> => {
      const token = localStorage.getItem('aeonpay_token');
      if (!token) return null;
      
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          localStorage.removeItem('aeonpay_token');
          return null;
        }
        
        return response.json();
      } catch (error) {
        localStorage.removeItem('aeonpay_token');
        return null;
      }
    },
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (phone: string): Promise<AuthResponse> => {
      const response = await apiRequest('POST', '/api/auth/mock_login', { phone });
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('aeonpay_token', data.token);
      queryClient.setQueryData(['/api/auth/me'], data.user);
      queryClient.invalidateQueries({ queryKey: ['/api'] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem('aeonpay_token');
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.clear();
    },
  });
}

export function getAuthToken(): string | null {
  return localStorage.getItem('aeonpay_token');
}

export function setAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
