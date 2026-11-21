"use client";

// ============================================================
// DIALOG KELOLA & UNGGAH FOTO PASLON â€” Smart Pemira Poltek CWE
// Mode: Tambah Paslon Baru, Edit Profil & Visi Misi, serta
// Unggah Foto Peran (BLOB Turso) dengan Kompresi Canvas 3:4.
// ============================================================
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, Trash2, Upload, Loader2, Sparkles, Check, AlertCircle, RefreshCw } from "lucide-react";
import Image from "next/image";

export interface CandidateItem {
  id: string;
  category: string;
  studyProgramId?: string | null;
  studyProgramName?: string | null;
  number: number;
  presidentName: string;
  viceName?: string | null;
  secondViceName?: string | null;
  photoLeaderUrl?: string | null;
  photoViceUrl?: string | null;
  photoSecondViceUrl?: string | null;
  vision: string;
  missions: string[];
  photoAccent: string;
  isEmptyBox?: boolean;
}

export interface StudyProgramItem {
  id: string;
  name: string;
}

interface CandidateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate?: CandidateItem | null; // null = Mode Tambah Baru
  prodis: StudyProgramItem[];
  onSuccess: () => void;
}

/** Kompresi gambar sisi klien menggunakan HTML5 Canvas (3:4, maks 600x800, WebP 82%) */
async function compressImageToBlob(file: File): Promise<{ blob: Blob; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const targetWidth = 600;
        const targetHeight = 800;
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context tidak tersedia"));

        // Perhitungan object-fit cover terpusat atas
        const imgRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;
        let sWidth = img.width;
        let sHeight = img.height;
        let sx = 0;
        let sy = 0;

        if (imgRatio > targetRatio) {
          sWidth = img.height * targetRatio;
          sx = (img.width - sWidth) / 2;
        } else {
          sHeight = img.width / targetRatio;
          sy = 0; // Prioritaskan bagian atas kepala/wajah
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Gagal mengompresi gambar"));
            resolve({ blob, previewUrl: URL.createObjectURL(blob) });
          },
          "image/webp",
          0.82
        );
      };
      img.onerror = () => reject(new Error("Gagal memuat berkas gambar"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Gagal membaca berkas"));
    reader.readAsDataURL(file);
  });
}

export function CandidateFormDialog({
  open,
  onOpenChange,
  candidate,
  prodis,
  onSuccess,
}: CandidateFormDialogProps) {
  const isEdit = Boolean(candidate);
  const [activeTab, setActiveTab] = useState<"profile" | "photos">("profile");

  // Form Fields
  const [category, setCategory] = useState<string>("PRESMA");
  const [studyProgramId, setStudyProgramId] = useState<string>("TPTP");
  const [number, setNumber] = useState<number>(1);
  const [presidentName, setPresidentName] = useState<string>("");
  const [viceName, setViceName] = useState<string>("");
  const [secondViceName, setSecondViceName] = useState<string>("");
  const [vision, setVision] = useState<string>("");
  const [missionsText, setMissionsText] = useState<string>("");
  const [photoAccent, setPhotoAccent] = useState<string>("#1B7F4E");

  const [saving, setSaving] = useState(false);
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);

  // Photo states
  const [photos, setPhotos] = useState<{
    leader?: string | null;
    vice?: string | null;
    secondVice?: string | null;
  }>({});

  const [uploadingRole, setUploadingRole] = useState<string | null>(null);

  useEffect(() => {
    if (candidate) {
      setCategory(candidate.category);
      setStudyProgramId(candidate.studyProgramId || "TPTP");
      setNumber(candidate.number);
      setPresidentName(candidate.presidentName);
      setViceName(candidate.viceName || "");
      setSecondViceName(candidate.secondViceName || "");
      setVision(candidate.vision);
      setMissionsText(candidate.missions?.join("\n") || "");
      setPhotoAccent(candidate.photoAccent || "#1B7F4E");
      setActiveCandidateId(candidate.id);
      setPhotos({
        leader: candidate.photoLeaderUrl,
        vice: candidate.photoViceUrl,
        secondVice: candidate.photoSecondViceUrl,
      });
      setActiveTab("profile");
    } else {
      setCategory("PRESMA");
      setStudyProgramId("TPTP");
      setNumber(1);
      setPresidentName("");
      setViceName("");
      setSecondViceName("");
      setVision("");
      setMissionsText("");
      setPhotoAccent("#1B7F4E");
      setActiveCandidateId(null);
      setPhotos({});
      setActiveTab("profile");
    }
  }, [candidate, open]);

  // Handle Save Profile
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!presidentName.trim()) {
      toast.error("Nama calon ketua/presma wajib diisi.");
      return;
    }
    if (!vision.trim()) {
      toast.error("Visi paslon wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      const missions = missionsText
        .split("\n")
        .map((m) => m.trim())
        .filter(Boolean);

      const payload = {
        category,
        studyProgramId: category === "HIMA" ? studyProgramId : null,
        number: Number(number),
        presidentName: presidentName.trim(),
        viceName: viceName.trim() || null,
        secondViceName: category === "DPM" ? secondViceName.trim() || null : null,
        vision: vision.trim(),
        missions,
        photoAccent,
      };

      if (isEdit && activeCandidateId) {
        const res = await fetch(`/api/admin/candidates/${activeCandidateId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Gagal memperbarui kandidat");
        toast.success(data.message || "Profil paslon berhasil diperbarui.");
        onSuccess();
      } else {
        const res = await fetch("/api/admin/candidates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Gagal mendaftarkan kandidat");
        toast.success(data.message || "Paslon baru berhasil didaftarkan.");
        setActiveCandidateId(data.candidate.id);
        setActiveTab("photos"); // Langsung arahkan ke upload foto
        onSuccess();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    } finally {
      setSaving(false);
    }
  }

  // Handle Upload Photo File for a Role
  async function handlePhotoFileChange(role: "leader" | "vice" | "secondVice", file: File) {
    if (!activeCandidateId) {
      toast.error("Simpan profil paslon terlebih dahulu sebelum mengunggah foto.");
      return;
    }

    setUploadingRole(role);
    try {
      toast.loading(`Mengompresi foto ${role}...`, { id: `upload-${role}` });
      const { blob } = await compressImageToBlob(file);

      toast.loading(`Mengunggah foto ${role} ke Turso BLOB...`, { id: `upload-${role}` });
      const formData = new FormData();
      formData.append("role", role);
      formData.append("file", blob, `${role}-${Date.now()}.webp`);

      const res = await fetch(`/api/admin/candidates/${activeCandidateId}/photo`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mengunggah foto");

      setPhotos((prev) => ({ ...prev, [role]: data.photoUrl }));
      toast.success(data.message || "Foto berhasil diunggah!", { id: `upload-${role}` });
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah foto.", { id: `upload-${role}` });
    } finally {
      setUploadingRole(null);
    }
  }

  // Handle Delete Photo for a Role
  async function handleDeletePhoto(role: "leader" | "vice" | "secondVice") {
    if (!activeCandidateId) return;
    if (!confirm(`Hapus foto resmi untuk peran ini?`)) return;

    setUploadingRole(role);
    try {
      const res = await fetch(`/api/admin/candidates/${activeCandidateId}/photo?role=${role}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menghapus foto");

      setPhotos((prev) => ({ ...prev, [role]: null }));
      toast.success(`Foto ${role} berhasil dihapus.`);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus foto.");
    } finally {
      setUploadingRole(null);
    }
  }

  // Peran foto sesuai kategori
  const memberSlots: Array<{ role: "leader" | "vice" | "secondVice"; title: string; name: string }> = [
    {
      role: "leader",
      title: category === "DPM" ? "Ketua Umum" : category === "PRESMA" ? "Presma (Ketua)" : "Ketua Hima",
      name: presidentName || "(Nama Belum Diisi)",
    },
    {
      role: "vice",
      title: category === "DPM" ? "Ketua 1" : category === "PRESMA" ? "Wakil Presma" : "Wakil Ketua",
      name: viceName || "(Nama Belum Diisi)",
    },
    ...(category === "DPM"
      ? [
          {
            role: "secondVice" as const,
            title: "Ketua 2 (DPM)",
            name: secondViceName || "(Nama Belum Diisi)",
          },
        ]
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-2 border-[#141E19] bg-[#FAF8F5] p-6 shadow-[6px_6px_0px_#141E19] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <span
              className="rounded-full border border-[#141E19] px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white"
              style={{ background: photoAccent }}
            >
              {category} {category === "HIMA" ? `â€¢ ${studyProgramId}` : ""}
            </span>
            <span className="text-[11px] font-bold text-[#7A8881]">
              {isEdit ? `ID: ${candidate?.id.slice(0, 8)}â€¦` : "Paslon Baru"}
            </span>
          </div>
          <DialogTitle className="font-display text-xl font-extrabold tracking-tight text-[#141E19]">
            {isEdit ? `Kelola Paslon #${candidate?.number} â€” ${candidate?.presidentName}` : "Tambah Pasangan Calon Baru"}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#4A5851]">
            Kelola identitas, nomor urut, visi-misi, serta foto potret resmi (BLOB) untuk surat suara dan portal publik.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="mt-2 flex border-b-2 border-[#141E19]">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2 font-display text-sm font-bold transition-colors ${
              activeTab === "profile"
                ? "border-b-2 border-[#141E19] bg-[#EAE6DF] text-[#141E19]"
                : "text-[#7A8881] hover:text-[#141E19]"
            }`}
          >
            Profil & Visi Misi
          </button>
          <button
            type="button"
            onClick={() => {
              if (!activeCandidateId) {
                toast.error("Simpan profil terlebih dahulu untuk membuka menu unggah foto.");
                return;
              }
              setActiveTab("photos");
            }}
            className={`flex items-center gap-2 px-4 py-2 font-display text-sm font-bold transition-colors ${
              activeTab === "photos"
                ? "border-b-2 border-[#141E19] bg-[#EAE6DF] text-[#141E19]"
                : "text-[#7A8881] hover:text-[#141E19]"
            }`}
          >
            <Camera className="h-4 w-4" /> Foto Anggota Paslon (BLOB)
            {activeCandidateId && <span className="h-2 w-2 rounded-full bg-[#1B7F4E]" />}
          </button>
        </div>

        {/* TAB 1: PROFIL & VISI MISI */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="category" className="text-xs font-bold text-[#141E19]">Kategori Pemilihan</Label>
                <select
                  id="category"
                  value={category}
                  disabled={isEdit}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-[8px] border-2 border-[#141E19] bg-white px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0px_#141E19] focus:outline-none focus:ring-2 focus:ring-[#1B7F4E]"
                >
                  <option value="PRESMA">PRESMA & WAPRESMA (BEM)</option>
                  <option value="DPM">DEWAN PERWAKILAN MAHASISWA (DPM)</option>
                  <option value="HIMA">HIMPUNAN MAHASISWA PRODI (HIMA)</option>
                </select>
              </div>

              {category === "HIMA" && (
                <div>
                  <Label htmlFor="studyProgram" className="text-xs font-bold text-[#141E19]">Program Studi</Label>
                  <select
                    id="studyProgram"
                    value={studyProgramId}
                    disabled={isEdit}
                    onChange={(e) => setStudyProgramId(e.target.value)}
                    className="mt-1 w-full rounded-[8px] border-2 border-[#141E19] bg-white px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0px_#141E19] focus:outline-none focus:ring-2 focus:ring-[#1B7F4E]"
                  >
                    {prodis.map((p) => (
                      <option key={p.id} value={p.id}>{p.id} â€” {p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <Label htmlFor="number" className="text-xs font-bold text-[#141E19]">Nomor Urut</Label>
                <Input
                  id="number"
                  type="number"
                  min={1}
                  max={99}
                  value={number}
                  onChange={(e) => setNumber(parseInt(e.target.value) || 1)}
                  required
                  className="mt-1 border-2 border-[#141E19] bg-white shadow-[2px_2px_0px_#141E19] font-bold"
                />
              </div>

              <div>
                <Label htmlFor="accent" className="text-xs font-bold text-[#141E19]">Warna Aksen Kartu</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="accent"
                    type="color"
                    value={photoAccent}
                    onChange={(e) => setPhotoAccent(e.target.value)}
                    className="h-8 w-10 cursor-pointer rounded border-2 border-[#141E19]"
                  />
                  <span className="font-mono text-xs font-bold">{photoAccent}</span>
                </div>
              </div>
            </div>

            {/* Nama Anggota */}
            <div className="rounded-[10px] border-2 border-[#141E19] bg-[#F6F4EE] p-3 space-y-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#7A8881]">
                Nama Pasangan Calon (Sesuai KTP / KTM)
              </p>
              <div>
                <Label htmlFor="presidentName" className="text-xs font-bold text-[#141E19]">
                  {category === "DPM" ? "Nama Calon Ketua Umum DPM" : category === "PRESMA" ? "Nama Calon Presma" : "Nama Calon Ketua Hima"} *
                </Label>
                <Input
                  id="presidentName"
                  value={presidentName}
                  onChange={(e) => setPresidentName(e.target.value)}
                  placeholder="Contoh: Ahmad Rizki Pratama"
                  required
                  className="mt-1 border-2 border-[#141E19] bg-white shadow-[2px_2px_0px_#141E19] font-bold"
                />
              </div>

              <div>
                <Label htmlFor="viceName" className="text-xs font-bold text-[#141E19]">
                  {category === "DPM" ? "Nama Calon Ketua 1 DPM" : category === "PRESMA" ? "Nama Calon Wakil Presma" : "Nama Calon Wakil Ketua Hima"}
                </Label>
                <Input
                  id="viceName"
                  value={viceName}
                  onChange={(e) => setViceName(e.target.value)}
                  placeholder="Contoh: Siti Rahma Putri (Opsional jika calon tunggal)"
                  className="mt-1 border-2 border-[#141E19] bg-white shadow-[2px_2px_0px_#141E19]"
                />
              </div>

              {category === "DPM" && (
                <div>
                  <Label htmlFor="secondViceName" className="text-xs font-bold text-[#141E19]">
                    Nama Calon Ketua 2 DPM (Khusus Struktur DPM)
                  </Label>
                  <Input
                    id="secondViceName"
                    value={secondViceName}
                    onChange={(e) => setSecondViceName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="mt-1 border-2 border-[#141E19] bg-white shadow-[2px_2px_0px_#141E19]"
                  />
                </div>
              )}
            </div>

            {/* Visi & Misi */}
            <div>
              <Label htmlFor="vision" className="text-xs font-bold text-[#141E19]">Visi Paslon *</Label>
              <Textarea
                id="vision"
                rows={2}
                value={vision}
                onChange={(e) => setVision(e.target.value)}
                placeholder="Tuliskan komitmen visi strategis paslon..."
                required
                className="mt-1 border-2 border-[#141E19] bg-white shadow-[2px_2px_0px_#141E19] text-xs"
              />
            </div>

            <div>
              <Label htmlFor="missions" className="text-xs font-bold text-[#141E19]">
                Misi Paslon (Satu butir per baris)
              </Label>
              <Textarea
                id="missions"
                rows={3}
                value={missionsText}
                onChange={(e) => setMissionsText(e.target.value)}
                placeholder="1. Meningkatkan advokasi mahasiswa&#10;2. Digitalisasi transparansi anggaran IKM&#10;3. Kolaborasi lintas prodi"
                className="mt-1 border-2 border-[#141E19] bg-white shadow-[2px_2px_0px_#141E19] text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-2 border-[#141E19] shadow-[2px_2px_0px_#141E19] font-bold text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="border-2 border-[#141E19] bg-[#1B7F4E] hover:bg-[#14653D] text-white shadow-[2px_2px_0px_#141E19] font-bold text-xs"
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {isEdit ? "Simpan Perubahan Profil" : "Daftarkan Paslon & Lanjut Foto"}
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: UNGGAH FOTO BERBASIS BLOB */}
        {activeTab === "photos" && (
          <div className="mt-4 space-y-4">
            <div className="rounded-[8px] border border-[#141E19]/20 bg-[#E8EEF9] p-3 text-xs text-[#2B50AA] flex items-start gap-2">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Penyimpanan Foto Dinamis (BLOB Storage):</p>
                <p className="text-[11px] leading-relaxed text-[#141E19]/80">
                  Foto otomatis dipotong & dikompresi ke rasio 3:4 format WebP (~50 KB) sebelum diunggah ke Turso.
                  Foto akan langsung tampil di bilik suara pemilih, kiosk, dan portal publik.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {memberSlots.map((slot) => {
                const currentPhoto = photos[slot.role];
                const isUploading = uploadingRole === slot.role;

                return (
                  <PhotoUploadCard
                    key={slot.role}
                    title={slot.title}
                    name={slot.name}
                    role={slot.role}
                    photoUrl={currentPhoto}
                    accent={photoAccent}
                    isUploading={isUploading}
                    onFileSelected={(file) => handlePhotoFileChange(slot.role, file)}
                    onDelete={() => handleDeletePhoto(slot.role)}
                  />
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-3 border-t-2 border-[#141E19]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("profile")}
                className="border-2 border-[#141E19] shadow-[2px_2px_0px_#141E19] font-bold text-xs"
              >
                â† Kembali ke Profil
              </Button>
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="border-2 border-[#141E19] bg-[#141E19] text-white hover:bg-[#28362E] shadow-[2px_2px_0px_#141E19] font-bold text-xs"
              >
                Selesai
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Kartu Upload Foto per Anggota Paslon dengan Live Canvas Preview */
function PhotoUploadCard({
  title,
  name,
  role,
  photoUrl,
  accent,
  isUploading,
  onFileSelected,
  onDelete,
}: {
  title: string;
  name: string;
  role: "leader" | "vice" | "secondVice";
  photoUrl?: string | null;
  accent: string;
  isUploading: boolean;
  onFileSelected: (file: File) => void;
  onDelete: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase() || "KP";

  return (
    <div className="flex flex-col gap-2 rounded-[10px] border-2 border-[#141E19] bg-white p-3 shadow-[3px_3px_0px_#141E19]">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-[#EAE6DF] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#141E19]">
          {title}
        </span>
        {photoUrl ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#1B7F4E]">
            <Check className="h-3 w-3" /> Ada Foto
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-bold text-[#7A8881]">
            <AlertCircle className="h-3 w-3" /> Avatar
          </span>
        )}
      </div>

      <p className="truncate text-xs font-bold text-[#141E19]" title={name}>
        {name}
      </p>

      {/* Frame Foto 3:4 */}
      <div
        className="relative mx-auto w-full max-w-[160px] overflow-hidden rounded-[8px] border-2 border-[#141E19] shadow-[2px_2px_0px_#141E19]"
        style={{ aspectRatio: "3 / 4", background: accent }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`Foto ${name}`}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-2xl font-extrabold text-white">
            {initials}
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-xs">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="mt-1 text-[10px] font-bold">Mengunggahâ€¦</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-1 flex gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onFileSelected(file);
              e.target.value = ""; // Reset agar file yang sama bisa dipilih ulang jika perlu
            }
          }}
        />

        <Button
          type="button"
          size="sm"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 border border-[#141E19] bg-[#F6F4EE] hover:bg-[#EAE6DF] text-[#141E19] font-bold text-[11px] shadow-[1px_1px_0px_#141E19] h-8"
        >
          <Upload className="mr-1 h-3 w-3" />
          {photoUrl ? "Ganti Foto" : "Unggah Foto"}
        </Button>

        {photoUrl && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isUploading}
            onClick={onDelete}
            title="Hapus foto resmi ini"
            className="border border-[#D95338] text-[#D95338] hover:bg-[#FCECE8] shadow-[1px_1px_0px_#D95338] h-8 px-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
