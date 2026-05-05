const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "data.json");
const BUILD_DATE = "2026-05-05";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function byRecent(a, b) {
  const left = String(b.updatedAt || b.publishedAt || "");
  const right = String(a.updatedAt || a.publishedAt || "");
  return left.localeCompare(right) || String(a.title || "").localeCompare(String(b.title || ""));
}

function buildPost(post) {
  return {
    wpId: null,
    image: "https://biharresult.live/favicon.png",
    ageLimit: [],
    vacancyDetails: [],
    ...post
  };
}

const POSTS = [
  buildPost({
    id: "custom-upsc-civil-services-main-2025-final-result",
    slug: "upsc-civil-services-main-2025-final-result",
    path: "sections/latest-results/upsc-civil-services-main-2025-final-result.html",
    title: "UPSC Civil Services (Main) Examination 2025 Final Result Official Update",
    category: "Latest Results",
    department: "Union Public Service Commission (UPSC)",
    location: "India",
    shortInfo: "UPSC Online Portal on 05 May 2026 is showing the final result for Civil Services (Main) Examination, 2025. This page brings the latest official result status, result access guidance, and source links together in one place.",
    longDescription: "The UPSC online portal dated 05 May 2026 prominently shows 'FINAL RESULT - CIVIL SERVICES (MAIN) EXAMINATION, 2025'. Candidates waiting for the final selection outcome should use the official UPSC result routes only, verify their roll-wise result carefully, and keep the final document copy safe for the next stage. This post is written as a quick result-reference page so that aspirants can check the result source, understand the result context, and move to official UPSC pages without confusion.",
    publishedAt: "2026-05-05",
    updatedAt: BUILD_DATE,
    isFeatured: true,
    sourceName: "UPSC Online Portal",
    sourceUrl: "https://upsconline.gov.in/",
    importantDates: [
      { label: "Portal Checked Date", value: "05 May 2026" },
      { label: "Result Status", value: "Final Result shown on UPSC online portal" },
      { label: "Exam Name", value: "Civil Services (Main) Examination, 2025" },
      { label: "Result Type", value: "Final Result" },
      { label: "Result Access", value: "Check official UPSC result pages and portal notices" }
    ],
    applicationFee: [
      { label: "Result Access Fee", value: "Normally no fee is required to view result notices on the official UPSC portal." },
      { label: "Document Advice", value: "Download and save the official result PDF or relevant notice for future counselling or document stages." }
    ],
    eligibility: [
      { label: "Who Can Check", value: "Candidates who appeared in UPSC Civil Services (Main) Examination, 2025 and are awaiting final result status." },
      { label: "Required Details", value: "Keep roll number, registration details, and identity information ready while checking the official result notice." },
      { label: "Next Step Users", value: "Candidates shortlisted in the final result should follow further UPSC instructions exactly as published on official pages." }
    ],
    importantLinks: [
      { label: "UPSC Online Portal", url: "https://upsconline.gov.in/", type: "primary" },
      { label: "UPSC Final Results", url: "https://upsc.gov.in/exams-related-info/final-result", type: "secondary" },
      { label: "UPSC Official Website", url: "https://upsc.gov.in/", type: "secondary" }
    ],
    howToApply: [
      "Open the official UPSC portal or final results page from the links below.",
      "Locate the Civil Services (Main) Examination, 2025 final result notice or PDF.",
      "Verify your roll number, name, and final result status carefully.",
      "Save the official result document and watch for any follow-up UPSC instructions."
    ],
    beforeYouStart: [
      "Use only official UPSC websites to verify the final result.",
      "Do not rely on social media screenshots without matching them on the official portal.",
      "Keep your roll number and registration-related details ready before checking."
    ]
  }),
  buildPost({
    id: "custom-cbse-under-secretary-legal-result-2026",
    slug: "cbse-under-secretary-legal-result-2026",
    path: "sections/latest-results/cbse-under-secretary-legal-result-2026.html",
    title: "CBSE Under Secretary (Legal) Result Notice 2026 Official Update",
    category: "Latest Results",
    department: "Central Board of Secondary Education (CBSE)",
    location: "New Delhi, India",
    shortInfo: "CBSE Recruitment page lists the Result Notice for the post of Under Secretary (Legal) dated 21 April 2026. This post helps candidates track the official result notice, source page, and next-step guidance from one place.",
    longDescription: "CBSE has published a Result Notice for the post of Under Secretary (Legal) on its recruitment page dated 21 April 2026. Candidates who applied or appeared for this recruitment update should open the official CBSE recruitment page, review the result notice title and document carefully, and keep the official record for any follow-up action. This page improves clarity by placing the notice date, result type, and official result links together with quick result-check guidance.",
    publishedAt: "2026-04-21",
    updatedAt: BUILD_DATE,
    isFeatured: false,
    sourceName: "CBSE Recruitment Page",
    sourceUrl: "https://www.cbse.gov.in/cbsenew/recruitment.html",
    importantDates: [
      { label: "Notice Date", value: "21 April 2026" },
      { label: "Result Status", value: "Result Notice published" },
      { label: "Post Name", value: "Under Secretary (Legal)" },
      { label: "Source Page", value: "CBSE Recruitment Page" }
    ],
    applicationFee: [
      { label: "Result Access Fee", value: "CBSE result notice access on the official recruitment page is normally free." },
      { label: "Record Advice", value: "Keep a downloaded copy of the official result notice for document verification or future communication." }
    ],
    eligibility: [
      { label: "Who Can Check", value: "Candidates connected with the CBSE Under Secretary (Legal) recruitment result process." },
      { label: "Required Details", value: "Keep your application and identity details ready in case the result notice asks for the next stage response." }
    ],
    importantLinks: [
      { label: "CBSE Recruitment Page", url: "https://www.cbse.gov.in/cbsenew/recruitment.html", type: "primary" },
      { label: "CBSE Official Website", url: "https://www.cbse.gov.in/", type: "secondary" }
    ],
    howToApply: [
      "Open the CBSE Recruitment page from the official link below.",
      "Find the Result Notice for the post of Under Secretary (Legal) dated 21 April 2026.",
      "Read the result notice carefully and verify the candidate details or instructions, if mentioned.",
      "Save the official notice copy for your records."
    ],
    beforeYouStart: [
      "Always match the notice date and post name before acting on any CBSE recruitment update.",
      "Check whether CBSE has mentioned any further document or joining-related instruction."
    ]
  }),
  buildPost({
    id: "custom-cbse-aiafa-result-2026",
    slug: "cbse-aiafa-result-2026",
    path: "sections/latest-results/cbse-aiafa-result-2026.html",
    title: "CBSE AIAFA Result Notice 2026 Official Update",
    category: "Latest Results",
    department: "Central Board of Secondary Education (CBSE)",
    location: "New Delhi, India",
    shortInfo: "CBSE Recruitment page shows the Result Notice for the post of Additional Internal Auditor & Financial Advisor (AIAFA) dated 16 April 2026. This post collects the official result source and quick candidate guidance.",
    longDescription: "CBSE has listed the Result Notice for Additional Internal Auditor & Financial Advisor (AIAFA) on its official recruitment page dated 16 April 2026. Candidates following this recruitment result can use this page to quickly reach the official result source, verify the notice title, and keep result-related documents ready. The page is written in a beginner-friendly way so visitors can understand what was published, when it appeared, and where the official record is available.",
    publishedAt: "2026-04-16",
    updatedAt: BUILD_DATE,
    isFeatured: false,
    sourceName: "CBSE Recruitment Page",
    sourceUrl: "https://www.cbse.gov.in/cbsenew/recruitment.html",
    importantDates: [
      { label: "Notice Date", value: "16 April 2026" },
      { label: "Result Status", value: "Result Notice published" },
      { label: "Post Name", value: "Additional Internal Auditor & Financial Advisor (AIAFA)" }
    ],
    applicationFee: [
      { label: "Result Access Fee", value: "No normal fee is required to open the CBSE result notice page." },
      { label: "Copy Advice", value: "Save the official result notice and any related instruction for future reference." }
    ],
    eligibility: [
      { label: "Who Can Check", value: "Candidates connected with the CBSE AIAFA recruitment result process." },
      { label: "Required Details", value: "Keep your recruitment details ready in case follow-up document verification or communication is announced." }
    ],
    importantLinks: [
      { label: "CBSE Recruitment Page", url: "https://www.cbse.gov.in/cbsenew/recruitment.html", type: "primary" },
      { label: "CBSE Official Website", url: "https://www.cbse.gov.in/", type: "secondary" }
    ],
    howToApply: [
      "Visit the official CBSE Recruitment page.",
      "Open the Result Notice for Additional Internal Auditor & Financial Advisor (AIAFA).",
      "Check the notice details carefully and save the official document.",
      "Follow any next-step instruction only through official CBSE communication."
    ],
    beforeYouStart: [
      "Verify the post name and notice date before you rely on any recruitment result copy.",
      "Use only the official CBSE page for final confirmation."
    ]
  }),
  buildPost({
    id: "custom-osssc-pet-provisional-result-2026",
    slug: "osssc-pet-provisional-result-2026",
    path: "sections/latest-results/osssc-pet-provisional-result-2026.html",
    title: "OSSSC PET Provisional Result 2026 Official Update",
    category: "Latest Results",
    department: "Odisha Sub-ordinate Staff Selection Commission (OSSSC)",
    location: "Odisha, India",
    shortInfo: "OSSSC recruitment news includes publication of the Provisional Result for the post of Physical Education Teacher (PET) dated 04 April 2026. This page gives the official result context and direct source guidance.",
    longDescription: "OSSSC has shown the publication of Provisional Result for the post of Physical Education Teacher (PET) dated 04 April 2026 on its official recruitment news stream. Candidates tracking PET result status should use the official OSSSC website for final result verification, shortlist review, and any next-stage notice. This page summarizes the official result heading, notice date, and direct result-check route in a simple format for faster manual review.",
    publishedAt: "2026-04-04",
    updatedAt: BUILD_DATE,
    isFeatured: false,
    sourceName: "OSSSC Official Website",
    sourceUrl: "https://www.osssc.gov.in/",
    importantDates: [
      { label: "Notice Date", value: "04 April 2026" },
      { label: "Result Status", value: "Provisional Result published" },
      { label: "Post Name", value: "Physical Education Teacher (PET)" },
      { label: "Authority", value: "OSSSC" }
    ],
    applicationFee: [
      { label: "Result Access Fee", value: "Candidates normally do not need to pay any fee to check official provisional result notices." }
    ],
    eligibility: [
      { label: "Who Can Check", value: "Candidates who appeared in or are connected with the OSSSC PET recruitment result process." },
      { label: "Important Advice", value: "Because the notice is provisional, candidates should read every official follow-up carefully." }
    ],
    importantLinks: [
      { label: "OSSSC Official Website", url: "https://www.osssc.gov.in/", type: "primary" },
      { label: "OSSSC Recruitment News", url: "https://www.osssc.gov.in/Public/OSSSC/Default.aspx", type: "secondary" }
    ],
    howToApply: [
      "Open the official OSSSC website.",
      "Check the recruitment news area for the PET provisional result notice dated 04 April 2026.",
      "Verify your result-related details only through the official OSSSC records.",
      "Keep watching the official portal for final or next-stage notices."
    ],
    beforeYouStart: [
      "Treat provisional result updates carefully and wait for official next-step instructions where required.",
      "Use only OSSSC official pages to confirm result status."
    ]
  }),
  buildPost({
    id: "custom-drdo-dipr-paid-intern-final-result-2026",
    slug: "drdo-dipr-paid-intern-final-result-2026",
    path: "sections/latest-results/drdo-dipr-paid-intern-final-result-2026.html",
    title: "DRDO DIPR Paid Intern Final Result 2026 Official Update",
    category: "Latest Results",
    department: "Defence Research and Development Organisation (DRDO)",
    location: "India",
    shortInfo: "DRDO has published the Final Result for Paid Intern in DIPR-DRDO under Advertisement No. 2557/Gen/Admin/DIPR/2026. This post keeps the official result page, publication date, and result document access guidance together.",
    longDescription: "The DRDO vacancies page shows the Final Result for Paid Intern in DIPR-DRDO under Advertisement No. 2557/Gen/Admin/DIPR/2026. The official page lists a published date of 28-02-2026 and provides the result document under the DRDO vacancy result section. Candidates who applied for this paid intern opportunity can use this page to reach the official result source quickly, confirm the advertisement reference, and save the result document for future use.",
    publishedAt: "2026-02-28",
    updatedAt: BUILD_DATE,
    isFeatured: false,
    sourceName: "DRDO Vacancy Result Page",
    sourceUrl: "https://www.drdo.gov.in/drdo/en/offerings/vacancies/final-result-paid-intern-dipr-drdo",
    importantDates: [
      { label: "Published Date", value: "28 February 2026" },
      { label: "Result Status", value: "Final Result available" },
      { label: "Advertisement No", value: "2557/Gen/Admin/DIPR/2026" },
      { label: "End Date", value: "15 March 2026" }
    ],
    applicationFee: [
      { label: "Result Access Fee", value: "No separate fee is normally needed to view the result page or result document." }
    ],
    eligibility: [
      { label: "Who Can Check", value: "Candidates who applied for the Paid Intern in DIPR-DRDO opportunity." },
      { label: "Required Details", value: "Keep your advertisement reference and personal application details ready for matching the result record." }
    ],
    importantLinks: [
      { label: "DRDO Final Result Page", url: "https://www.drdo.gov.in/drdo/en/offerings/vacancies/final-result-paid-intern-dipr-drdo", type: "primary" },
      { label: "DRDO Vacancies", url: "https://www.drdo.gov.in/drdo/en/offerings/vacancies", type: "secondary" }
    ],
    howToApply: [
      "Open the official DRDO result page from the link below.",
      "Check the advertisement number and result title carefully.",
      "Open the result document and verify your selection status.",
      "Save the official result copy for later stages or communication."
    ],
    beforeYouStart: [
      "Confirm the advertisement number before relying on the result.",
      "Keep a copy of the official result PDF or page for your records."
    ]
  }),
  buildPost({
    id: "custom-cbse-drq-tier-2-admit-card-2026",
    slug: "cbse-drq-tier-2-admit-card-2026",
    path: "sections/admit-card/cbse-drq-tier-2-admit-card-2026.html",
    title: "CBSE DRQ Tier-2 Admit Card 2026 Official Update",
    category: "Admit Card",
    department: "Central Board of Secondary Education (CBSE)",
    location: "New Delhi, India",
    shortInfo: "CBSE Recruitment page shows Admit Card for Tier-2 DRQ2026 and also lists the City Intimation public notice dated 07 April 2026. Candidates can use this page to reach the official admit-card route quickly.",
    longDescription: "CBSE has listed 'Admit Card for Tier-2 DRQ2026' on its recruitment page along with a City Intimation public notice dated 07 April 2026. Candidates preparing for the Direct Recruitment Quota Tier-2 stage should use official CBSE recruitment and examination services pages only, verify their hall-ticket details carefully, and keep the print copy ready if required. This post combines the official heading, notice date, and download guidance in a simple format for faster manual access.",
    publishedAt: "2026-04-07",
    updatedAt: BUILD_DATE,
    isFeatured: true,
    sourceName: "CBSE Recruitment Page",
    sourceUrl: "https://www.cbse.gov.in/cbsenew/recruitment.html",
    importantDates: [
      { label: "City Intimation Notice", value: "07 April 2026" },
      { label: "Admit Card Status", value: "Tier-2 admit card link shown on CBSE recruitment page" },
      { label: "Exam Stage", value: "Direct Recruitment Quota Examination 2026 Tier-2" },
      { label: "Related Result", value: "Tier-1 result notice dated 02 March 2026" }
    ],
    applicationFee: [
      { label: "Admit Card Fee", value: "Admit card download is normally free on the official portal." },
      { label: "Print Advice", value: "Keep a clean printout and also verify city, stage, and candidate details before exam day." }
    ],
    eligibility: [
      { label: "Who Can Download", value: "Candidates shortlisted or eligible for CBSE DRQ2026 Tier-2 as per official instructions." },
      { label: "Login Details", value: "Keep registration details, date of birth, password, or other portal credentials ready." },
      { label: "What To Verify", value: "Check candidate name, exam city, exam stage, reporting time, and instructions on the admit card." }
    ],
    importantLinks: [
      { label: "CBSE Recruitment Page", url: "https://www.cbse.gov.in/cbsenew/recruitment.html", type: "primary" },
      { label: "Examination Services Portal", url: "https://examinationservices.nic.in/", type: "secondary" },
      { label: "CBSE Official Website", url: "https://www.cbse.gov.in/", type: "secondary" }
    ],
    howToApply: [
      "Open the CBSE Recruitment page and find the DRQ2026 Tier-2 admit card section.",
      "Use the official examination services portal if prompted for admit card access.",
      "Verify all admit-card details carefully after login.",
      "Print the hall ticket and follow the official Tier-2 instructions."
    ],
    beforeYouStart: [
      "Use only official CBSE and examination-services links for admit card access.",
      "Check both city intimation and admit card details if both notices apply to your stage."
    ]
  }),
  buildPost({
    id: "custom-osssc-cre-2025-ii-admission-letters-2026",
    slug: "osssc-cre-2025-ii-admission-letters-2026",
    path: "sections/admit-card/osssc-cre-2025-ii-admission-letters-2026.html",
    title: "OSSSC CRE-2025 (II) Admission Letters 2026 Official Update",
    category: "Admit Card",
    department: "Odisha Sub-ordinate Staff Selection Commission (OSSSC)",
    location: "Odisha, India",
    shortInfo: "OSSSC recruitment news dated 09 April 2026 includes release of Admission Letters for the Written Test for Forester, Forest Guard, and Excise Constable under CRE-2025(II) in CBRE mode.",
    longDescription: "OSSSC has officially shown the release of Admission Letters for the Written Test for Forester, Forest Guard, and Excise Constable under CRE-2025(II) in CBRE mode dated 09 April 2026. Candidates connected with this recruitment should use only the official OSSSC website to download their admission letter, review exam instructions, and confirm exam-center details. This page organizes the official heading, notice date, and basic download guidance for quick candidate reference.",
    publishedAt: "2026-04-09",
    updatedAt: BUILD_DATE,
    isFeatured: false,
    sourceName: "OSSSC Official Website",
    sourceUrl: "https://www.osssc.gov.in/",
    importantDates: [
      { label: "Notice Date", value: "09 April 2026" },
      { label: "Admit Card Status", value: "Admission Letters released" },
      { label: "Recruitment", value: "CRE-2025(II) in CBRE mode" },
      { label: "Covered Posts", value: "Forester, Forest Guard, and Excise Constable" }
    ],
    applicationFee: [
      { label: "Download Fee", value: "No normal fee is expected for downloading official admission letters." }
    ],
    eligibility: [
      { label: "Who Can Download", value: "Registered candidates for the OSSSC CRE-2025(II) written test for the listed posts." },
      { label: "Login Details", value: "Keep registration or recruitment login details ready before opening the official portal." },
      { label: "What To Verify", value: "Check name, exam date, venue, reporting time, and post name on the admission letter." }
    ],
    importantLinks: [
      { label: "OSSSC Official Website", url: "https://www.osssc.gov.in/", type: "primary" },
      { label: "OSSSC Recruitment News", url: "https://www.osssc.gov.in/Public/OSSSC/Default.aspx", type: "secondary" }
    ],
    howToApply: [
      "Open the official OSSSC portal.",
      "Find the admission-letter update for CRE-2025(II) written test.",
      "Log in with your official recruitment credentials and download the letter.",
      "Verify the exam details and keep a printed copy if required."
    ],
    beforeYouStart: [
      "Download only from the official OSSSC portal.",
      "Check the post name carefully because the notice covers multiple posts."
    ]
  }),
  buildPost({
    id: "custom-central-sanskrit-university-semester-admit-card-april-2026",
    slug: "central-sanskrit-university-semester-admit-card-april-2026",
    path: "sections/admit-card/central-sanskrit-university-semester-admit-card-april-2026.html",
    title: "Central Sanskrit University Semester Admit Card April 2026 Official Update",
    category: "Admit Card",
    department: "Central Sanskrit University",
    location: "New Delhi, India",
    shortInfo: "Central Sanskrit University examination notifications list the release of Admit Cards for Semester Examinations (II, IV, VI & VIII) dated 29 April 2026. This page helps students reach the official notice quickly.",
    longDescription: "The Central Sanskrit University examination notifications page lists 'Release of Admit Cards for Semester Examinations (II, IV, VI & VIII)-Regarding' dated 29 April 2026. Students preparing for these semester examinations should check the official university notice carefully, match their semester details, and keep a clean copy of the admit card for the examination process. This page organizes the official update in a simple way so that students can quickly locate the source notice and follow the next steps from one place.",
    publishedAt: "2026-04-29",
    updatedAt: BUILD_DATE,
    isFeatured: false,
    sourceName: "Central Sanskrit University Examination Notifications",
    sourceUrl: "https://www.sanskrit.nic.in/examinations_notifications.php",
    importantDates: [
      { label: "Notice Date", value: "29 April 2026" },
      { label: "Admit Card Status", value: "Admit cards released" },
      { label: "Semester Coverage", value: "II, IV, VI and VIII" },
      { label: "Authority", value: "Central Sanskrit University" }
    ],
    applicationFee: [
      { label: "Download Fee", value: "Semester admit card access is normally free through official university channels." }
    ],
    eligibility: [
      { label: "Who Can Download", value: "Students appearing in the relevant Central Sanskrit University semester examinations." },
      { label: "Required Details", value: "Keep roll number, registration details, or university login details ready." },
      { label: "What To Verify", value: "Check semester, subject, exam center, timing, and student details on the admit card." }
    ],
    importantLinks: [
      { label: "Examination Notifications Page", url: "https://www.sanskrit.nic.in/examinations_notifications.php", type: "primary" },
      { label: "Central Sanskrit University", url: "https://www.sanskrit.nic.in/", type: "secondary" }
    ],
    howToApply: [
      "Open the official examination notifications page.",
      "Locate the semester admit-card notice dated 29 April 2026.",
      "Follow the official university route to access or download your admit card.",
      "Verify all exam and identity details before the examination date."
    ],
    beforeYouStart: [
      "Check your correct semester before downloading the admit card.",
      "Use only the official university website for final confirmation."
    ]
  }),
  buildPost({
    id: "custom-incois-recruitment-2026-advt-01",
    slug: "incois-recruitment-2026-advt-01",
    path: "sections/latest-jobs/incois-recruitment-2026-advt-01.html",
    title: "INCOIS Recruitment 2026 Advt. No. INCOIS/RMT/01/2026",
    category: "Latest Jobs",
    department: "Indian National Centre for Ocean Information Services (INCOIS)",
    location: "Hyderabad, India",
    shortInfo: "INCOIS official vacancy portal is accepting online applications under Advt. No. INCOIS/RMT/01/2026. The official portal states that the online application closes on 11 May 2026 at 17:00 Hrs.",
    longDescription: "The official INCOIS vacancy portal under Advt. No. INCOIS/RMT/01/2026 states that online application submission closes on 11 May 2026 at 17:00 Hrs. Candidates should apply early, upload clear documents, and read the official portal instructions carefully before final submission because incomplete applications can be rejected. This post is designed as a quick all-India government job reference page with the main application window, portal route, and document guidance kept together.",
    publishedAt: "2026-05-05",
    updatedAt: BUILD_DATE,
    isFeatured: true,
    sourceName: "INCOIS Vacancy Portal",
    sourceUrl: "https://vacancies.incois.gov.in/jobs/incois0126/home.jsp",
    importantDates: [
      { label: "Advertisement No", value: "INCOIS/RMT/01/2026" },
      { label: "Application Start", value: "Portal live on official vacancy site" },
      { label: "Last Date", value: "11 May 2026, 17:00 Hrs" },
      { label: "Hard Copy for Deputation Posts", value: "18 May 2026, 17:00 Hrs for applicable deputation posts" }
    ],
    applicationFee: [
      { label: "Fee Status", value: "Check the official INCOIS advertisement and portal for exact fee instructions, if any." },
      { label: "Submission Advice", value: "Upload all required documents clearly and complete the form before the closing time." }
    ],
    eligibility: [
      { label: "Who Can Apply", value: "Eligible candidates meeting the post-wise education, experience, age, and category rules in the official advertisement." },
      { label: "Qualification", value: "Check the official advertisement for exact post-wise qualification and experience requirements." },
      { label: "Documents Needed", value: "Keep educational certificates, experience proof, DOB proof, category certificate, photo, signature, and other required documents ready." }
    ],
    importantLinks: [
      { label: "INCOIS Vacancy Portal", url: "https://vacancies.incois.gov.in/jobs/incois0126/home.jsp", type: "primary" },
      { label: "INCOIS Login / Application", url: "https://vacancies.incois.gov.in/jobs/incois0126/login.jsp", type: "secondary" },
      { label: "INCOIS Advertisement PDF", url: "https://vacancies.incois.gov.in/jobs/incois0126/docs/incois0126.pdf", type: "secondary" }
    ],
    howToApply: [
      "Open the official INCOIS vacancy portal.",
      "Read the advertisement and portal instructions carefully before registration.",
      "Complete online registration, upload the required documents, and review all details.",
      "Submit the form before 11 May 2026, 17:00 Hrs and save the acknowledgment copy."
    ],
    beforeYouStart: [
      "Check the official advertisement PDF for exact post-wise eligibility and closing rules.",
      "Do not wait for the last day because the portal closes at a fixed official time.",
      "If you are applying for deputation posts, also note the hard-copy submission requirement mentioned in the advertisement."
    ]
  }),
  buildPost({
    id: "custom-ministry-of-ports-shipping-vacancy-portal-may-2026",
    slug: "ministry-of-ports-shipping-vacancy-portal-may-2026",
    path: "sections/latest-jobs/ministry-of-ports-shipping-vacancy-portal-may-2026.html",
    title: "Ministry of Ports Shipping Vacancy Portal Openings May 2026",
    category: "Latest Jobs",
    department: "Ministry of Ports, Shipping and Waterways",
    location: "India",
    shortInfo: "The Ministry of Ports, Shipping and Waterways online vacancy portal shows active 2026 openings including Chief Medical Officer CoPA, Secretary CoPA, and Dy Chairperson posts with closing dates up to 01 June 2026.",
    longDescription: "The official online vacancy portal of the Ministry of Ports, Shipping and Waterways shows multiple active 2026 openings with visible opening and closing dates. The current portal snapshot includes Chief Medical Officer CoPA closing on 01 June 2026, Secretary CoPA closing on 28 May 2026, and Dy Chairperson vacancies for major port authorities also closing on 28 May 2026. This post is organized as a quick job-reference page so candidates can identify the active vacancy titles, portal route, and closing-date window from a single section page before reading the detailed official circulars.",
    publishedAt: "2026-05-01",
    updatedAt: BUILD_DATE,
    isFeatured: false,
    sourceName: "Ministry Online Application Portal",
    sourceUrl: "https://onlinevacancy.shipmin.nic.in/",
    importantDates: [
      { label: "Portal Snapshot Date", value: "01 May 2026" },
      { label: "Application Start", value: "07 April 2026 to 15 April 2026 depending on post" },
      { label: "Last Date", value: "28 May 2026 to 01 June 2026 depending on vacancy" },
      { label: "Key Post 1", value: "Chief Medical Officer CoPA - closing 01 June 2026" },
      { label: "Key Post 2", value: "Secretary CoPA / Dy Chairperson vacancies - closing 28 May 2026" }
    ],
    applicationFee: [
      { label: "Fee Status", value: "Check the individual vacancy circular or portal instructions for exact application-fee information, if applicable." },
      { label: "Application Advice", value: "Review the vacancy method such as deputation or absorption carefully before applying." }
    ],
    eligibility: [
      { label: "Who Can Apply", value: "Candidates who meet the post-specific service, experience, and eligibility conditions listed on the official portal and vacancy circular." },
      { label: "Recruitment Method", value: "Different posts may be filled by deputation, absorption method, or other official recruitment modes." },
      { label: "Documents Needed", value: "Keep service records, experience documents, identity proof, and vacancy-specific documents ready before applying." }
    ],
    importantLinks: [
      { label: "Online Vacancy Portal", url: "https://onlinevacancy.shipmin.nic.in/", type: "primary" },
      { label: "New Registration", url: "https://onlinevacancy.shipmin.nic.in/", type: "secondary" }
    ],
    howToApply: [
      "Open the official online vacancy portal of the Ministry of Ports, Shipping and Waterways.",
      "Read the vacancy title, recruitment method, and closing date carefully.",
      "Open the detailed vacancy circular for the post you want to apply for.",
      "Complete registration and submit the official application before the vacancy-specific deadline."
    ],
    beforeYouStart: [
      "Check the vacancy method carefully because not all posts follow the same recruitment mode.",
      "Match your experience and service background with the exact post requirement before applying."
    ]
  }),
  buildPost({
    id: "custom-vssc-advertisement-339-2026",
    slug: "vssc-advertisement-339-2026",
    path: "sections/latest-jobs/vssc-advertisement-339-2026.html",
    title: "VSSC Advertisement No. 339 2026 Online Application Update",
    category: "Latest Jobs",
    department: "Vikram Sarabhai Space Centre (VSSC)",
    location: "Thiruvananthapuram, India",
    shortInfo: "VSSC Advertisement No. 339 dated 20 April 2026 shows online application opening from 20 April 2026, 10:00 Hrs and closing on 05 May 2026, 17:00 Hrs. This page keeps the official application window and source links easy to review.",
    longDescription: "VSSC Advertisement No. 339 dated 20 April 2026 clearly lists the online application window along with the crucial eligibility date. The official page shows opening of application on 20 April 2026 at 10:00 Hrs and closing on 05 May 2026 at 17:00 Hrs, so interested candidates should act within the official time window. This post is designed as a quick latest-job reference page with the application dates, official portal route, and document guidance summarized for faster reading.",
    publishedAt: "2026-04-20",
    updatedAt: BUILD_DATE,
    isFeatured: false,
    sourceName: "VSSC Advertisement No. 339",
    sourceUrl: "https://www.vssc.gov.in/advt339.html",
    importantDates: [
      { label: "Advertisement Date", value: "20 April 2026" },
      { label: "Crucial Date of Eligibility", value: "05 May 2026" },
      { label: "Application Start", value: "20 April 2026, 10:00 Hrs" },
      { label: "Last Date", value: "05 May 2026, 17:00 Hrs" }
    ],
    applicationFee: [
      { label: "Fee Status", value: "Refer the official VSSC advertisement and application portal for the exact fee rule, if applicable." },
      { label: "Upload Advice", value: "Scan and upload the required documents in the format asked on the official portal." }
    ],
    eligibility: [
      { label: "Who Can Apply", value: "Candidates who meet the post-wise eligibility, qualification, and other official conditions mentioned in Advertisement No. 339." },
      { label: "Qualification", value: "Read the official VSSC advertisement carefully for exact subject, degree, and score requirements." },
      { label: "Documents Needed", value: "Keep degree certificate, marksheets, score proof, age proof, and category certificate ready if applicable." }
    ],
    importantLinks: [
      { label: "VSSC Advertisement Page", url: "https://www.vssc.gov.in/advt339.html", type: "primary" },
      { label: "VSSC Apply Portal", url: "https://rmt.vssc.gov.in/", type: "secondary" },
      { label: "VSSC Official Website", url: "https://www.vssc.gov.in/", type: "secondary" }
    ],
    howToApply: [
      "Open the official VSSC advertisement page and read the notice completely.",
      "Check the eligibility conditions and prepare the required documents in advance.",
      "Visit the official apply portal and complete the online form carefully.",
      "Submit the application before 05 May 2026, 17:00 Hrs and save the acknowledgment."
    ],
    beforeYouStart: [
      "This application window is time-sensitive, so do not wait until the last hour to submit.",
      "Match your qualification and score requirements with the official advertisement before applying."
    ]
  })
];

function main() {
  const data = readJson(DATA_PATH);
  const bySlug = new Map(data.map((post) => [post.slug, post]));

  for (const post of POSTS) {
    bySlug.set(post.slug, {
      ...(bySlug.get(post.slug) || {}),
      ...post
    });
  }

  const next = Array.from(bySlug.values()).sort(byRecent);
  writeJson(DATA_PATH, next);

  console.log(JSON.stringify({
    upsertedPosts: POSTS.length,
    totalPosts: next.length
  }, null, 2));
}

main();
