import type { ContentItem, ContentTopic, Subject, SubjectId } from "./types";
import {
  harflerTopics,
  baglantilarTopics,
  harekelerTopics,
} from "./topics/elifba";

export const SUBJECTS: Subject[] = [
  {
    id: "harfler",
    title: "Harfler",
    emoji: "📖",
    description: "29 Arapça harfi tanı",
    bgVar: "bg-[image:var(--bg-turkce)]",
    topics: harflerTopics,
  },
  {
    id: "baglantilar",
    title: "Bağlantılar",
    emoji: "🔗",
    description: "Başta, ortada, sonda",
    bgVar: "bg-[image:var(--bg-ingilizce)]",
    topics: baglantilarTopics,
  },
  {
    id: "harekeler",
    title: "Harekeler",
    emoji: "✨",
    description: "Fetha, esre, ötre, cezim, tenvin, med",
    bgVar: "bg-[image:var(--bg-matematik)]",
    topics: harekelerTopics,
  },
];

export function getSubject(id: SubjectId): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}

export function getTopic(subjectId: SubjectId, topicId: string): ContentTopic | undefined {
  return getSubject(subjectId)?.topics.find((t) => t.id === topicId);
}

export function flattenItems(): ContentItem[] {
  return SUBJECTS.flatMap((s) => s.topics.flatMap((t) => t.items));
}

export function findItem(id: string): ContentItem | undefined {
  return flattenItems().find((it) => it.id === id);
}
