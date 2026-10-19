import type { Metadata } from "next";
import { deleteProfileAction, switchProfileAction } from "@/actions/profile";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { ProfileForm } from "@/components/profile-form";
import { Alert, Badge, Button, Card, CardTitle, PageHeader } from "@/components/ui";
import { getActiveProfile, requireUser } from "@/lib/dal";
import { getI18n } from "@/lib/i18n/server";
import { ageOn } from "@/lib/medical/normalize";

export const metadata: Metadata = { title: "Family" };

export default async function FamilyPage({ searchParams }: PageProps<"/family">) {
  const sp = await searchParams;
  const { user } = await requireUser();
  const [{ t, locale }, { active, all }] = await Promise.all([getI18n(), getActiveProfile(user.id)]);
  const toForm = (p: (typeof all)[number]) => ({
    id: p.id,
    name: p.name,
    relation: p.relation,
    dateOfBirth: p.dateOfBirth,
    sex: p.sex,
    bloodGroup: p.bloodGroup,
    heightCm: p.heightCm,
    diet: p.diet,
    hasAbha: !!p.abhaEnc,
  });

  if (sp.first === "1") {
    const primary = all.find((p) => p.isPrimary) ?? all[0];
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={t("family.firstTitle")} subtitle={t("family.firstBody")} />
        <Card><ProfileForm profile={toForm(primary)} first submitLabel={t("common.continue")} /></Card>
      </div>
    );
  }

  return (
    <>
      <PageHeader title={t("family.title")} subtitle={t("family.subtitle")} />
      {sp.error === "last" && <Alert tone="warn" className="mb-4">{t("family.cannotDeleteLast")}</Alert>}
      <div className="grid gap-4 lg:grid-cols-2">
        {all.map((p) => {
          const age = ageOn(p.dateOfBirth);
          return (
            <Card key={p.id} className={p.id === active.id ? "border-primary" : undefined}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{p.name}</p>
                  <p className="text-sm text-muted">
                    {[t(`family.relations.${p.relation}`), age !== null ? `${age} ${locale === "hi" ? "वर्ष" : "yrs"}` : null, p.sex ? t(`family.sexes.${p.sex}`) : null, p.bloodGroup].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {p.isPrimary && <Badge tone="primary">{t("family.primary")}</Badge>}
                  {p.id === active.id ? (
                    <Badge tone="ok">{t("family.viewing")}</Badge>
                  ) : (
                    <form action={switchProfileAction}>
                      <input type="hidden" name="profileId" value={p.id} />
                      <input type="hidden" name="back" value="/dashboard" />
                      <Button variant="secondary" className="min-h-0 px-3 py-1.5">{t("family.switch")}</Button>
                    </form>
                  )}
                </div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-primary">{t("family.edit")}</summary>
                <div className="mt-3"><ProfileForm profile={toForm(p)} /></div>
                {all.length > 1 && (
                  <form action={deleteProfileAction} className="mt-4 border-t border-border pt-4">
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmSubmit variant="ghost" className="text-bad" message={t("family.deleteConfirm")}>{t("common.delete")}</ConfirmSubmit>
                  </form>
                )}
              </details>
            </Card>
          );
        })}
      </div>
      <Card className="mt-6">
        <CardTitle>{t("family.add")}</CardTitle>
        <ProfileForm submitLabel={t("common.add")} />
      </Card>
    </>
  );
}
