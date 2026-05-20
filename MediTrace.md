Implementation Guide for You: The MediTrace Ledger
The Core Concept The application is a Digital Health Ledger that transforms unstructured medical reports into a hyperlinked, verifiable biography. The central technical challenge is to link AI-generated text back to image coordinates on a scanned document to provide "Citations."

1. The Ingestion Pipeline The user uploads a photo (JPG/PNG) or PDF. The system must first store this file in a Supabase Storage Bucket. Once stored, a background process must trigger two actions:

OCR Analysis: Use an OCR engine (like Google Cloud Vision) to extract not just the text, but the bounding boxes (pixel coordinates) for every word and sentence. Store this raw JSON in the database.
AI Extraction: Send the extracted text to an LLM (Gemini 1.5 Flash). Instruct the LLM to return a structured JSON list of "Medical Insights" (e.g., Blood Sugar, Medication Name, Diagnosis). For each insight, the AI must also provide the exact "Source Snippet"—the literal string of text it found in the report. 2. The Citation Engine (The "Linking" Logic) This is the most critical part. You must implement a matching algorithm that takes the Source Snippet from the AI and finds its corresponding Bounding Box from the OCR data.

Storage: Save these insights into an insights table, where each record contains the label, the value, and the specific coordinates from the original image. 3. The "Living Book" UI The frontend should not look like a standard dashboard; it should look like a readable biography.

The Narrative: Use an LLM to generate an "Overall Summary" of the patient's entire history.
Hyperlinking: Any medical fact in that summary (e.g., "Diagnosed with Hypertension in 2023") should be rendered as a clickable hyperlink.
The Source Viewer: When a hyperlink is clicked, the app should open a side-by-side view. On one side is the summary; on the other is the original uploaded image. The app must use the stored coordinates to draw a highlight box (using CSS or Canvas) directly over the text on the image that proves the summary's claim. 4. Chronological Management & Self-Correction The system must maintain a strict Time-Series logic.

Timeline View: Display all reports in a vertical, chronological feed.
Dynamic Re-summarization: If a user deletes a "wrong" report, the system must trigger a "re-sync." It should gather the remaining insights and prompt the LLM to rewrite the "Executive Health Biography" to ensure the book is always accurate.
Trend Tracking: For numerical data (like Blood Pressure or HbA1c), the system should automatically plot these values on a line chart to show health trends over years.
