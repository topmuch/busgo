import "@testing-library/jest-dom/vitest";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
  default: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        id: "test-user-id",
        email: "admin@fastbus.sn",
        name: "Admin Test",
        role: "admin",
        tenantId: "tenant-1",
        tenantSlug: "fastbus",
        tenantName: "FastBus Express",
      },
    },
    status: "authenticated",
  })),
}));

// Mock @/lib/get-session — the app's wrapper around next-auth's getServerSession.
// Tests use `vi.mocked(getServerSession).mockResolvedValue(...)` which requires
// the function to be a vi.fn() — this mock provides that.
vi.mock("@/lib/get-session", () => ({
  getServerSession: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
  usePathname: vi.fn(() => "/admin/guichet"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock Prisma
vi.mock("@/lib/db", () => ({
  db: {
    bus: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    trajet: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    billet: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tenant: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue("$hashed"),
  },
  genSalt: vi.fn().mockResolvedValue("$salt"),
}));

// Mock canvas for QR code tests
Object.defineProperty(globalThis, "HTMLCanvasElement", {
  value: class HTMLCanvasElement {
    toDataURL = vi.fn(() => "data:image/png;base64,test");
    getContext = vi.fn(() => ({
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: [] })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => ({ data: [] })),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    }));
    width = 280;
    height = 280;
  },
  writable: true,
});

// Mock window.open for print tests
Object.defineProperty(globalThis, "window", {
  value: {
    ...globalThis.window,
    open: vi.fn(() => ({
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
      close: vi.fn(),
      print: vi.fn(),
      onload: null,
    })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});