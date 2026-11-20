-- ============================================================
-- SQL DDL SCHEMA — SMART PEMIRA POLTEK CWE (Importable to Draw.io)
-- Gunakan menu: Arrange -> Insert -> Advanced -> SQL... di draw.io
-- ============================================================

CREATE TABLE StudyProgram (
    id VARCHAR(10) PRIMARY KEY, -- TPTP, TPHP, MANLOG, BD, TRPL
    name VARCHAR(100) NOT NULL,
    facultyName VARCHAR(100) NOT NULL,
    colorPrimary VARCHAR(10) NOT NULL,
    colorTint VARCHAR(10) NOT NULL
);

CREATE TABLE Tps (
    id VARCHAR(10) PRIMARY KEY, -- TPTP, TPHP, MANLOG, BD, TRPL
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    chainSalt VARCHAR(64) UNIQUE NOT NULL,
    lastChainHash VARCHAR(64) DEFAULT ''
);

CREATE TABLE Voter (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    nim VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    angkatan INTEGER NOT NULL,
    studyProgramId VARCHAR(10) NOT NULL REFERENCES StudyProgram(id),
    tpsId VARCHAR(10) NOT NULL REFERENCES Tps(id),
    status VARCHAR(20) DEFAULT 'BELUM_MEMILIH',
    hasVoted BOOLEAN DEFAULT FALSE,
    votedAt TIMESTAMP NULL,
    pendingTokenHash VARCHAR(64) NULL, -- 1:0..1 Transien
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE VotingToken (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    tokenHash VARCHAR(64) UNIQUE NOT NULL,
    tpsId VARCHAR(10) NOT NULL REFERENCES Tps(id),
    studyProgramId VARCHAR(10) NOT NULL REFERENCES StudyProgram(id),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    issuedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiresAt TIMESTAMP NOT NULL, -- TTL 10 Menit
    usedAt TIMESTAMP NULL,
    lockedAt TIMESTAMP NULL, -- Kunci Suaraku
    revoteCount INTEGER DEFAULT 0
);

CREATE TABLE Candidate (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    category VARCHAR(20) NOT NULL, -- PRESMA, DPM, HIMA
    studyProgramId VARCHAR(10) NULL REFERENCES StudyProgram(id),
    number INTEGER NOT NULL,
    presidentName VARCHAR(100) NOT NULL,
    viceName VARCHAR(100) NULL,
    secondViceName VARCHAR(100) NULL,
    photoLeaderUrl TEXT NULL,
    photoViceUrl TEXT NULL,
    photoSecondViceUrl TEXT NULL,
    vision TEXT NOT NULL,
    missionJson TEXT NOT NULL,
    photoAccent VARCHAR(10) NOT NULL,
    isEmptyBox BOOLEAN DEFAULT FALSE
);

CREATE TABLE BallotBox (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4 Acak Murni
    category VARCHAR(20) NOT NULL, -- PRESMA, DPM, HIMA
    candidateId VARCHAR(36) NULL REFERENCES Candidate(id), -- NULL jika Kotak Kosong
    isEmptyBox BOOLEAN DEFAULT FALSE,
    tpsId VARCHAR(10) NOT NULL REFERENCES Tps(id),
    tokenId VARCHAR(36) NULL REFERENCES VotingToken(id),
    voteVersion INTEGER DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ballotHash VARCHAR(64) NOT NULL
);

CREATE TABLE Operator (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    username VARCHAR(50) UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL, -- KPUM, PPUR, PANWASLU, SAKSI, ITPO
    fullName VARCHAR(100) NOT NULL,
    tpsId VARCHAR(10) NULL REFERENCES Tps(id),
    isActive BOOLEAN DEFAULT TRUE,
    mustChangePassword BOOLEAN DEFAULT FALSE,
    totpSecret TEXT NULL,
    totpEnabledAt TIMESTAMP NULL,
    backupCodesJson TEXT NULL,
    lastLoginAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE AuditLog (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    event VARCHAR(50) NOT NULL,
    detail TEXT NOT NULL,
    tpsId VARCHAR(10) NULL REFERENCES Tps(id),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ElectionIncident (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    ticketNumber VARCHAR(30) UNIQUE NOT NULL,
    reporterName VARCHAR(100) NOT NULL,
    reporterNim VARCHAR(20) NOT NULL,
    incidentType VARCHAR(50) NOT NULL,
    location VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'SUBMITTED',
    verdict TEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ElectionSetting (
    id VARCHAR(20) PRIMARY KEY, -- 'main'
    votingOpen BOOLEAN DEFAULT TRUE,
    emergencyFreeze BOOLEAN DEFAULT FALSE,
    plenoUnlocked BOOLEAN DEFAULT FALSE,
    plenoUnlockedAt TIMESTAMP NULL,
    sessionSecret TEXT NOT NULL,
    baSignatureEd25519 TEXT NULL,
    baSignedAt TIMESTAMP NULL,
    baSignaturesJson TEXT NULL,
    periodLabel VARCHAR(100) NOT NULL,
    periodStartedAt TIMESTAMP NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ElectionArchive (
    id VARCHAR(36) PRIMARY KEY, -- UUIDv4
    archiveCode VARCHAR(30) UNIQUE NOT NULL,
    periodLabel VARCHAR(100) NOT NULL,
    mode VARCHAR(20) NOT NULL,
    sealedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sealedBy VARCHAR(50) NOT NULL,
    note TEXT NOT NULL,
    summaryJson TEXT NOT NULL,
    canonical TEXT NOT NULL,
    signature VARCHAR(64) NOT NULL,
    signatureEd25519 TEXT NULL,
    chainHeadsJson TEXT NOT NULL,
    dptCount INTEGER NOT NULL,
    votedCount INTEGER NOT NULL,
    ballotCount INTEGER NOT NULL
);
