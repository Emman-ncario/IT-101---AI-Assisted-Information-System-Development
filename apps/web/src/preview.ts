import type { Building, ClassInfo, QueueItem, Reservation, Room, User } from "./types";

const STORAGE_KEY = "roomwise-preview";

export function isPreviewEnabled() {
  return import.meta.env.DEV && sessionStorage.getItem(STORAGE_KEY) === "1";
}

export function enablePreview() {
  if (!import.meta.env.DEV) return;
  sessionStorage.setItem(STORAGE_KEY, "1");
}

export function disablePreview() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function syncPreviewFromUrl() {
  if (!import.meta.env.DEV) return;
  const value = new URLSearchParams(window.location.search).get("preview");
  if (value === "1") enablePreview();
  if (value === "0") disablePreview();
}

const classA: ClassInfo = {
  id: "preview-class-a",
  block: "BSIT-1A",
  program: "BS Information Technology",
  yearLevel: 1,
};

export const previewUser: User = {
  id: "preview-user-rep",
  fullName: "Alex Preview",
  email: "preview.rep@example.test",
  role: "REPRESENTATIVE",
  memberships: [{ id: "preview-mem-rep", isRep: true, class: classA }],
};

const studentUser = {
  id: "preview-user-student",
  fullName: "Sam Student",
  email: "preview.student@example.test",
  role: "STUDENT" as const,
};

function manilaDate(offsetDays = 0) {
  const base = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return base.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function manilaDateTime(offsetDays: number, hour: number, minute: number) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${manilaDate(offsetDays)}T${hh}:${mm}:00+08:00`);
}

function parseLocalInput(value: string) {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return new Date(`${value}:00+08:00`);
  return new Date(value);
}

const buildingArts = {
  id: "preview-bldg-arts",
  code: "LA",
  name: "Liberal Arts Building",
  description: "Lecture rooms and seminar spaces near the main quad.",
  imageUrl: null as string | null,
};

const buildingScience = {
  id: "preview-bldg-sci",
  code: "SCI",
  name: "Science Building",
  description: "Laboratories and discussion rooms for lab-adjacent classes.",
  imageUrl: null as string | null,
};

const rooms: Room[] = [
  { id: "preview-room-la-201", number: "201", name: "Seminar 201", capacity: 40, roomType: "Lecture", facilities: ["Projector"], floorId: "preview-floor-la-2", active: true, floor: { number: 2, building: { name: buildingArts.name } } },
  { id: "preview-room-la-202", number: "202", name: "Seminar 202", capacity: 32, roomType: "Lecture", facilities: ["Whiteboard"], floorId: "preview-floor-la-2", active: true, floor: { number: 2, building: { name: buildingArts.name } } },
  { id: "preview-room-la-101", number: "101", name: "Hall 101", capacity: 80, roomType: "Lecture hall", facilities: ["Projector", "Microphone"], floorId: "preview-floor-la-1", active: true, floor: { number: 1, building: { name: buildingArts.name } } },
  { id: "preview-room-sci-305", number: "305", name: "Lab 305", capacity: 24, roomType: "Laboratory", facilities: ["Workbenches"], floorId: "preview-floor-sci-3", active: true, floor: { number: 3, building: { name: buildingScience.name } } },
  { id: "preview-room-sci-204", number: "204", name: "Discussion 204", capacity: 20, roomType: "Discussion", facilities: ["Whiteboard"], floorId: "preview-floor-sci-2", active: true, floor: { number: 2, building: { name: buildingScience.name } } },
];

const floorsByBuilding: Record<string, { id: string; number: number; rooms: Room[] }[]> = {
  [buildingArts.id]: [
    { id: "preview-floor-la-2", number: 2, rooms: rooms.filter((room) => room.floorId === "preview-floor-la-2") },
    { id: "preview-floor-la-1", number: 1, rooms: rooms.filter((room) => room.floorId === "preview-floor-la-1") },
  ],
  [buildingScience.id]: [
    { id: "preview-floor-sci-3", number: 3, rooms: rooms.filter((room) => room.floorId === "preview-floor-sci-3") },
    { id: "preview-floor-sci-2", number: 2, rooms: rooms.filter((room) => room.floorId === "preview-floor-sci-2") },
  ],
};

const buildingsMeta = [buildingArts, buildingScience];

type Member = {
  id: string;
  userId: string;
  isRep: boolean;
  user: { id: string; fullName: string; email: string; role: string };
};

let members: Member[] = [
  { id: "preview-mem-rep", userId: previewUser.id, isRep: true, user: { id: previewUser.id, fullName: previewUser.fullName, email: previewUser.email, role: previewUser.role } },
  { id: "preview-mem-student", userId: studentUser.id, isRep: false, user: studentUser },
];

let reservations: Reservation[] = [
  {
    id: "preview-res-1",
    startAt: manilaDateTime(1, 9, 0).toISOString(),
    endAt: manilaDateTime(1, 10, 30).toISOString(),
    status: "CONFIRMED",
    room: rooms[0],
    class: classA,
    createdBy: { id: previewUser.id, fullName: previewUser.fullName },
  },
  {
    id: "preview-res-2",
    startAt: manilaDateTime(3, 14, 0).toISOString(),
    endAt: manilaDateTime(3, 16, 0).toISOString(),
    status: "CONFIRMED",
    room: rooms[3],
    class: classA,
    createdBy: { id: previewUser.id, fullName: previewUser.fullName },
  },
];

let queueItems: QueueItem[] = [
  {
    id: "preview-queue-1",
    roomId: rooms[2].id,
    classId: classA.id,
    startAt: manilaDateTime(2, 8, 0).toISOString(),
    endAt: manilaDateTime(2, 9, 0).toISOString(),
    room: rooms[2],
    class: classA,
  },
];

function buildingSummaries(): Building[] {
  return buildingsMeta.map((building) => {
    const floors = floorsByBuilding[building.id];
    return {
      ...building,
      floorCount: floors.length,
      roomCount: floors.reduce((sum, floor) => sum + floor.rooms.length, 0),
      floors: floors.map((floor) => ({ id: floor.id, number: floor.number, roomCount: floor.rooms.length })),
    };
  });
}

function classesPayload() {
  return [
    {
      ...classA,
      memberships: members,
      representatives: members.filter((member) => member.isRep).map((member) => member.user),
      reservations: reservations.filter((reservation) => reservation.status === "CONFIRMED" && new Date(reservation.endAt) > new Date()),
    },
  ];
}

function availability(roomId: string, date: string) {
  const room = rooms.find((item) => item.id === roomId);
  if (!room) throw new Error("Room not found.");
  const dayStart = new Date(`${date}T00:00:00+08:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const dayReservations = reservations.filter(
    (reservation) => reservation.room.id === roomId && reservation.status === "CONFIRMED" && new Date(reservation.startAt) < dayEnd && new Date(reservation.endAt) > dayStart,
  );
  const slots = [];
  for (let minutes = 7 * 60; minutes < 21 * 60; minutes += 30) {
    const startAt = new Date(`${date}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00+08:00`);
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
    const reservation = dayReservations.find((item) => new Date(item.startAt) < endAt && new Date(item.endAt) > startAt);
    slots.push({
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      available: !reservation && startAt > new Date(),
      past: startAt <= new Date(),
      reservation: reservation ? { classBlock: reservation.class.block } : null,
    });
  }
  return {
    room: { id: room.id, number: room.number, name: room.name, floor: room.floor?.number, building: room.floor?.building.name },
    date,
    timeZone: "Asia/Manila",
    slots,
    reservations: dayReservations,
  };
}

function readJson(init: RequestInit) {
  if (typeof init.body !== "string" || !init.body) return {};
  try {
    return JSON.parse(init.body) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function handlePreviewRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const [pathname, queryString] = path.split("?");
  const query = new URLSearchParams(queryString ?? "");
  const body = readJson(init);

  if (pathname === "/auth/csrf") return { csrfToken: "preview-csrf" } as T;
  if (pathname === "/auth/me") return { user: previewUser } as T;
  if (pathname === "/auth/logout") return undefined as T;

  if (method === "GET" && pathname === "/buildings") return buildingSummaries() as T;
  if (method === "GET" && pathname === "/reservations") return [...reservations] as T;
  if (method === "GET" && pathname === "/classes") return classesPayload() as T;
  if (method === "GET" && pathname === "/booking-queue") return [...queueItems] as T;

  const availabilityMatch = pathname.match(/^\/buildings\/rooms\/([^/]+)\/availability$/);
  if (method === "GET" && availabilityMatch) {
    const date = query.get("date");
    if (!date) throw new Error("Provide date=YYYY-MM-DD.");
    return availability(availabilityMatch[1], date) as T;
  }

  const buildingMatch = pathname.match(/^\/buildings\/([^/]+)$/);
  if (method === "GET" && buildingMatch) {
    const building = buildingsMeta.find((item) => item.id === buildingMatch[1]);
    if (!building) throw new Error("Building not found.");
    return { ...building, floors: floorsByBuilding[building.id] } as T;
  }

  if (method === "POST" && pathname === "/booking-queue") {
    const room = rooms.find((item) => item.id === body.roomId);
    if (!room) throw new Error("Room not found.");
    const item: QueueItem = {
      id: `preview-queue-${Date.now()}`,
      roomId: room.id,
      classId: classA.id,
      startAt: parseLocalInput(body.startAt).toISOString(),
      endAt: parseLocalInput(body.endAt).toISOString(),
      room,
      class: classA,
    };
    queueItems = [...queueItems, item];
    return item as T;
  }

  const queueMatch = pathname.match(/^\/booking-queue\/([^/]+)$/);
  if (method === "DELETE" && queueMatch) {
    queueItems = queueItems.filter((item) => item.id !== queueMatch[1]);
    return undefined as T;
  }

  if (method === "POST" && pathname === "/booking-queue/confirm") {
    const confirmed = queueItems.map((item) => ({
      id: `preview-res-${item.id}`,
      startAt: item.startAt,
      endAt: item.endAt,
      status: "CONFIRMED",
      room: item.room,
      class: item.class,
      createdBy: { id: previewUser.id, fullName: previewUser.fullName },
    }));
    reservations = [...reservations, ...confirmed];
    queueItems = [];
    return { confirmed: confirmed.length } as T;
  }

  const cancelMatch = pathname.match(/^\/reservations\/([^/]+)\/cancel$/);
  if (method === "POST" && cancelMatch) {
    reservations = reservations.map((reservation) =>
      reservation.id === cancelMatch[1] ? { ...reservation, status: "CANCELLED" } : reservation,
    );
    return undefined as T;
  }

  const memberMatch = pathname.match(/^\/classes\/([^/]+)\/members$/);
  if (method === "POST" && memberMatch) {
    const email = body.email?.trim();
    if (!email) throw new Error("Email is required.");
    if (members.some((member) => member.user.email === email)) throw new Error("That student is already in this class.");
    const id = `preview-user-${Date.now()}`;
    members = [
      ...members,
      {
        id: `preview-mem-${id}`,
        userId: id,
        isRep: false,
        user: { id, fullName: email.split("@")[0].replace(/\./g, " "), email, role: "STUDENT" },
      },
    ];
    return { ok: true } as T;
  }

  throw new Error(`Preview mock has no handler for ${method} ${pathname}`);
}
