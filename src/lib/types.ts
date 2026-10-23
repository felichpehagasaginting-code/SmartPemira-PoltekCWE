// Tipe data bersama antara API dan UI — Smart Pemira
export type VoterStatus = "BELUM_MEMILIH" | "DALAM_ANTREAN" | "SUDAH_MEMILIH";

export interface ProdiInfo {
  id: string;
  name: string;
  facultyName: string;
  colorName?: string;
  colorPrimary: string;
  colorTint: string;
}

export interface CandidateView {
  id: string;
  category: "PRESMA" | "DPM" | "HIMA";
  studyProgramId: string | null;
  number: number;
  presidentName: string;
  viceName: string | null;
  secondViceName: string | null; // khusus DPM: Ketua 2
  photoLeaderUrl: string | null;
  photoViceUrl: string | null;
  photoSecondViceUrl: string | null; // khusus DPM: foto Ketua 2
  vision: string;
  missions: string[];
  isEmptyBox: boolean;
  photoAccent: string;
}

export interface BallotPayload {
  category: "PRESMA" | "DPM" | "HIMA";
  stepTitle: string;
  institutionLabel: string;
  color: string;
  tint: string;
  /** Opsi SUARA KOSONG selalu disediakan sistem sebagai kartu TERAKHIR di setiap
   *  surat suara — tidak lagi bergantung pada skenario calon tunggal. */
  candidates: CandidateView[];
}

export interface KioskSession {
  expiresAt: string | null; // null = re-vote (tanpa TTL, sampai pemungutan ditutup)
  tpsName: string;
  studyProgramId: string;
  studyProgramName: string;
  himaName: string;
}

export interface KioskValidateResponse {
  ok: boolean;
  message?: string;
  isRevote?: boolean;
  voteVersion?: number;
  session?: KioskSession;
  ballots?: BallotPayload[];
}

export interface SubmitSuccess {
  ok: true;
  message: string;
  receiptCode: string;
  tpsName: string;
  voteVersion: number;
  isRevote: boolean;
}

export interface VoterRow {
  id: string;
  nim: string;
  name: string;
  angkatan: number;
  status: VoterStatus;
  hasVoted: boolean;
  votedAt: string | null;
  studyProgramId: string;
  studyProgramName: string;
  studyProgramColor: string;
  studyProgramTint: string;
}

export interface PpurVotersResponse {
  counts: { all: number; belum: number; antrean: number; sudah: number };
  voters: VoterRow[];
}

export interface PortalResponse {
  appName: string;
  legalBasis: string;
  votingOpen: boolean;
  emergencyFreeze: boolean;
  plenoUnlocked: boolean;
  chains: Array<{ id: string; name: string; location: string }>;
  stats: { dptTotal: number; voted: number; turnoutPct: number };
  prodis: ProdiInfo[];
  candidates: CandidateView[];
}

export interface CandidateResultView {
  candidateId: string | null;
  number: number; // 0 = baris sintetis SUARA KOSONG (selalu posisi terakhir)
  name: string;
  viceName: string | null;
  secondViceName: string | null; // khusus DPM: Ketua 2
  isEmptyBox: boolean; // true = SUARA KOSONG (bukan entitas kandidat di database)
  votes: number;
  percentage: number;
}

export interface CategoryResultView {
  category: "PRESMA" | "DPM" | "HIMA";
  studyProgramId: string | null;
  studyProgramName: string | null;
  totalValidVotes: number;
  results: CandidateResultView[];
  outcome: "TERPILIH" | "MANDAT_KEMBALI_KE_MUSYAWARAH_MAHASISWA" | "PEMENANG_SEMENTARA" | "STATUS_SERI_PENDING_PLENO";
  outcomeDetail: string;
}

export interface ChainIntegrityView {
  tpsId: string;
  name: string;
  valid: boolean;
  checkedCount: number;
  headHash: string;
  brokenAtIndex: number | null;
}

export interface RevoteStatsView {
  tokensVoted: number;
  tokensRevoted: number;
  supersededBallots: number;
  lockedTokens: number;
}

export interface TallyResponse {
  locked: boolean;
  message?: string;
  unlocked?: boolean;
  unlockedAt?: string | null;
  categories?: CategoryResultView[];
  integrity?: { allValid: boolean; chains: ChainIntegrityView[]; totalChecked: number };
  revoteStats?: RevoteStatsView;
  generatedAt?: string;
}

export interface MonitorLiveResponse {
  kpis: {
    dptTotal: number;
    sudahMemilih: number;
    dalamAntrean: number;
    belumMemilih: number;
    turnoutPct: number;
    tokenAktif: number;
    tokenUsed: number;
    tokenExpired: number;
    ballotsCount: number;
    effectiveBallots?: number;
    revokedTokens?: number;
  };
  votingOpen: boolean;
  emergencyFreeze: boolean;
  plenoUnlocked: boolean;
  integrity: { allValid: boolean; chains: ChainIntegrityView[]; totalChecked: number };
  revoteStats?: RevoteStatsView & { effectiveBallots: number };
  chains?: Array<{ id: string; name: string; location: string; lastChainHash: string }>;
  attendanceByHour: Array<{ hour: number; count: number }>;
  logs: Array<{ id: string; event: string; detail: string; createdAt: string }>;
  /** Rekomendasi #8: jumlah percobaan login gagal/lockout dalam 5 menit terakhir */
  failedLogins5m?: number;
}

export interface AdminOverviewResponse {
  settings: {
    votingOpen: boolean;
    emergencyFreeze: boolean;
    plenoUnlocked: boolean;
    plenoUnlockedAt: string | null;
  };
  chains: Array<{ id: string; name: string; location: string; lastChainHash: string }>;
  stats: { dptTotal: number; sudah: number; antrean: number; belum: number; tokenUsed: number; ballots: number };
  candidates: CandidateView[];
  prodis: ProdiInfo[];
  voters: VoterRow[];
  logs: Array<{ id: string; event: string; detail: string; createdAt: string }>;
}

export interface IncidentRow {
  id: string;
  ticketNumber: string;
  reporterName: string;
  reporterNim: string;
  incidentType: string;
  location: string;
  description: string;
  status: string;
  verdict: string | null;
  createdAt: string;
}
