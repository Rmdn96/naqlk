import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { getBrandName, getLocaleAlternates } from "@/config/brand";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { cn } from "@/utils/cn";

type PrivacyPageProps = {
  params: Promise<{ locale: AppLocale }>;
};

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });

  return {
    alternates: getLocaleAlternates(locale, "/privacy"),
    description: t("metaDescription"),
    openGraph: {
      description: t("metaDescription"),
      locale: locale === "ar" ? "ar_SA" : "en_SA",
      siteName: getBrandName(locale),
      title: t("metaTitle"),
      type: "website",
      url: `/${locale}/privacy`,
    },
    title: t("metaTitle"),
    twitter: {
      card: "summary",
      description: t("metaDescription"),
      title: t("metaTitle"),
    },
  };
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Privacy");
  const Arrow = locale === "ar" ? ArrowLeft : ArrowRight;
  const sections = [
    [t("collectionTitle"), t("collectionBody")],
    [t("purposeTitle"), t("purposeBody")],
    [t("storageTitle"), t("storageBody")],
    [t("choiceTitle"), t("choiceBody")],
    [t("advertisingTitle"), t("advertisingBody")],
  ];

  return (
    <main className="container py-14 sm:py-20" id="main-content">
      <article className="mx-auto max-w-3xl">
        <span className="grid size-14 place-items-center rounded-lg bg-secondary text-primary">
          <LockKeyhole aria-hidden="true" className="size-6" />
        </span>
        <h1 className="mt-6 text-balance text-3xl font-black sm:text-5xl">{t("title")}</h1>
        <p className="mt-3 text-sm font-bold text-primary">{t("updated")}</p>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">{t("intro")}</p>
        <div className="mt-10 divide-y divide-border border-y border-border">
          {sections.map(([title, body]) => (
            <section className="py-7" key={title}>
              <h2 className="text-xl font-black">{title}</h2>
              <p className="mt-3 leading-8 text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
        <Link className={cn(buttonVariants({ variant: "outline" }), "mt-9")} href="/request">
          {t("back")}
          <Arrow aria-hidden="true" className="size-4" />
        </Link>
      </article>
    </main>
  );
}
