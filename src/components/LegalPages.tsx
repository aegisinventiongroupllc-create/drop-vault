import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";
import LanguageToggle from "@/components/LanguageToggle";
import { TermsOfService, PrivacyPolicy } from "@/components/LegalFooter";

type Page = "tos" | "privacy";

const LegalPages = ({ initialPage = "tos", onBack }: { initialPage?: Page; onBack: () => void }) => {
  const [page, setPage] = useState<Page>(initialPage);
  const { t } = useI18n();

  return (
    <div className="min-h-screen pb-20">
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground tracking-wider font-display flex-1">{t.legal}</h1>
        <LanguageToggle />
      </div>

      <div className="flex gap-2 px-4 mb-4">
        {(["tos", "privacy"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest transition-all ${
              page === p ? "bg-primary text-primary-foreground neon-glow-sm" : "bg-secondary text-muted-foreground"
            }`}
          >
            {p === "tos" ? t.terms : t.privacy}
          </button>
        ))}
      </div>

      <div className="px-4">
        <div className="bg-card border border-border rounded-xl p-5 text-xs text-muted-foreground space-y-4 leading-relaxed">
          {page === "tos" ? <TermsOfService /> : <PrivacyPolicy />}
        </div>
      </div>
    </div>
  );
};

export default LegalPages;
