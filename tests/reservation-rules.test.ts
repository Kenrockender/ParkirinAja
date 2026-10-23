import { afterEach, expect, test } from "bun:test";
import { useParkir } from "../src/lib/store";
import { dateStr, type Reservation, type Slot, type Vehicle } from "../src/lib/parking-data";

const initialState = useParkir.getState();

afterEach(() => {
  useParkir.setState(initialState, true);
});

function prepareBookingWorld() {
  const slot: Slot = {
    id: "test-slot-a-01",
    slotNumber: "A-01",
    rowLabel: "A",
    colIndex: 0,
    status: "ACTIVE",
    slotType: "STANDARD",
  };
  const vehicle: Vehicle = {
    id: "test-vehicle",
    nickname: "Mobil uji",
    licensePlate: "B 1234 TEST",
    brand: "Honda",
    model: "HR-V",
    color: "Putih",
  };
  useParkir.setState({
    slots: [slot],
    reservations: [],
    vehicles: [vehicle],
    walletBalance: 1_000_000,
    user: { ...initialState.user, isBinusian: true },
  });
  return { slot, vehicle };
}

test("booking store refuses an overlapping reservation for the same slot", () => {
  const { slot, vehicle } = prepareBookingWorld();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const date = dateStr(tomorrow);
  const conflict: Reservation = {
    id: "existing-reservation",
    code: "PB-TEST01",
    type: "ADVANCE",
    slotId: slot.id,
    slotNumber: slot.slotNumber,
    date,
    startTime: "10:00",
    endTime: "12:00",
    status: "CONFIRMED",
    serviceFee: 15_000,
    overtimeFee: 0,
    refundAmount: 0,
    vehiclePlate: vehicle.licensePlate,
    vehicleName: "Honda HR-V",
    driverName: initialState.user.name,
    createdAt: Date.now(),
  };
  useParkir.setState({ reservations: [conflict] });

  const result = useParkir.getState().book({
    slotId: slot.id,
    slotNumber: slot.slotNumber,
    type: "ADVANCE",
    date,
    startTime: "11:00",
    endTime: "13:00",
    vehiclePlate: vehicle.licensePlate,
    vehicleName: "Honda HR-V",
  });

  expect(result).toBeNull();
  expect(useParkir.getState().reservations).toHaveLength(1);
});

test("booking store accepts a valid non-overlapping reservation", () => {
  const { slot, vehicle } = prepareBookingWorld();
  const tomorrow = dateStr(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const result = useParkir.getState().book({
    slotId: slot.id,
    slotNumber: slot.slotNumber,
    type: "ADVANCE",
    date: tomorrow,
    startTime: "10:00",
    endTime: "12:00",
    vehiclePlate: vehicle.licensePlate,
    vehicleName: "Honda HR-V",
  });

  expect(result).not.toBeNull();
  expect(useParkir.getState().reservations).toHaveLength(1);
});
