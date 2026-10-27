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

// ========== PAYSTACK SETTINGS ==========
const PAYSTACK_PUBLIC_KEY = "pk_test_6d7f71e351b386a15a8b9817e256b7ec05b3a9fb";
const PREMIUM_PRICE = 1500 * 100; // ₦1500 in kobo
const FREE_LIMIT = 3; // Number of free generations
// ======================================

function getUsage() {
  const data = localStorage.getItem("careermate_usage");
  return data ? JSON.parse(data) : { count: 0, premiumUntil: null };
}

function saveUsage(data) {
  localStorage.setItem("careermate_usage", JSON.stringify(data));
}

function isPremium() {
  const usage = getUsage();
  if (!usage.premiumUntil) return false;
  return new Date(usage.premiumUntil) > new Date();
}

function canGenerate() {
  if (isPremium()) return true;
  const usage = getUsage();
  return usage.count < FREE_LIMIT;
}

function increaseUsage() {
  if (isPremium()) return;
  const usage = getUsage();
  usage.count += 1;
  saveUsage(usage);
}

function activatePremium() {
  const usage = getUsage();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30); // 30 days
  usage.premiumUntil = expiry.toISOString();
  usage.count = 0;
  saveUsage(usage);
  alert("Payment successful! You now have unlimited access for 30 days.");
}


function payWithPaystack() {
  if (typeof PaystackPop === "undefined") {
    alert("Paystack did not load. Please refresh and try again.");
    return;
  }
  alert("Paystack loaded: " + typeof PaystackPop);
console.log("PaystackPop:", PaystackPop);
  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: "customer@example.com",
    amount: PREMIUM_PRICE,
    currency: "NGN",
    ref: "CM_" + Date.now(),

    callback: async function(response) {
      try {
        const verification = await fetch(
          `${BACKEND_URL}/api/verify-payment`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              reference: response.reference
            })
          }
        );

        const result = await verification.json();

        if (verification.ok && result.verified === true) {
          activatePremium();
          alert("Payment verified! CareerMate AI Premium is now active.");
        } else {
          alert("We could not verify your payment. Please contact support if you were charged.");
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        alert("We could not verify your payment right now. Please try again or contact support if you were charged.");
      }
    },

    onClose: function() {
      alert("Payment cancelled.");
    }
  });

  try {
  handler.openIframe();
} catch (error) {
  console.error("Paystack checkout error:", error);
  alert("Paystack could not open. Please try Chrome or check your internet connection.");
    };
}

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

  // Check if user can generate
  if (!canGenerate()) {
    const confirmPay = confirm(
      `You have used your ${FREE_LIMIT} free generations.\n\nPay ₦1,500 to unlock unlimited access for 30 days?`
    );
    if (confirmPay) {
  alert("Opening Paystack...");
  payWithPaystack();
    }
    return;
  }

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

  // Build input for AI
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

    // Count this generation
    increaseUsage();

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
