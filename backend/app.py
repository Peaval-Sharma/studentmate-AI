from flask import Flask, request, jsonify
from flask_cors import CORS
from pypdf import PdfReader
from pdf2image import convert_from_bytes
import pytesseract
import requests
import json
import os
from datetime import date

app = Flask(__name__)
CORS(app)

# =========================
# SETTINGS
# =========================

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.2:3b"

# Tesseract location
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

# Poppler location
POPPLER_PATH = r"C:\Users\Lenovo\Downloads\Release-26.07.0-0\poppler-26.07.0\Library\bin"


# =========================
# OLLAMA
# =========================

def ask_ollama(prompt):
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3
                }
            },
            timeout=600
        )

        response.raise_for_status()

        data = response.json()
        return data.get("response", "").strip()

    except requests.exceptions.ConnectionError:
        raise Exception(
            "Ollama is not running. Start Ollama and try again."
        )

    except Exception as e:
        raise Exception(f"Ollama error: {str(e)}")


# =========================
# PDF TEXT EXTRACTION
# =========================

def extract_text_with_pypdf(file_bytes):
    """
    Try to extract normal selectable text from PDF.
    """

    try:
        from io import BytesIO

        reader = PdfReader(BytesIO(file_bytes))

        pages_text = []

        for page_number, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""

            if text.strip():
                pages_text.append(
                    f"\n--- Page {page_number} ---\n{text}"
                )

        return "\n".join(pages_text).strip()

    except Exception:
        return ""


# =========================
# OCR EXTRACTION
# =========================

def extract_text_with_ocr(file_bytes):
    """
    Convert PDF pages into images using Poppler
    and read them using Tesseract OCR.
    """

    try:
        print("No readable PDF text found.")
        print("Starting OCR...")

        images = convert_from_bytes(
            file_bytes,
            dpi=200,
            poppler_path=POPPLER_PATH
        )

        all_text = []

        for page_number, image in enumerate(images, start=1):

            print(f"OCR processing page {page_number}/{len(images)}...")

            # OCR
            text = pytesseract.image_to_string(
                image,
                config="--psm 6"
            )

            if text.strip():
                all_text.append(
                    f"\n--- Page {page_number} ---\n{text}"
                )

        result = "\n".join(all_text).strip()

        print("OCR completed.")

        return result

    except Exception as e:
        print("OCR ERROR:", e)
        raise Exception(f"OCR failed: {str(e)}")


# =========================
# GET PDF TEXT
# =========================

def get_pdf_text(file):
    """
    First try normal PDF extraction.
    If little/no text is found, automatically use OCR.
    """

    if not file:
        raise Exception("No file selected.")

    if not file.filename.lower().endswith(".pdf"):
        raise Exception("Please upload a PDF file.")

    file_bytes = file.read()

    if not file_bytes:
        raise Exception("Uploaded file is empty.")

    print("\n==============================")
    print("Processing:", file.filename)
    print("==============================")

    # First attempt: normal PDF
    text = extract_text_with_pypdf(file_bytes)

    # If enough text exists, use it
    if len(text.strip()) >= 100:
        print("Normal text PDF detected.")
        print("Extracted characters:", len(text))
        return text

    # Otherwise OCR
    print("Scanned/image PDF detected.")
    text = extract_text_with_ocr(file_bytes)

    if not text.strip():
        raise Exception(
            "Could not read any text from this PDF. "
            "The scan or handwriting may be too unclear."
        )

    print("OCR characters:", len(text))

    return text


# =========================
# HEALTH CHECK
# =========================

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "StudyMate AI backend is running",
        "model": MODEL,
        "ocr": "enabled"
    })


# =========================
# SUMMARY
# =========================

@app.route("/upload", methods=["POST"])
def upload_pdf():

    try:
        if "file" not in request.files:
            return jsonify({
                "error": "No file selected."
            }), 400

        file = request.files["file"]

        text = get_pdf_text(file)

        word_count = len(text.split())

        if word_count < 1500:
            length_instruction = """
Create a complete and detailed summary.
Cover all important information from the provided material.
"""
        elif word_count < 4000:
            length_instruction = """
Create approximately a 2-page detailed summary.
Cover the important concepts without unnecessary repetition.
"""
        elif word_count < 8000:
            length_instruction = """
Create approximately a 3-4 page detailed summary.
Organize the material topic-by-topic.
"""
        else:
            length_instruction = """
Create approximately a 4-6 page detailed summary.
Cover the major topics, concepts, definitions, examples and
important examination points.
"""

        prompt = f"""
You are StudyMate AI, an educational assistant.

The following text was extracted from a student's PDF.
It may have been extracted using OCR, so preserve the
meaning of the source and do not invent information.

{length_instruction}

Include:

1. Overview
2. Main topics
3. Important concepts
4. Definitions
5. Formulas or examples if present
6. Important exam points
7. Possible exam questions

Use clear headings and simple language.

STUDY MATERIAL:

{text}
"""

        summary = ask_ollama(prompt)

        return jsonify({
            "summary": summary,
            "word_count": word_count,
            "ocr_used": len(text) >= 100
        })

    except Exception as e:
        print("UPLOAD ERROR:", e)

        return jsonify({
            "error": str(e)
        }), 500


# =========================
# ASK AI
# =========================

@app.route("/ask", methods=["POST"])
def ask_ai():

    try:
        question = request.form.get("question", "").strip()

        if not question:
            return jsonify({
                "error": "Please enter a question."
            }), 400

        if "file" not in request.files:
            return jsonify({
                "error": "Please upload a PDF first."
            }), 400

        file = request.files["file"]

        text = get_pdf_text(file)

        prompt = f"""
You are StudyMate AI.

Answer the student's question using the study material
provided below.

If the answer is not present in the material, clearly say
that it is not available in the uploaded material.

Use simple student-friendly language.

QUESTION:
{question}

STUDY MATERIAL:
{text}
"""

        answer = ask_ollama(prompt)

        return jsonify({
            "answer": answer
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# =========================
# QUIZ
# =========================

@app.route("/quiz", methods=["POST"])
def quiz():

    try:
        count = request.form.get("count", "5")

        try:
            count = int(count)
        except:
            count = 5

        count = max(1, min(count, 20))

        if "file" not in request.files:
            return jsonify({
                "error": "Please upload a PDF first."
            }), 400

        file = request.files["file"]

        text = get_pdf_text(file)

        prompt = f"""
Create exactly {count} multiple-choice questions from
the study material below.

Return ONLY valid JSON.

Format:

[
  {{
    "question": "Question here",
    "options": [
      "Option A",
      "Option B",
      "Option C",
      "Option D"
    ],
    "answer": 0
  }}
]

The answer number must be:
0 = A
1 = B
2 = C
3 = D

Do not include markdown or any text outside JSON.

STUDY MATERIAL:

{text}
"""

        result = ask_ollama(prompt)

        result = result.replace("```json", "")
        result = result.replace("```", "")
        result = result.strip()

        quiz_data = json.loads(result)

        return jsonify({
            "quiz": quiz_data
        })

    except json.JSONDecodeError:
        return jsonify({
            "error": "AI returned an invalid quiz format. Please try again."
        }), 500

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# =========================
# FLASHCARDS
# =========================

@app.route("/flashcards", methods=["POST"])
def flashcards():

    try:
        count = request.form.get("count", "10")

        try:
            count = int(count)
        except:
            count = 10

        count = max(1, min(count, 30))

        if "file" not in request.files:
            return jsonify({
                "error": "Please upload a PDF first."
            }), 400

        file = request.files["file"]

        text = get_pdf_text(file)

        prompt = f"""
Create exactly {count} useful study flashcards from
the following material.

Return ONLY valid JSON.

Format:

[
  {{
    "question": "Question",
    "answer": "Answer"
  }}
]

Keep answers short but useful.

STUDY MATERIAL:

{text}
"""

        result = ask_ollama(prompt)

        result = result.replace("```json", "")
        result = result.replace("```", "")
        result = result.strip()

        cards = json.loads(result)

        return jsonify({
            "flashcards": cards
        })

    except json.JSONDecodeError:
        return jsonify({
            "error": "AI returned an invalid flashcard format. Please try again."
        }), 500

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# =========================
# STUDY PLAN
# =========================

@app.route("/plan", methods=["POST"])
def study_plan():

    try:
        subject = request.form.get("subject", "").strip()
        exam_date = request.form.get("examDate", "").strip()
        study_time = request.form.get("studyTime", "").strip()

        if not subject:
            return jsonify({
                "error": "Please enter a subject."
            }), 400

        if not exam_date:
            return jsonify({
                "error": "Please select an exam date."
            }), 400

        if not study_time:
            return jsonify({
                "error": "Please enter daily study time."
            }), 400

        prompt = f"""
Create a practical study plan for a B.Tech student.

Subject: {subject}
Exam date: {exam_date}
Daily study time: {study_time} hours

Today's date: {date.today()}

Include:
- Daily topics
- Revision sessions
- Practice questions
- Final revision
- Important topics first

Keep it realistic and easy to follow.
"""

        plan = ask_ollama(prompt)

        return jsonify({
            "plan": plan
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# =========================
# RUN SERVER
# =========================

if __name__ == "__main__":
    print("\n===================================")
    print("       StudyMate AI Backend")
    print("===================================")
    print("Ollama model:", MODEL)
    print("OCR: Enabled")
    print("Tesseract:", TESSERACT_PATH)
    print("Poppler:", POPPLER_PATH)
    print("Server: http://127.0.0.1:5000")
    print("===================================\n")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )