import type { L } from "./biomarkers";

/*
 * General lifestyle guidance shown next to out-of-range results. Written for
 * an Indian audience (common foods, vegetarian diets, monsoon diseases).
 * Deliberately non-prescriptive: no drug names or doses, always pointing to
 * a qualified doctor for diagnosis and treatment.
 */

export type Advice = { title: L; tips: L[]; action: L };

const doctorSoon: L = {
  en: "Discuss this result with your doctor.",
  hi: "इस रिपोर्ट के बारे में अपने डॉक्टर से बात करें।",
};
const doctorUrgent: L = {
  en: "This value is in a range that needs prompt medical attention. Contact your doctor today. In an emergency call 112 or 108.",
  hi: "यह मान तुरंत चिकित्सा ध्यान वाली सीमा में है। आज ही डॉक्टर से संपर्क करें। आपात स्थिति में 112 या 108 पर कॉल करें।",
};

export const URGENT_ACTION = doctorUrgent;

const sugarTips: L[] = [
  { en: "Swap white rice and maida for millets (jowar, bajra, ragi), brown rice or whole-wheat atta.", hi: "सफ़ेद चावल और मैदा की जगह बाजरा, ज्वार, रागी, ब्राउन राइस या गेहूँ का आटा लें।" },
  { en: "Fill half the plate with vegetables/salad and add protein (dal, chana, paneer, curd, eggs, fish).", hi: "आधी थाली सब्ज़ी/सलाद से भरें और प्रोटीन (दाल, चना, पनीर, दही, अंडा, मछली) जोड़ें।" },
  { en: "Cut down on sweets, sugary chai, cold drinks and packaged fruit juices.", hi: "मिठाई, ज़्यादा चीनी वाली चाय, कोल्ड ड्रिंक और पैकेट जूस कम करें।" },
  { en: "Walk briskly for at least 30 minutes a day; a 10–15 minute walk after meals helps.", hi: "रोज़ कम से कम 30 मिनट तेज़ चलें; खाने के बाद 10–15 मिनट टहलना मदद करता है।" },
];

const cholesterolTips: L[] = [
  { en: "Limit deep-fried snacks (samosa, pakora, namkeen) and avoid vanaspati/dalda (trans fats).", hi: "तले हुए नाश्ते (समोसा, पकौड़ा, नमकीन) कम करें और वनस्पति/डालडा से बचें।" },
  { en: "Use oils like mustard, groundnut or rice-bran in moderation; limit ghee and butter.", hi: "सरसों, मूँगफली या राइस-ब्रान तेल सीमित मात्रा में इस्तेमाल करें; घी-मक्खन कम करें।" },
  { en: "Add soluble fibre: oats, dalia, rajma, chana, flaxseed (alsi), fruits and nuts.", hi: "घुलनशील फ़ाइबर लें: ओट्स, दलिया, राजमा, चना, अलसी, फल और मेवे।" },
  { en: "Exercise 150 minutes a week and stop smoking/tobacco.", hi: "हफ़्ते में 150 मिनट व्यायाम करें और धूम्रपान/तंबाकू छोड़ें।" },
];

const ironTips: L[] = [
  { en: "Eat iron-rich foods: green leafy vegetables (palak, methi, bathua), rajma, chana, sprouts, ragi, dates; eggs/meat if you eat them.", hi: "आयरन वाले भोजन लें: हरी पत्तेदार सब्ज़ियाँ (पालक, मेथी, बथुआ), राजमा, चना, अंकुरित अनाज, रागी, खजूर; अंडा/मांस यदि खाते हैं।" },
  { en: "Have vitamin C with meals (amla, lemon, guava, oranges) to absorb iron better.", hi: "आयरन अच्छे से सोखने के लिए खाने के साथ विटामिन C लें (आँवला, नींबू, अमरूद, संतरा)।" },
  { en: "Avoid tea/coffee within an hour of meals — they reduce iron absorption.", hi: "खाने के एक घंटे के अंदर चाय/कॉफ़ी न लें — ये आयरन सोखना कम करते हैं।" },
  { en: "Your doctor may look for the cause (diet, blood loss, worms, B12/folate) before starting iron tablets.", hi: "आयरन की गोली शुरू करने से पहले डॉक्टर कारण (आहार, खून की कमी, पेट के कीड़े, B12/फ़ोलेट) देख सकते हैं।" },
];

const kidneyTips: L[] = [
  { en: "Avoid painkillers like NSAIDs without medical advice and don't self-medicate.", hi: "बिना डॉक्टर की सलाह के दर्द निवारक (NSAIDs) न लें और खुद दवा न लें।" },
  { en: "Keep blood pressure and sugar under control; drink adequate water unless told otherwise.", hi: "BP और शुगर नियंत्रण में रखें; जब तक मना न किया जाए, पर्याप्त पानी पिएँ।" },
  { en: "Reduce added salt, pickles (achar), papad and processed foods.", hi: "ऊपर से नमक, अचार, पापड़ और प्रोसेस्ड फ़ूड कम करें।" },
];

const liverTips: L[] = [
  { en: "Avoid alcohol completely until reviewed by a doctor.", hi: "डॉक्टर से सलाह तक शराब बिल्कुल न लें।" },
  { en: "Fatty liver is very common: reduce sugar, refined carbs and fried food, and aim for gradual weight loss.", hi: "फ़ैटी लिवर बहुत आम है: चीनी, मैदा और तला खाना कम करें, धीरे-धीरे वज़न घटाएँ।" },
  { en: "Ask your doctor whether hepatitis B/C tests or an ultrasound are needed.", hi: "डॉक्टर से पूछें कि क्या हेपेटाइटिस B/C जाँच या अल्ट्रासाउंड ज़रूरी है।" },
];

const bpTips: L[] = [
  { en: "Cut down salt: limit pickles, papad, namkeen, chutney powders and restaurant food.", hi: "नमक कम करें: अचार, पापड़, नमकीन, चटनी पाउडर और बाहर का खाना सीमित करें।" },
  { en: "Eat more fruits, vegetables, dals and low-fat dairy; walk or exercise daily.", hi: "फल, सब्ज़ियाँ, दालें और कम वसा वाला दूध लें; रोज़ टहलें या व्यायाम करें।" },
  { en: "Limit alcohol, stop tobacco, sleep 7–8 hours and manage stress (yoga, pranayama).", hi: "शराब सीमित करें, तंबाकू छोड़ें, 7–8 घंटे सोएँ और तनाव कम करें (योग, प्राणायाम)।" },
  { en: "Measure BP at home after 5 minutes of rest, seated, arm at heart level, and keep a log.", hi: "घर पर 5 मिनट आराम के बाद बैठकर, बाँह दिल की ऊँचाई पर रखकर BP नापें और रिकॉर्ड रखें।" },
];

export const ADVICE: Record<string, { high?: Advice; low?: Advice; abnormal?: Advice }> = {
  GLU_F: {
    high: { title: { en: "Fasting sugar is above normal", hi: "फ़ास्टिंग शुगर सामान्य से अधिक है" }, tips: sugarTips, action: { en: "Ask your doctor about an HbA1c test to confirm, and repeat as advised.", hi: "पुष्टि के लिए डॉक्टर से HbA1c जाँच के बारे में पूछें और सलाह अनुसार दोबारा कराएँ।" } },
    low: { title: { en: "Fasting sugar is low", hi: "फ़ास्टिंग शुगर कम है" }, tips: [{ en: "If you feel shaky, sweaty or confused, take 15 g of fast sugar (glucose, juice) and recheck.", hi: "काँपना, पसीना या घबराहट हो तो 15 ग्राम तुरंत शुगर (ग्लूकोज़, जूस) लें और दोबारा जाँचें।" }, { en: "Don't skip meals, especially if you take diabetes medicines.", hi: "खाना न छोड़ें, ख़ासकर अगर डायबिटीज़ की दवा लेते हैं।" }], action: doctorSoon },
  },
  GLU_PP: { high: { title: { en: "Post-meal sugar is high", hi: "खाने के बाद की शुगर अधिक है" }, tips: sugarTips, action: doctorSoon } },
  GLU_R: { high: { title: { en: "Random sugar is high", hi: "रैंडम शुगर अधिक है" }, tips: sugarTips, action: { en: "A fasting sugar or HbA1c test helps confirm. Discuss with your doctor.", hi: "फ़ास्टिंग शुगर या HbA1c से पुष्टि होती है। डॉक्टर से बात करें।" } } },
  HBA1C: { high: { title: { en: "HbA1c is above normal", hi: "HbA1c सामान्य से अधिक है" }, tips: [...sugarTips, { en: "Recheck HbA1c every 3 months while working on it — it reflects your average sugar.", hi: "सुधार के दौरान हर 3 महीने HbA1c दोबारा कराएँ — यह औसत शुगर दिखाता है।" }], action: doctorSoon } },
  CHOL: { high: { title: { en: "Total cholesterol is high", hi: "कुल कोलेस्ट्रॉल अधिक है" }, tips: cholesterolTips, action: doctorSoon } },
  LDL: { high: { title: { en: "LDL (bad) cholesterol is above target", hi: "LDL (खराब) कोलेस्ट्रॉल लक्ष्य से अधिक है" }, tips: [...cholesterolTips, { en: "Indians tend to get heart disease earlier; your doctor will set an LDL target based on your overall risk.", hi: "भारतीयों में हृदय रोग जल्दी होता है; डॉक्टर आपके जोखिम के अनुसार LDL लक्ष्य तय करेंगे।" }], action: doctorSoon } },
  NONHDL: { high: { title: { en: "Non-HDL cholesterol is high", hi: "नॉन-HDL कोलेस्ट्रॉल अधिक है" }, tips: cholesterolTips, action: doctorSoon } },
  TG: { high: { title: { en: "Triglycerides are high", hi: "ट्राइग्लिसराइड्स अधिक हैं" }, tips: [{ en: "Reduce sugar, sweets, white rice/maida and fruit juices — these raise triglycerides most.", hi: "चीनी, मिठाई, सफ़ेद चावल/मैदा और जूस कम करें — ये ट्राइग्लिसराइड सबसे ज़्यादा बढ़ाते हैं।" }, { en: "Avoid alcohol; add omega-3 sources like fish, walnuts and flaxseed.", hi: "शराब से बचें; मछली, अखरोट और अलसी जैसे ओमेगा-3 स्रोत लें।" }, { en: "Regular exercise and weight loss lower triglycerides quickly.", hi: "नियमित व्यायाम और वज़न कम करने से ट्राइग्लिसराइड जल्दी घटते हैं।" }], action: doctorSoon } },
  HDL: { low: { title: { en: "HDL (good) cholesterol is low", hi: "HDL (अच्छा) कोलेस्ट्रॉल कम है" }, tips: [{ en: "Regular aerobic exercise (brisk walking, cycling, swimming) raises HDL.", hi: "नियमित एरोबिक व्यायाम (तेज़ चलना, साइकिल, तैराकी) HDL बढ़ाता है।" }, { en: "Quit smoking, reduce refined carbs, include nuts and healthy oils.", hi: "धूम्रपान छोड़ें, मैदा कम करें, मेवे और अच्छे तेल शामिल करें।" }], action: doctorSoon } },
  LPA: { high: { title: { en: "Lipoprotein(a) is high", hi: "लिपोप्रोटीन (a) अधिक है" }, tips: [{ en: "Lp(a) is mostly inherited; controlling LDL, BP, sugar and avoiding tobacco matters even more.", hi: "Lp(a) ज़्यादातर आनुवंशिक है; LDL, BP, शुगर नियंत्रण और तंबाकू से बचना और भी ज़रूरी है।" }, { en: "Tell close family members — they may want to get tested.", hi: "परिवार के करीबी सदस्यों को बताएँ — वे भी जाँच करा सकते हैं।" }], action: doctorSoon } },
  HOMOCYS: { high: { title: { en: "Homocysteine is high", hi: "होमोसिस्टीन अधिक है" }, tips: [{ en: "Often linked to low B12/folate — common with vegetarian diets. Ask your doctor to check B12 and folate.", hi: "अक्सर B12/फ़ोलेट की कमी से — शाकाहारी आहार में आम। डॉक्टर से B12 और फ़ोलेट जाँचने को कहें।" }, { en: "Include green leafy vegetables, legumes, dairy and fortified foods.", hi: "हरी सब्ज़ियाँ, दालें, दूध से बनी चीज़ें और फ़ोर्टिफ़ाइड भोजन लें।" }], action: doctorSoon } },
  HB: {
    low: { title: { en: "Haemoglobin is low (anaemia)", hi: "हीमोग्लोबिन कम है (एनीमिया)" }, tips: ironTips, action: doctorSoon },
    high: { title: { en: "Haemoglobin is high", hi: "हीमोग्लोबिन अधिक है" }, tips: [{ en: "Can happen with dehydration, smoking or living at high altitude; drink enough water.", hi: "पानी की कमी, धूम्रपान या ऊँचाई पर रहने से हो सकता है; पर्याप्त पानी पिएँ।" }], action: doctorSoon },
  },
  FERRITIN: { low: { title: { en: "Iron stores (ferritin) are low", hi: "आयरन भंडार (फ़ेरिटिन) कम है" }, tips: ironTips, action: doctorSoon }, high: { title: { en: "Ferritin is high", hi: "फ़ेरिटिन अधिक है" }, tips: [{ en: "Ferritin also rises with inflammation, infection, fatty liver or alcohol. Don't take iron supplements unless prescribed.", hi: "सूजन, संक्रमण, फ़ैटी लिवर या शराब से भी फ़ेरिटिन बढ़ता है। बिना सलाह आयरन सप्लीमेंट न लें।" }], action: doctorSoon } },
  IRON: { low: { title: { en: "Serum iron is low", hi: "सीरम आयरन कम है" }, tips: ironTips, action: doctorSoon } },
  TSAT: { low: { title: { en: "Transferrin saturation is low", hi: "ट्रांसफ़रिन सैचुरेशन कम है" }, tips: ironTips, action: doctorSoon } },
  MCV: {
    low: { title: { en: "Red cells are smaller than normal", hi: "लाल कोशिकाएँ सामान्य से छोटी हैं" }, tips: [{ en: "Commonly due to iron deficiency; thalassaemia trait is also common in India — your doctor may suggest an HbA2/HPLC test.", hi: "अक्सर आयरन की कमी से; भारत में थैलेसीमिया ट्रेट भी आम है — डॉक्टर HbA2/HPLC जाँच सुझा सकते हैं।" }], action: doctorSoon },
    high: { title: { en: "Red cells are larger than normal", hi: "लाल कोशिकाएँ सामान्य से बड़ी हैं" }, tips: [{ en: "Often due to low vitamin B12 or folate (common in vegetarians) or alcohol. Ask about B12/folate tests.", hi: "अक्सर B12 या फ़ोलेट की कमी (शाकाहारियों में आम) या शराब से। B12/फ़ोलेट जाँच के बारे में पूछें।" }], action: doctorSoon },
  },
  VITD: {
    low: { title: { en: "Vitamin D is low", hi: "विटामिन D कम है" }, tips: [{ en: "Get 15–30 minutes of sunlight on arms and legs (late morning) a few times a week, if safe for you.", hi: "हफ़्ते में कुछ बार 15–30 मिनट धूप (सुबह देर से) बाँहों और पैरों पर लें, यदि आपके लिए सुरक्षित हो।" }, { en: "Include fortified milk/oil, eggs, fish and mushrooms where possible.", hi: "जहाँ संभव हो फ़ोर्टिफ़ाइड दूध/तेल, अंडा, मछली और मशरूम लें।" }, { en: "Doctors often prescribe vitamin D3 — avoid self-medicating with high-dose sachets; recheck after about 3 months.", hi: "डॉक्टर अक्सर विटामिन D3 देते हैं — हाई-डोज़ सैशे खुद से न लें; लगभग 3 महीने बाद दोबारा जाँच कराएँ।" }], action: doctorSoon },
    high: { title: { en: "Vitamin D is higher than needed", hi: "विटामिन D ज़रूरत से अधिक है" }, tips: [{ en: "Usually from excess supplements. Stop extra doses and check with your doctor.", hi: "आमतौर पर ज़्यादा सप्लीमेंट से। अतिरिक्त डोज़ बंद करें और डॉक्टर से जाँच कराएँ।" }], action: doctorSoon },
  },
  VITB12: { low: { title: { en: "Vitamin B12 is low", hi: "विटामिन B12 कम है" }, tips: [{ en: "Very common in vegetarians: include milk, curd, paneer, cheese; eggs/fish/meat if acceptable; fortified foods.", hi: "शाकाहारियों में बहुत आम: दूध, दही, पनीर, चीज़; अंडा/मछली/मांस यदि खाते हैं; फ़ोर्टिफ़ाइड भोजन।" }, { en: "Long-term metformin or acidity medicines can lower B12 — tell your doctor what you take.", hi: "लंबे समय तक मेटफ़ॉर्मिन या एसिडिटी की दवाओं से B12 घट सकता है — डॉक्टर को अपनी दवाएँ बताएँ।" }, { en: "Your doctor may prescribe B12 tablets or injections.", hi: "डॉक्टर B12 की गोलियाँ या इंजेक्शन दे सकते हैं।" }], action: doctorSoon } },
  FOLATE: { low: { title: { en: "Folate is low", hi: "फ़ोलेट कम है" }, tips: [{ en: "Eat green leafy vegetables, dals, chana, rajma, citrus fruits; folic acid is especially important before and during pregnancy.", hi: "हरी पत्तेदार सब्ज़ियाँ, दालें, चना, राजमा, खट्टे फल लें; गर्भावस्था से पहले और दौरान फ़ोलिक एसिड बहुत ज़रूरी है।" }], action: doctorSoon } },
  TSH: {
    high: { title: { en: "TSH is high (possible underactive thyroid)", hi: "TSH अधिक है (थायरॉइड कम सक्रिय होने की संभावना)" }, tips: [{ en: "A repeat test with Free T4 (and sometimes anti-TPO) is commonly done to confirm.", hi: "पुष्टि के लिए आमतौर पर Free T4 (और कभी-कभी anti-TPO) के साथ दोबारा जाँच होती है।" }, { en: "Use iodised salt. If prescribed thyroid medicine, take it empty stomach, at the same time daily.", hi: "आयोडीन युक्त नमक इस्तेमाल करें। यदि थायरॉइड दवा दी गई है तो रोज़ एक ही समय खाली पेट लें।" }], action: doctorSoon },
    low: { title: { en: "TSH is low (possible overactive thyroid)", hi: "TSH कम है (थायरॉइड अधिक सक्रिय होने की संभावना)" }, tips: [{ en: "Watch for palpitations, weight loss, tremors or heat intolerance and tell your doctor.", hi: "धड़कन तेज़ होना, वज़न घटना, हाथ काँपना या गर्मी न सहन होना — डॉक्टर को बताएँ।" }, { en: "If you take thyroid medicine, the dose may need review — don't change it yourself.", hi: "यदि थायरॉइड दवा लेते हैं तो डोज़ की समीक्षा ज़रूरी हो सकती है — खुद न बदलें।" }], action: doctorSoon },
  },
  CREAT: { high: { title: { en: "Creatinine is high", hi: "क्रिएटिनिन अधिक है" }, tips: kidneyTips, action: doctorSoon } },
  EGFR: { low: { title: { en: "Kidney filtering (eGFR) is reduced", hi: "किडनी की फ़िल्टर दर (eGFR) कम है" }, tips: kidneyTips, action: doctorSoon } },
  UREA: { high: { title: { en: "Blood urea is high", hi: "ब्लड यूरिया अधिक है" }, tips: [{ en: "Can rise with dehydration, high protein intake or reduced kidney function — drink adequate water.", hi: "पानी की कमी, अधिक प्रोटीन या किडनी कमज़ोर होने से बढ़ सकता है — पर्याप्त पानी पिएँ।" }, ...kidneyTips.slice(0, 1)], action: doctorSoon } },
  BUN: { high: { title: { en: "BUN is high", hi: "BUN अधिक है" }, tips: kidneyTips, action: doctorSoon } },
  UACR: { high: { title: { en: "Protein leak in urine (UACR) is raised", hi: "पेशाब में प्रोटीन रिसाव (UACR) बढ़ा है" }, tips: kidneyTips, action: doctorSoon } },
  URIC: { high: { title: { en: "Uric acid is high", hi: "यूरिक एसिड अधिक है" }, tips: [{ en: "Limit red meat, organ meat, shellfish, alcohol (especially beer) and sugary drinks.", hi: "रेड मीट, कलेजी, झींगा, शराब (ख़ासकर बीयर) और मीठे पेय सीमित करें।" }, { en: "Drink plenty of water and maintain a healthy weight.", hi: "भरपूर पानी पिएँ और वज़न नियंत्रित रखें।" }], action: doctorSoon } },
  ALT: { high: { title: { en: "Liver enzyme SGPT (ALT) is raised", hi: "लिवर एंज़ाइम SGPT (ALT) बढ़ा है" }, tips: liverTips, action: doctorSoon } },
  AST: { high: { title: { en: "Liver enzyme SGOT (AST) is raised", hi: "लिवर एंज़ाइम SGOT (AST) बढ़ा है" }, tips: liverTips, action: doctorSoon } },
  GGT: { high: { title: { en: "GGT is raised", hi: "GGT बढ़ा है" }, tips: liverTips, action: doctorSoon } },
  ALP: { high: { title: { en: "Alkaline phosphatase is raised", hi: "एल्कलाइन फ़ॉस्फ़ेटेज़ बढ़ा है" }, tips: [{ en: "Can come from liver/bile or bone; your doctor will correlate with other results.", hi: "लिवर/पित्त या हड्डी से हो सकता है; डॉक्टर अन्य रिपोर्ट से मिलान करेंगे।" }], action: doctorSoon } },
  BILI_T: { high: { title: { en: "Bilirubin is high", hi: "बिलीरुबिन अधिक है" }, tips: [{ en: "Watch for yellow eyes/urine. Hepatitis A/E spreads through contaminated water — drink boiled/filtered water.", hi: "आँखों/पेशाब के पीलेपन पर ध्यान दें। हेपेटाइटिस A/E दूषित पानी से फैलता है — उबला/फ़िल्टर पानी पिएँ।" }, ...liverTips.slice(0, 1)], action: doctorSoon } },
  BILI_D: { high: { title: { en: "Direct bilirubin is high", hi: "डायरेक्ट बिलीरुबिन अधिक है" }, tips: liverTips.slice(0, 1), action: doctorSoon } },
  ALB: { low: { title: { en: "Albumin is low", hi: "एल्ब्यूमिन कम है" }, tips: [{ en: "Ensure enough protein in meals (dal, paneer, curd, eggs, soy); your doctor may check liver and kidney causes.", hi: "भोजन में पर्याप्त प्रोटीन (दाल, पनीर, दही, अंडा, सोया) लें; डॉक्टर लिवर और किडनी कारण देख सकते हैं।" }], action: doctorSoon } },
  PLT: {
    low: { title: { en: "Platelet count is low", hi: "प्लेटलेट काउंट कम है" }, tips: [{ en: "With fever — especially in monsoon — low platelets can be dengue. Seek medical care; avoid aspirin/ibuprofen.", hi: "बुख़ार के साथ — ख़ासकर बरसात में — प्लेटलेट कम होना डेंगू हो सकता है। डॉक्टर को दिखाएँ; एस्पिरिन/आइबुप्रोफ़ेन न लें।" }, { en: "Watch for bleeding gums, nosebleeds, red spots on skin or black stools — seek care immediately if they occur.", hi: "मसूड़ों/नाक से खून, त्वचा पर लाल धब्बे या काला मल हो तो तुरंत डॉक्टर के पास जाएँ।" }, { en: "Stay well hydrated (ORS, coconut water, soups).", hi: "भरपूर तरल लें (ORS, नारियल पानी, सूप)।" }], action: doctorSoon },
    high: { title: { en: "Platelet count is high", hi: "प्लेटलेट काउंट अधिक है" }, tips: [{ en: "Can be a reaction to infection, inflammation or iron deficiency; your doctor may repeat the test.", hi: "संक्रमण, सूजन या आयरन की कमी की प्रतिक्रिया हो सकती है; डॉक्टर दोबारा जाँच करा सकते हैं।" }], action: doctorSoon },
  },
  WBC: {
    high: { title: { en: "White cell count is high", hi: "श्वेत रक्त कोशिकाएँ अधिक हैं" }, tips: [{ en: "Often due to an infection or inflammation; note any fever, cough or burning urine for your doctor.", hi: "अक्सर संक्रमण या सूजन से; बुख़ार, खाँसी या पेशाब में जलन हो तो डॉक्टर को बताएँ।" }], action: doctorSoon },
    low: { title: { en: "White cell count is low", hi: "श्वेत रक्त कोशिकाएँ कम हैं" }, tips: [{ en: "Can happen with viral fevers (including dengue) or some medicines; avoid crowds and practise good hand hygiene.", hi: "वायरल बुख़ार (डेंगू सहित) या कुछ दवाओं से हो सकता है; भीड़ से बचें और हाथ धोते रहें।" }], action: doctorSoon },
  },
  EOS: { high: { title: { en: "Eosinophils are raised", hi: "इयोसिनोफ़िल बढ़े हैं" }, tips: [{ en: "Common with allergies, asthma or worm infections. Ask your doctor whether deworming is appropriate.", hi: "एलर्जी, अस्थमा या पेट के कीड़ों में आम। डॉक्टर से पूछें कि क्या कृमिनाशक दवा उचित है।" }, { en: "Wash hands before meals, wash vegetables well and wear footwear outdoors.", hi: "खाने से पहले हाथ धोएँ, सब्ज़ियाँ अच्छे से धोएँ और बाहर चप्पल पहनें।" }], action: doctorSoon } },
  AEC: { high: { title: { en: "Absolute eosinophil count is raised", hi: "एब्सोल्यूट इयोसिनोफ़िल काउंट बढ़ा है" }, tips: [{ en: "Common with allergies, asthma or worm infections. Ask your doctor whether deworming is appropriate.", hi: "एलर्जी, अस्थमा या पेट के कीड़ों में आम। डॉक्टर से पूछें कि क्या कृमिनाशक दवा उचित है।" }], action: doctorSoon } },
  ESR: { high: { title: { en: "ESR is raised", hi: "ESR बढ़ा है" }, tips: [{ en: "A non-specific sign of inflammation or infection (including TB). Your doctor will interpret it with symptoms.", hi: "सूजन या संक्रमण (TB सहित) का सामान्य संकेत। डॉक्टर लक्षणों के साथ इसका अर्थ समझाएँगे।" }], action: doctorSoon } },
  CRP: { high: { title: { en: "CRP is raised", hi: "CRP बढ़ा है" }, tips: [{ en: "Suggests active inflammation or infection. Note symptoms like fever or joint pain for your doctor.", hi: "सक्रिय सूजन या संक्रमण का संकेत। बुख़ार या जोड़ों के दर्द जैसे लक्षण डॉक्टर को बताएँ।" }], action: doctorSoon } },
  HSCRP: { high: { title: { en: "hs-CRP indicates higher heart risk", hi: "hs-CRP अधिक हृदय जोखिम दर्शाता है" }, tips: cholesterolTips.slice(2), action: doctorSoon } },
  NA: { low: { title: { en: "Sodium is low", hi: "सोडियम कम है" }, tips: [{ en: "Can be caused by diarrhoea/vomiting, some BP medicines or drinking excess water. Don't change medicines yourself.", hi: "दस्त/उल्टी, कुछ BP दवाओं या बहुत ज़्यादा पानी से हो सकता है। दवाएँ खुद न बदलें।" }], action: doctorSoon }, high: { title: { en: "Sodium is high", hi: "सोडियम अधिक है" }, tips: [{ en: "Usually reflects dehydration — drink fluids and consult your doctor.", hi: "आमतौर पर पानी की कमी — तरल लें और डॉक्टर से सलाह लें।" }], action: doctorSoon } },
  K: { low: { title: { en: "Potassium is low", hi: "पोटैशियम कम है" }, tips: [{ en: "Coconut water, bananas, dal and vegetables provide potassium; some BP/water pills lower it.", hi: "नारियल पानी, केला, दाल और सब्ज़ियाँ पोटैशियम देती हैं; कुछ BP/पेशाब की दवाएँ इसे घटाती हैं।" }], action: doctorSoon }, high: { title: { en: "Potassium is high", hi: "पोटैशियम अधिक है" }, tips: [{ en: "High potassium can affect heart rhythm. Avoid potassium supplements/salt substitutes until reviewed.", hi: "अधिक पोटैशियम दिल की धड़कन पर असर डाल सकता है। सलाह तक पोटैशियम सप्लीमेंट/लो-सोडियम नमक न लें।" }], action: doctorSoon } },
  CA: { low: { title: { en: "Calcium is low", hi: "कैल्शियम कम है" }, tips: [{ en: "Include milk, curd, paneer, ragi, sesame (til) and green leafy vegetables; low vitamin D is a common cause.", hi: "दूध, दही, पनीर, रागी, तिल और हरी सब्ज़ियाँ लें; विटामिन D की कमी एक आम कारण है।" }], action: doctorSoon }, high: { title: { en: "Calcium is high", hi: "कैल्शियम अधिक है" }, tips: [{ en: "Stop calcium/vitamin D supplements until reviewed and drink adequate water.", hi: "सलाह तक कैल्शियम/विटामिन D सप्लीमेंट बंद करें और पर्याप्त पानी पिएँ।" }], action: doctorSoon } },
  BP_SYS: { high: { title: { en: "Blood pressure is above normal", hi: "ब्लड प्रेशर सामान्य से अधिक है" }, tips: bpTips, action: { en: "Confirm with repeated home readings; discuss with your doctor if it stays at 140/90 or above.", hi: "घर पर बार-बार नापकर पुष्टि करें; 140/90 या अधिक रहे तो डॉक्टर से बात करें।" } } },
  BP_DIA: { high: { title: { en: "Diastolic pressure is above normal", hi: "नीचे वाला BP सामान्य से अधिक है" }, tips: bpTips, action: { en: "Confirm with repeated home readings; discuss with your doctor if it stays at 140/90 or above.", hi: "घर पर बार-बार नापकर पुष्टि करें; 140/90 या अधिक रहे तो डॉक्टर से बात करें।" } } },
  SPO2: { low: { title: { en: "Oxygen level is low", hi: "ऑक्सीजन स्तर कम है" }, tips: [{ en: "Re-measure with warm hands, at rest, without nail polish. If it stays below 94% or you feel breathless, seek care.", hi: "गर्म हाथ, आराम में, बिना नेल पॉलिश दोबारा नापें। 94% से कम रहे या साँस फूले तो डॉक्टर को दिखाएँ।" }], action: doctorSoon } },
  TEMP: { high: { title: { en: "You have a fever", hi: "आपको बुख़ार है" }, tips: [{ en: "Rest and drink fluids. Fever lasting over 2–3 days needs a doctor; in monsoon, dengue/malaria/typhoid tests may be needed.", hi: "आराम करें और तरल लें। 2–3 दिन से ज़्यादा बुख़ार हो तो डॉक्टर को दिखाएँ; बरसात में डेंगू/मलेरिया/टाइफ़ाइड जाँच लग सकती है।" }], action: doctorSoon } },
  BMI: {
    high: { title: { en: "BMI is above the healthy range for Indians", hi: "BMI भारतीयों के लिए स्वस्थ सीमा से अधिक है" }, tips: [{ en: "Aim for gradual loss of 5–10% of body weight with portion control and daily activity.", hi: "थाली छोटी करके और रोज़ सक्रिय रहकर धीरे-धीरे 5–10% वज़न घटाने का लक्ष्य रखें।" }, { en: "Indians develop diabetes and heart disease at lower BMIs, so 23+ already needs attention.", hi: "भारतीयों में कम BMI पर भी डायबिटीज़ और हृदय रोग होते हैं, इसलिए 23+ पर ही ध्यान दें।" }], action: doctorSoon },
    low: { title: { en: "BMI is below the healthy range", hi: "BMI स्वस्थ सीमा से कम है" }, tips: [{ en: "Add calorie- and protein-rich foods (dal, paneer, peanuts, eggs, milk); unexplained weight loss needs a check-up.", hi: "कैलोरी और प्रोटीन वाले भोजन (दाल, पनीर, मूँगफली, अंडा, दूध) जोड़ें; बिना कारण वज़न घटे तो जाँच कराएँ।" }], action: doctorSoon },
  },
  WAIST: { high: { title: { en: "Waist size indicates belly fat", hi: "कमर का माप पेट की चर्बी दर्शाता है" }, tips: [{ en: "Belly fat raises diabetes and heart risk in Indians; daily activity and fewer refined carbs help most.", hi: "पेट की चर्बी भारतीयों में डायबिटीज़ और हृदय जोखिम बढ़ाती है; रोज़ की गतिविधि और कम मैदा सबसे मददगार।" }], action: doctorSoon } },
  U_GLUCOSE: { abnormal: { title: { en: "Sugar found in urine", hi: "पेशाब में शुगर मिली" }, tips: sugarTips.slice(0, 2), action: { en: "Check blood sugar/HbA1c and discuss with your doctor.", hi: "ब्लड शुगर/HbA1c जाँचें और डॉक्टर से बात करें।" } } },
  U_PROTEIN: { abnormal: { title: { en: "Protein found in urine", hi: "पेशाब में प्रोटीन मिला" }, tips: kidneyTips.slice(1), action: doctorSoon } },
  U_PUS: { high: { title: { en: "Pus cells in urine are raised", hi: "पेशाब में पस सेल्स बढ़े हैं" }, tips: [{ en: "May indicate a urinary infection — drink plenty of water and don't hold urine. Antibiotics only on prescription.", hi: "यूरिन इन्फ़ेक्शन का संकेत हो सकता है — भरपूर पानी पिएँ, पेशाब न रोकें। एंटीबायोटिक केवल डॉक्टर की पर्ची पर।" }], action: doctorSoon } },
  U_KETONE: { abnormal: { title: { en: "Ketones found in urine", hi: "पेशाब में कीटोन मिले" }, tips: [{ en: "Can occur with fasting, but with high sugar it can be serious — check your blood sugar.", hi: "उपवास में हो सकता है, लेकिन हाई शुगर के साथ गंभीर हो सकता है — ब्लड शुगर जाँचें।" }], action: doctorSoon } },
};

export const GENERIC_ADVICE: Advice = {
  title: { en: "Result outside the reference range", hi: "परिणाम सामान्य सीमा से बाहर" },
  tips: [{ en: "One-off results can vary with fasting, time of day, medicines or recent illness.", hi: "एक बार के परिणाम उपवास, समय, दवाओं या हाल की बीमारी से बदल सकते हैं।" }],
  action: doctorSoon,
};

export function adviceFor(code: string | null, flag: string): Advice {
  const entry = code ? ADVICE[code] : undefined;
  const dir = flag.includes("high") ? "high" : flag.includes("low") ? "low" : "abnormal";
  return entry?.[dir] ?? entry?.abnormal ?? GENERIC_ADVICE;
}
