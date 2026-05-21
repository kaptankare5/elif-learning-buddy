import { Link, useParams, Navigate } from "react-router-dom";
import { getSubject } from "@/data/subjects";
import { PageHeader } from "@/components/PageHeader";
import type { SubjectId } from "@/data/types";

const Subject = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const subject = getSubject(subjectId as SubjectId);
  if (!subject) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/30 to-background">
      <main className="container mx-auto max-w-2xl px-4 pb-16">
        <PageHeader title={subject.title} backTo="/" centered />

        <div className={`${subject.bgVar} mb-6 rounded-3xl p-6 text-center text-white shadow-card animate-bounce-in`}>
          <div className="text-6xl mb-2">{subject.emoji}</div>
          <h1 className="text-3xl font-extrabold text-shadow-soft">{subject.title}</h1>
          <p className="text-sm font-semibold opacity-90 mt-1">{subject.description}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {subject.topics.map((t, i) => (
            <Link
              key={t.id}
              to={`/konu/${subject.id}/${t.id}`}
              className="group flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card transition-bouncy hover:-translate-y-1 hover:shadow-elegant border-2 border-border/40 animate-bounce-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="text-4xl">{t.emoji}</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-foreground">{t.title}</h3>
                <p className="text-xs font-medium text-muted-foreground truncate">{t.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Subject;
