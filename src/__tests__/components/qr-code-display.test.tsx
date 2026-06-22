import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QRCodeDisplay } from "@/components/guichet/qr-code-display";

// Mock the qrcode module
vi.mock("qrcode", () => ({
  default: {
    toCanvas: vi.fn((canvas, _url, _opts, cb) => {
      if (cb) cb(null);
      return Promise.resolve();
    }),
    toDataURL: vi.fn(() => Promise.resolve("data:image/png;base64,mock-qr")),
  },
}));

describe("QRCodeDisplay", () => {
  const defaultProps = {
    billetId: "billet-abc123",
    ticketNumber: "PAP-001",
    passengerName: "Amadou Diallo",
    trajetInfo: "Dakar → Saint-Louis · 15/01/2025 08:00",
    seatNumber: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the QR code canvas", () => {
    render(<QRCodeDisplay {...defaultProps} />);

    // Canvas element with aria-label
    const canvas = document.querySelector('canvas[aria-label="QR Code pour le billet PAP-001"]');
    expect(canvas).toBeInTheDocument();
  });

  it("displays the passenger name", () => {
    render(<QRCodeDisplay {...defaultProps} />);
    expect(screen.getByText("Amadou Diallo")).toBeInTheDocument();
  });

  it("displays the trajet info", () => {
    render(<QRCodeDisplay {...defaultProps} />);
    expect(screen.getByText("Dakar → Saint-Louis · 15/01/2025 08:00")).toBeInTheDocument();
  });

  it("displays the seat number", () => {
    render(<QRCodeDisplay {...defaultProps} />);
    expect(screen.getByText("Siège N°5")).toBeInTheDocument();
  });

  it("displays the ticket number", () => {
    render(<QRCodeDisplay {...defaultProps} />);
    expect(screen.getByText("PAP-001")).toBeInTheDocument();
  });

  it("shows the mandatory scan warning", () => {
    render(<QRCodeDisplay {...defaultProps} />);
    expect(
      screen.getByText("Scannez ce QR code, c'est OBLIGATOIRE")
    ).toBeInTheDocument();
  });

  it("renders the Imprimer button", () => {
    render(<QRCodeDisplay {...defaultProps} />);
    expect(screen.getByText("Imprimer")).toBeInTheDocument();
  });

  it("opens a print window when Imprimer is clicked", () => {
    render(<QRCodeDisplay {...defaultProps} />);

    const printButton = screen.getByText("Imprimer");
    fireEvent.click(printButton);

    expect(window.open).toHaveBeenCalledWith("", "_blank");
  });

  it("does not show Nouveau passager button when onReset is not provided", () => {
    render(<QRCodeDisplay {...defaultProps} />);
    expect(screen.queryByText("Nouveau passager")).not.toBeInTheDocument();
  });

  it("shows Nouveau passager button when onReset is provided", () => {
    const onReset = vi.fn();
    render(<QRCodeDisplay {...defaultProps} onReset={onReset} />);
    expect(screen.getByText("Nouveau passager")).toBeInTheDocument();
  });

  it("calls onReset when Nouveau passager is clicked", () => {
    const onReset = vi.fn();
    render(<QRCodeDisplay {...defaultProps} onReset={onReset} />);

    const resetButton = screen.getByText("Nouveau passager");
    fireEvent.click(resetButton);

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});