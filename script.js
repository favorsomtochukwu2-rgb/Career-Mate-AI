// CareerMate AI - JavaScript starter
/** @type {Record<string, {title:string, button:string, result:string, apiTool:string}>} */
const info = {
  letter: {
    title: "Application letter",
    button: "Generate letter",
    result: "Application letter draft",
    apiTool: "application-letter"
  },
  cv: {
    title: "CV summary",
    button: "Create CV summary",
    result: "CV summary draft",
    apiTool: "cv-summary"
  },
  interview: {
    title: "Interview coach",
    button: "Prepare my answer",
    result: "Interview answer draft",
    apiTool: "interview-coach"
  },
  tailor: {
    title: "Job description tailor",
    button: "Tailor my application",
    result: "Tailored application draft",
    apiTool: "job-description-tailor"
  }
};

/** @type {string} */
let current = "letter";

/** @param {string} id */
const $ = (id) => document.getElementById(id);

// ========== CHANGE THIS TO YOUR REAL RENDER URL ==========
const BACKEND_URL = "https://careermate-backend-mx51.onrender.com";
// ========================================================

/** @param {string} key */
function selectTool(key) {
  if (!info[key]) return;
  current = key;
  $("toolTitle").textContent = info[key].title;
  $("generate").textContent = info[key].button + " →";
  $("questionBox").hidden = key !== "interview";

  document.querySelectorAll(".tool").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === key);
  });
  document.querySelectorAll("nav a").forEach((link) => link.classList.remove("selected"));
  const navLink = document.querySelector(`[data-nav="${key}"]`);
  if (navLink) navLink.classList.add("selected");

  $("workspace").scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelectorAll(".tool").forEach((button) => {
  button.addEventListener("click", () => selectTool(button.dataset.tool));
});
document.querySelectorAll("[data-nav]").forEach((link) => {
  link.addEventListener("click", () => selectTool(link.dataset.nav));
});

$("form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const values = {
    name: $("name").value.trim(),
    job: $("job").value.trim(),
    qualification: $("qualification").value.trim(),
    experience: $("experience").value,
    skills: $("skills").value.trim(),
    description: $("description").value.trim(),
    question: $("question").value.trim()
  };

  if (!values.job || !values.skills) {
    alert("Please enter your target job and skills.");
    return;
  }

  const generateButton = $("generate");
  generateButton.disabled = true;
  generateButton.textContent = "Generating with AI...";

  // Build a clear input for the AI
  let inputText = `Name: ${values.name || "Not provided"}
Job title: ${values.job}
Qualification: ${values.qualification || "Not provided"}
Experience level: ${values.experience}
Skills: ${values.skills}`;

  if (values.description) {
    inputText += `\n\nJob description:\n${values.description}`;
  }

  if (current === "interview" && values.question) {
    inputText += `\n\nInterview question: ${values.question}`;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        tool: info[current].apiTool,
        input: inputText
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    $("result").value = data.result || "No result returned.";
    $("resultBox").hidden = false;
    $("resultBox").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    alert("AI generation failed. Please try again.\n\n" + error.message);
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = info[current].button + " →";
  }
});

$("copy").addEventListener("click", async () => {
  const copyButton = $("copy");
  const result = /** @type {HTMLTextAreaElement} */ ($("result"));

  try {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      throw new Error("Clipboard API unavailable");
    }
    await navigator.clipboard.writeText(result.value);
    copyButton.textContent = "Copied ✓";
  } catch {
    result.focus();
    result.select();
    copyButton.textContent = "Text selected — use Copy";
  }

  window.setTimeout(() => {
    copyButton.textContent = "Copy result";
  }, 2200);
});

$("download").addEventListener("click", async () => {
  const content = $("result").value;

  if (!content.trim()) {
    alert("Please generate a result first.");
    return;
  }

  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8"
  });

  const file = new File(
    [blob],
    `CareerMate-${current || "result"}.txt`,
    { type: "text/plain" }
  );

  if (navigator.share && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "CareerMate AI Result"
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        alert("Sharing failed. Please try again.");
      }
    }
  } else {
    alert("File sharing is not supported here. Please use Copy Result to save your text.");
  }
});