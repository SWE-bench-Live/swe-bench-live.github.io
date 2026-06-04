// Logo mapping for different organizations
const logoMap = {
  'SWE-agent': 'assets/logos/SWE-agent.png',
  'OpenHands': 'assets/logos/OpenHands.png',
  'Agentless': 'assets/logos/Agentless.png',
  'qwen': "assets/logos/qwen.png",
  'claude': "assets/logos/claude.png",
  "Win-agent": "assets/swe-bench-live.png",
  "Brokk": "assets/brokk.png"
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

// Current sort configuration
let currentSort = { column: 'resolved', direction: 'desc' };
let allReports = [];
let selectedSplits = new Set();
let selectedSet = 'lite';
const assetVersion = '20260604-3';

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
          report.resolved_percentage = ((resolvedCount / report.total) * 100).toFixed(2);
          report.resolved_count = resolvedCount;
        } else {
          report.resolved_percentage = "0.00";
          report.resolved_count = 0;
        }
        report.num_valid_inst = report.num_valid_inst ?? report.num_instances ?? report.total ?? null;
        return report;
      });
    
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
  
  // Render table
  renderTable(sortedData);
  
  // Update stats
  document.getElementById('total-models').textContent = filtered.length;
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
function renderTable(data) {
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
    
    // Determine rank badge
    let rankBadge = '';
    if (index === 0) rankBadge = '<span class="rank-badge gold">🥇</span>';
    else if (index === 1) rankBadge = '<span class="rank-badge silver">🥈</span>';
    else if (index === 2) rankBadge = '<span class="rank-badge bronze">🥉</span>';
    
    // Get logo path
    const logoPath = logoMap[item.logo] || 'assets/logos/default.png';
    const modelName = renderModelName(item);
    
    // Format date
    const formattedDate = item.date ? new Date(item.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }) : 'N/A';
    
    row.innerHTML = `
      <td class="rank-col">${rankBadge}${index + 1}</td>
      <td class="model-col">
        <div class="model-info">
          <div class="model-logo-frame">
            <img src="${escapeHtml(logoPath)}" alt="${escapeHtml(item.logo || '')}" class="model-logo-img" onerror="this.style.display='none'">
          </div>
          ${modelName}
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
      
      updateLeaderboard();
    });
  });
}

// Initialize smooth scrolling for navigation links
function initSmoothScrolling() {
  document.querySelectorAll('a.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href.startsWith('#')) {
        e.preventDefault();
        const targetId = href.substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          const yOffset = -80;
          const y = targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
    });
  });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  await loadSplits();
  await loadLeaderboard();
  setupSorting();
  setupSetTabs();
  initSmoothScrolling();
  updateSplitSummary();
});

// Setup dataset tabs for selecting set
function setupSetTabs() {
  const container = document.getElementById('set-tabs');
  if (!container) return;
  const buttons = container.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSet = (btn.dataset.set || 'lite').toLowerCase();
      updateLeaderboard();
      updateSplitSummary();
    });
  });
}
