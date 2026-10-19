import type { Metadata } from "next";
import { UploadForm } from "@/components/upload-form";
import { Card, PageHeader } from "@/components/ui";
import { getActiveProfile, requireUser } from "@/lib/dal";
import { env } from "@/lib/env";
import { configuredProviders } from "@/lib/extraction/llm";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Upload" };

export default async function UploadPage() {
  const { user } = await requireUser();
  const [{ t }, { active, all }] = await Promise.all([getI18n(), getActiveProfile(user.id)]);
  const providers = configuredProviders();
  const aiOn = providers.some((p) => p.trusted) || (user.aiConsent && providers.length > 0);
  return (
    <>
      <PageHeader title={t("upload.title")} subtitle={t("upload.subtitle", { max: env().MAX_UPLOAD_MB })} />
      <Card className="max-w-2xl">
        <UploadForm profiles={all.map((p) => ({ id: p.id, name: p.name }))} activeId={active.id} maxMb={env().MAX_UPLOAD_MB} aiOn={aiOn} />
      </Card>
    </>
  );
}
