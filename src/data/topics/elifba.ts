// Elifba müfredatı — mevcut LETTERS + HAREKES verisinden inşa edilir
// Her item.speech, public/audio/<sha1>.mp3 dosyasındaki ses dosyasının
// karşılığı olan Arapça metindir (manifest.json anahtarlarıyla aynı).
//
// Görsel (label) bağlı formu (başta/ortada/sonda) gösterir,
// SES (speech) ise daima izole harf+hareke metnidir → mevcut MP3'ler çalışır.

import { LETTERS, HAREKES, readLetterWithHareke, readLetterWithMed, type ArabicLetter } from "../letters";
import type { ContentItem, ContentTopic } from "../types";

// Uzun Arapça harf isimleri (temel harfler için ses anahtarı)
const LONG_NAMES: Record<string, string> = {
  elif: "أَلِف", be: "بَاء", te: "تَاء", se: "ثَاء", cim: "جِيم", ha: "حَاء", hi: "خَاء",
  dal: "دَال", zel: "ذَال", ra: "رَاء", ze: "زَاي", sin: "سِين", sin2: "شِين",
  sad: "صَاد", dad: "ضَاد", ti: "طَاء", zi: "ظَاء", ayin: "عَيْن", gayin: "غَيْن",
  fe: "فَاء", kaf: "قَاف", kef: "كَاف", lam: "لاَم", mim: "مِيم", nun: "نُون",
  vav: "وَاو", he: "هَاء", ye: "يَاء", lamelif: "لاَم أَلِف",
};

// Sola bağlanmayan harfler — başta=izole, ortada=sonda. Bunlara ekstra kart yok.
const NO_LEFT_CONNECT = new Set(["elif", "dal", "zel", "ra", "ze", "vav"]);

function letterItem(l: ArabicLetter): ContentItem {
  return {
    id: `harf-${l.id}`,
    label: l.letter,
    subLabel: l.name,
    speech: LONG_NAMES[l.id] ?? l.letter,
    lang: "tr",
  };
}

type Shape = "initial" | "medial" | "final";
const SHAPE_LABEL: Record<Shape, string> = { initial: "başta", medial: "ortada", final: "sonda" };

// Bir harf+hareke için kartlar. Karmaşık harflerde 3'e bölünür.
function harekeCardsFor(l: ArabicLetter, harekeId: keyof typeof HAREKES, prefix: string): ContentItem[] {
  const h = HAREKES[harekeId];
  const speech = l.letter + h.mark; // izole form — mevcut MP3 ile eşleşir
  const sub = readLetterWithHareke(l, harekeId);

  // Sade harf: tek kart (başta = izole)
  if (NO_LEFT_CONNECT.has(l.id)) {
    return [{
      id: `${prefix}-${l.id}`,
      label: l.initial + h.mark,
      subLabel: sub,
      speech,
      lang: "tr",
    }];
  }

  // Karmaşık harf: 3 form (başta + ortada + sonda)
  const shapes: Shape[] = ["initial", "medial", "final"];
  return shapes.map((s) => ({
    id: `${prefix}-${l.id}-${s}`,
    label: l[s] + h.mark,
    subLabel: `${sub} (${SHAPE_LABEL[s]})`,
    speech, // hepsi aynı sese sahip — sadece görsel form değişir
    lang: "tr",
  }));
}

function harekeItems(harekeId: keyof typeof HAREKES, prefix: string): ContentItem[] {
  return LETTERS.filter((l) => l.id !== "lamelif").flatMap((l) =>
    harekeCardsFor(l, harekeId, prefix)
  );
}

// Tek-form hareke kartları: harf başına 1 kart, belirtilen şekilde (başta/ortada/sonda)
function harekeShapeItems(harekeId: keyof typeof HAREKES, shape: Shape, prefix: string): ContentItem[] {
  const h = HAREKES[harekeId];
  return LETTERS.filter((l) => l.id !== "lamelif").map((l) => {
    const speech = l.letter + h.mark;
    const sub = readLetterWithHareke(l, harekeId);
    return {
      id: `${prefix}-${shape}-${l.id}`,
      label: l[shape] + h.mark,
      subLabel: `${sub} (${SHAPE_LABEL[shape]})`,
      speech,
      lang: "tr" as const,
    };
  });
}

// Cezim/sükûn tek başına okunmaz — önüne harekeli bir harf (elif + fetha)
// koyarak iki harfli okunuş üretiriz: أَبْ = "eb", أَتْ = "et", أَدْ = "ed" ...
const FRONT_LETTERS_CEZIM = new Set(["be","te","se","cim","ha","dal","zel","ze","sin","sin2","ayin","fe","kef","lam","mim","nun","he","ye","lamelif"]);
function cezimItems(): ContentItem[] {
  const elifFetha = "ا" + HAREKES.fetha.mark; // أَ
  return LETTERS.filter((l) => l.id !== "elif" && l.id !== "lamelif").map((l) => {
    // Elif sola bağlanmaz → sonraki harf izole formda görünür
    const letterGlyph = l.isolated + HAREKES.cezim.mark;
    const vowel = FRONT_LETTERS_CEZIM.has(l.id) ? "e" : "a";
    const sub = vowel + (l.consonant || "");
    return {
      id: `cezim-${l.id}`,
      label: elifFetha + letterGlyph,
      subLabel: sub,
      speech: elifFetha + l.letter + HAREKES.cezim.mark,
      lang: "tr" as const,
    };
  });
}

function medItems(med: "elif" | "vav" | "ye"): ContentItem[] {
  const medChar = med === "elif" ? "ا" : med === "vav" ? "و" : "ي";
  const harekeMark =
    med === "vav" ? HAREKES.otre.mark : med === "ye" ? HAREKES.esre.mark : HAREKES.fetha.mark;

  return LETTERS.filter((l) => l.id !== "lamelif").flatMap((l) => {
    const sub = readLetterWithMed(l, med);
    const speech = l.letter + harekeMark + medChar;
    if (NO_LEFT_CONNECT.has(l.id)) {
      return [{
        id: `med-${med}-${l.id}`,
        label: l.initial + harekeMark + medChar,
        subLabel: sub,
        speech,
        lang: "tr" as const,
      }];
    }
    const shapes: Shape[] = ["initial", "medial", "final"];
    return shapes.map((s) => ({
      id: `med-${med}-${l.id}-${s}`,
      label: l[s] + harekeMark + medChar,
      subLabel: `${sub} (${SHAPE_LABEL[s]})`,
      speech,
      lang: "tr" as const,
    }));
  });
}

function shapeItems(shape: Shape): ContentItem[] {
  return LETTERS.filter((l) => l.id !== "lamelif").map((l) => ({
    id: `sekil-${shape}-${l.id}`,
    label: l[shape] + HAREKES.fetha.mark,
    subLabel: l.name + " (" + SHAPE_LABEL[shape] + ")",
    speech: l.letter + HAREKES.fetha.mark,
    lang: "tr" as const,
  }));
}

// ============== HARFLER ==============
export const harflerTopics: ContentTopic[] = [
  {
    id: "temel",
    parent: "harfler",
    title: "Temel Harfler",
    description: "Elif, Be, Te, Se... 29 harfi tanı",
    emoji: "📖",
    practiceMode: "visual",
    items: LETTERS.map(letterItem),
  },
];

// ============== BAĞLANTILAR ==============
export const baglantilarTopics: ContentTopic[] = [
  {
    id: "pozisyon-basta",
    parent: "baglantilar",
    title: "Başta",
    description: "Harflerin başta yazılış şekli",
    emoji: "▶️",
    practiceMode: "visual",
    items: shapeItems("initial"),
  },
  {
    id: "pozisyon-ortada",
    parent: "baglantilar",
    title: "Ortada",
    description: "Harflerin ortada yazılış şekli",
    emoji: "⏺️",
    practiceMode: "visual",
    items: shapeItems("medial"),
  },
  {
    id: "pozisyon-sonda",
    parent: "baglantilar",
    title: "Sonda",
    description: "Harflerin sonda yazılış şekli",
    emoji: "⏹️",
    practiceMode: "visual",
    items: shapeItems("final"),
  },
];

// ============== HAREKELER (Diyanet sırası: fetha → esre → ötre → cezim → tenvin → med) ==============
export const harekelerTopics: ContentTopic[] = [
  {
    id: "fetha",
    parent: "harekeler",
    title: "Fetha (üstün)",
    description: "Harf üstünde fetha — e/a sesi (başta)",
    emoji: "✨",
    practiceMode: "visual",
    items: harekeShapeItems("fetha", "initial", "fetha"),
  },
  {
    id: "esre",
    parent: "harekeler",
    title: "Esre",
    description: "Harf altında esre — i/ı sesi (ortada)",
    emoji: "💫",
    practiceMode: "visual",
    items: harekeShapeItems("esre", "medial", "esre"),
  },
  {
    id: "otre",
    parent: "harekeler",
    title: "Ötre",
    description: "Harf üstünde ötre — u/ü sesi (sonda)",
    emoji: "⭐",
    practiceMode: "visual",
    items: harekeShapeItems("otre", "final", "otre"),
  },
  {
    id: "cezim",
    parent: "harekeler",
    title: "Cezim / Sükûn",
    description: "Harfi sessiz okuma — 29 harf karışık",
    emoji: "⏸️",
    practiceMode: "visual",
    items: cezimItems(),
  },
  {
    id: "tenvin-fetha",
    parent: "harekeler",
    title: "Tenvin Üstün",
    description: "İkili fetha — en/an sesi",
    emoji: "📿",
    practiceMode: "visual",
    items: harekeItems("tenvinFetha", "tenvin-fetha"),
  },
  {
    id: "tenvin-esre",
    parent: "harekeler",
    title: "Tenvin Esre",
    description: "İkili esre — in/ın sesi",
    emoji: "🕌",
    practiceMode: "visual",
    items: harekeItems("tenvinEsre", "tenvin-esre"),
  },
  {
    id: "tenvin-otre",
    parent: "harekeler",
    title: "Tenvin Ötre",
    description: "İkili ötre — un/ün sesi",
    emoji: "☪️",
    practiceMode: "visual",
    items: harekeItems("tenvinOtre", "tenvin-otre"),
  },
  {
    id: "med-elif",
    parent: "harekeler",
    title: "Med — Elif",
    description: "Fetha + elif uzatması",
    emoji: "🌙",
    practiceMode: "visual",
    items: medItems("elif"),
  },
  {
    id: "med-vav",
    parent: "harekeler",
    title: "Med — Vav",
    description: "Ötre + vav uzatması",
    emoji: "☀️",
    practiceMode: "visual",
    items: medItems("vav"),
  },
  {
    id: "med-ye",
    parent: "harekeler",
    title: "Med — Ye",
    description: "Esre + ye uzatması",
    emoji: "⭐",
    practiceMode: "visual",
    items: medItems("ye"),
  },
];
