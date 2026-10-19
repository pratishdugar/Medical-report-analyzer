import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";
import { env } from "@/lib/env";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Terms of use" };

export default async function TermsPage() {
  const { t, locale } = await getI18n();
  const name = env().APP_NAME;
  if (locale === "hi") {
    return (
      <LegalLayout appName={t("app.name")} title={t("legal.termsTitle")} updated="अंतिम अद्यतन: अक्टूबर 2026">
        <h2>चिकित्सा सलाह नहीं</h2>
        <p>{name} एक व्यक्तिगत स्वास्थ्य रिकॉर्ड और जानकारी उपकरण है। यह निदान, इलाज या दवा नहीं बताता और डॉक्टर का विकल्प नहीं है। आपात स्थिति में 112 या 108 पर कॉल करें।</p>
        <h2>सटीकता</h2>
        <p>रिपोर्ट से अपने-आप निकाले गए मानों में गलती हो सकती है। मूल रिपोर्ट से मिलान करें और ज़रूरत हो तो सुधारें। सुझाव सामान्य जानकारी हैं।</p>
        <h2>आपकी ज़िम्मेदारियाँ</h2>
        <ul>
          <li>केवल अपना या उन परिवार सदस्यों का डेटा अपलोड करें जिनकी ओर से आपको अनुमति है।</li>
          <li>पासवर्ड सुरक्षित रखें और 2FA चालू करें।</li>
          <li>साझा लिंक केवल अपने डॉक्टर को दें।</li>
        </ul>
        <h2>लागू कानून</h2>
        <p>ये शर्तें भारत के कानूनों के अधीन हैं।</p>
      </LegalLayout>
    );
  }
  return (
    <LegalLayout appName={t("app.name")} title={t("legal.termsTitle")} updated="Last updated: October 2026">
      <h2>1. Not medical advice</h2>
      <p>{name} is a personal health record and information tool. It does not diagnose, treat or prescribe, and it is not a substitute for a qualified medical professional. Suggestions are general wellness information. In an emergency call 112 or 108.</p>
      <h2>2. Accuracy of extracted data</h2>
      <p>Values are extracted automatically from documents and may contain errors, especially from photos or scans. Uncertain values are highlighted; always compare with the original report and correct anything that is wrong. Reference ranges vary between labs; the range printed on your report takes precedence.</p>
      <h2>3. Your account</h2>
      <ul>
        <li>You must be 18 or older. You may add family members (including children) only if you are authorised to manage their health information.</li>
        <li>Keep your password confidential and enable two-factor authentication. You are responsible for activity under your account.</li>
        <li>Share links give read access to anyone holding the link (and PIN) until they expire or are revoked. Share them only with your doctor.</li>
      </ul>
      <h2>4. Acceptable use</h2>
      <p>Do not upload content you have no right to, attempt to access other users&apos; data, probe or disrupt the service, or use it for unlawful purposes.</p>
      <h2>5. Availability and liability</h2>
      <p>The service is provided “as is”. To the extent permitted by law we are not liable for decisions made on the basis of information shown in the app. Keep your own copies of important medical records; you can export everything at any time.</p>
      <h2>6. Governing law</h2>
      <p>These terms are governed by the laws of India.</p>
    </LegalLayout>
  );
}
