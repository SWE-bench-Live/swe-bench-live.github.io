// Logo mapping for different organizations
const logoMap = {
  "Default-logo": "assets/swe-bench-live.png",
  'SWE-agent': 'assets/logos/SWE-agent.png',
  'OpenHands': 'assets/logos/OpenHands.png',
  'Agentless': 'assets/logos/Agentless.png',
  'qwen': "assets/logos/qwen.png",
  'claude': "assets/logos/claude.png",
  "Win-agent": "assets/swe-bench-live.png",
  "Brokk": "assets/logos/brokk.png",
  "AMI-Agent": "assets/logos/ami-agent.png",
  "Slingshot-Agent": "assets/logos/slingshot.png",
  "agav-agent": "assets/logos/agav-agent.jfif",
  "TianxiCode": "assets/logos/tianxicode.png"
};


function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function getSafeLinkUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function renderModelName(item) {
  const name = escapeHtml(item.name || 'N/A');
  const url = getSafeLinkUrl(item.url);

  if (!url) {
    return `<span class="model-name">${name}</span>`;
  }

  return `<a class="model-name model-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${name}</a>`;
}

function renderVerifiedTag(item) {
  if (item.verified !== true) return '';

  const message = 'the result is directly run or manually checked by the maintainer team';
  return `
    <a class="verified-tag" href="#verification-policy" title="${message}" aria-label="Verified: ${message}">
      <img class="verified-icon" src="assets/verified-tag.png" alt="">
      <span class="visually-hidden">Verified</span>
    </a>
  `;
}

// Current sort configuration
let currentSort = { column: 'resolved', direction: 'desc' };
let allReports = [];
let selectedSplits = new Set();
let selectedSet = 'lite';
const assetVersion = Date.now().toString();

// Valid dataset keys (must match data-set attributes in HTML)
const validSets = ['lite', 'full', 'verified', 'ccpp', 'csharp', 'java', 'tsjs', 'go', 'rust', 'windows'];
const paginationBySet = Object.fromEntries(validSets.map(set => [set, { page: 1, pageSize: 20 }]));
let reportsLoaded = false;

// Split name mapping for display
const splitNameMap = {
  '202401': 'Jan 2024',
  '202402': 'Feb 2024',
  '202403': 'Mar 2024',
  '202404': 'Apr 2024',
  '202405': 'May 2024',
  '202406': 'Jun 2024',
  '202407': 'Jul 2024',
  '202408': 'Aug 2024',
  '202409': 'Sep 2024',
  '202410': 'Oct 2024',
  '202411': 'Nov 2024',
  '202412': 'Dec 2024',
  '202501': 'Jan 2025',
  '202502': 'Feb 2025',
  '202503': 'Mar 2025',
  '202504': 'Apr 2025',
  '202505': 'May 2025',
  '202506': 'Jun 2025'
};

// Default splits (Oct 2024 - Mar 2025) - only these have results
const availableSplits = ['202410', '202411', '202412', '202501', '202502', '202503'];

// Load splits data
async function loadSplits() {
  // Period selector removed; keep no-op for compatibility
}

// Create split selector UI
function createSplitSelector() {
  const splitOptions = document.getElementById('split-options');
  
  // Show all splits but disable unavailable ones
  Object.keys(splitNameMap).forEach(split => {
    const option = document.createElement('div');
    const isAvailable = availableSplits.includes(split);
    const isChecked = selectedSplits.has(split);
    
    option.className = 'split-option' + (isAvailable ? '' : ' disabled');
    option.innerHTML = `
      <input type="checkbox" 
             class="split-checkbox" 
             id="split-${split}" 
             value="${split}" 
             ${isChecked ? 'checked' : ''} 
             ${isAvailable ? '' : 'disabled'}>
      <label class="split-label" for="split-${split}">
        <span class="split-name">${splitNameMap[split]}</span>
        <span class="split-count">${isAvailable ? '50' : 'N/A'}</span>
      </label>
    `;
    splitOptions.appendChild(option);
    
    if (isAvailable) {
      // Add event listener only for available splits
      const checkbox = option.querySelector('.split-checkbox');
      checkbox.addEventListener('change', () => {
        // Update Apply button state
        const checkedBoxes = document.querySelectorAll('.split-checkbox:checked');
        const applyBtn = document.getElementById('apply-splits-btn');
        applyBtn.textContent = `Apply (${checkedBoxes.length})`;
      });
    }
  });
  
  // Setup dropdown toggle
  const periodBtn = document.getElementById('period-btn');
  const dropdown = document.getElementById('period-dropdown');
  
  periodBtn.addEventListener('click', () => {
    dropdown.classList.toggle('active');
    periodBtn.classList.toggle('active');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.period-selector')) {
      dropdown.classList.remove('active');
      periodBtn.classList.remove('active');
    }
  });
  
  // Setup select all/none buttons
  document.getElementById('select-all-btn').addEventListener('click', () => {
    document.querySelectorAll('.split-checkbox:not(:disabled)').forEach(cb => cb.checked = true);
    document.getElementById('apply-splits-btn').textContent = `Apply (${document.querySelectorAll('.split-checkbox:checked').length})`;
  });
  
  document.getElementById('select-none-btn').addEventListener('click', () => {
    document.querySelectorAll('.split-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('apply-splits-btn').textContent = `Apply (0)`;
  });
  
  // Setup apply button
  document.getElementById('apply-splits-btn').addEventListener('click', () => {
    applySplitSelection();
    dropdown.classList.remove('active');
    periodBtn.classList.remove('active');
  });
  
  // Initialize apply button text
  const checkedCount = document.querySelectorAll('.split-checkbox:checked').length;
  document.getElementById('apply-splits-btn').textContent = `Apply (${checkedCount})`;
}


// Apply split selection
function applySplitSelection() {
  selectedSplits.clear();
  document.querySelectorAll('.split-checkbox:checked').forEach(cb => {
    selectedSplits.add(cb.value);
  });
  
  updateSplitSummary();
  updateLeaderboard();
}

// Update split summary text
function updateSplitSummary() {
  // Instance totals are displayed per row in the num_valid_inst column.
}

// Load and display leaderboard data
async function loadLeaderboard() {
  try {
    const response = await fetch(`reports-0605.jsonl?v=${assetVersion}`, { cache: 'no-store' });
    const text = await response.text();
    
    // Parse JSONL format and filter to only lite set
    const lines = text.trim().split('\n').filter(line => line.trim());
    allReports = lines
      .map(line => {
        const report = JSON.parse(line);
        // Handle resolved field as either int or list
        let resolvedCount = 0;
        if (typeof report.resolved === 'number') {
          // If resolved is a number, use it directly
          resolvedCount = report.resolved;
        } else if (Array.isArray(report.resolved)) {
          // If resolved is an array, get its length
          resolvedCount = report.resolved.length;
        }
        
        // Calculate percentage based on total
        if (report.total && report.total > 0) {
          report.resolved_percentage = ((resolvedCount / report.total) * 100).toFixed(1);
          report.resolved_count = resolvedCount;
        } else {
          report.resolved_percentage = "0.0";
          report.resolved_count = 0;
        }
        report.num_valid_inst = report.num_valid_inst ?? report.num_instances ?? report.total ?? null;
        return report;
      });
    
    reportsLoaded = true;
    updateLeaderboard();
    document.getElementById('loading').style.display = 'none';
    
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
  }
}

// Update leaderboard display
function updateLeaderboard() {
  // Filter by selected set (normalize both to lowercase for comparison)
  const filtered = allReports.filter(r => (r.set || '').toLowerCase() === selectedSet.toLowerCase());
  
  // Sort data
  const sortedData = sortReports(filtered);
  
  // Paginate after sorting so ranks and ordering span the entire selected set.
  const pagination = paginationBySet[selectedSet];
  const pageCount = Math.max(1, Math.ceil(sortedData.length / pagination.pageSize));
  pagination.page = Math.min(pagination.page, pageCount);
  const offset = (pagination.page - 1) * pagination.pageSize;
  renderTable(sortedData.slice(offset, offset + pagination.pageSize), offset);
  renderPagination(sortedData.length, pageCount);
}

function renderPagination(total, pageCount) {
  const { page, pageSize } = paginationBySet[selectedSet];
  document.getElementById('leaderboard-pagination').hidden = !reportsLoaded;
  document.getElementById('results-per-page').value = pageSize;
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, total);
  document.getElementById('page-summary').textContent = `Showing ${first}–${last} of ${total} results`;

  // Keep first/last pages and the current page's neighbors accessible on small screens.
  const pages = [];
  for (let number = 1; number <= pageCount; number++) {
    if (pageCount <= 7 || number === 1 || number === pageCount || Math.abs(number - page) <= 1) {
      if (pages.length && number - pages[pages.length - 1] > 1) pages.push(null);
      pages.push(number);
    }
  }
  document.getElementById('page-buttons').innerHTML = pages.map(number => number === null
    ? '<span class="page-ellipsis" aria-hidden="true">…</span>'
    : `<button type="button" class="page-button" data-page="${number}" aria-label="Page ${number}"${number === page ? ' aria-current="page"' : ''} aria-controls="leaderboard-table">${number}</button>`
  ).join('');
}

function setupPagination() {
  document.getElementById('page-buttons').addEventListener('click', event => {
    const button = event.target.closest('button[data-page]');
    if (!button) return;
    paginationBySet[selectedSet].page = Number(button.dataset.page);
    updateLeaderboard();
    document.querySelector('#page-buttons [aria-current="page"]').focus({ preventScroll: true });
    scrollToSection('leaderboard');
  });

  document.getElementById('results-per-page').addEventListener('change', event => {
    const input = event.target;
    const pagination = paginationBySet[selectedSet];
    if (!input.value || !input.checkValidity()) {
      input.value = pagination.pageSize;
      return;
    }
    pagination.pageSize = input.valueAsNumber;
    pagination.page = 1;
    updateLeaderboard();
    scrollToSection('leaderboard');
  });
}

// Sort reports
function sortReports(reports) {
  const sorted = [...reports].sort((a, b) => {
    if (currentSort.column === 'date') {
      const aDate = new Date(a.date || '2024-01-01');
      const bDate = new Date(b.date || '2024-01-01');
      return currentSort.direction === 'asc' ? 
        aDate - bDate : bDate - aDate;
    } else if (currentSort.column === 'num_valid_inst') {
      const aVal = Number(a.num_valid_inst) || 0;
      const bVal = Number(b.num_valid_inst) || 0;

      if (aVal === bVal) {
        const aDate = new Date(a.date || '2024-01-01');
        const bDate = new Date(b.date || '2024-01-01');
        return bDate - aDate;
      }

      return currentSort.direction === 'asc' ?
        aVal - bVal : bVal - aVal;
    } else {
      // Sort by resolved percentage
      const aVal = parseFloat(a.resolved_percentage);
      const bVal = parseFloat(b.resolved_percentage);
      
      if (aVal === bVal) {
        // If percentages are equal, sort by date (newer first)
        const aDate = new Date(a.date || '2024-01-01');
        const bDate = new Date(b.date || '2024-01-01');
        return bDate - aDate;
      }
      
      return currentSort.direction === 'asc' ? 
        aVal - bVal : bVal - aVal;
    }
  });
  
  return sorted;
}

// Render table
function renderTable(data, offset = 0) {
  const tbody = document.getElementById('leaderboard-body');
  tbody.innerHTML = '';
  
  if (data.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="5" style="text-align: center; padding: 3rem; color: #666666;">
        No results available for the selected set.
      </td>
    `;
    tbody.appendChild(row);
    return;
  }
  
  data.forEach((item, index) => {
    const row = document.createElement('tr');
    const rank = offset + index + 1;
    
    // Determine rank badge
    let rankBadge = '';
    if (rank === 1) rankBadge = '<span class="rank-badge gold">🥇</span>';
    else if (rank === 2) rankBadge = '<span class="rank-badge silver">🥈</span>';
    else if (rank === 3) rankBadge = '<span class="rank-badge bronze">🥉</span>';
    
    // Get logo path
    const logoPath = logoMap[item.logo] || 'assets/logos/default.png';
    const modelName = renderModelName(item);
    const verifiedTag = renderVerifiedTag(item);
    
    // Format date
    const formattedDate = item.date ? new Date(item.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }) : 'N/A';
    
    row.innerHTML = `
      <td class="rank-col">${rankBadge}${rank}</td>
      <td class="model-col">
        <div class="model-info">
          <div class="model-logo-frame">
            <img src="${escapeHtml(logoPath)}" alt="${escapeHtml(item.logo || '')}" class="model-logo-img" onerror="this.style.display='none'">
          </div>
          ${modelName}
          ${verifiedTag}
        </div>
      </td>
      <td class="score-col">
        <span class="score-display">${item.resolved_percentage}%</span>
      </td>
      <td class="instances-col">${item.num_valid_inst ?? "-"}</td>
      <td class="date-col">${formattedDate}</td>
    `;
    
    tbody.appendChild(row);
  });
}

// Setup sorting
function setupSorting() {
  document.querySelectorAll('.sortable').forEach(header => {
    header.addEventListener('click', () => {
      const column = header.dataset.sort;
      
      // Update sort direction
      if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = column;
        currentSort.direction = column === 'date' ? 'desc' : 'desc'; // Default desc for metrics
      }
      
      // Update UI
      document.querySelectorAll('.sortable').forEach(h => {
        h.classList.remove('sorted-asc', 'sorted-desc');
        h.querySelector('.sort-arrow').textContent = '↕';
      });
      
      header.classList.add(`sorted-${currentSort.direction}`);
      header.querySelector('.sort-arrow').textContent = 
        currentSort.direction === 'asc' ? '↑' : '↓';
      
      paginationBySet[selectedSet].page = 1;
      updateLeaderboard();
    });
  });
}

// Scroll to a section, optionally activating a dataset tab
function scrollToSection(targetId) {
  let elementId = targetId;
  if (targetId.startsWith('leaderboard-') && validSets.includes(targetId.substring('leaderboard-'.length))) {
    elementId = 'leaderboard';
    activateSet(targetId.substring('leaderboard-'.length), true);
  }
  const targetElement = document.getElementById(elementId);
  if (targetElement) {
    const yOffset = -80;
    const y = targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}

// Initialize smooth scrolling for navigation links
function initSmoothScrolling() {
  document.querySelectorAll('a.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        e.preventDefault();
        scrollToSection(href.substring(1));
      }
    });
  });

  // On initial load, handle hash in URL (e.g. direct link to #leaderboard-go)
  const initialHash = location.hash.replace('#', '');
  if (initialHash) {
    setTimeout(() => scrollToSection(initialHash), 100);
  }
}

// Keep mobile navigation available even while leaderboard data is loading.
function initMobileNavigation() {
  const toggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  const main = document.querySelector('.main-content');
  const mobileLayout = window.matchMedia('(max-width: 1024px)');

  function setOpen(open, restoreFocus = true) {
    open = open && mobileLayout.matches;
    sidebar.classList.toggle('open', open);
    document.body.classList.toggle('sidebar-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.sidebar-toggle-label').textContent = open ? 'Close' : 'Menu';
    main.inert = open;
    if (!open && restoreFocus && mobileLayout.matches) toggle.focus();
  }

  toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('open')));
  backdrop.addEventListener('click', () => setOpen(false));
  sidebar.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (mobileLayout.matches) setOpen(false);
    });
  });

  document.addEventListener('keydown', event => {
    if (!sidebar.classList.contains('open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Tab') {
      const links = sidebar.querySelectorAll('a[href]');
      const lastLink = links[links.length - 1];
      if (event.shiftKey && document.activeElement === toggle) {
        event.preventDefault();
        lastLink.focus();
      } else if (!event.shiftKey && document.activeElement === lastLink) {
        event.preventDefault();
        toggle.focus();
      }
    }
  });

  mobileLayout.addEventListener('change', () => {
    const focusWasInSidebar = sidebar.contains(document.activeElement);
    setOpen(false, false);
    if (mobileLayout.matches && focusWasInSidebar) toggle.focus();
  });
}

// Initialize everything once the DOM is available
async function initLeaderboard() {
  initMobileNavigation();
  initSmoothScrolling();
  setupPagination();
  await loadSplits();
  await loadLeaderboard();
  setupSorting();
  setupSetTabs();
  updateSplitSummary();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLeaderboard);
} else {
  initLeaderboard();
}

// Activate a dataset tab by key, update the table and URL hash
function activateSet(setKey, updateHash) {
  if (!validSets.includes(setKey)) return;
  const container = document.getElementById('set-tabs');
  if (!container) return;
  const buttons = container.querySelectorAll('.tab-btn');
  buttons.forEach(b => b.classList.remove('active'));
  const target = container.querySelector(`.tab-btn[data-set="${setKey}"]`);
  if (target) target.classList.add('active');
  selectedSet = setKey;
  updateLeaderboard();
  updateSplitSummary();
  if (updateHash) {
    history.replaceState(null, '', '#leaderboard-' + setKey);
  }
}

// Read the URL hash and activate the matching tab (if any)
function applyHashToTab() {
  const hash = location.hash.replace('#', '');
  if (hash.startsWith('leaderboard-')) {
    const setKey = hash.substring('leaderboard-'.length);
    if (validSets.includes(setKey)) {
      activateSet(setKey, false);
      return true;
    }
  }
  return false;
}

// Setup dataset tabs for selecting set
function setupSetTabs() {
  const container = document.getElementById('set-tabs');
  if (!container) return;
  const buttons = container.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const setKey = (btn.dataset.set || 'lite').toLowerCase();
      activateSet(setKey, true);
    });
  });

  window.addEventListener('hashchange', () => { applyHashToTab(); });
  applyHashToTab();
}
