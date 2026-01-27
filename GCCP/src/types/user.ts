export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  apiKey: string;
  createdAt: string;
  usage: {
    totalCost: number;
    requestCount: number;
  };
  passwordHash?: string;
}
