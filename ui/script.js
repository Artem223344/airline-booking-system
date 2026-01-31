// =============================
// CONFIG & STATE
// =============================
const navLinks = document.querySelectorAll(".nav-link");
const views = document.querySelectorAll(".view");

// =============================
// NAVIGATION
// =============================
navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    // e.preventDefault(); // Якщо це посилання, а не кнопка

    const viewId = link.dataset.view;
    if (!viewId) return;

    // Прибираємо активний клас у всіх лінків
    navLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    // Ховаємо всі екрани і показуємо потрібний
    views.forEach((v) => v.classList.remove("active"));
    const targetView = document.getElementById(viewId);
    if (targetView) {
      targetView.classList.add("active");
    }
  });
});

// Клік по Help у футері
document.querySelectorAll('[data-view-link="helpView"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const helpBtn = document.querySelector('.nav-link[data-view="helpView"]');
    if (helpBtn) helpBtn.click();
  });
});
