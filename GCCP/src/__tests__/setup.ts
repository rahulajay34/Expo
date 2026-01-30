/**
 * Test Setup File
 * 
 * Configure global test environment and mocks.
 */

// ========================================
// MOCK SETUP
// ========================================

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
  headers: jest.fn(() => new Headers()),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock next/server
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    url: string;
    method: string;
    headers: Headers;
    body: ReadableStream | null;
    private _bodyData: unknown;

    constructor(input: string | URL, init?: RequestInit) {
      this.url = input.toString();
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
      this.body = null;
      // Parse body if it's a string
      if (typeof (init as unknown as { body?: string })?.body === 'string') {
        try {
          this._bodyData = JSON.parse((init as unknown as { body: string }).body);
        } catch {
          this._bodyData = (init as unknown as { body: string }).body;
        }
      }
    }

    async json() {
      return this._bodyData ?? {};
    }

    async text() {
      return typeof this._bodyData === 'string' ? this._bodyData : JSON.stringify(this._bodyData ?? {});
    }
  },
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) => {
      // Create a mock response object compatible with jsdom
      const response = {
        status: init?.status || 200,
        statusText: init?.status === 200 ? 'OK' : 'Error',
        headers: new Headers({
          'content-type': 'application/json',
          ...(init?.headers || {}),
        }),
        json: async () => data,
        text: async () => JSON.stringify(data),
        ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
        redirected: false,
        type: 'basic' as ResponseType,
        url: '',
        clone: function() { return this; },
        body: null,
        bodyUsed: false,
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        formData: async () => new FormData(),
      };
      return response as unknown as Response;
    },
  },
}));

// ========================================
// CONSOLE MOCKING
// ========================================

// Suppress console logs during tests unless explicitly enabled
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  if (!process.env.ENABLE_TEST_LOGS) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// ========================================
// GLOBAL MOCKS
// ========================================

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: jest.fn().mockReturnValue([]),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollTo
window.scrollTo = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// ========================================
// TEST UTILITIES
// ========================================

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Flush all pending promises
 */
export async function flushPromises(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Create a mock event
 */
export function createMockEvent<T extends Event>(type: string, overrides?: Partial<T>): T {
  const event = new Event(type, { bubbles: true, cancelable: true });
  return Object.assign(event, overrides) as T;
}

/**
 * Mock fetch response
 */
export function mockFetchResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({ 'content-type': 'application/json' }),
    clone: function() { return this; },
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    redirected: false,
    statusText: status === 200 ? 'OK' : 'Error',
    type: 'basic',
    url: '',
  } as Response;
}

// ========================================
// MATCHERS
// ========================================

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  toBeValidISODate(received: string) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime());
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ISO date`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ISO date`,
        pass: false,
      };
    }
  },
});

// Extend Jest matchers interface
declare module 'expect' {
  interface AsymmetricMatchers {
    toBeWithinRange(floor: number, ceiling: number): void;
    toBeValidISODate(): void;
  }
  interface Matchers<R> {
    toBeWithinRange(floor: number, ceiling: number): R;
    toBeValidISODate(): R;
  }
}
