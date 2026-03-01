export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  token?: string;
  error?: string;
}

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  const { email, password } = credentials;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    return { success: false, error: 'Invalid credentials' };
  }

  const data = await response.json();
  return { success: true, token: data.token };
}
