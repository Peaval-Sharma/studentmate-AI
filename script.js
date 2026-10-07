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
    function openResultWindow(title, content) {
    const newWindow = window.open("", "_blank");

    if (!newWindow) {
        alert("Please allow pop-ups for this website.");
        return;
    }

    newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    line-height: 1.6;
                    background: #f5f7fb;
                }

                .result-box {
                    max-width: 900px;
                    margin: auto;
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                }

                h1 {
                    margin-bottom: 25px;
                }
            </style>
        </head>
        <body>
            <div class="result-box">
                <h1>${title}</h1>
                ${content}
            </div>
        </body>
        </html>
    `);

    newWindow.document.close();
}

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

    // Open window immediately to avoid popup blocker
    const resultWindow = window.open("", "_blank");

    if (!resultWindow) {
        alert("Please allow pop-ups for this website.");
        return;
    }

    resultWindow.document.write(`
        <html>
        <head>
            <title>StudyMate AI - Summary</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    line-height: 1.6;
                    background: #f5f7fb;
                }

                .result-box {
                    max-width: 900px;
                    margin: auto;
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                }

                h1 {
                    margin-bottom: 25px;
                }
            </style>
        </head>
        <body>
            <div class="result-box">
                <h1>⏳ Generating Summary...</h1>
            </div>
        </body>
        </html>
    `);

    try {
        const data = await postPDF("/upload");

        if (data && data.summary) {
            resultWindow.document.querySelector(".result-box").innerHTML = `
                <h1>📚 StudyMate AI - Summary</h1>
                ${formatText(data.summary)}
            `;
        } else {
            resultWindow.document.querySelector(".result-box").innerHTML = `
                <h1>❌ Could not generate summary.</h1>
            `;
        }

    } catch (error) {
        console.error(error);

        resultWindow.document.querySelector(".result-box").innerHTML = `
            <h1>❌ Could not connect to backend.</h1>
            <p>Make sure Flask and Ollama are running.</p>
        `;
    }
}



// ================= ASK AI =================

async function askAI() {
    const question = document.getElementById("questionInput").value.trim();

    if (!question) {
        alert("Please enter a question.");
        return;
    }

    // Open window immediately
    const resultWindow = window.open("", "_blank");

    if (!resultWindow) {
        alert("Please allow pop-ups for this website.");
        return;
    }

    resultWindow.document.write(`
        <html>
        <head>
            <title>StudyMate AI - AI Answer</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    line-height: 1.6;
                    background: #f5f7fb;
                }

                .result-box {
                    max-width: 900px;
                    margin: auto;
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                }
            </style>
        </head>
        <body>
            <div class="result-box">
                <h1>⏳ AI is thinking...</h1>
            </div>
        </body>
        </html>
    `);

    try {
        const data = await postPDF("/ask", {
            question: question
        });

        if (data && data.answer) {
            resultWindow.document.querySelector(".result-box").innerHTML = `
                <h1>🤖 AI Answer</h1>
                ${formatText(data.answer)}
            `;
        } else {
            resultWindow.document.querySelector(".result-box").innerHTML =
                "<h1>❌ Could not get an answer.</h1>";
        }

    } catch (error) {
        console.error(error);

        resultWindow.document.querySelector(".result-box").innerHTML =
            "<h1>❌ Could not connect to AI.</h1>";
    }
}

// ================= AI QUIZ =================

let quizData = [];
let quizWindow= null;
async function generateQuiz() {
    const count = document.getElementById("quizCount").value;

    // Open window immediately
    quizWindow = window.open("", "_blank");

    if (!quizWindow) {
        alert("Please allow pop-ups for this website.");
        return;
    }

    quizWindow.document.write(`
        <html>
        <head>
            <title>StudyMate AI - Quiz</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    line-height: 1.6;
                    background: #f5f7fb;
                }

                .quiz-box {
                    max-width: 900px;
                    margin: auto;
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                }

                .quiz-question {
                    margin-bottom: 25px;
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 10px;
                }

                .quiz-option {
                    display: block;
                    padding: 8px;
                    cursor: pointer;
                }

                button {
                    padding: 12px 20px;
                    cursor: pointer;
                    border: none;
                    border-radius: 8px;
                }

                .quiz-answer {
                    margin-top: 25px;
                    padding: 20px;
                    border-radius: 10px;
                    background: #eef6ff;
                }
            </style>
        </head>

        <body>
            <div class="quiz-box">
                <h1>⏳ Generating Quiz...</h1>
            </div>
        </body>
        </html>
    `);

    try {
        const data = await postPDF("/quiz", {
            count: count
        });

        if (!data || !data.quiz) {
            quizWindow.document.querySelector(".quiz-box").innerHTML =
                "<h1>❌ Could not generate quiz.</h1>";
            return;
        }

        quizData = data.quiz;

        let html = `
            <h1>📝 StudyMate AI Quiz</h1>
        `;

        quizData.forEach((question, index) => {

            html += `
                <div class="quiz-question">
                    <h3>Q${index + 1}. ${escapeHTML(question.question)}</h3>
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
            <button onclick="window.opener.showQuizAnswers()">
                Check Answers
            </button>

            <div id="quizScore"></div>
        `;

        quizWindow.document.querySelector(".quiz-box").innerHTML = html;

    } catch (error) {

        console.error(error);

        quizWindow.document.querySelector(".quiz-box").innerHTML =
            "<h1>❌ Quiz generation failed.</h1>";
    }
}

// ================= CHECK QUIZ ANSWERS =================

function showQuizAnswers() {
    if (!quizWindow || quizWindow.closed) {
        alert("Quiz window is closed.");
        return;
    }

    let score = 0;

    quizData.forEach((question, index) => {

        const selected = quizWindow.document.querySelector(
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

    const scoreBox = quizWindow.document.getElementById("quizScore");

    scoreBox.innerHTML = `
        <div class="quiz-answer">
            <h2>🎯 Your Score: ${score}/${total}</h2>
            <p>Percentage: ${percentage}%</p>
        </div>
    `;
}


// ================= FLASHCARDS =================

async function generateFlashcards() {
    const count = document.getElementById("flashcardCount").value;

    // Open window immediately
    const resultWindow = window.open("", "_blank");

    if (!resultWindow) {
        alert("Please allow pop-ups for this website.");
        return;
    }

    resultWindow.document.write(`
        <html>
        <head>
            <title>StudyMate AI - Flashcards</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    line-height: 1.6;
                    background: #f5f7fb;
                }

                .result-box {
                    max-width: 900px;
                    margin: auto;
                }

                .flashcard {
                    background: white;
                    padding: 20px;
                    margin-bottom: 20px;
                    border-radius: 12px;
                    border: 1px solid #ddd;
                }

                .flashcard h3 {
                    margin-top: 0;
                }
            </style>
        </head>

        <body>
            <div class="result-box">
                <h1>⏳ Creating Flashcards...</h1>
            </div>
        </body>
        </html>
    `);

    try {
        const data = await postPDF("/flashcards", {
            count: count
        });

        if (!data || !data.flashcards) {
            resultWindow.document.querySelector(".result-box").innerHTML =
                "<h1>❌ Could not create flashcards.</h1>";
            return;
        }

        let html = `
            <h1>📚 StudyMate AI Flashcards</h1>
        `;

        data.flashcards.forEach((card, index) => {

            html += `
                <div class="flashcard">
                    <h3>📚 Card ${index + 1}</h3>

                    <p>
                        <strong>Question:</strong><br>
                        ${escapeHTML(card.question)}
                    </p>

                    <p>
                        <strong>Answer:</strong><br>
                        ${escapeHTML(card.answer)}
                    </p>
                </div>
            `;
        });

        resultWindow.document.querySelector(".result-box").innerHTML = html;

    } catch (error) {

        console.error(error);

        resultWindow.document.querySelector(".result-box").innerHTML =
            "<h1>❌ Flashcard generation failed.</h1>";
    }
}


// ================= EXAM PLANNER =================

async function createPlan() {

    const subject = document.getElementById("subject").value.trim();
    const examDate = document.getElementById("examDate").value;
    const studyTime = document.getElementById("studyTime").value;

    if (!subject || !examDate) {
        alert("Please enter subject and exam date.");
        return;
    }

    const resultWindow = window.open("", "_blank");

    if (!resultWindow) {
        alert("Please allow pop-ups for this website.");
        return;
    }

    resultWindow.document.write(
        "<html>" +
        "<head>" +
        "<title>StudyMate AI - Study Plan</title>" +
        "<style>" +
        "body {" +
        "font-family: Arial, sans-serif;" +
        "padding: 30px;" +
        "line-height: 1.6;" +
        "background: #f5f7fb;" +
        "}" +
        ".result-box {" +
        "max-width: 900px;" +
        "margin: auto;" +
        "background: white;" +
        "padding: 30px;" +
        "border-radius: 12px;" +
        "}" +
        "h1 { margin-bottom: 25px; }" +
        "</style>" +
        "</head>" +
        "<body>" +
        "<div class='result-box'>" +
        "<h1>⏳ Creating your study plan...</h1>" +
        "</div>" +
        "</body>" +
        "</html>"
    );

    try {
try {

    const formData = new FormData();

    formData.append("subject", subject);
    formData.append("examDate", examDate);
    formData.append("studyTime", studyTime);

    const response = await fetch(API + "/plan", {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    console.log("Backend response:", data);

    const resultBox = resultWindow.document.querySelector(".result-box");

    if (response.ok && data.plan) {

        resultBox.innerHTML =
            "<h1>📅 StudyMate AI - Exam Planner</h1>" +
            formatText(data.plan);

    } else {

        resultBox.innerHTML =
            "<h1>❌ Backend Error</h1>" +
            "<p>" + (data.error || "Unknown backend error") + "</p>";
    }

} catch (error) {

    console.error("PLAN ERROR:", error);

    resultWindow.document.querySelector(".result-box").innerHTML =
        "<h1>❌ Actual Error</h1>" +
        "<p>" + error.message + "</p>";
}

    } catch (error) {

        console.error(error);

        resultWindow.document.querySelector(".result-box").innerHTML =
            "<h1>❌ Could not connect to backend.</h1>" +
            "<p>Make sure Flask and Ollama are running.</p>";
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