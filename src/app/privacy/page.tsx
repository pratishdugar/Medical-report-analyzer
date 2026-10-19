import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";
import { env } from "@/lib/env";
import { configuredProviders } from "@/lib/extraction/llm";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Privacy notice" };

export default async function PrivacyPage() {
  const { t, locale } = await getI18n();
  const e = env();
  const providers = configuredProviders();
  const ai = providers.length ? providers.map((p) => `${p.label}${p.trusted ? " (self-hosted)" : ""}`).join(", ") : locale === "hi" ? "कोई नहीं" : "none configured";
  const officer = <>{e.GRIEVANCE_OFFICER_NAME} — <a className="text-primary underline" href={`mailto:${e.GRIEVANCE_OFFICER_EMAIL}`}>{e.GRIEVANCE_OFFICER_EMAIL}</a></>;

  if (locale === "hi") {
    return (
      <LegalLayout appName={t("app.name")} title={t("legal.privacyTitle")} updated="अंतिम अद्यतन: अक्टूबर 2026 · डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 के अनुसार">
        <p>{e.APP_NAME} (“हम”) आपकी व्यक्तिगत और स्वास्थ्य जानकारी का “डेटा फ़िड्यूशियरी” है। यह सूचना बताती है कि हम कौन-सा डेटा, क्यों और कैसे प्रोसेस करते हैं और आपके क्या अधिकार हैं।</p>
        <h2>हम कौन-सा डेटा लेते हैं</h2>
        <ul>
          <li>खाता: नाम, ईमेल, पासवर्ड (केवल सुरक्षित हैश), भाषा।</li>
          <li>स्वास्थ्य डेटा जो आप अपलोड करते हैं: रिपोर्ट फ़ाइलें, निकाले गए मान, मेडिकल इतिहास, परिवार प्रोफ़ाइल (जन्म तिथि, लिंग, ABHA नंबर वैकल्पिक)।</li>
          <li>सुरक्षा डेटा: IP पता, डिवाइस/ब्राउज़र, साइन-इन और गतिविधि लॉग।</li>
        </ul>
        <h2>उद्देश्य</h2>
        <p>केवल आपको सेवा देने के लिए: रिपोर्ट सहेजना, मान निकालना, ग्राफ़/तुलना/सुझाव दिखाना, और खाते की सुरक्षा। हम आपका डेटा बेचते नहीं हैं, विज्ञापन नहीं दिखाते और प्रोफ़ाइलिंग नहीं करते।</p>
        <h2>AI सेवाएँ</h2>
        <p>केवल आपकी अलग से दी गई सहमति पर, रिपोर्ट का टेक्स्ट नाम, फ़ोन और ID हटाकर AI प्रदाता को भेजा जा सकता है। फ़ोटो/स्कैन कभी भी थर्ड-पार्टी को नहीं भेजे जाते। कॉन्फ़िगर किए गए प्रदाता: {ai}। मुफ़्त AI सेवाओं की शर्तें प्रदाता को डेटा का उपयोग अपनी सेवाएँ सुधारने के लिए करने दे सकती हैं। आप सेटिंग्स में कभी भी सहमति वापस ले सकते हैं।</p>
        <h2>सुरक्षा</h2>
        <p>एन्क्रिप्टेड कनेक्शन (HTTPS), हर खाते के लिए अलग एन्क्रिप्शन कुंजी, डेटाबेस में रो-लेवल सिक्योरिटी, टू-फ़ैक्टर ऑथेंटिकेशन और गतिविधि लॉग।</p>
        <h2>आपके अधिकार</h2>
        <ul>
          <li>पहुँच और पोर्टेबिलिटी — सेटिंग्स → “मेरा डेटा डाउनलोड करें”।</li>
          <li>सुधार — कोई भी मान या प्रोफ़ाइल कभी भी बदलें।</li>
          <li>मिटाना — सेटिंग्स → “खाता हटाएँ” (सारा डेटा और फ़ाइलें स्थायी रूप से)।</li>
          <li>सहमति वापस लेना, शिकायत निवारण, और नामांकन (मृत्यु/अक्षमता की स्थिति में आपकी ओर से अधिकार का प्रयोग करने हेतु व्यक्ति नामित करना) — शिकायत अधिकारी से संपर्क करें।</li>
          <li>संतुष्ट न होने पर आप भारतीय डेटा संरक्षण बोर्ड से संपर्क कर सकते हैं।</li>
        </ul>
        <h2>बच्चों का डेटा</h2>
        <p>खाता बनाने के लिए उम्र 18+ होनी चाहिए। बच्चों की प्रोफ़ाइल माता-पिता/अभिभावक द्वारा उनकी ओर से जोड़ी जाती है। हम बच्चों की ट्रैकिंग या लक्षित विज्ञापन नहीं करते।</p>
        <h2>डेटा कब तक रखा जाता है</h2>
        <p>जब तक आपका खाता है। खाता हटाने पर डेटा तुरंत सक्रिय सिस्टम से हट जाता है; बैकअप सीमित अवधि में अपने-आप समाप्त हो जाते हैं।</p>
        <h2>डेटा उल्लंघन</h2>
        <p>किसी व्यक्तिगत डेटा उल्लंघन की स्थिति में हम प्रभावित उपयोगकर्ताओं और डेटा संरक्षण बोर्ड को कानून के अनुसार सूचित करेंगे।</p>
        <h2>शिकायत अधिकारी</h2>
        <p>{officer}</p>
        <p className="text-sm text-muted">{t("disclaimer.short")}</p>
      </LegalLayout>
    );
  }

  return (
    <LegalLayout appName={t("app.name")} title={t("legal.privacyTitle")} updated="Last updated: October 2026 · Notice under the Digital Personal Data Protection Act, 2023">
      <p>{e.APP_NAME} (“we”) acts as the Data Fiduciary for the personal and health data you provide. This notice explains what we process, why, how it is protected and the rights you have.</p>
      <h2>1. Data we process</h2>
      <ul>
        <li><b>Account data:</b> name, email address, password (stored only as an Argon2id hash), language preference.</li>
        <li><b>Health data you choose to upload:</b> report files (PDFs/photos), values extracted from them, medical history entries, family profiles (name, date of birth, sex, height, diet, optional ABHA number).</li>
        <li><b>Security data:</b> IP address, browser/device type, sign-in sessions and an activity log you can view in Settings.</li>
      </ul>
      <h2>2. Purposes</h2>
      <p>We use this data only to provide the service you asked for — storing your reports, extracting values, showing trends, comparisons and general health suggestions — and to keep your account secure. We do not sell data, show advertising, or build marketing profiles.</p>
      <h2>3. Consent</h2>
      <p>At sign-up you give separate, specific consent to (a) the terms and this notice and (b) processing of the health information you upload. Sending redacted report text to third-party AI providers is a separate, optional consent. You can withdraw consent at any time in Settings; withdrawing consent for core processing means deleting your account.</p>
      <h2>4. AI processing and other processors</h2>
      <p>Scanned images and photos are read on our own server (OCR) and are never sent to third parties. If you enable AI-assisted extraction, report text is first stripped of names, phone numbers, emails and ID numbers and then sent to the configured provider(s): <b>{ai}</b>. Some free-tier AI services may use submitted content to improve their products under their own terms, which is why only redacted text is shared and why this is opt-in. Self-hosted models keep data on our servers. We also use a hosting provider and an email provider to operate the service.</p>
      <h2>5. Security</h2>
      <ul>
        <li>All traffic is encrypted in transit (HTTPS).</li>
        <li>Report files and sensitive text are encrypted at rest with a key derived uniquely for your account.</li>
        <li>Database row-level security ensures one account can never read another account&apos;s records.</li>
        <li>Optional two-factor authentication, session management, rate limiting and an activity log.</li>
      </ul>
      <h2>6. Retention</h2>
      <p>We keep your data while your account exists. When you delete a report, profile or your account, it is removed from our active systems immediately and from encrypted backups when they expire.</p>
      <h2>7. Your rights</h2>
      <ul>
        <li><b>Access and portability:</b> Settings → “Download my data” gives you everything as JSON, CSV and your original files.</li>
        <li><b>Correction:</b> edit any value, report detail or profile at any time.</li>
        <li><b>Erasure:</b> delete individual items or your whole account from Settings.</li>
        <li><b>Grievance redressal and nomination:</b> contact our Grievance Officer (below), including to nominate a person to exercise your rights in case of death or incapacity.</li>
        <li>If you are not satisfied with our response, you may approach the Data Protection Board of India.</li>
      </ul>
      <h2>8. Children</h2>
      <p>Account holders must be 18 or older. Profiles for children are created by a parent or lawful guardian, who consents on the child&apos;s behalf. We do not track children or show them targeted advertising.</p>
      <h2>9. Data breaches</h2>
      <p>If a personal data breach occurs we will inform affected users and the Data Protection Board of India as required by law.</p>
      <h2>10. Grievance Officer</h2>
      <p>{officer}</p>
      <p className="text-sm text-muted">{t("disclaimer.short")}</p>
    </LegalLayout>
  );
}
