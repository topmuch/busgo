import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SeatSelector } from "@/components/guichet/seat-selector";

describe("SeatSelector", () => {
  it("renders the bus layout with correct number of seats", () => {
    render(
      <SeatSelector
        capacity={8}
        occupiedSeats={[]}
        selectedSeat={null}
        onSelect={vi.fn()}
      />
    );

    // Should have 8 clickable seat buttons (numbered 1-8)
    for (let i = 1; i <= 8; i++) {
      expect(screen.getByTitle(`Siège 1${String.fromCharCode(64 + ((i - 1) % 4) + 1)}`)).toBeInTheDocument();
    }
  });

  it("renders a driver seat indicator", () => {
    render(
      <SeatSelector
        capacity={8}
        occupiedSeats={[]}
        selectedSeat={null}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText("Chauffeur")).toBeInTheDocument();
  });

  it("renders Arrière label at the bottom", () => {
    render(
      <SeatSelector
        capacity={4}
        occupiedSeats={[]}
        selectedSeat={null}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText("Arrière")).toBeInTheDocument();
  });

  it("calls onSelect when a free seat is clicked", () => {
    const onSelect = vi.fn();
    render(
      <SeatSelector
        capacity={4}
        occupiedSeats={[]}
        selectedSeat={null}
        onSelect={onSelect}
      />
    );

    // Click the first seat
    const seatButton = screen.getByTitle("Siège 1A");
    fireEvent.click(seatButton);

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("disables occupied seats", () => {
    render(
      <SeatSelector
        capacity={4}
        occupiedSeats={[2, 3]}
        selectedSeat={null}
        onSelect={vi.fn()}
      />
    );

    const seat2 = screen.getByTitle("Siège 2 — occupé");
    const seat3 = screen.getByTitle("Siège 3 — occupé");

    expect(seat2).toBeDisabled();
    expect(seat3).toBeDisabled();
  });

  it("does not call onSelect when an occupied seat is clicked", () => {
    const onSelect = vi.fn();
    render(
      <SeatSelector
        capacity={4}
        occupiedSeats={[2]}
        selectedSeat={null}
        onSelect={onSelect}
      />
    );

    const seat2 = screen.getByTitle("Siège 2 — occupé");
    fireEvent.click(seat2);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("highlights the selected seat", () => {
    render(
      <SeatSelector
        capacity={4}
        occupiedSeats={[]}
        selectedSeat={3}
        onSelect={vi.fn()}
      />
    );

    // The component uses aria-label with "sélectionné" for selected seats
    const seat3 = screen.getByLabelText("Siège 3 sélectionné");
    expect(seat3).toBeInTheDocument();
    expect(seat3).not.toBeDisabled();
  });

  it("disables all seats when disabled prop is true", () => {
    render(
      <SeatSelector
        capacity={4}
        occupiedSeats={[]}
        selectedSeat={null}
        onSelect={vi.fn()}
        disabled={true}
      />
    );

    // All seat buttons should be disabled
    const buttons = screen.getAllByRole("button").filter((btn) => btn.getAttribute("aria-label")?.startsWith("Sélectionner"));
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("shows selected seat label at the bottom", () => {
    render(
      <SeatSelector
        capacity={4}
        occupiedSeats={[]}
        selectedSeat={3}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/Siège sélectionné/)).toBeInTheDocument();
    // Use a more specific selector since "3" appears in both the seat button and the label
    const label = screen.getByText(/Siège sélectionné/);
    expect(label).toHaveTextContent("3");
  });

  it("shows Plan du bus title", () => {
    render(
      <SeatSelector
        capacity={4}
        occupiedSeats={[]}
        selectedSeat={null}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText("Plan du bus")).toBeInTheDocument();
  });

  it("hides seats beyond capacity (e.g., capacity=5 in a 2-row layout)", () => {
    render(
      <SeatSelector
        capacity={5}
        occupiedSeats={[]}
        selectedSeat={null}
        onSelect={vi.fn()}
      />
    );

    // Seats 1-5 should exist (seat 5 is in row 2, col A = title "Siège 2A")
    expect(screen.getByTitle("Siège 1A")).toBeInTheDocument();
    expect(screen.getByTitle("Siège 2A")).toBeInTheDocument();

    // Seat 6, 7, 8 should NOT exist as buttons
    expect(screen.queryByLabelText("Sélectionner siège 6")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sélectionner siège 7")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sélectionner siège 8")).not.toBeInTheDocument();
  });
});