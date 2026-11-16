import type { SeedData } from '../src/repositories/in-memory';
import type { Suggestion, Ticket, Technician, User } from '../src/domain/types';

const HOUR = 3_600_000;

const hoursAgo = (now: Date, hours: number): string =>
  new Date(now.getTime() - hours * HOUR).toISOString();

const users: User[] = [
  { id: 'U-17', name: 'Sara Al-Harbi', role: 'reporter' },
  { id: 'U-18', name: 'Omar Al-Qahtani', role: 'reporter' },
  { id: 'SUP-01', name: 'Khalid Al-Otaibi', role: 'supervisor' },
];

const technicians: Technician[] = [
  { id: 'TECH-01', name: 'Ahmed Saleh', skills: ['HVAC', 'Electrical'], available: true },
  { id: 'TECH-02', name: 'Fatima Nasser', skills: ['Plumbing'], available: true },
  { id: 'TECH-03', name: 'Yousef Karim', skills: ['HVAC'], available: true },
  { id: 'TECH-04', name: 'Layla Mansour', skills: ['IT', 'Electrical'], available: true },
  { id: 'TECH-05', name: 'Hassan Idris', skills: ['Furniture', 'Cleaning'], available: false },
  { id: 'TECH-06', name: 'Noura Fahad', skills: ['Cleaning', 'Plumbing'], available: true },
];

interface TicketSpec {
  id: string;
  title: string;
  description: string;
  building: string;
  room: string;
  reporterId: string;
  status: Ticket['status'];
  category: Ticket['category'];
  priority: Ticket['priority'];
  assignedTo: string | null;
  hours: number;
  approvedBy?: string | null;
}

const specs: TicketSpec[] = [
  {
    id: 'T-1038',
    title: 'AC not working in 2A-15',
    description: 'The AC in room 2A-15 has been blowing hot air since this morning.',
    building: 'Building 6',
    room: '2A-15',
    reporterId: 'U-18',
    status: 'Assigned',
    category: 'HVAC',
    priority: 'High',
    assignedTo: 'TECH-03',
    hours: 2,
    approvedBy: 'SUP-01',
  },
  {
    id: 'T-1039',
    title: 'Socket sparking near the door',
    description: 'The wall socket beside the door in room 2A-15 sparks when a laptop is plugged in.',
    building: 'Building 6',
    room: '2A-15',
    reporterId: 'U-17',
    status: 'Resolved',
    category: 'Electrical',
    priority: 'Urgent',
    assignedTo: 'TECH-01',
    hours: 5,
    approvedBy: 'SUP-01',
  },
  {
    id: 'T-1040',
    title: 'Projector does not turn on',
    description: 'The ceiling projector in the library study room stays black before a scheduled lecture.',
    building: 'Library',
    room: '1B-04',
    reporterId: 'U-17',
    status: 'Assigned',
    category: 'IT',
    priority: 'High',
    assignedTo: 'TECH-04',
    hours: 8,
    approvedBy: 'SUP-01',
  },
  {
    id: 'T-1041',
    title: 'Water leaking near a power strip',
    description: 'A pipe under the sink is leaking and water is pooling next to a power strip.',
    building: 'Building 2',
    room: '1A-10',
    reporterId: 'U-18',
    status: 'Resolved',
    category: 'Plumbing',
    priority: 'Urgent',
    assignedTo: 'TECH-02',
    hours: 12,
    approvedBy: 'SUP-01',
  },
  {
    id: 'T-1042',
    title: 'Spilled drink on the floor',
    description: 'Someone spilled a drink in the corridor of room 3C-21 and the floor is sticky.',
    building: 'Building 3',
    room: '3C-21',
    reporterId: 'U-17',
    status: 'Resolved',
    category: 'Cleaning',
    priority: 'Low',
    assignedTo: 'TECH-06',
    hours: 24,
    approvedBy: 'SUP-01',
  },
  {
    id: 'T-1043',
    title: 'Wobbly chair in 2B-07',
    description: 'One of the chairs at the back of room 2B-07 has a loose leg and wobbles.',
    building: 'Building 4',
    room: '2B-07',
    reporterId: 'U-18',
    status: 'Resolved',
    category: 'Furniture',
    priority: 'Low',
    assignedTo: 'TECH-05',
    hours: 30,
    approvedBy: 'SUP-01',
  },
  {
    id: 'T-1044',
    title: 'Slow drain in the lab sink',
    description: 'The sink in room 1A-02 drains very slowly but the room is still usable.',
    building: 'Building 5',
    room: '1A-02',
    reporterId: 'U-17',
    status: 'InProgress',
    category: 'Plumbing',
    priority: 'Medium',
    assignedTo: 'TECH-02',
    hours: 40,
    approvedBy: 'SUP-01',
  },
  {
    id: 'T-1045',
    title: 'Light flickering in the hall',
    description: 'The ceiling light in the sports hall entrance flickers constantly.',
    building: 'Sports Hall',
    room: '1A-01',
    reporterId: 'U-18',
    status: 'Resolved',
    category: 'Electrical',
    priority: 'Medium',
    assignedTo: 'TECH-04',
    hours: 60,
    approvedBy: 'SUP-01',
  },
  {
    id: 'T-1046',
    title: 'No network in the meeting room',
    description: 'The wired network port in room 2A-09 does not connect at all today.',
    building: 'Building 7',
    room: '2A-09',
    reporterId: 'U-17',
    status: 'Resolved',
    category: 'IT',
    priority: 'Medium',
    assignedTo: 'TECH-04',
    hours: 72,
    approvedBy: 'SUP-01',
  },
  {
    id: 'T-1047',
    title: 'Broken tap in the washroom',
    description: 'The tap in the washroom of room 1B-12 keeps running and will not close.',
    building: 'Building 1',
    room: '1B-12',
    reporterId: 'U-18',
    status: 'New',
    category: 'Plumbing',
    priority: 'Medium',
    assignedTo: null,
    hours: 1,
  },
  {
    id: 'T-1048',
    title: 'No cooling in 2A-05',
    description: 'The air conditioning in room 2A-05 is not cooling and the room is very hot.',
    building: 'Building 2',
    room: '2A-05',
    reporterId: 'U-17',
    status: 'New',
    category: 'HVAC',
    priority: 'High',
    assignedTo: null,
    hours: 3,
  },
  {
    id: 'T-1049',
    title: 'Desk lamp socket broken',
    description: 'The socket next to the desk in room 1A-08 is loose and the lamp cuts out.',
    building: 'Building 3',
    room: '1A-08',
    reporterId: 'U-18',
    status: 'New',
    category: 'Electrical',
    priority: 'Medium',
    assignedTo: null,
    hours: 4,
  },
];

const suggestions: Suggestion[] = [
  {
    ticketId: 'T-1047',
    category: 'Plumbing',
    priority: 'Medium',
    possibleDuplicateOf: null,
    suggestedTechnician: 'TECH-02',
    draftReply: 'Thanks for reporting. A technician will check the tap in room 1B-12.',
    reason: 'Running tap in a washroom; the room is still usable.',
    needsHuman: false,
  },
  {
    ticketId: 'T-1048',
    category: 'HVAC',
    priority: 'High',
    possibleDuplicateOf: null,
    suggestedTechnician: 'TECH-01',
    draftReply: 'Thanks for reporting. A technician will check room 2A-05 today.',
    reason: 'No cooling in a classroom; the room cannot be used comfortably.',
    needsHuman: false,
  },
  {
    ticketId: 'T-1049',
    category: 'Electrical',
    priority: 'Medium',
    possibleDuplicateOf: null,
    suggestedTechnician: 'TECH-04',
    draftReply: 'Thanks for reporting. A technician will inspect the socket in room 1A-08.',
    reason: 'Loose socket without smoke or sparks; the room is still usable.',
    needsHuman: false,
  },
];

export function buildSeedData(now: Date): SeedData {
  const tickets: Ticket[] = specs.map((spec) => ({
    id: spec.id,
    title: spec.title,
    description: spec.description,
    building: spec.building,
    room: spec.room,
    reporterId: spec.reporterId,
    status: spec.status,
    category: spec.category,
    priority: spec.priority,
    assignedTo: spec.assignedTo,
    duplicateOf: null,
    createdAt: hoursAgo(now, spec.hours),
    approvedBy: spec.approvedBy ?? null,
    approvedAt: spec.approvedBy ? hoursAgo(now, spec.hours - 0.5) : null,
    humanOverride: false,
  }));

  return {
    users: users.map((user) => ({ ...user })),
    technicians: technicians.map((technician) => ({
      ...technician,
      skills: [...technician.skills],
    })),
    tickets,
    suggestions: suggestions.map((suggestion) => ({ ...suggestion })),
  };
}

export const SEED_COUNTS = {
  users: users.length,
  technicians: technicians.length,
  tickets: specs.length,
} as const;
