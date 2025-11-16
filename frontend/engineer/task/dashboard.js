document.addEventListener("DOMContentLoaded", () => {
  // Mobile tab functionality
  const tabs = document.querySelectorAll(".assignment-tabs .tab");
  const containers = document.querySelectorAll(".assignment-list .task-container");

  function setActiveTab(targetKey) {
    tabs.forEach((tab) => {
      const tabKey = tab.getAttribute("data-tab");
      if (tabKey === targetKey) {
        tab.classList.add("tab-active");
      } else {
        tab.classList.remove("tab-active");
      }
    });

    containers.forEach((container) => {
      const containerKey = container.getAttribute("data-container");
      if (containerKey === targetKey) {
        container.classList.add("task-container-active");
      } else {
        container.classList.remove("task-container-active");
      }
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetKey = tab.getAttribute("data-tab");
      if (!targetKey) return;
      setActiveTab(targetKey);
    });
  });

  // Desktop navigation functionality
  const navLinks = document.querySelectorAll(".sidebar-nav .nav-link");
  const contentSections = document.querySelectorAll(".content-section");

  function setActivePage(targetPage) {
    navLinks.forEach((link) => {
      const pageKey = link.getAttribute("data-page");
      if (pageKey === targetPage) {
        link.classList.add("nav-link-active");
      } else {
        link.classList.remove("nav-link-active");
      }
    });

    contentSections.forEach((section) => {
      const contentKey = section.getAttribute("data-content");
      if (contentKey === targetPage) {
        section.classList.add("content-section-active");
      } else {
        section.classList.remove("content-section-active");
      }
    });
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetPage = link.getAttribute("data-page");
      if (!targetPage) return;
      setActivePage(targetPage);
    });
  });
});
