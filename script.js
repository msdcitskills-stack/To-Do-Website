let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let currentFilter = "all";
let currentSearch = "";
let editingIndex = -1;

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  renderTasks();
  setupEventListeners();
  updateStats();
});

function setupEventListeners() {
  // Filter buttons
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      e.target.closest(".filter-btn").classList.add("active");
      currentFilter = e.target.closest(".filter-btn").dataset.filter;
      renderTasks();
    });
  });

  // Search functionality
  document.getElementById("searchInput").addEventListener("input", (e) => {
    currentSearch = e.target.value.toLowerCase();
    renderTasks();
  });

  // Enter key to add task
  document.getElementById("taskInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTask();
  });
}

function renderTasks() {
  const taskList = document.getElementById("taskList");
  const emptyState = document.getElementById("emptyState");
  taskList.innerHTML = "";

  let filteredTasks = tasks.filter((task, index) => {
    // Apply filter
    if (currentFilter === "completed" && !task.completed) return false;
    if (currentFilter === "active" && task.completed) return false;
    if (currentFilter === "high" && task.priority !== "high") return false;

    // Apply search
    if (currentSearch && !task.text.toLowerCase().includes(currentSearch)) {
      return false;
    }

    return true;
  });

  if (filteredTasks.length === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
  }

  filteredTasks.forEach((task) => {
    const index = tasks.indexOf(task);
    const li = document.createElement("li");
    li.className = `task-item ${task.completed ? "completed" : ""} priority-${task.priority || "medium"}`;

    // Due date indicator
    let dueDateHtml = "";
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      const isOverdue = dueDate < today && !task.completed;
      const isToday = dueDate.toDateString() === today.toDateString();
      dueDateHtml = `<span class="task-meta-item" style="${isOverdue ? "color: #dc3545; font-weight: 600;" : ""}"><i class="fas fa-calendar"></i> ${isToday ? "Today" : dueDate.toLocaleDateString()}</span>`;
    }

    // Category badge
    let categoryHtml = "";
    if (task.category) {
      categoryHtml = `<span class="category-badge"><i class="fas fa-tag"></i> ${task.category}</span>`;
    }

    li.innerHTML = `
      <input type="checkbox" class="checkbox" ${task.completed ? "checked" : ""} onchange="toggleTask(${index})">
      <div class="task-content">
        <div class="task-text">${escapeHtml(task.text)}</div>
        <div class="task-meta">
          <span class="priority-badge ${task.priority || "medium"}">
            <i class="fas fa-flag"></i> ${(task.priority || "medium").charAt(0).toUpperCase() + (task.priority || "medium").slice(1)}
          </span>
          ${dueDateHtml}
          ${categoryHtml}
        </div>
      </div>
      <button class="important-btn ${task.important ? "" : "inactive"}" onclick="toggleImportant(${index})" title="Mark as important">
        <i class="fas fa-star"></i>
      </button>
      <button class="edit-btn" onclick="openEditModal(${index})" title="Edit task">
        <i class="fas fa-edit"></i>
      </button>
      <button class="delete-btn" onclick="deleteTask(${index})" title="Delete task">
        <i class="fas fa-trash"></i>
      </button>
    `;

    taskList.appendChild(li);
  });

  updateStats();
  updateClearButton();
}

function addTask() {
  const input = document.getElementById("taskInput");
  const prioritySelect = document.getElementById("prioritySelect");
  const dueDate = document.getElementById("dueDate");
  const categoryInput = document.getElementById("categoryInput");

  const text = input.value.trim();
  if (text === "") {
    input.focus();
    return;
  }

  const newTask = {
    text: text,
    completed: false,
    priority: prioritySelect.value,
    dueDate: dueDate.value || null,
    category: categoryInput.value.trim() || null,
    important: false,
    dateAdded: new Date().toISOString(),
  };

  tasks.unshift(newTask);
  input.value = "";
  dueDate.value = "";
  categoryInput.value = "";
  prioritySelect.value = "medium";
  input.focus();

  saveTasks();
  renderTasks();
}

function toggleTask(index) {
  tasks[index].completed = !tasks[index].completed;
  saveTasks();
  renderTasks();
}

function toggleImportant(index) {
  tasks[index].important = !tasks[index].important;
  saveTasks();
  renderTasks();
}

function deleteTask(index) {
  if (confirm("Are you sure you want to delete this task?")) {
    tasks.splice(index, 1);
    saveTasks();
    renderTasks();
  }
}

function openEditModal(index) {
  editingIndex = index;
  const task = tasks[index];

  document.getElementById("editTaskInput").value = task.text;
  document.getElementById("editPrioritySelect").value = task.priority || "medium";
  document.getElementById("editDueDate").value = task.dueDate || "";
  document.getElementById("editCategoryInput").value = task.category || "";

  document.getElementById("editModal").classList.add("show");
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("show");
  editingIndex = -1;
}

function saveEditedTask() {
  if (editingIndex === -1) return;

  const text = document.getElementById("editTaskInput").value.trim();
  if (text === "") {
    alert("Task cannot be empty!");
    return;
  }

  tasks[editingIndex].text = text;
  tasks[editingIndex].priority = document.getElementById("editPrioritySelect").value;
  tasks[editingIndex].dueDate = document.getElementById("editDueDate").value || null;
  tasks[editingIndex].category = document.getElementById("editCategoryInput").value.trim() || null;

  saveTasks();
  renderTasks();
  closeEditModal();
}

function clearCompleted() {
  if (confirm("Delete all completed tasks? This cannot be undone.")) {
    tasks = tasks.filter((task) => !task.completed);
    saveTasks();
    renderTasks();
  }
}

function sortTasks() {
  const sortValue = document.getElementById("sortSelect").value;

  if (sortValue === "priority") {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    tasks.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));
  } else if (sortValue === "due-date") {
    tasks.sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  } else if (sortValue === "name") {
    tasks.sort((a, b) => a.text.localeCompare(b.text));
  } else {
    // date-added (default)
    tasks.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  }

  saveTasks();
  renderTasks();
}

function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;

  document.getElementById("totalTasks").textContent = total;
  document.getElementById("completedTasks").textContent = completed;
}

function updateClearButton() {
  const clearBtn = document.getElementById("clearBtn");
  const hasCompleted = tasks.some((t) => t.completed);
  clearBtn.style.display = hasCompleted ? "flex" : "none";
}

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  const modal = document.getElementById("editModal");
  if (e.target === modal) {
    closeEditModal();
  }
});