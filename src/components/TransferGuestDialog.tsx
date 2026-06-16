import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { migrateGuestDataToAccount } from "@/lib/localProgress";
import { hydrateSrsFromCloud, hasGuestData } from "@/data/srs";
import { getCachedProfile } from "@/lib/analytics";
import { toast } from "sonner";

const ASKED_FLAG = (uid: string) => `miniakil:transfer-asked:${uid}`;

export const TRANSFER_PROMPT_EVENT = "miniakil:prompt-transfer";

export function TransferGuestDialog() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onPrompt = () => {
      if (!session) return;
      const uid = session.user.id;
      try { if (localStorage.getItem(ASKED_FLAG(uid)) === "1") return; } catch { /* */ }
      if (!hasGuestData()) return;
      setOpen(true);
    };
    window.addEventListener(TRANSFER_PROMPT_EVENT, onPrompt);
    return () => window.removeEventListener(TRANSFER_PROMPT_EVENT, onPrompt);
  }, [session]);

  const markAsked = () => {
    if (!session) return;
    try { localStorage.setItem(ASKED_FLAG(session.user.id), "1"); } catch { /* */ }
  };

  const doTransfer = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const uid = session.user.id;
      const r = await migrateGuestDataToAccount(uid, { force: true });
      await hydrateSrsFromCloud(uid);
      markAsked();
      if (r.errors === 0 && r.migrated > 0) toast.success(`✅ ${r.inserted} yeni, ${r.updated} güncellendi`);
      else if (r.migrated === 0) toast.info("Aktarılacak misafir verisi bulunamadı.");
      else toast.error(`Aktarıldı: ${r.migrated} • Hata: ${r.errors}`);
      setOpen(false);
    } finally { setBusy(false); }
  };

  return (
    <>
      <AlertDialog open={open && !confirmDecline} onOpenChange={(v) => { if (!v) setConfirmDecline(true); else setOpen(v); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>📲 Cihazdaki ilerlemeni hesabına ekleyelim mi?</AlertDialogTitle>
            <AlertDialogDescription>
              Misafirken oynadığın oyunlardan kazandığın seviye ve rozetler bu hesaba eklenebilir.
              Mevcut hesabındaki ilerleme silinmez — en yüksek değer korunur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} onClick={(e) => { e.preventDefault(); setConfirmDecline(true); }}>
              Hayır
            </AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void doTransfer(); }}>
              {busy ? "Aktarılıyor…" : "✅ Evet, aktar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* İkinci onay: yanlışlıkla "Hayır" tıklamayı engelle */}
      <AlertDialog open={confirmDecline} onOpenChange={setConfirmDecline}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emin misin?</AlertDialogTitle>
            <AlertDialogDescription>
              Aktarmazsan cihazdaki misafir ilerlemesi bu hesaba eklenmez ve bu hesap için
              bir daha sorulmaz. Daha sonra Ayarlar'dan da aktarabilirsin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => { e.preventDefault(); setConfirmDecline(false); }}>
              ← Vazgeç, geri dön
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-muted text-foreground hover:bg-muted/80"
              onClick={(e) => { e.preventDefault(); markAsked(); setConfirmDecline(false); setOpen(false); }}
            >
              Aktarma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
