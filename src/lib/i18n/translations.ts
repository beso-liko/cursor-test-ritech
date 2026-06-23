export type Locale = "en" | "sq";

const en = {
  // Sidebar
  "sidebar.brand": "StudyBuddy",
  "sidebar.tagline": "AI-powered learning",
  "sidebar.nav.label": "Navigation",
  "sidebar.nav.dashboard": "Dashboard",
  "sidebar.nav.dashboard.desc": "Overview & stats",
  "sidebar.nav.documents": "Documents",
  "sidebar.nav.documents.desc": "Your study materials",
  "sidebar.nav.upload": "Upload",
  "sidebar.nav.upload.desc": "Add new documents",
  "sidebar.features.label": "What you can do",
  "sidebar.features.summaries": "AI Summaries",
  "sidebar.features.flashcards": "Smart Flashcards",
  "sidebar.features.quizzes": "Auto Quizzes",
  "sidebar.footer": "Powered by GPT-4o mini",

  // Dashboard
  "dashboard.title": "Dashboard",
  "dashboard.subtitle": "Your AI-powered study workspace",
  "dashboard.upload": "Upload Document",
  "dashboard.stats.documents": "Documents",
  "dashboard.stats.documents.desc": "Total uploaded",
  "dashboard.stats.flashcards": "Flashcards",
  "dashboard.stats.flashcards.desc": "Generated cards",
  "dashboard.stats.quizzes": "Quizzes",
  "dashboard.stats.quizzes.desc": "Created quizzes",
  "dashboard.stats.attempts": "Attempts",
  "dashboard.stats.attempts.desc": "Quizzes taken",
  "dashboard.recent": "Recent Documents",
  "dashboard.viewAll": "View all",
  "dashboard.empty.title": "No documents yet",
  "dashboard.empty.desc":
    "Upload your first study document to get started with AI-powered summaries, flashcards, and quizzes.",
  "dashboard.empty.cta": "Upload your first document",

  // Upload Page
  "upload.title": "Upload Document",
  "upload.subtitle":
    "Supported: PDF, DOCX, PPTX, TXT, PNG, JPEG, HEIC, HEIF, DNG, RAW — up to 20MB",
  "upload.whatNext": "What happens next",
  "upload.feature.instant.title": "Instant Processing",
  "upload.feature.instant.desc": "Text is extracted and indexed in seconds",
  "upload.feature.ai.title": "AI-Powered",
  "upload.feature.ai.desc":
    "Generate summaries, flashcards, and quizzes automatically",
  "upload.feature.secure.title": "Secure Storage",
  "upload.feature.secure.desc": "Files stored securely in Supabase",

  // Documents Page
  "documents.title": "Documents",
  "documents.count.one": "1 document",
  "documents.count.other": "{n} documents",
  "documents.upload": "Upload",
  "documents.search": "Search documents…",
  "documents.empty.title": "No documents yet",
  "documents.empty.desc": "Upload a study document to get started.",
  "documents.empty.cta": "Upload document",
  "documents.noMatch": 'No documents match "{search}"',
  "documents.delete.confirm": "Delete this document? This cannot be undone.",

  // Document Detail Page
  "document.back": "All documents",
  "document.status.ready": "Ready",
  "document.status.processing": "Processing",
  "document.status.error": "Error",
  "document.chunksIndexed": "{n} chunks indexed",
  "document.added": "Added {date}",
  "document.processing.message":
    "This document is being processed. Please refresh in a moment.",
  "document.error.message":
    "Failed to process this document. Please try uploading again.",
  "document.tab.summary": "Summary",
  "document.tab.flashcards": "Flashcards",
  "document.tab.quiz": "Quiz",
  "document.tab.chat": "Chat",

  // DocumentCard
  "card.status.ready": "Ready",
  "card.status.processing": "Processing",
  "card.status.error": "Error",
  "card.chunks": "{n} chunks",

  // FileUploader
  "uploader.drop": "Drop your files here, or",
  "uploader.browse": "browse",
  "uploader.formats":
    "PDF, DOCX, PPTX, TXT, PNG, JPEG, HEIC, HEIF, DNG, RAW — up to {max}MB each",
  "uploader.addMore": "Add more files",
  "uploader.error.type":
    "Unsupported file type. Please upload PDF, DOCX, PPTX, TXT, PNG, JPEG, HEIC, HEIF, DNG, or RAW.",
  "uploader.error.size": "File too large. Maximum size is {max}MB.",
  "uploader.status.uploading": "Uploading file…",
  "uploader.status.processing": "Extracting and indexing…",
  "uploader.status.done": "Done! Redirecting…",
  "uploader.button.upload": "Upload & Process",
  "uploader.button.uploadAll": "Upload & Process {n} Files",
  "uploader.button.retry": "Try again",

  // Group detail page
  "group.title": "Study Set ({n} files)",
  "group.files": "Files in this set",
  "group.viewDoc": "View",

  // SummaryPanel
  "summary.generating": "Generating summary with AI…",
  "summary.empty.title": "No summary yet",
  "summary.empty.desc":
    "Generate an AI-powered summary of your document including key points and topics.",
  "summary.error": "Failed to generate summary. Please try again.",
  "summary.generate": "Generate Summary",
  "summary.title": "Summary",
  "summary.keyPoints": "Key Points",
  "summary.topics": "Topics Covered",

  // FlashcardViewer
  "flashcards.generating": "Generating flashcards with AI…",
  "flashcards.empty.title": "No flashcards yet",
  "flashcards.empty.desc":
    "Generate AI flashcards to test your knowledge of key concepts.",
  "flashcards.error": "Failed to generate flashcards. Please try again.",
  "flashcards.generate": "Generate Flashcards",
  "flashcards.restart": "Restart",
  "flashcards.question": "Question",
  "flashcards.answer": "Answer",
  "flashcards.reveal": "Click to reveal answer",

  // QuizInterface
  "quiz.generating": "Generating quiz with AI…",
  "quiz.empty.title": "No quiz yet",
  "quiz.empty.desc":
    "Generate a 10-question multiple choice quiz to test your understanding.",
  "quiz.error": "Failed to generate quiz. Please try again.",
  "quiz.generate": "Generate Quiz",
  "quiz.ready.title": "Quiz ready",
  "quiz.ready.questions": "{n} multiple choice questions",
  "quiz.start": "Start Quiz",
  "quiz.result.excellent": "Excellent!",
  "quiz.result.good": "Good job!",
  "quiz.result.keep": "Keep studying!",
  "quiz.result.practice": "Need more practice",
  "quiz.result.score": "{score} / {total} correct",
  "quiz.result.correct": "Correct: {answer}",
  "quiz.retake": "Retake Quiz",
  "quiz.question": "Question {current} of {total}",
  "quiz.progress": "{pct}% complete",
  "quiz.explanation": "Explanation",
  "quiz.next": "Next Question",
  "quiz.seeResults": "See Results",

  // ChatInterface
  "chat.title": "Chat with your document",
  "chat.desc":
    "Ask any question about the content. The AI will answer based on your document.",
  "chat.suggestion.1": "Summarize the main idea",
  "chat.suggestion.2": "What are the key concepts?",
  "chat.suggestion.3": "Explain the most important topic",
  "chat.placeholder": "Ask anything about this document…",
  "chat.hint": "Press Enter to send · Shift+Enter for new line",
};

const sq: typeof en = {
  // Sidebar
  "sidebar.brand": "StudyBuddy",
  "sidebar.tagline": "Mësim i fuqizuar nga AI",
  "sidebar.nav.label": "Navigimi",
  "sidebar.nav.dashboard": "Paneli",
  "sidebar.nav.dashboard.desc": "Pasqyrë & statistika",
  "sidebar.nav.documents": "Dokumentet",
  "sidebar.nav.documents.desc": "Materialet e studimit",
  "sidebar.nav.upload": "Ngarko",
  "sidebar.nav.upload.desc": "Shto dokumente të reja",
  "sidebar.features.label": "Çfarë mund të bëni",
  "sidebar.features.summaries": "Përmbledhje AI",
  "sidebar.features.flashcards": "Kartela Studimi",
  "sidebar.features.quizzes": "Kuize Automatike",
  "sidebar.footer": "Me fuqi nga GPT-4o mini",

  // Dashboard
  "dashboard.title": "Paneli",
  "dashboard.subtitle": "Hapësira juaj e studimit me AI",
  "dashboard.upload": "Ngarko Dokument",
  "dashboard.stats.documents": "Dokumentet",
  "dashboard.stats.documents.desc": "Gjithsej të ngarkuara",
  "dashboard.stats.flashcards": "Kartela Studimi",
  "dashboard.stats.flashcards.desc": "Kartela të gjeneruara",
  "dashboard.stats.quizzes": "Kuizet",
  "dashboard.stats.quizzes.desc": "Kuize të krijuara",
  "dashboard.stats.attempts": "Përpjekjet",
  "dashboard.stats.attempts.desc": "Kuize të kryera",
  "dashboard.recent": "Dokumentet e Fundit",
  "dashboard.viewAll": "Shih të gjitha",
  "dashboard.empty.title": "Nuk ka dokumente akoma",
  "dashboard.empty.desc":
    "Ngarkoni dokumentin tuaj të parë të studimit për të filluar me përmbledhje, kartela studimi dhe kuize të fuqizuara nga AI.",
  "dashboard.empty.cta": "Ngarkoni dokumentin e parë",

  // Upload Page
  "upload.title": "Ngarko Dokument",
  "upload.subtitle":
    "Mbështet: PDF, DOCX, PPTX, TXT, PNG, JPEG, HEIC, HEIF, DNG, RAW — deri në 20MB",
  "upload.whatNext": "Çfarë ndodh më pas",
  "upload.feature.instant.title": "Përpunim i Menjëhershëm",
  "upload.feature.instant.desc":
    "Teksti ekstraktohet dhe indeksohet në sekonda",
  "upload.feature.ai.title": "I Fuqizuar nga AI",
  "upload.feature.ai.desc":
    "Gjeneroni përmbledhje, kartela studimi dhe kuize automatikisht",
  "upload.feature.secure.title": "Ruajtje e Sigurt",
  "upload.feature.secure.desc":
    "Skedarët ruhen në mënyrë të sigurt në Supabase",

  // Documents Page
  "documents.title": "Dokumentet",
  "documents.count.one": "1 dokument",
  "documents.count.other": "{n} dokumente",
  "documents.upload": "Ngarko",
  "documents.search": "Kërko dokumente…",
  "documents.empty.title": "Nuk ka dokumente akoma",
  "documents.empty.desc": "Ngarkoni një dokument studimi për të filluar.",
  "documents.empty.cta": "Ngarko dokument",
  "documents.noMatch": 'Asnjë dokument nuk përputhet me "{search}"',
  "documents.delete.confirm":
    "Fshi këtë dokument? Kjo nuk mund të kthehet mbrapsht.",

  // Document Detail Page
  "document.back": "Të gjitha dokumentet",
  "document.status.ready": "Gati",
  "document.status.processing": "Duke u përpunuar",
  "document.status.error": "Gabim",
  "document.chunksIndexed": "{n} segmente të indeksuara",
  "document.added": "Shtuar {date}",
  "document.processing.message":
    "Ky dokument po përpunohet. Ju lutemi rifreskoni pas një çasti.",
  "document.error.message":
    "Dështoi përpunimi i këtij dokumenti. Ju lutemi ngarkojeni sërish.",
  "document.tab.summary": "Përmbledhje",
  "document.tab.flashcards": "Kartela Studimi",
  "document.tab.quiz": "Kuiz",
  "document.tab.chat": "Bisedë",

  // DocumentCard
  "card.status.ready": "Gati",
  "card.status.processing": "Duke u përpunuar",
  "card.status.error": "Gabim",
  "card.chunks": "{n} segmente",

  // FileUploader
  "uploader.drop": "Hidhni skedarët këtu, ose",
  "uploader.browse": "shfletoni",
  "uploader.formats":
    "PDF, DOCX, PPTX, TXT, PNG, JPEG, HEIC, HEIF, DNG, RAW — deri në {max}MB secili",
  "uploader.addMore": "Shtoni më shumë skedarë",
  "uploader.error.type":
    "Lloji i skedarit nuk mbështetet. Ngarkoni PDF, DOCX, PPTX, TXT, PNG, JPEG, HEIC, HEIF, DNG ose RAW.",
  "uploader.error.size": "Skedari është shumë i madh. Madhësia maksimale është {max}MB.",
  "uploader.status.uploading": "Duke ngarkuar skedarin…",
  "uploader.status.processing": "Duke ekstraktuar dhe indeksuar…",
  "uploader.status.done": "Gati! Duke ridrejtuar…",
  "uploader.button.upload": "Ngarko & Përpuno",
  "uploader.button.uploadAll": "Ngarko & Përpuno {n} Skedarë",
  "uploader.button.retry": "Provoni sërish",

  // Group detail page
  "group.title": "Set Studimi ({n} skedarë)",
  "group.files": "Skedarët në këtë set",
  "group.viewDoc": "Shiko",

  // SummaryPanel
  "summary.generating": "Duke gjeneruar përmbledhjen me AI…",
  "summary.empty.title": "Asnjë përmbledhje akoma",
  "summary.empty.desc":
    "Gjeneroni një përmbledhje të fuqizuar nga AI të dokumentit tuaj duke përfshirë pikat kryesore dhe temat.",
  "summary.error": "Dështoi gjenerimi i përmbledhjes. Ju lutemi provoni sërish.",
  "summary.generate": "Gjeneroni Përmbledhjen",
  "summary.title": "Përmbledhje",
  "summary.keyPoints": "Pikat Kryesore",
  "summary.topics": "Temat e Trajtuara",

  // FlashcardViewer
  "flashcards.generating": "Duke gjeneruar kartelat e studimit me AI…",
  "flashcards.empty.title": "Asnjë kartelë akoma",
  "flashcards.empty.desc":
    "Gjeneroni kartela studimi me AI për të testuar njohuritë tuaja mbi konceptet kryesore.",
  "flashcards.error":
    "Dështoi gjenerimi i kartelave. Ju lutemi provoni sërish.",
  "flashcards.generate": "Gjeneroni Kartelat",
  "flashcards.restart": "Rifillo",
  "flashcards.question": "Pyetje",
  "flashcards.answer": "Përgjigje",
  "flashcards.reveal": "Klikoni për të zbuluar përgjigjen",

  // QuizInterface
  "quiz.generating": "Duke gjeneruar kuizin me AI…",
  "quiz.empty.title": "Asnjë kuiz akoma",
  "quiz.empty.desc":
    "Gjeneroni një kuiz me 10 pyetje me zgjedhje të shumëfishtë për të testuar njohuritë tuaja.",
  "quiz.error": "Dështoi gjenerimi i kuizit. Ju lutemi provoni sërish.",
  "quiz.generate": "Gjeneroni Kuizin",
  "quiz.ready.title": "Kuizi gati",
  "quiz.ready.questions": "{n} pyetje me zgjedhje të shumëfishtë",
  "quiz.start": "Filloni Kuizin",
  "quiz.result.excellent": "Shkëlqyeshëm!",
  "quiz.result.good": "Punë e mirë!",
  "quiz.result.keep": "Vazhdoni të studioni!",
  "quiz.result.practice": "Nevojitet më shumë praktikë",
  "quiz.result.score": "{score} / {total} saktë",
  "quiz.result.correct": "Saktë: {answer}",
  "quiz.retake": "Rihy Kuizin",
  "quiz.question": "Pyetja {current} nga {total}",
  "quiz.progress": "{pct}% e kompletuar",
  "quiz.explanation": "Shpjegim",
  "quiz.next": "Pyetja Tjetër",
  "quiz.seeResults": "Shih Rezultatet",

  // ChatInterface
  "chat.title": "Bisedoni me dokumentin tuaj",
  "chat.desc":
    "Bëni çdo pyetje rreth përmbajtjes. AI do të përgjigjet bazuar në dokumentin tuaj.",
  "chat.suggestion.1": "Përmbledhni idenë kryesore",
  "chat.suggestion.2": "Cilat janë konceptet kryesore?",
  "chat.suggestion.3": "Shpjegoni temën më të rëndësishme",
  "chat.placeholder": "Pyesni çdo gjë rreth këtij dokumenti…",
  "chat.hint": "Shtypni Enter për të dërguar · Shift+Enter për rresht të ri",
};

export const translations: Record<Locale, typeof en> = { en, sq };
