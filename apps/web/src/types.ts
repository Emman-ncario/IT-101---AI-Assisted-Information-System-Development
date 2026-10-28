export type Role = "STUDENT" | "REPRESENTATIVE" | "ADMIN";
export interface User { id: string; fullName: string; email: string; role: Role; memberships?: Membership[] }
export interface Membership { id: string; isRep: boolean; class: ClassInfo }
export interface ClassInfo { id: string; block: string; program: string; yearLevel: number }
export interface Building { id: string; code: string; name: string; description: string; imageUrl?: string | null; floorCount: number; roomCount: number; floors: { id: string; number: number; roomCount: number }[] }
export interface Room { id: string; number: string; name: string; capacity: number; roomType: string; facilities: string[]; floorId: string; active: boolean; floor?: { number: number; building: { name: string } } }
export interface Reservation { id: string; startAt: string; endAt: string; status: string; room: Room; class: ClassInfo; createdBy: { id: string; fullName: string } }
export interface QueueItem { id: string; roomId: string; classId: string; startAt: string; endAt: string; room: Room; class: ClassInfo }
