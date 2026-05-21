// Arapça harf verisi - Diyanet Elifba sırasına göre 29 harf
export interface ArabicLetter {
  id: string;
  letter: string;
  name: string;            // Türkçe okunuşu (kart başlığı): elif, be, te, se...
  consonant: string;       // Sessiz harf sesi (tecvid): "", b, t, s, c, h, h, d...
  isolated: string;
  initial: string;
  medial: string;
  final: string;
}

// name = harfin Türkçe ismi (elif, be, te...)
// consonant = harfin saf sessiz sesi; harekelerle birleşince doğru ses üretmek için
// Örn: nun + fetha = "ne" (nunun değil)
export const LETTERS: ArabicLetter[] = [
  { id: "elif", letter: "ا", name: "elif", consonant: "",  isolated: "ا", initial: "ا", medial: "ـا", final: "ـا" },
  { id: "be",   letter: "ب", name: "be",   consonant: "b", isolated: "ب", initial: "بـ", medial: "ـبـ", final: "ـب" },
  { id: "te",   letter: "ت", name: "te",   consonant: "t", isolated: "ت", initial: "تـ", medial: "ـتـ", final: "ـت" },
  { id: "se",   letter: "ث", name: "se",   consonant: "s", isolated: "ث", initial: "ثـ", medial: "ـثـ", final: "ـث" },
  { id: "cim",  letter: "ج", name: "cim",  consonant: "c", isolated: "ج", initial: "جـ", medial: "ـجـ", final: "ـج" },
  { id: "ha",   letter: "ح", name: "ha",   consonant: "h", isolated: "ح", initial: "حـ", medial: "ـحـ", final: "ـح" },
  { id: "hi",   letter: "خ", name: "hı",   consonant: "h", isolated: "خ", initial: "خـ", medial: "ـخـ", final: "ـخ" },
  { id: "dal",  letter: "د", name: "dal",  consonant: "d", isolated: "د", initial: "د",  medial: "ـد", final: "ـد" },
  { id: "zel",  letter: "ذ", name: "zel",  consonant: "z", isolated: "ذ", initial: "ذ",  medial: "ـذ", final: "ـذ" },
  { id: "ra",   letter: "ر", name: "ra",   consonant: "r", isolated: "ر", initial: "ر",  medial: "ـر", final: "ـر" },
  { id: "ze",   letter: "ز", name: "ze",   consonant: "z", isolated: "ز", initial: "ز",  medial: "ـز", final: "ـز" },
  { id: "sin",  letter: "س", name: "sin",  consonant: "s", isolated: "س", initial: "سـ", medial: "ـسـ", final: "ـس" },
  { id: "sin2", letter: "ش", name: "şın",  consonant: "ş", isolated: "ش", initial: "شـ", medial: "ـشـ", final: "ـش" },
  { id: "sad",  letter: "ص", name: "sad",  consonant: "s", isolated: "ص", initial: "صـ", medial: "ـصـ", final: "ـص" },
  { id: "dad",  letter: "ض", name: "dad",  consonant: "d", isolated: "ض", initial: "ضـ", medial: "ـضـ", final: "ـض" },
  { id: "ti",   letter: "ط", name: "tı",   consonant: "t", isolated: "ط", initial: "طـ", medial: "ـطـ", final: "ـط" },
  { id: "zi",   letter: "ظ", name: "zı",   consonant: "z", isolated: "ظ", initial: "ظـ", medial: "ـظـ", final: "ـظ" },
  { id: "ayin", letter: "ع", name: "ayın", consonant: "a", isolated: "ع", initial: "عـ", medial: "ـعـ", final: "ـع" },
  { id: "gayin",letter: "غ", name: "ğayın",consonant: "ğ", isolated: "غ", initial: "غـ", medial: "ـغـ", final: "ـغ" },
  { id: "fe",   letter: "ف", name: "fe",   consonant: "f", isolated: "ف", initial: "فـ", medial: "ـفـ", final: "ـف" },
  { id: "kaf",  letter: "ق", name: "kaf",  consonant: "k", isolated: "ق", initial: "قـ", medial: "ـقـ", final: "ـق" },
  { id: "kef",  letter: "ك", name: "kef",  consonant: "k", isolated: "ك", initial: "كـ", medial: "ـكـ", final: "ـك" },
  { id: "lam",  letter: "ل", name: "lam",  consonant: "l", isolated: "ل", initial: "لـ", medial: "ـلـ", final: "ـل" },
  { id: "mim",  letter: "م", name: "mim",  consonant: "m", isolated: "م", initial: "مـ", medial: "ـمـ", final: "ـم" },
  { id: "nun",  letter: "ن", name: "nun",  consonant: "n", isolated: "ن", initial: "نـ", medial: "ـنـ", final: "ـن" },
  { id: "vav",  letter: "و", name: "vav",  consonant: "v", isolated: "و", initial: "و",  medial: "ـو", final: "ـو" },
  { id: "he",   letter: "ه", name: "he",   consonant: "h", isolated: "ه", initial: "هـ", medial: "ـهـ", final: "ـه" },
  { id: "ye",   letter: "ي", name: "ye",   consonant: "y", isolated: "ي", initial: "يـ", medial: "ـيـ", final: "ـي" },
  { id: "lamelif",letter:"لا",name: "lamelif",consonant: "l", isolated: "لا", initial: "لا", medial: "ـلا", final: "ـلا" },
];

export interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: "green" | "blue" | "yellow" | "orange" | "pink" | "purple";
}

export const TOPICS: Topic[] = [
  { id: "temel", title: "Temel Harfler", description: "Elif, Be, Te, Se, Cim... temel harf tanıma", icon: "📖", color: "green" },
  { id: "pozisyon", title: "Başta - Ortada - Sonda", description: "Harflerin bağlantı şekillerini öğren", icon: "🔗", color: "blue" },
  { id: "hareke-temel", title: "Fetha, Esre, Ötre", description: "Temel harekeleri öğren", icon: "✨", color: "yellow" },
  { id: "medler", title: "Medler", description: "Elif medi, Vav medi, Ye medi", icon: "📏", color: "purple" },
  { id: "tenvinler", title: "Tenvinler", description: "Tenvin üstün, esre ve ötre", icon: "🔔", color: "orange" },
  { id: "cezim", title: "Cezim / Sükûn", description: "Harfi sessiz okuma", icon: "⏸️", color: "pink" },
];

export interface Game {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: "green" | "blue" | "yellow" | "orange" | "pink" | "purple";
}

export const GAMES: Game[] = [
  { id: "memory", title: "Hafıza Kartları", description: "Eşleşen harfleri bul", icon: "🃏", color: "green" },
  { id: "candy", title: "Harf Patlatma", description: "3 aynı harfi yan yana getir", icon: "🍬", color: "yellow" },
  { id: "race", title: "Bilgi Yarışı", description: "Zamana karşı yarış", icon: "🏎️", color: "blue" },
  { id: "balloon", title: "Harf Balonları", description: "Doğru balonu patlatarak puan kazan", icon: "🎈", color: "pink" },
  { id: "treasure", title: "Hazine Sandığı", description: "Harfi doğru hareke sandığına yerleştir", icon: "📦", color: "orange" },
];

// Hareke (diacritic) verileri
export interface Hareke {
  id: string;
  mark: string;          // Unicode harekeleri
  name: string;          // Görsel/metin etiketi
  vowel: string;         // sesli harf (e, i, u, en, in, un, "")
  doubleVowel?: boolean; // med için
}

export const HAREKES = {
  fetha:       { id: "fetha",       mark: "\u064E", name: "fetha",       vowel: "e" },
  esre:        { id: "esre",        mark: "\u0650", name: "esre",        vowel: "i" },
  otre:        { id: "otre",        mark: "\u064F", name: "ötre",        vowel: "u" },
  cezim:       { id: "cezim",       mark: "\u0652", name: "cezim",       vowel: "" },
  tenvinFetha: { id: "tenvinFetha", mark: "\u064B", name: "tenvin üstün", vowel: "en" },
  tenvinEsre:  { id: "tenvinEsre",  mark: "\u064D", name: "tenvin esre",  vowel: "in" },
  tenvinOtre:  { id: "tenvinOtre",  mark: "\u064C", name: "tenvin ötre",  vowel: "un" },
} as const;

// Türkçe okunuş üretici: harf + hareke = "ne", "ni", "nü" gibi
// İnce/kalın ünlü uyumu: ince ünlü çıkaran harfler için e/i/ü, kalınlar için a/ı/u
const FRONT_LETTERS = new Set(["be","te","se","cim","ha","dal","zel","ze","sin","sin2","ayin","fe","kef","lam","mim","nun","he","ye","lamelif"]);

function vowelFor(letterId: string, vowel: string): string {
  if (!vowel) return "";
  const front = FRONT_LETTERS.has(letterId);
  // map: e/i/u (ince) <-> a/ı/u (kalın); en/in/un <-> en/ın/un
  switch (vowel) {
    case "e":  return front ? "e"  : "a";
    case "i":  return front ? "i"  : "ı";
    case "u":  return front ? "ü"  : "u";
    case "en": return front ? "en" : "an";
    case "in": return front ? "in" : "ın";
    case "un": return front ? "ün" : "un";
    default:   return vowel;
  }
}

// Harf + hareke için Türkçe okunuş ("ne", "bi", "tu", "sen" vs.)
export function readLetterWithHareke(letter: ArabicLetter, harekeId: keyof typeof HAREKES | null): string {
  if (!harekeId) return letter.name; // sade harf adı
  const h = HAREKES[harekeId];
  const v = vowelFor(letter.id, h.vowel);
  if (h.id === "cezim") return letter.consonant || letter.name;
  // tenvinler: be + tenvinFetha = "ben"
  return (letter.consonant || "") + v;
}

// Med okunuşu: be + elif medi = "bââ"
export function readLetterWithMed(letter: ArabicLetter, med: "elif" | "vav" | "ye"): string {
  const base = readLetterWithHareke(letter, med === "vav" ? "otre" : med === "ye" ? "esre" : "fetha");
  return base + base.slice(-1); // basit uzatma
}

// Topic renk -> tailwind class haritası
export const colorClasses: Record<Topic["color"], { bg: string; text: string; ring: string }> = {
  green:  { bg: "bg-topic-green",  text: "text-topic-green",  ring: "ring-topic-green" },
  blue:   { bg: "bg-topic-blue",   text: "text-topic-blue",   ring: "ring-topic-blue" },
  yellow: { bg: "bg-topic-yellow", text: "text-topic-yellow", ring: "ring-topic-yellow" },
  orange: { bg: "bg-topic-orange", text: "text-topic-orange", ring: "ring-topic-orange" },
  pink:   { bg: "bg-topic-pink",   text: "text-topic-pink",   ring: "ring-topic-pink" },
  purple: { bg: "bg-topic-purple", text: "text-topic-purple", ring: "ring-topic-purple" },
};

// Sesli okuma — eski API uyumluluğu (tarayıcı TTS yedek)
export function speak(text: string, lang = "tr-TR") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
}
