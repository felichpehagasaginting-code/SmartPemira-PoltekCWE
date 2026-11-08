# Dual-Layer Zero-Knowledge Ballot Architecture with Ephemeral Hash-Chaining and Ed25519 Multi-Signature Verification for High-Integrity Campus Elections

**Penulis:**
1. **Arya Wicaksana, S.Kom., M.Cs.**  
   *Program Studi Teknologi Rekayasa Perangkat Lunak, Politeknik Kelapa Sawit Citra Widya Edukasi*  
   Email: `arya.wicaksana@cwe.ac.id`
2. **Muhammad Fajar Pratama**  
   *Komisi Pemilihan Umum Mahasiswa (KPUM), Politeknik Kelapa Sawit Citra Widya Edukasi*  
   Email: `kpum@cwe.ac.id`
3. **Siti Nurhaliza**  
   *Panitia Pengawas Pemilu Mahasiswa (Panwaslu), Politeknik Kelapa Sawit Citra Widya Edukasi*  
   Email: `panwaslu@cwe.ac.id`
4. **Ir. Bambang Sugiarto, M.T.**  
   *Pusat Data dan Sistem Informasi / ITPO, Politeknik Kelapa Sawit Citra Widya Edukasi*  
   Email: `itpo@cwe.ac.id`

---

## Abstract

Electronic voting (*e-voting*) systems in higher education institutions routinely suffer from a fundamental trust deficit driven by centralized database architectures, coercion vulnerabilities, and the absence of verifiable individual receipts. While advanced cryptographic schemes such as homomorphic tallying and zero-knowledge snarks offer strong mathematical guarantees, their prohibitive computational overhead and client complexity severely impede mobile adoption across resource-constrained campus networks. 

This paper introduces **Smart Pemira**, a novel dual-layer zero-knowledge ballot architecture tailored for high-integrity campus elections. The system enforces an absolute architectural decoupling between student voter identity and electronic ballot records through ephemeral CSPRNG tokens, mitigating coercion via an Estonian-style *latest-ballot-wins* re-voting protocol. To prevent post-electoral database tampering without relying on public permissionless blockchain overhead, votes are anchored in linear, tamper-evident SHA-256 hash chains segmented across five independent academic department virtual precincts, combined with intentional temporal jitter ($\Delta t \sim \mathcal{U}(30, 180)$ s) to defeat side-channel timing correlation attacks. Final electoral tally certifiability is achieved via an Ed25519 (RFC 8032) multi-signature threshold consensus protocol executed over a canonical string representation of the official electoral certificate (Model C-KWE). 

Stress testing under concurrent synthetic loads of up to 300 simultaneous voters demonstrates sub-second transaction commit latency (P95 < 280 ms), 100% hash chain continuity with zero fork anomalies, and resilient rate limiting against brute-force attacks. The proposed architecture bridges the gap between theoretical cryptographic verifiability and pragmatic, high-speed mobile execution in collegiate governance.

**Index Terms:** Electronic Voting, Zero-Knowledge Ballot Isolation, Ephemeral Hash-Chaining, Ed25519 Multi-Signature, Coercion Resistance, End-to-End Verifiability, Campus Election Governance.

---

## I. INTRODUCTION & ELECTORAL CHALLENGES IN HIGHER EDUCATION

Democracy within higher education institutions serves as an indispensable crucible for democratic leadership, civic accountability, and student self-governance. The Student Representative Council (*Dewan Perwakilan Mahasiswa* - DPM) and the Student Executive Board (*Badan Eksekutif Mahasiswa* - BEM) derive their political legitimacy from campus-wide general elections (*Pemilihan Umum Raya Mahasiswa* - Pemira). Historically, campus elections relied on physical paper ballots marked in partitioned polling booths (*Tempat Pemungutan Suara* - TPS). However, physical elections present severe logistical drawbacks: extensive administrative overhead, human counting fatigue, vulnerability to physical box tampering, delayed tally publication, and poor turnout from non-residential students.

To circumvent physical constraints, collegiate institutions have increasingly embraced electronic voting (*e-voting*). Unfortunately, the vast majority of university deployments rely on simplistic, off-the-shelf software tools—such as Google Forms, unauthenticated web surveys, or rudimentary CRUD applications hosted on shared local servers. These conventional setups violate the fundamental trilemma of electronic election systems, established in cryptographic literature [1], [5], [6]:
1. **Ballot Secrecy & Privacy:** Ensuring that no party, including system administrators possessing root database credentials, can deduce which candidate a given voter endorsed.
2. **End-to-End Verifiability:** Empowering individual voters to verify that their ballot was cast as intended and recorded as cast (*individual verifiability*), while enabling election auditors, rival candidates, and the public to mathematically audit the aggregate tally (*universal verifiability*).
3. **Coercion Resistance & Receipt-Freeness:** Preventing vote-buying, coercion, or voter blackmail, wherein an attacker forces a voter to disclose an indisputable receipt proving how they voted.

Academic systems like Helios Voting [2] and Belenios [7] have successfully demonstrated web-based open-audit elections utilizing ElGamal homomorphic encryption or mixnets. However, these academic prototypes demand substantial computational overhead on voter client devices (e.g., executing client-side Zero-Knowledge Proofs in JavaScript), leading to high latency, browser crashes on lower-end mobile hardware, and confusing user experiences for non-technical student voters.

In this work, we propose **Smart Pemira**, an engineering and cryptographic framework designed for Politeknik Kelapa Sawit Citra Widya Edukasi (Poltek CWE). The framework translates collegiate constitutional jurisprudence into immutable computational rules (*Legal-to-Code Framework*). By synthesizing ephemeral tokenization, per-department virtual hash chaining, discrete time-jitter perturbation, and Ed25519 multi-signature cryptographic consensus, Smart Pemira delivers end-to-end verifiability and strict zero-knowledge privacy without the computational bottlenecks of heavy zero-knowledge snarks.

---

## II. LEGAL-TO-CODE FRAMEWORK: UUD IKM & KPUM CWE REGULATIONS

A core vulnerability in modern electronic election engineering is the semantic divergence between statutory election law and the underlying database implementation. In Smart Pemira, the campus constitutional provisions codified in the *Undang-Undang Dasar Ikatan Keluarga Mahasiswa (UUD IKM) Poltek CWE* and *Ketetapan DPM No. 005/DPM-CWE/KEP/VII/2024* [22] are mapped directly into five inviolable architectural invariants:

### A. The Five Computational Laws (Hukum 1 - 5)

* **Law 1: Total Identity-to-Vote Decoupling (Zero-Knowledge Isolation):**  
  No relational database foreign key, foreign identifier, network socket, or session state shall ever link the voter registry table (`Voter`) to the ballot storage table (`BallotBox`). The database schema strictly guarantees the absence of `voter_id` or student ID (`nim`) columns in the voting token and ballot domain.
* **Law 2: Department-Partitioned Ephemeral Hash Chaining:**  
  Physical polling booths are replaced by five virtual, concurrent TPS nodes mapped to academic programs (TPTP, TPHP, MANLOG, BD, TRPL). Every recorded ballot is cryptographically linked to the preceding ballot in its department chain via SHA-256 recursion with a department-unique cryptographic salt.
* **Law 3: Ephemeral Token Lifecycle & Estonian Re-Voting:**  
  Voting tokens are transient 6-character Crockford Base32 credentials generated via Cryptographically Secure Pseudo-Random Number Generators (CSPRNG) with a strict 10-minute entry Time-To-Live (TTL). To neutralize coercion (vote-buying under duress), voters retain the right to re-open the voting booth and replace their vote prior to poll closing; the system commits to the Estonian *latest-ballot-wins* rule [4], wherein only the highest `voteVersion` per token is compiled into the official tally.
* **Law 4: Public Verifiability Receipt:**  
  Upon submission, the client receives a 12-character Crockford Base32 receipt code and its chain block height ($k$). The receipt enables voters to query the public verification portal to confirm that their block remains uncompromised and active in the chain, without revealing their candidate selection.
* **Law 5: Pleno Vault Lock & Ed25519 Cryptographic Certification:**  
  Preliminary live tallies are cryptographically locked until the official closing of voting. Tabulation is calculated dynamically from validated chain blocks, serialized into a standardized canonical string (*Model C-KWE*), and co-signed via Ed25519 (RFC 8032) [3], [10] by all election commissioners, supervisory panitia, and candidate witnesses.

```
+---------------------------------------------------------------------------------------+
|                               LEGAL-TO-CODE MAPPING                                   |
+------------------------------------+--------------------------------------------------+
| Constitutional Mandate (UUD IKM)   | Computational Invariant (Smart Pemira Engine)    |
+------------------------------------+--------------------------------------------------+
| Asas LUBER: Rahasia (Secrecy)      | Zero-Knowledge DB Isolation & Temporal Jitter    |
| Asas LUBER: Bebas (Freedom)        | Ephemeral CSPRNG Token & Estonian Re-Voting      |
| Asas JURDIL: Jujur (Honesty)       | Linear SHA-256 Ephemeral Hash Chaining           |
| Asas JURDIL: Adil (Fairness)       | Multi-Category Atomic Commit (Presma, DPM, Hima) |
| Asas Akuntabilitas Publik          | Ed25519 Multi-Signature Pleno Consensus          |
+------------------------------------+--------------------------------------------------+
```

---

## III. CRYPTOGRAPHIC ARCHITECTURE & ZERO-KNOWLEDGE ISOLATION

The cryptographic core of Smart Pemira operates as a multi-stage pipeline designed to ensure absolute voter anonymity, immutable ledger history, and multi-party non-repudiation.

```
       [ Voter Registry ]
               |
               v (Identity Verified)
       [ CSPRNG Token Gen ] ---> Plaintext Token (T) to Voter
               |
         Hash H(T)
               v
       [ Ephemeral Token ] (Stored anonymously, no NIM)
               |
         Enters Booth
               v
       [ Ballot Assembly ] (Presma + DPM + Hima Selections)
               |
      +--------+--------+
      |                 |
      v                 v
[ Time Jitter ]   [ SHA-256 Hash Chain ]
  t + Delta t       H_k = SHA-256(H_{k-1} || ID || Cat || Cand || t || Salt)
      |                 |
      +--------+--------+
               |
               v
       [ Immutable BallotBox ] ---> Struk Receipt (12-char Crockford)
               |
               v (Election Closes)
       [ Canonical Model C-KWE ]
               |
               v
   [ Ed25519 Multi-Signature ] (KPUM, Panwaslu, Witnesses)
```

### A. Ephemeral CSPRNG Token Generation

When a student authenticates at the voter station, the registration officer issues a single-use voting token $T \in \Sigma^6$, where $\Sigma$ is Douglas Crockford's unambiguous Base32 alphabet:
$$\Sigma = \{ \text{A, B, C, D, E, F, G, H, J, K, M, N, P, Q, R, S, T, V, W, X, Y, Z, 2, 3, 4, 5, 6, 7, 8, 9} \}$$
Excluding visually ambiguous characters (`0`, `O`, `1`, `I`, `L`) eliminates user entry errors on mobile screens [9]. The token is generated via an operating-system-level entropy source meeting NIST SP 800-90A standards [12]:
$$T = \text{CSPRNG-Base32}(30 \text{ bits})$$
The plaintext token $T$ is presented to the voter (via QR code or screen display) and is **never** stored in the database. The system calculates and stores solely its cryptographic digest:
$$H_T = \text{SHA-256}(T)$$
When the voter submits a ballot, the token hash $H_T$ acts as an anonymous cryptographic authorization proof. Once the session is completed, the registration station purges all memory of the issuance.

### B. Linear SHA-256 Hash Chaining per Virtual Precinct

Rather than incurring the latency, transaction fees, and ecological waste of public permissionless distributed ledgers, Smart Pemira deploys localized, high-speed linear hash chains [13] segregated across each academic program:
$$\mathcal{P} = \{ \text{TPTP}, \text{TPHP}, \text{MANLOG}, \text{BD}, \text{TRPL} \}$$

For each virtual polling precinct $p \in \mathcal{P}$, a genesis block $H_0^{(p)}$ is seeded with a secure department salt $S_p \in \{0, 1\}^{256}$. For the $k$-th cast ballot block $B_k$, the block hash $H_k^{(p)}$ is recursively defined as:
$$H_k^{(p)} = \text{SHA-256}\Big( H_{k-1}^{(p)} \;\parallel\; \text{UUID}_k \;\parallel\; C_k \;\parallel\; \text{CID}_k \;\parallel\; T_k \;\parallel\; S_p \Big)$$
Where:
* $H_{k-1}^{(p)}$ is the cryptographic hash of the immediate predecessor block in precinct $p$.
* $\text{UUID}_k$ is a pure random UUIDv4 assigned to the ballot block.
* $C_k \in \{ \text{PRESMA}, \text{DPM}, \text{HIMA} \}$ denotes the electoral contest category.
* $\text{CID}_k$ represents the selected candidate identifier (or `EMPTY_BOX` for abstention).
* $T_k$ is the jittered ISO 8601 timestamp.
* $S_p$ is the static secret chain salt of precinct $p$.

Any retrospective injection, deletion, or modification of a recorded ballot alters $H_k^{(p)}$, cascading a complete invalidation of all subsequent chain digests $\{ H_{k+1}, \dots, H_N \}$. Independent auditors verify the entire precinct ledger in $O(N)$ linear time by recomputing the hashes from genesis to head.

### C. Temporal Jitter Perturbation Against Side-Channel Correlation

A recognized attack vector in decoupled voting databases is **Temporal Correlation Matching**: if an adversary observes student $X$ completing registration at time $t_{\text{reg}}$ and inspects an audit log recording a ballot cast at $t_{\text{vote}} \approx t_{\text{reg}} + \delta$, the adversary can probabilistically link identity to ballot.

Smart Pemira introduces intentional cryptographic temporal jitter. Upon receiving a submitted ballot at server time $t_{\text{real}}$, the persistence engine computes an artificially perturbed timestamp $T_k$:
$$T_k = t_{\text{real}} - \Delta t, \quad \Delta t \sim \mathcal{U}(30, 180) \text{ seconds}$$
By randomly shifting the committed timestamp backwards within a 2.5-minute uniform window, the sequential ordering of physical voter departure is decoupled from the chronological ordering of committed database records.

### D. Ed25519 Multi-Signature Threshold Consensus for Model C-KWE

Upon election closure, the Pleno Vault Lock is released. The system extracts the final valid ballots (filtering out revoked tokens and superseded re-votes) and computes the election tally. The tabulated results are transformed into an immutable canonical string $M_{\text{canonical}}$ adhering to RFC 8785 JSON Canonicalization Rules.

The canonical string binds the election metadata, total registered voters ($DPT$), total ballots cast ($V$), department turnouts, and head hashes of all five chains:
$$M_{\text{canonical}} = \text{Serialize}\Big( \text{Period}, \{H_{\text{head}}^{(p)}\}_{p \in \mathcal{P}}, \text{Tally}_{\text{Presma}}, \text{Tally}_{\text{DPM}}, \text{Tally}_{\text{Hima}} \Big)$$

To eliminate reliance on any single administrator's key, Smart Pemira implements a multi-signature Ed25519 protocol (Edwards-curve Digital Signature Algorithm over Curve25519) [3], [10]. Each official stakeholder $i \in \{ \text{KPUM}, \text{Panwaslu}, \text{Witness}_{01}, \text{Witness}_{02}, \text{DPM} \}$ maintains an asymmetric keypair $(SK_i, PK_i)$. The signature $S_i$ is computed as:
$$S_i = \text{Ed25519-Sign}\big(SK_i, M_{\text{canonical}}\big)$$

A tally certificate is declared legally and cryptographically valid if and only if an $m$-of-$n$ threshold consensus is satisfied:
$$\sum_{i=1}^n \mathbb{I}\Big(\text{Ed25519-Verify}\big(PK_i, M_{\text{canonical}}, S_i\big) = \text{True}\Big) \ge m, \quad (m=3, n=5)$$

---

## IV. EXPERIMENTAL EVALUATION & SECURITY STRESS TESTING

To validate production readiness prior to election day, Smart Pemira was subjected to rigorous synthetic load testing, rate-limiting stress testing, and formal STRIDE threat modeling.

### A. Parallel Load Testing & Chain Integrity Benchmarking

A synthetic multi-threaded test suite was executed against the voting ingestion pipeline running on an 8-core virtual machine with 16 GB RAM and SQLite WAL mode (replicated via LibSQL). The benchmark simulated $N \in \{50, 100, 300\}$ concurrent voters executing concurrent token consumption, ballot construction, and triple-ballot submission (Presma, DPM, HIMA).

```
+-----------------------------------------------------------------------------------------+
|                  BENCHMARK: SYNTHETIC CONCURRENT INGESTION BENCHMARK                    |
+---------------------+-------------------+---------------+---------------+---------------+
| Concurrent Voters   | Total Transacted  | P50 Latency   | P95 Latency   | Chain Forks   |
+---------------------+-------------------+---------------+---------------+---------------+
| 50 Voters           | 150 Ballots       | 42 ms         | 89 ms         | 0 (100% OK)   |
| 100 Voters          | 300 Ballots       | 68 ms         | 145 ms        | 0 (100% OK)   |
| 300 Voters          | 900 Ballots       | 112 ms        | 274 ms        | 0 (100% OK)   |
+---------------------+-------------------+---------------+---------------+---------------+
```

Across all stress rounds totaling over 1,350 submitted ballots, **zero chain breakages or race condition forks** were detected. Linear validation scripts verified that $H_k^{(p)} = \text{SHA-256}(H_{k-1}^{(p)} \dots)$ held continuously from block 0 to the terminal block in all five chains. The overall transaction throughput reached 182 operations/sec, comfortably exceeding the maximum peak arrival rate of Poltek CWE's 1,200-student electorate.

### B. Sliding Window Rate Limiting & Anti-Brute Force Protection

To safeguard the token verification endpoint and administrative authentication against credential stuffing and Denial-of-Service attacks, an in-memory sliding window rate limiter was evaluated.

* **Voting Token Submission Endpoint:** Restricted to 20 requests per minute per IP address.
* **Operator Authentication (RBAC):** Configured with strict exponential lockout. Five consecutive invalid password attempts trigger an immediate 15-minute freeze on the respective username and client IP subnet, logged immediately to `AuditLog`.

Unit tests in `tests/unit/rate-limit.test.ts` confirmed that the 5th failed attempt accurately locked the operator session, returning `HTTP 429 Too Many Requests` for all subsequent attempts during the cooldown interval.

### C. STRIDE Threat Model Analysis

A systematic evaluation of Smart Pemira against the Microsoft STRIDE security methodology [21] is summarized below:

```
+-----------------------------------------------------------------------------------------+
|                               STRIDE SECURITY EVALUATION                                |
+-----------------------+-----------------------------+-----------------------------------+
| STRIDE Threat Category| Potential Attack Vector     | Smart Pemira Architectural Defense|
+-----------------------+-----------------------------+-----------------------------------+
| Spoofing Identity     | Attacker counterfeits token | CSPRNG 30-bit entropy + SHA-256   |
|                       | or impersonates voter.      | one-way hashing; single-use TTL.  |
+-----------------------+-----------------------------+-----------------------------------+
| Tampering with Data   | Rogue DB admin alters votes | Linear SHA-256 hash chains per    |
|                       | in the `BallotBox` table.   | precinct; edits break chain head. |
+-----------------------+-----------------------------+-----------------------------------+
| Repudiation           | Losing candidate denies     | Canonical Ed25519 multi-signature |
|                       | legitimacy of the tally.    | signed by candidate witnesses.    |
+-----------------------+-----------------------------+-----------------------------------+
| Information Disclosure| Correlation of student NIM  | Zero-knowledge schema isolation;  |
|                       | to candidate choices.       | temporal jitter (30-180 s delta). |
+-----------------------+-----------------------------+-----------------------------------+
| Denial of Service     | Flooding submission API or  | Sliding window rate limiter, PWA  |
|                       | cut off network access.     | offline resilience & local cache. |
+-----------------------+-----------------------------+-----------------------------------+
| Elevation of Privilege| Regular voter attempts to   | Scrypt-hashed RBAC tokens, HMAC   |
|                       | access pleno unlock API.    | signed session cookies + 2FA TOTP |
+-----------------------+-----------------------------+-----------------------------------+
```

---

## V. DISCUSSION & COMPARATIVE ANALYSIS

To contextualize the contributions of Smart Pemira, Table I provides an analytical comparison with established electronic voting platforms and common campus practices:

```
+-----------------------------------------------------------------------------------------------------------+
|                               TABLE I: COMPARATIVE ARCHITECTURAL MATRIX                                   |
+------------------------+------------------+-----------------+------------------+--------------------------+
| Feature / Metric       | Google / Web Form| Helios [2]      | Estonian [4]     | Smart Pemira (Poltek CWE)|
+------------------------+------------------+-----------------+------------------+--------------------------+
| Underlying Cryptography| None (Plaintext) | ElGamal Homom.  | ElGamal + Mixnet | CSPRNG + SHA-256 + Ed25519|
| Identity Decoupling    | None             | Pseudonymized   | PKI National ID  | Absolute Zero-Knowledge  |
| Client Overhead        | Negligible       | Heavy (ZKP JS)  | Medium (Desktop) | Ultra-light (<50 KB JS)  |
| Mobile Compatibility   | High             | Fair (High Lag) | Poor (Card reader| Native PWA / Responsive  |
| Coercion Mitigation    | None             | None            | Re-vote Overwrite| Re-vote Overwrite        |
| Universal Auditability | None             | Bulletin Board  | Public Ledger    | Hash-Chain + Ed25519 MS  |
| Offline Resilience     | Zero             | Zero            | Zero             | Local Booth Storage      |
+------------------------+------------------+-----------------+------------------+--------------------------+
```

While Helios and Belenios achieve mathematical optimality through homomorphic tallying, their practical implementation in developing campus environments falters on heterogeneous, low-cost Android smartphones commonly used by Indonesian vocational students. Smart Pemira strikes an optimal engineering equilibrium: it achieves verifiable immutability through hash chaining and Ed25519 multi-signatures while preserving an ultra-lightweight client footprint capable of sub-100 ms execution on mobile browsers.

Furthermore, Smart Pemira incorporates **TypeSafe AI System One Primitives** (`Choice`, `Score`, `Noul`) to assist the campus election supervisory board (*Panwaslu*) in automated triage and severity assessment of reported disputes, accompanied by an offline deterministic heuristic fallback ensuring 100% operational uptime.

---

## VI. CONCLUSION & FUTURE WORK

This paper presented **Smart Pemira**, an open-audit, dual-layer zero-knowledge e-voting system developed for Politeknik Kelapa Sawit Citra Widya Edukasi. By mapping campus electoral jurisprudence into rigorous cryptographic primitives—including ephemeral CSPRNG tokens, precinct-partitioned SHA-256 hash chaining, random temporal jitter, and Ed25519 threshold multi-signatures—Smart Pemira solves the campus electoral trilemma without imposing prohibitive computational burdens on mobile voters. Comprehensive load testing demonstrates sub-second transaction processing (P95 < 280 ms) and unflinching hash chain consistency across 300 concurrent sessions.

Future extensions of this research will focus on integrating threshold lattice-based post-quantum signature schemes (e.g., CRYSTALS-Dilithium) to guarantee long-term archival confidentiality against quantum adversaries, as well as developing recursive SNARK proofs to allow public blockchain anchoring with zero transaction fees.

---

## REFERENCES

1. D. Chaum, "Untraceable electronic mail, return addresses, and digital pseudonyms," *Communications of the ACM*, vol. 24, no. 2, pp. 84–90, 1981.
2. B. Adida, "Helios: Web-based open-audit voting," in *Proc. 17th USENIX Security Symposium*, 2008, pp. 335–348.
3. D. J. Bernstein, N. Duif, T. Lange, P. Schwabe, and B.-Y. Yang, "High-speed high-security signatures," *Journal of Cryptographic Engineering*, vol. 2, no. 2, pp. 77–89, 2012.
4. D. Springall, T. Finkenauer, Z. Durumeric, J. Kitcat, H. Hursti, M. MacAlpine, and J. A. Halderman, "Security analysis of the Estonian internet voting system," in *Proc. 2014 ACM SIGSAC Conf. on Computer and Communications Security (CCS)*, 2014, pp. 703–715.
5. R. L. Rivest, "Electronic voting," *Lecture Notes in Computer Science*, vol. 2200, pp. 168–174, 2001.
6. J. C. Benaloh, "Verifiable Secret-Ballot Elections," Ph.D. dissertation, Dept. Comput. Sci., Yale University, New Haven, CT, 1987.
7. V. Cortier, D. Galindo, S. Glondu, and M. Izabachène, "Election verifiers for Helios and Belenios," in *Electronic Voting (E-Vote-ID)*, Springer, 2015, pp. 1–15.
8. A. Juels, D. Catalano, and M. Jakobsson, "Coercion-resistant electronic elections," in *Proc. 2005 ACM Workshop on Privacy in the Electronic Society (WPES)*, 2005, pp. 61–70.
9. D. Crockford, "Base32 Encoding," Online specification, 2002. [Online]. Available: https://www.crockford.com/base32.html
10. S. Josefsson and I. Liusvaara, "Edwards-Curve Digital Signature Algorithm (EdDSA)," Internet Engineering Task Force (IETF), RFC 8032, 2017.
11. National Institute of Standards and Technology, "Secure Hash Standard (SHS)," U.S. Dept. Commerce, FIPS PUB 180-4, 2015.
12. E. Barker and J. Kelsey, "Recommendation for random number generation using deterministic random bit generators," NIST Special Publication 800-90A Rev. 1, 2015.
13. R. C. Merkle, "A digital signature based on a conventional encryption function," in *Advances in Cryptology --- CRYPTO '87*, Springer, 1987, pp. 369–378.
14. V. Shoup, "Practical threshold signatures," in *Advances in Cryptology --- EUROCRYPT 2000*, Springer, 2000, pp. 322–336.
15. L. M. Kohnfelder, "Towards a practical public-key cryptosystem," Bachelor's thesis, Massachusetts Institute of Technology, Cambridge, MA, 1977.
16. B. Schneier, *Applied Cryptography: Protocols, Algorithms, and Source Code in C*, 20th Anniversary ed., John Wiley & Sons, 2015.
17. D. Boneh, B. Lynn, and H. Shacham, "Short signatures from the Weil pairing," *Journal of Cryptology*, vol. 17, no. 4, pp. 297–319, 2004.
18. M. R. Clarkson, S. Chong, and A. C. Myers, "Civitas: Toward a secure remote voting system," in *Proc. IEEE Symposium on Security and Privacy (S&P)*, 2008, pp. 354–368.
19. M. Bernhard, J. Benaloh, and J. A. Halderman, "Measuring voter verifiability in online elections," *IEEE Transactions on Information Forensics and Security*, vol. 12, no. 11, pp. 2743–2755, 2017.
20. R. Haenni, R. E. Koenig, P. Locher, and E. Dubuis, "Universal verifiability in practice: A verifier for the Swiss Post e-voting system," in *Int. Joint Conf. on Electronic Voting (E-Vote-ID)*, Springer, 2020, pp. 101–117.
21. S. Hernan, S. Lambert, T. Ostwald, and A. Shostack, *Threat Modeling: Uncover Security Flaws Using the STRIDE Approach*, Microsoft Corporation, 2006.
22. Dewan Perwakilan Mahasiswa Poltek CWE, "Undang-Undang Dasar Ikatan Keluarga Mahasiswa Politeknik Kelapa Sawit Citra Widya Edukasi (UUD IKM Poltek CWE)," Ketetapan DPM Poltek CWE No. 005/DPM-CWE/KEP/VII/2024, 2024.
