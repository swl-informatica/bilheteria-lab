import { addDays, addYears } from '../time';

export interface SeedUser {
  key: string;
  name: string;
  email: string;
  cpf: string;
  birthDate: string;
  role: 'BUYER' | 'ADMIN';
  password: string;
}

export interface SeedSector {
  key: string;
  name: string;
  fullPrice: number;
  capacity: number;
}

export interface SeedEvent {
  key: string;
  name: string;
  venue: string;
  description: string;
  ageRating: string;
  salesOpenOn: string;
  startDate: string;
  startTime: string;
  canceled: boolean;
  sectors: SeedSector[];
}

export interface SeedCoupon {
  code: string;
  percent: number;
  startsOn: string;
  endsOn: string;
  usageLimit: number;
  minAmount: number;
}

export interface SeedTicket {
  code: string;
  used: boolean;
}

export interface SeedOrder {
  key: string;
  userKey: string;
  eventKey: string;
  sectorKey: string;
  quantity: number;
  couponCode: string | null;
  /** Payment date; null keeps the order awaiting payment. */
  paidOn: string | null;
  /** Paid at the exact moment the seed runs instead of at the usual time. */
  paidAtSeedMoment?: boolean;
  /** Minutes before the seed moment when an unpaid order was created. */
  createdMinutesAgo?: number;
  tickets: SeedTicket[];
}

export interface SeedData {
  users: SeedUser[];
  events: SeedEvent[];
  coupons: SeedCoupon[];
  orders: SeedOrder[];
}

const BUYER_PASSWORD = 'Senha123';
const ADMIN_PASSWORD = 'Admin123';

function plateia(price: number, capacity: number): SeedSector[] {
  return [{ key: 'plateia', name: 'Plateia', fullPrice: price, capacity }];
}

function tickets(...codes: string[]): SeedTicket[] {
  return codes.map((code) => ({ code, used: false }));
}

/** Builds the initial data relative to the given date (YYYY-MM-DD). */
export function buildSeedData(d: string): SeedData {
  const day = (offset: number) => addDays(d, offset);
  const standUpDate = day(10);
  const turnsEighteenOnShow = addYears(standUpDate, -18);

  const users: SeedUser[] = [
    {
      key: 'admin',
      name: 'Admin Bilheteria',
      email: 'admin@bilheteria.local',
      cpf: '98765432100',
      birthDate: '1985-01-15',
      role: 'ADMIN',
      password: ADMIN_PASSWORD,
    },
    {
      key: 'ana',
      name: 'Ana Souza',
      email: 'ana@bilheteria.local',
      cpf: '52998224725',
      birthDate: addYears(d, -30),
      role: 'BUYER',
      password: BUYER_PASSWORD,
    },
    {
      key: 'bruno',
      name: 'Bruno Lima',
      email: 'bruno@bilheteria.local',
      cpf: '11144477735',
      birthDate: turnsEighteenOnShow,
      role: 'BUYER',
      password: BUYER_PASSWORD,
    },
    {
      key: 'carla',
      name: 'Carla Dias',
      email: 'carla@bilheteria.local',
      cpf: '39053344705',
      birthDate: addDays(turnsEighteenOnShow, 1),
      role: 'BUYER',
      password: BUYER_PASSWORD,
    },
    {
      key: 'davi',
      name: 'Davi Rocha',
      email: 'davi@bilheteria.local',
      cpf: '24681357928',
      birthDate: addDays(turnsEighteenOnShow, -1),
      role: 'BUYER',
      password: BUYER_PASSWORD,
    },
  ];

  const events: SeedEvent[] = [
    {
      key: 'sons-do-cerrado',
      name: 'Festival Sons do Cerrado',
      venue: 'Arena Planalto, Brasília',
      description:
        'Dois palcos com artistas da música brasileira ao ar livre. Praça de alimentação e área de descanso no gramado.',
      ageRating: 'L',
      salesOpenOn: day(-10),
      startDate: day(30),
      startTime: '20:00',
      canceled: false,
      sectors: [
        { key: 'pista', name: 'Pista', fullPrice: 12000, capacity: 200 },
        { key: 'camarote', name: 'Camarote', fullPrice: 13636, capacity: 50 },
        { key: 'gramado', name: 'Gramado', fullPrice: 1500, capacity: 300 },
      ],
    },
    {
      key: 'noite-do-stand-up',
      name: 'Noite do Stand-up',
      venue: 'Teatro Paulista, São Paulo',
      description: 'Quatro comediantes se revezam no palco com textos inéditos. Espetáculo com linguagem adulta.',
      ageRating: '18',
      salesOpenOn: day(0),
      startDate: standUpDate,
      startTime: '21:00',
      canceled: false,
      sectors: plateia(8555, 80),
    },
    {
      key: 'o-ultimo-ato',
      name: 'O Último Ato',
      venue: 'Teatro Municipal, Curitiba',
      description: 'Drama sobre uma companhia de teatro na véspera da sua última apresentação.',
      ageRating: '12',
      salesOpenOn: day(-1),
      startDate: day(3),
      startTime: '19:00',
      canceled: false,
      sectors: plateia(10000, 7),
    },
    {
      key: 'acustico-ao-entardecer',
      name: 'Acústico ao Entardecer',
      venue: 'Parque das Águas, Belo Horizonte',
      description: 'Show acústico ao pôr do sol, com repertório de MPB e folk.',
      ageRating: 'L',
      salesOpenOn: day(-30),
      startDate: day(0),
      startTime: '18:00',
      canceled: false,
      sectors: [{ key: 'pista', name: 'Pista', fullPrice: 6000, capacity: 100 }],
    },
    {
      key: 'orquestra-em-concerto',
      name: 'Orquestra em Concerto',
      venue: 'Sala Sinfônica, Porto Alegre',
      description: 'A orquestra apresenta obras de Villa-Lobos e Beethoven.',
      ageRating: 'L',
      salesOpenOn: day(-10),
      startDate: day(20),
      startTime: '20:00',
      canceled: true,
      sectors: plateia(9000, 100),
    },
    {
      key: 'feira-geek',
      name: 'Feira Geek',
      venue: 'Centro de Convenções, Recife',
      description: 'Quadrinhos, games, cosplay e painéis com convidados durante todo o dia.',
      ageRating: '10',
      salesOpenOn: day(1),
      startDate: day(40),
      startTime: '10:00',
      canceled: false,
      sectors: [{ key: 'pista', name: 'Pista', fullPrice: 4000, capacity: 500 }],
    },
    {
      key: 'roda-de-samba',
      name: 'Roda de Samba',
      venue: 'Largo do Pelourinho, Salvador',
      description: 'Roda de samba tradicional com convidados da velha guarda.',
      ageRating: 'L',
      salesOpenOn: day(-30),
      startDate: day(-1),
      startTime: '20:00',
      canceled: false,
      sectors: [{ key: 'pista', name: 'Pista', fullPrice: 5000, capacity: 100 }],
    },
    {
      key: 'jazz-na-praca',
      name: 'Jazz na Praça',
      venue: 'Praça XV, Rio de Janeiro',
      description: 'Quarteto de jazz instrumental em apresentação ao ar livre.',
      ageRating: 'L',
      salesOpenOn: day(-30),
      startDate: day(1),
      startTime: '20:00',
      canceled: false,
      sectors: plateia(8000, 100),
    },
    {
      key: 'danca-em-movimento',
      name: 'Dança em Movimento',
      venue: 'Teatro do Lago, Florianópolis',
      description: 'Espetáculo de dança contemporânea com coreografias inéditas.',
      ageRating: 'L',
      salesOpenOn: day(-30),
      startDate: day(2),
      startTime: '20:00',
      canceled: false,
      sectors: plateia(8000, 100),
    },
    {
      key: 'coral-vozes-do-sul',
      name: 'Coral Vozes do Sul',
      venue: 'Auditório Central, Porto Alegre',
      description: 'Apresentação do coral com canções populares e eruditas.',
      ageRating: 'L',
      salesOpenOn: day(-30),
      startDate: day(6),
      startTime: '19:00',
      canceled: false,
      sectors: plateia(8000, 100),
    },
    {
      key: 'cinema-ao-ar-livre',
      name: 'Cinema ao Ar Livre',
      venue: 'Parque Central, Goiânia',
      description: 'Sessão de cinema no parque, com telão e pipoca. Traga sua canga.',
      ageRating: '14',
      salesOpenOn: day(-30),
      startDate: day(7),
      startTime: '19:30',
      canceled: false,
      sectors: plateia(8000, 100),
    },
    {
      key: 'circo-das-luzes',
      name: 'Circo das Luzes',
      venue: 'Lona Cultural, Fortaleza',
      description: 'Acrobacias, malabares e palhaços em um espetáculo para toda a família.',
      ageRating: 'L',
      salesOpenOn: day(-30),
      startDate: day(8),
      startTime: '16:00',
      canceled: false,
      sectors: plateia(8000, 100),
    },
  ];

  const coupons: SeedCoupon[] = [
    { code: 'BEMVINDO10', percent: 10, startsOn: day(-30), endsOn: day(60), usageLimit: 1000, minAmount: 0 },
    { code: 'FESTIVAL50', percent: 50, startsOn: day(-30), endsOn: day(60), usageLimit: 3, minAmount: 20000 },
    { code: 'LANCAMENTO20', percent: 20, startsOn: day(-30), endsOn: day(60), usageLimit: 1, minAmount: 0 },
    { code: 'VERAO15', percent: 15, startsOn: day(-60), endsOn: day(-1), usageLimit: 1000, minAmount: 0 },
    { code: 'ULTIMODIA5', percent: 5, startsOn: day(-1), endsOn: day(0), usageLimit: 1000, minAmount: 0 },
    { code: 'ESTREIA10', percent: 10, startsOn: day(0), endsOn: day(1), usageLimit: 1000, minAmount: 0 },
    { code: 'AMANHA25', percent: 25, startsOn: day(1), endsOn: day(60), usageLimit: 1000, minAmount: 0 },
  ];

  const ana = 'ana';
  const orders: SeedOrder[] = [
    { key: 'ana-01', userKey: ana, eventKey: 'acustico-ao-entardecer', sectorKey: 'pista', quantity: 2, couponCode: null, paidOn: day(-10), tickets: tickets('K7M2Q9XA', 'H4N8R3TB') },
    { key: 'ana-02', userKey: ana, eventKey: 'sons-do-cerrado', sectorKey: 'pista', quantity: 1, couponCode: 'LANCAMENTO20', paidOn: day(0), paidAtSeedMoment: true, tickets: tickets('Z5W6C8PD') },
    {
      key: 'ana-03',
      userKey: ana,
      eventKey: 'roda-de-samba',
      sectorKey: 'pista',
      quantity: 2,
      couponCode: null,
      paidOn: day(-20),
      tickets: [
        { code: 'M3V7J2KE', used: true },
        { code: 'W4P6N3RC', used: false },
      ],
    },
    { key: 'ana-04', userKey: ana, eventKey: 'o-ultimo-ato', sectorKey: 'plateia', quantity: 2, couponCode: null, paidOn: day(-10), tickets: tickets('R8T5Y4GS', 'B2X9L6UF') },
    { key: 'ana-05', userKey: ana, eventKey: 'jazz-na-praca', sectorKey: 'plateia', quantity: 1, couponCode: null, paidOn: day(-10), tickets: tickets('7WP8D9FK') },
    { key: 'ana-06', userKey: ana, eventKey: 'danca-em-movimento', sectorKey: 'plateia', quantity: 1, couponCode: null, paidOn: day(-10), tickets: tickets('CWPER5FQ') },
    { key: 'ana-07', userKey: ana, eventKey: 'coral-vozes-do-sul', sectorKey: 'plateia', quantity: 1, couponCode: null, paidOn: day(-10), tickets: tickets('PKDCLHT7') },
    { key: 'ana-08', userKey: ana, eventKey: 'cinema-ao-ar-livre', sectorKey: 'plateia', quantity: 1, couponCode: null, paidOn: day(-10), tickets: tickets('4TP6FWPF') },
    { key: 'ana-09', userKey: ana, eventKey: 'circo-das-luzes', sectorKey: 'plateia', quantity: 1, couponCode: null, paidOn: day(-10), tickets: tickets('DP7P7WLV') },
    { key: 'ana-10', userKey: ana, eventKey: 'sons-do-cerrado', sectorKey: 'pista', quantity: 1, couponCode: null, paidOn: day(-6), tickets: tickets('JFCZGNF3') },
    { key: 'ana-11', userKey: ana, eventKey: 'sons-do-cerrado', sectorKey: 'pista', quantity: 1, couponCode: null, paidOn: day(-7), tickets: tickets('NA33JL33') },
    { key: 'ana-12', userKey: ana, eventKey: 'sons-do-cerrado', sectorKey: 'pista', quantity: 1, couponCode: null, paidOn: day(-8), tickets: tickets('PMU8Y747') },
    { key: 'ana-13', userKey: ana, eventKey: 'sons-do-cerrado', sectorKey: 'pista', quantity: 1, couponCode: null, paidOn: null, createdMinutesAgo: 20, tickets: [] },
  ];

  return { users, events, coupons, orders };
}
