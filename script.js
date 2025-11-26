// ----- Keys for localStorage -----
const TASKS_KEY = "productivityTasks";
const NOTES_KEY = "productivityNotes";
const THEME_KEY = "productivityTheme";

// ----- State -----
let tasks = [];
let notes = [];
let currentFilter = "all";

// ----- DOM elements -----
const taskList = document.getElementById("task-list");
const noteList = document.getElementById("note-list");

// ========== Storage helpers ==========
function loadData() {
  const savedTasks = localStorage.getItem(TASKS_KEY);
  const savedNotes = localStorage.getItem(NOTES_KEY);

  tasks = savedTasks ? JSON.parse(savedTasks) : [];
  notes = savedNotes ? JSON.parse(savedNotes) : [];
}

function saveData() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

// Check if date string is real and not in past (empty is allowed)
function isValidDateString(dateStr) {
  if (!dateStr) return true; // optional

  // Parse the date components
  const [y, m, day] = dateStr.split("-").map(Number);

  // FIX: Use components to create a Date object in the LOCAL timezone.
  // This avoids the UTC interpretation that caused 'today' to become 'yesterday'.
  const taskDate = new Date(y, m - 1, day); // month is 0-indexed

  if (Number.isNaN(taskDate.getTime())) {
    return false;
  }
  
  // Set the task date to local midnight for comparison
  taskDate.setHours(0, 0, 0, 0);

  // Set today to local midnight for a precise day-level comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  
  // Final check to ensure the date is a real date (e.g., Feb 30)
  if (taskDate.getFullYear() !== y || taskDate.getMonth() !== m - 1 || taskDate.getDate() !== day) {
    return false;
  }
  
  // Comparison to allow TODAY or Future (>=)
  return taskDate >= today;
}

// Returns string like "2d 03:12:09" or "Overdue" or null
function getTimeLeft(dateStr) {
  if (!dateStr) return null;

  const now = new Date();
  const due = new Date(dateStr + "T23:59:59");
  const diff = due.getTime() - now.getTime();

  if (diff <= 0) return "Overdue";

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  const dayPart = days > 0 ? days + "d " : "";
  return dayPart + hh + ":" + mm + ":" + ss;
}

// ========== Render functions ==========
function renderTasks() {
  taskList.innerHTML = "";

  tasks.forEach((t, index) => {
    const li = document.createElement("li");
    li.className = "task-item" + (t.completed ? " task-complete" : "");

    const left = document.createElement("div");
    const titleSpan = document.createElement("span");
    titleSpan.textContent = t.title;
    left.appendChild(titleSpan);

    const meta = document.createElement("div");
    meta.className = "task-meta";

    if (t.date) {
      const timeLeft = getTimeLeft(t.date);
      if (timeLeft === "Overdue") {
        meta.textContent = `Due: ${t.date} • Overdue`;
        meta.classList.add("overdue");
      } else if (timeLeft) {
        meta.textContent = `Due: ${t.date} • Time left: ${timeLeft}`;
      } else {
        meta.textContent = `Due: ${t.date}`;
      }
    } else {
      meta.textContent = "No due date";
    }
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "task-buttons";

    const completeBtn = document.createElement("button");
    completeBtn.className = "task-btn complete-btn";
    completeBtn.textContent = "Complete";
    completeBtn.addEventListener("click", () => {
      tasks[index].completed = !tasks[index].completed;
      saveData();
      renderTasks();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "task-btn delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      tasks.splice(index, 1);
      saveData();
      renderTasks();
    });

    right.appendChild(completeBtn);
    right.appendChild(deleteBtn);

    li.appendChild(left);
    li.appendChild(right);
    taskList.appendChild(li);
  });
}

function renderNotes() {
  noteList.innerHTML = "";
  notes.forEach((n, index) => {
    const card = document.createElement("div");
    card.className = "note-card";

    const title = document.createElement("h3");
    title.textContent = n.title || "Untitled note";

    const body = document.createElement("p");
    body.textContent = n.body;

    const del = document.createElement("button");
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      notes.splice(index, 1);
      saveData();
      renderNotes();
    });

    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(del);

    noteList.appendChild(card);
  });
}

// Show/hide whole sections based on filter
function applyFilter() {
  const tasksSection = document.getElementById("tasks");
  const notesSection = document.getElementById("notes");

  if (currentFilter === "all") {
    tasksSection.classList.remove("hidden");
    notesSection.classList.remove("hidden");
  } else if (currentFilter === "tasks") {
    tasksSection.classList.remove("hidden");
    notesSection.classList.add("hidden");
  } else if (currentFilter === "notes") {
    tasksSection.classList.add("hidden");
    notesSection.classList.remove("hidden");
  }
}

// ========== Form handlers ==========

// Task form with validation
document.getElementById("task-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const titleInput = document.getElementById("task-title");
  const dateInput = document.getElementById("task-date");
  const errorEl = document.getElementById("task-error");

  const title = titleInput.value.trim();
  const date = dateInput.value;

  errorEl.textContent = "";
  errorEl.classList.add("hidden");

  if (!title) {
    errorEl.textContent = "Please enter a task title.";
    errorEl.classList.remove("hidden");
    return;
  }

  if (!isValidDateString(date)) {
    // Error message restored to original request for "today or in the future"
    errorEl.textContent =
      "Please choose a real date (today or in the future).";
    errorEl.classList.remove("hidden");
    return;
  }

  tasks.push({ title, date, completed: false });
  saveData();
  renderTasks();

  e.target.reset();
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
  hidePanel("task-form");
});

// Note form
document.getElementById("note-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("note-title").value.trim();
  const body = document.getElementById("note-body").value.trim();
  if (!body && !title) return;

  notes.push({ title, body });
  saveData();
  renderNotes();

  e.target.reset();
  hidePanel("note-form");
});

// ========== Panel show/hide ==========
function showPanel(id) {
  document.getElementById(id).classList.remove("hidden");
}

function hidePanel(id) {
  document.getElementById(id).classList.add("hidden");
}

document.querySelectorAll(".add-toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");
    showPanel(target);
  });
});

document.querySelectorAll(".close-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");
    hidePanel(target);
  });
});

// ========== Filter buttons ==========
function setFilter(next) {
  currentFilter = next;

  document
    .querySelectorAll(".nav-filter")
    .forEach((btn) => btn.classList.remove("active"));

  if (next === "all") {
    document.getElementById("filter-all").classList.add("active");
  } else if (next === "tasks") {
    document.getElementById("filter-tasks").classList.add("active");
  } else if (next === "notes") {
    document.getElementById("filter-notes").classList.add("active");
  }

  applyFilter();
}

document.getElementById("filter-all").addEventListener("click", () =>
  setFilter("all")
);
document.getElementById("filter-tasks").addEventListener("click", () =>
  setFilter("tasks")
);
document.getElementById("filter-notes").addEventListener("click", () =>
  setFilter("notes")
);

// ========== Reset modal ==========
const resetModal = document.getElementById("reset-modal");
const resetBtn = document.getElementById("reset-btn");
const cancelReset = document.getElementById("cancel-reset");
const confirmReset = document.getElementById("confirm-reset");

resetBtn.addEventListener("click", () => {
  resetModal.classList.remove("hidden");
});

cancelReset.addEventListener("click", () => {
  resetModal.classList.add("hidden");
});

confirmReset.addEventListener("click", () => {
  tasks = [];
  notes = [];
  saveData();
  renderTasks();
  renderNotes();
  resetModal.classList.add("hidden");
});

// ========== Dark mode toggle ==========
const themeToggle = document.getElementById("theme-toggle");

function applyThemeFromStorage() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "☼ Light";
  } else {
    document.body.classList.remove("dark");
    themeToggle.textContent = "☾ Dark";
  }
}

themeToggle.addEventListener("click", () => {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "☼ Light" : "☾ Dark";
});

// ========== Init ==========
loadData();
applyThemeFromStorage();
renderTasks();
renderNotes();
applyFilter();

// Update countdown every second
setInterval(renderTasks, 1000);