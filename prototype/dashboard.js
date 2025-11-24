document.addEventListener("DOMContentLoaded", () => {
  const mobileLayout = document.querySelector('.mobile-layout');
  const desktopLayout = document.querySelector('.desktop-layout');

  function syncLayouts() {
    const isMobile = window.innerWidth <= 1023;
    if (mobileLayout) {
      mobileLayout.style.display = isMobile ? 'flex' : 'none';
    }
    if (desktopLayout) {
      desktopLayout.style.display = isMobile ? 'none' : 'flex';
    }
  }

  syncLayouts();
  window.addEventListener('resize', syncLayouts);

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

  // Main navigation functionality
  const mainNavLinks = document.querySelectorAll(".main-navigation .nav-item");
  const mainSections = document.querySelectorAll(".main-section");

  function setActiveMainPage(targetPage) {
    mainNavLinks.forEach((link) => {
      const pageKey = link.getAttribute("data-main-page");
      if (pageKey === targetPage) {
        link.classList.add("nav-item-active");
      } else {
        link.classList.remove("nav-item-active");
      }
    });

    mainSections.forEach((section) => {
      const sectionKey = section.getAttribute("data-main-section");
      if (sectionKey === targetPage) {
        section.classList.add("main-section-active");
      } else {
        section.classList.remove("main-section-active");
      }
    });
  }

  mainNavLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetPage = link.getAttribute("data-main-page");
      if (!targetPage) return;
      setActiveMainPage(targetPage);
    });
  });

  // Desktop filter functionality (Teams-style)
  const filterButtons = document.querySelectorAll(".filter-btn");
  const feedSections = document.querySelectorAll(".feed-section");

  function setActiveFilter(targetFilter) {
    filterButtons.forEach((btn) => {
      const filterKey = btn.getAttribute("data-filter");
      if (filterKey === targetFilter) {
        btn.classList.add("filter-btn-active");
      } else {
        btn.classList.remove("filter-btn-active");
      }
    });

    feedSections.forEach((section) => {
      const feedKey = section.getAttribute("data-feed");
      if (feedKey === targetFilter) {
        section.classList.add("feed-section-active");
      } else {
        section.classList.remove("feed-section-active");
      }
    });
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetFilter = btn.getAttribute("data-filter");
      if (!targetFilter) return;
      setActiveFilter(targetFilter);
    });
  });

  // Section tabs functionality
  const sectionTabs = document.querySelectorAll(".section-tab");
  const sectionPanels = document.querySelectorAll(".section-panel");

  function setActiveSection(targetSection) {
    sectionTabs.forEach((tab) => {
      const sectionKey = tab.getAttribute("data-section");
      if (sectionKey === targetSection) {
        tab.classList.add("section-tab-active");
      } else {
        tab.classList.remove("section-tab-active");
      }
    });

    sectionPanels.forEach((panel) => {
      const panelKey = panel.getAttribute("data-panel");
      if (panelKey === targetSection) {
        panel.classList.add("section-panel-active");
      } else {
        panel.classList.remove("section-panel-active");
      }
    });
  }

  sectionTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetSection = tab.getAttribute("data-section");
      if (!targetSection) return;
      setActiveSection(targetSection);
    });
  });

  // Mobile navigation functionality
  const mobileNavButtons = document.querySelectorAll(".bottom-nav .nav-item");
  const mobileContentSections = document.querySelectorAll(".mobile-content-section");

  function setActiveMobilePage(targetPage) {
    mobileNavButtons.forEach((button) => {
      const pageKey = button.getAttribute("data-mobile-page");
      if (pageKey === targetPage) {
        button.classList.add("nav-item-active");
      } else {
        button.classList.remove("nav-item-active");
      }
    });

    mobileContentSections.forEach((section) => {
      const contentKey = section.getAttribute("data-mobile-content");
      if (contentKey === targetPage) {
        section.classList.add("mobile-content-section-active");
      } else {
        section.classList.remove("mobile-content-section-active");
      }
    });
  }

  mobileNavButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetPage = button.getAttribute("data-mobile-page");
      if (!targetPage) return;
      setActiveMobilePage(targetPage);
    });
  });

  // Ensure all modals start hidden on load (defensive in case CSS didn't apply yet)
  document.querySelectorAll('.modal').forEach(m => {
    m.classList.remove('show');
    m.style.visibility = 'hidden';
    m.style.opacity = '0';
    m.style.pointerEvents = 'none';
  });
});

// Function to open assignment details (for mobile cards)
function openAssignmentDetails(assignmentId) {
  // Check if we're on mobile or desktop
  const isMobile = window.innerWidth <= 1023;
  
  if (isMobile) {
    // Show mobile assignment details
    const mobileDetails = document.getElementById('mobileAssignmentDetails');
    
    if (mobileDetails) {
      mobileDetails.classList.add('show');
      document.body.classList.add('modal-open');
    }

    // Toggle mobile footer buttons based on assignment type
    toggleMobileActions(assignmentId);

    // Populate mobile details with the same data model
    updateMobileDetails(assignmentId);
  } else {
    // Navigate to assignment details page for desktop
    window.location.href = `./assignment-details.html?type=${assignmentId}&id=${Date.now()}`;
  }
  
  console.log('Opening assignment details for:', assignmentId);
}

// Function to close mobile assignment details
function closeMobileAssignmentDetails() {
  const mobileDetails = document.getElementById('mobileAssignmentDetails');
  
  if (mobileDetails) {
    mobileDetails.classList.remove('show');
    document.body.classList.remove('modal-open');
  }
}

// Function to select assignment in Teams-style layout
function selectAssignment(assignmentType) {
  // Remove selected class from all assignment items
  document.querySelectorAll('.assignment-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  // Add selected class to clicked item
  event.currentTarget.classList.add('selected');
  
  // Update main content area with assignment details
  updateAssignmentDetails(assignmentType);
}

// Function to update assignment details in main content
// Centralized assignment data
function getAssignments() {
  return {
    'site-inspection': {
      title: 'Site Inspection',
      site: 'Site: Quezon City - North Fairview',
      due: 'Due: Oct 21, 2025',
      priority: 'MEDIUM',
      ticketNumber: 'TKT-1001',
      dateTime: '2025-21-11 14:30',
      priorityText: 'Medium',
      type: 'Site Inspection',
      location: 'Quezon City - North Fairview',
      description: 'Site Malfunction',
      remarks: 'Coordinate with site manager before arrival.',
      status: 'pending'
    },
    'installation': {
      title: 'Installation',
      site: 'Site: Makati - Ayala',
      due: 'Due: Oct 11, 2025',
      priority: 'MEDIUM',
      ticketNumber: 'TKT-1002',
      dateTime: '2025-11-10 09:00',
      priorityText: 'Medium',
      type: 'Installation',
      location: 'Makati - Ayala',
      description: 'Network Equipment Installation',
      remarks: 'Bring necessary installation tools.',
      status: 'pending'
    },
    'network-upgrade': {
      title: 'Installation',
      site: 'Site: BGC - Taguig',
      due: 'Due: Nov 05, 2025',
      priority: 'MEDIUM',
      ticketNumber: 'TKT-1003',
      dateTime: '2025-05-11 13:00',
      priorityText: 'Medium',
      type: 'Installation',
      location: 'BGC - Taguig',
      description: 'Upgrade network infrastructure',
      remarks: 'Schedule during off-peak hours.',
      status: 'ongoing'
    },
    'system-check': {
      title: 'Site Inspection',
      site: 'Site: Quezon City - North Fairview',
      due: 'Completed: Sep 30, 2025',
      priority: 'MEDIUM',
      ticketNumber: 'TKT-1001',
      dateTime: '2025-21-11 14:30',
      priorityText: 'Medium',
      type: 'Site Inspection',
      location: 'Quezon City - North Fairview',
      description: 'Site Malfunction',
      remarks: 'All systems functioning normally.',
      status: 'completed'
    },
    // Aliases to support new cards
    'site-inspection-ongoing': {
      title: 'Site Inspection',
      site: 'Site: Quezon City - North Fairview',
      due: 'Due: Nov 02, 2025',
      priority: 'MEDIUM',
      ticketNumber: 'TKT-1001',
      dateTime: '2025-21-11 14:30',
      priorityText: 'Medium',
      type: 'Site Inspection',
      location: 'Quezon City - North Fairview',
      description: 'Site Malfunction',
      remarks: 'Coordinate with site manager before arrival.',
      status: 'ongoing'
    },
    'installation-completed': {
      title: 'Installation',
      site: 'Site: Makati - Ayala',
      due: 'Completed: Oct 11, 2025',
      priority: 'MEDIUM',
      ticketNumber: 'TKT-1002',
      dateTime: '2025-11-10 09:00',
      priorityText: 'Medium',
      type: 'Installation',
      location: 'Makati - Ayala',
      description: 'Network Equipment Installation',
      remarks: 'Bring necessary installation tools.',
      status: 'completed'
    }
  };
}

function updateAssignmentDetails(assignmentType) {
  const assignments = getAssignments();

  const assignment = assignments[assignmentType] || assignments['site-inspection'];

  // Update main content
  document.querySelector('.assignment-detail-title').textContent = assignment.title;
  document.querySelector('.assignment-detail-site').textContent = assignment.site;
  document.querySelector('.assignment-detail-due').textContent = assignment.due;
  document.querySelector('.assignment-detail-priority').textContent = assignment.priority;

  // Update detail values
  const detailValues = document.querySelectorAll('.detail-value');
  if (detailValues.length >= 7) {
    detailValues[0].textContent = assignment.ticketNumber;
    detailValues[1].textContent = assignment.dateTime;
    detailValues[2].textContent = assignment.priorityText;
    detailValues[3].textContent = assignment.type;
    detailValues[4].textContent = assignment.location;
    detailValues[5].textContent = assignment.description;
    detailValues[6].textContent = assignment.remarks;
  }

  // Toggle desktop action buttons / acknowledge based on status
  toggleDesktopActions(assignment.status);
}

// Function for back navigation
function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = './dashboard.html';
  }
}

// Function to acknowledge assignment
function acknowledgeAssignment() {
  showAcknowledgeModal();
}

// Function to close all modals
function closeAllModals() {
  const modals = document.querySelectorAll('.modal');
  modals.forEach(modal => {
    modal.classList.remove('show');
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    document.body.classList.remove('modal-open');
  });
}

// Modal functions
function showAcknowledgeModal() {
  closeAllModals(); // Ensure no other modals are open
  const modal = document.getElementById('acknowledgeModal');
  modal.classList.add('show');
  modal.style.visibility = 'visible';
  modal.style.opacity = '1';
  modal.style.pointerEvents = 'auto';
  document.body.classList.add('modal-open');
}

function closeAcknowledgeModal() {
  const modal = document.getElementById('acknowledgeModal');
  modal.classList.remove('show');
  modal.style.visibility = 'hidden';
  modal.style.opacity = '0';
  modal.style.pointerEvents = 'none';
  // Clear the textarea
  document.getElementById('acknowledgeRemarks').value = '';
  document.body.classList.remove('modal-open');
}

function confirmAcknowledge() {
  const remarks = document.getElementById('acknowledgeRemarks').value;
  
  // Close acknowledge modal first
  closeAcknowledgeModal();
  
  // Wait for modal to close completely, then show toast and next modal
  setTimeout(() => {
    showToast('Assignment acknowledged');
    
    // Show request vehicle modal after a longer delay
    setTimeout(() => {
      showRequestVehicleModal();
    }, 1500);
  }, 400);
}

// Function to update acknowledge button to request vehicle
function updateAcknowledgeButton() {
  // Update desktop acknowledge button
  const desktopBtn = document.querySelector('.acknowledge-btn');
  if (desktopBtn) {
    desktopBtn.innerHTML = '<span class="acknowledge-icon">🚗</span><span>REQUEST VEHICLE</span>';
    desktopBtn.onclick = function() { showRequestVehicleModal(); };
  }
  
  // Update mobile acknowledge button
  const mobileBtn = document.querySelector('.mobile-acknowledge-btn');
  if (mobileBtn) {
    mobileBtn.innerHTML = '<span class="mobile-acknowledge-icon">🚗</span><span>REQUEST VEHICLE</span>';
    mobileBtn.onclick = function() { showRequestVehicleModal(); };
  }
}

function showRequestVehicleModal() {
  closeAllModals(); // Ensure no other modals are open
  const modal = document.getElementById('requestVehicleModal');
  modal.classList.add('show');
  modal.style.visibility = 'visible';
  modal.style.opacity = '1';
  modal.style.pointerEvents = 'auto';
  document.body.classList.add('modal-open');
}

function closeRequestVehicleModal() {
  const modal = document.getElementById('requestVehicleModal');
  modal.classList.remove('show');
  modal.style.visibility = 'hidden';
  modal.style.opacity = '0';
  modal.style.pointerEvents = 'none';
  // Clear the textarea
  document.getElementById('vehicleRemarks').value = '';
  document.body.classList.remove('modal-open');
}

function confirmRequestVehicle() {
  const remarks = document.getElementById('vehicleRemarks').value;
  
  // Close modal
  closeRequestVehicleModal();
  
  // Wait for modal to close, then show request forwarded modal
  setTimeout(() => {
    showRequestForwardedModal();
  }, 400);
  
  console.log('Vehicle requested with remarks:', remarks);
}

function showRequestForwardedModal() {
  closeAllModals(); // Ensure no other modals are open
  const modal = document.getElementById('requestForwardedModal');
  modal.classList.add('show');
  modal.style.visibility = 'visible';
  modal.style.opacity = '1';
  modal.style.pointerEvents = 'auto';
  document.body.classList.add('modal-open');
}

function closeRequestForwardedModal() {
  const modal = document.getElementById('requestForwardedModal');
  modal.classList.remove('show');
  modal.style.visibility = 'hidden';
  modal.style.opacity = '0';
  modal.style.pointerEvents = 'none';
  
  // Update button to FORWARDED state
  updateButtonToForwarded();
  document.body.classList.remove('modal-open');
}

function updateButtonToForwarded() {
  // Update desktop acknowledge button
  const desktopBtn = document.querySelector('.acknowledge-btn');
  if (desktopBtn) {
    desktopBtn.innerHTML = '<span>FORWARDED</span>';
    desktopBtn.className = 'acknowledge-btn forwarded';
    desktopBtn.onclick = null;
  }
  
  // Update mobile action button
  const mobileBtn = document.getElementById('mobileActionBtn');
  if (mobileBtn) {
    mobileBtn.textContent = 'FORWARDED';
    mobileBtn.className = 'mobile-action-btn forwarded';
    mobileBtn.onclick = null;
  }
}

function showToast(message) {
  const toast = document.getElementById('successToast');
  const toastText = toast.querySelector('.toast-text');
  
  toastText.textContent = message;
  toast.classList.add('show');
  
  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('show');
    document.body.classList.remove('modal-open');
  }
});

// ==============================
// Mobile Notification: Vehicle Ticket
// ==============================
function openVehicleTicket(kind) {
  // Sample data; in real usage, fetch from API or dataset
  const presets = {
    approved: {
      ticket: '#001', pickup: 'Oct 11, 2025 - 2:30PM', location: 'Makati - Ayala North',
      status: 'Approved', priority: 'High', driver: 'John Smith', contact: '09171234567', vehicle: 'Van - ABC 123', remarks: 'Driver en route to pickup.'
    },
    onhold: {
      ticket: '#009', pickup: 'Oct 23, 2025 - 9:10AM', location: 'Makati - Ayala North',
      status: 'On Hold', priority: 'Medium', driver: '—', contact: '—', vehicle: '—', remarks: 'Please wait for vehicle availability.'
    }
  };
  const data = presets[kind] || presets.approved;

  // Populate fields
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('vtTicket', data.ticket);
  setVal('vtPickup', data.pickup);
  setVal('vtLocation', data.location);
  setVal('vtStatus', data.status);
  setVal('vtPriority', data.priority);
  setVal('vtDriver', data.driver || '');
  setVal('vtContact', data.contact || '');
  setVal('vtVehicle', data.vehicle || '');
  setVal('vtRemarks', data.remarks || '');

  const toggleField = (fieldId, hasValue) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.style.display = hasValue ? '' : 'none';
    }
  };

  const hasDriver = Boolean(data.driver && data.driver !== '—');
  const hasContact = Boolean(data.contact && data.contact !== '—');
  const hasVehicle = Boolean(data.vehicle && data.vehicle !== '—');

  toggleField('vtDriverField', hasDriver);
  toggleField('vtContactField', hasContact);
  toggleField('vtVehicleField', hasVehicle);

  closeAllModals();
  const modal = document.getElementById('vehicleTicketModal');
  if (modal) {
    modal.classList.add('show');
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    document.body.classList.add('modal-open');
  }
}

function closeVehicleTicketModal() {
  const modal = document.getElementById('vehicleTicketModal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    document.body.classList.remove('modal-open');
  }
}

function openMaterialTicket(kind) {
  const presets = {
    approved: {
      ticket: 'G-1001',
      job: 'Installation',
      site: 'Makati - Ayala North',
      datetime: '2025-10-11 14:30',
      items: 'Network Switch 3 pcs',
      remarks: 'Materials ready for pickup'
    }
  };
  const data = presets[kind] || presets.approved;

  const setVal = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  };

  setVal('mtTicket', data.ticket);
  setVal('mtJob', data.job);
  setVal('mtSite', data.site);
  setVal('mtDatetime', data.datetime);
  setVal('mtItems', data.items);
  setVal('mtRemarks', data.remarks);

  closeAllModals();
  const modal = document.getElementById('materialTicketModal');
  if (modal) {
    modal.classList.add('show');
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    document.body.classList.add('modal-open');
  }
}

function closeMaterialTicketModal() {
  const modal = document.getElementById('materialTicketModal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    document.body.classList.remove('modal-open');
  }
}

// ==============================
// Actions: Request Material / Mark as Completed
// ==============================
function toggleDesktopActions(status) {
  const actions = document.getElementById('desktopAssignmentActions');
  const ackBtn = document.querySelector('.acknowledge-btn');
  if (!actions || !ackBtn) return;

  if (status === 'ongoing') {
    actions.style.display = 'flex';
    ackBtn.style.display = 'none';
  } else if (status === 'pending') {
    actions.style.display = 'none';
    ackBtn.style.display = '';
  } else {
    // completed or other statuses
    actions.style.display = 'none';
    ackBtn.style.display = 'none';
  }
}

function toggleMobileActions(assignmentId) {
  const requestBtn = document.getElementById('mobileRequestMaterialBtn');
  const completeBtn = document.getElementById('mobileMarkCompletedBtn');
  const ackBtn = document.getElementById('mobileActionBtn');
  if (!requestBtn || !completeBtn || !ackBtn) return;

  const assignments = getAssignments();
  const status = (assignments[assignmentId] && assignments[assignmentId].status) || 'pending';
  if (status === 'ongoing') {
    requestBtn.style.display = 'block';
    completeBtn.style.display = 'block';
    ackBtn.style.display = 'none';
  } else if (status === 'pending') {
    requestBtn.style.display = 'none';
    completeBtn.style.display = 'none';
    ackBtn.style.display = 'block';
  } else {
    // completed
    requestBtn.style.display = 'none';
    completeBtn.style.display = 'none';
    ackBtn.style.display = 'none';
  }
}

function requestMaterial() {
  closeAllModals();
  const modal = document.getElementById('materialRequestModal');
  if (modal) {
    modal.classList.add('show');
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    document.body.classList.add('modal-open');
    
    // Clear previous entries and add one initial row
    const list = document.getElementById('mrList');
    if (list) {
      list.innerHTML = '';
      addMaterialRow();
    }
    
    // Clear remarks
    const remarks = document.getElementById('mrRemarks');
    if (remarks) remarks.value = '';
  }
}

// Add a new material row
function addMaterialRow() {
  const list = document.getElementById('mrList');
  if (!list) return;
  
  const row = document.createElement('div');
  row.className = 'mr-row';
  row.innerHTML = `
    <input class="modal-input mr-type" type="text" placeholder="Material type" />
    <div class="qty-container">
      <input class="modal-input mr-qty" type="text" placeholder="Quantity" />
      <button type="button" class="remove-material-btn" onclick="removeMaterialRow(this)" title="Remove material">×</button>
    </div>
  `;
  list.appendChild(row);
}

// Remove a material row
function removeMaterialRow(button) {
  const row = button.parentElement.parentElement; // button -> qty-container -> mr-row
  const list = document.getElementById('mrList');
  
  // Don't remove if it's the only row
  if (list && list.children.length > 1) {
    row.remove();
  } else {
    // Clear the inputs instead of removing the last row
    const typeInput = row.querySelector('.mr-type');
    const qtyInput = row.querySelector('.mr-qty');
    if (typeInput) typeInput.value = '';
    if (qtyInput) qtyInput.value = '';
  }
}

function markAsCompleted() {
  closeAllModals();
  const modal = document.getElementById('markCompletedModal');
  if (modal) {
    modal.classList.add('show');
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    document.body.classList.add('modal-open');
    const remarks = document.getElementById('markCompletedRemarks');
    if (remarks) remarks.value = '';
  }
}

function closeMarkCompletedModal() {
  const modal = document.getElementById('markCompletedModal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
  }
}

function confirmMarkCompleted() {
  const remarks = document.getElementById('markCompletedRemarks')?.value?.trim() || '';
  closeMarkCompletedModal();
  finalizeCompletionUI();
  showToast('Assignment marked as completed');
  console.log('Assignment marked completed with remarks:', remarks);
}

function finalizeCompletionUI() {
  toggleDesktopActions('completed');

  const desktopBtn = document.getElementById('desktopMarkCompletedBtn');
  if (desktopBtn) {
    desktopBtn.textContent = 'Completed';
    desktopBtn.disabled = true;
    desktopBtn.classList.add('action-secondary');
  }

  const requestBtn = document.getElementById('mobileRequestMaterialBtn');
  const completeBtn = document.getElementById('mobileMarkCompletedBtn');
  const ackBtn = document.getElementById('mobileActionBtn');
  if (requestBtn) requestBtn.style.display = 'none';
  if (completeBtn) {
    completeBtn.textContent = 'COMPLETED';
    completeBtn.disabled = true;
  }
  if (ackBtn) ackBtn.style.display = 'none';
}

function closeMaterialRequestModal() {
  const modal = document.getElementById('materialRequestModal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
  }
}

function confirmMaterialRequest() {
  // Collect materials and remarks
  const materials = [];
  const list = document.getElementById('mrList');
  if (list) {
    list.querySelectorAll('.mr-row').forEach(row => {
      const type = row.querySelector('.mr-type')?.value?.trim();
      const qty = row.querySelector('.mr-qty')?.value?.trim();
      if (type && qty) materials.push({ type, qty });
    });
  }
  
  const remarks = document.getElementById('mrRemarks')?.value?.trim() || '';
  
  // Basic validation
  if (materials.length === 0) {
    alert('Please add at least one material with both type and quantity.');
    return;
  }
  
  closeMaterialRequestModal();
  showToast('Material request submitted');

  // Change buttons to MATERIAL REQUESTED (orange)
  const desktopBtn = document.getElementById('desktopRequestMaterialBtn');
  if (desktopBtn) {
    desktopBtn.textContent = 'Material Requested';
    desktopBtn.classList.remove('action-secondary');
    desktopBtn.classList.add('action-primary');
    desktopBtn.style.background = 'var(--brand-orange)';
    desktopBtn.onclick = null;
  }

  const mobileBtn = document.getElementById('mobileRequestMaterialBtn');
  if (mobileBtn) {
    mobileBtn.textContent = 'MATERIAL REQUESTED';
    mobileBtn.classList.add('request-vehicle');
    mobileBtn.onclick = null;
  }
  
  console.log('Materials requested:', materials, 'Remarks:', remarks);
}

// Function to logout
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    // Redirect to login page
    window.location.href = '../login/login.html';
  }
}
