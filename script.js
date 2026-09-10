const API = "http://127.0.0.1:5000";

// ================= PDF FILE SELECTION =================

const pdfFile = document.getElementById("pdfFile");
const fileName = document.getElementById("fileName");

if (pdfFile) {
    pdfFile.addEventListener("change", function () {
        if (this.files.length > 0) {
            fileName.textContent = this.files[0].name;
        } else {
            fileName.textContent = "No file selected";
        }
    });
}


// ================= GET PDF =================

function getPDFFormData() {
    const file = pdfFile.files[0];

    if (!file) {
        alert("Please select a PDF file first.");
        return null;
    }

    const formData = new FormData();
    formData.append("file", file);

    return formData;
}


// ================= PDF API REQUEST =================

async function postPDF(endpoint, extraData = {}) {
    const formData = getPDFFormData();

    if (!formData) return null;

    for (const key in extraData) {
        formData.append(key, extraData[key]);
    }

    const response = await fetch(API + endpoint, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error("Server error: " + response.status);
    }

    return await response.json();
}


// ================= AI SUMMARY =================

async function generateSummary() {
    const result = document.getElementById("summaryResult");

    result.innerHTML = "⏳ Generating summary...";

    try {
        const data = await postPDF("/upload");

        if (data && data.summary) {
            result.innerHTML = formatText(data.summary);
        } else {
            result.innerHTML = "❌ Could not generate summary.";
        }

    } catch (error) {
        console.error(error);

        result.innerHTML =
            "❌ Could not connect to backend.<br>" +
            "Make sure Flask and Ollama are running.";
    }
}


// ================= ASK AI =================

async function askAI() {
    const question = document.getElementById("questionInput").value.trim();
    const result = document.getElementById("askResult");

    if (!question) {
        result.innerHTML = "Please enter a question.";
        return;
    }

    result.innerHTML = "⏳ AI is thinking...";

    try {
        const data = await postPDF("/ask", {
            question: question
        });

        if (data && data.answer) {
            result.innerHTML = formatText(data.answer);
        } else {
            result.innerHTML = "❌ Could not get an answer.";
        }

    } catch (error) {
        console.error(error);
        result.innerHTML = "❌ Error connecting to AI.";
    }
}


// ================= AI QUIZ =================

let quizData = [];

async function generateQuiz() {
    const result = document.getElementById("quizResult");
    const count = document.getElementById("quizCount").value;

    result.innerHTML = "⏳ Generating quiz...";

    try {
        const data = await postPDF("/quiz", {
            count: count
        });

        if (!data || !data.quiz) {
            result.innerHTML = "❌ Could not generate quiz.";
            return;
        }

        quizData = data.quiz;

        let html = "";

        quizData.forEach((question, index) => {
            html += `
                <div class="quiz-question">
                    <h4>Q${index + 1}. ${escapeHTML(question.question)}</h4>
            `;

            question.options.forEach((option, optionIndex) => {
                html += `
                    <label class="quiz-option">
                        <input 
                            type="radio"
                            name="question${index}"
                            value="${optionIndex}"
                        >
                        ${escapeHTML(option)}
                    </label>
                `;
            });

            html += `</div>`;
        });

        html += `
            <button onclick="showQuizAnswers()">
                Check Answers
            </button>
        `;

        result.innerHTML = html;

    } catch (error) {
        console.error(error);
        result.innerHTML =
            "❌ Quiz generation failed. Please try again.";
    }
}


// ================= CHECK QUIZ ANSWERS =================

function showQuizAnswers() {
    let score = 0;

    quizData.forEach((question, index) => {

        const selected = document.querySelector(
            `input[name="question${index}"]:checked`
        );

        if (selected) {
            const answer = parseInt(selected.value);

            if (answer === question.answer) {
                score++;
            }
        }
    });

    const total = quizData.length;

    const percentage = total > 0
        ? Math.round((score / total) * 100)
        : 0;

    const result = document.getElementById("quizResult");

    result.innerHTML += `
        <div class="quiz-answer">
            <h3>🎯 Your Score: ${score}/${total}</h3>
            <p>Percentage: ${percentage}%</p>
        </div>
    `;
}


// ================= FLASHCARDS =================

async function generateFlashcards() {
    const result = document.getElementById("flashcardResult");
    const count = document.getElementById("flashcardCount").value;

    result.innerHTML = "⏳ Creating flashcards...";

    try {
        const data = await postPDF("/flashcards", {
            count: count
        });

        if (!data || !data.flashcards) {
            result.innerHTML = "❌ Could not create flashcards.";
            return;
        }

        let html = "";

        data.flashcards.forEach((card, index) => {

            html += `
                <div class="flashcard">
                    <h4>📚 Card ${index + 1}</h4>

                    <p>
                        <strong>Question:</strong>
                        ${escapeHTML(card.question)}
                    </p>

                    <p>
                        <strong>Answer:</strong>
                        ${escapeHTML(card.answer)}
                    </p>
                </div>
            `;
        });

        result.innerHTML = html;

    } catch (error) {
        console.error(error);
        result.innerHTML =
            "❌ Flashcard generation failed.";
    }
}


// ================= EXAM PLANNER =================

async function createPlan() {

    const subject = document.getElementById("subject").value.trim();
    const examDate = document.getElementById("examDate").value;
    const studyTime = document.getElementById("studyTime").value;

    const result = document.getElementById("planResult");

    if (!subject || !examDate) {
        result.innerHTML =
            "Please enter subject and exam date.";
        return;
    }

    result.innerHTML = "⏳ Creating your study plan...";

    try {

        const response = await fetch(API + "/plan", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                subject: subject,
                exam_date: examDate,
                study_time: studyTime
            })
        });

        if (!response.ok) {
            throw new Error("Server error");
        }

        const data = await response.json();

        if (data.plan) {
            result.innerHTML = formatText(data.plan);
        } else {
            result.innerHTML =
                "❌ Could not create study plan.";
        }

    } catch (error) {

        console.error(error);

        result.innerHTML =
            "❌ Could not connect to backend.";
    }
}


// ================= FORMAT AI TEXT =================

function formatText(text) {

    if (!text) return "";

    return escapeHTML(text)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
}


// ================= SECURITY =================

function escapeHTML(text) {

    if (text === undefined || text === null) {
        return "";
    }

    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}