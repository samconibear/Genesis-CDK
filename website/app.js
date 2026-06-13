let courses = [];
let selectedCourse = null;

async function loadCourses() {
  const res = await fetch('./courses.json');
  courses = await res.json();
  courses.sort((a, b) => a.name.localeCompare(b.name));
}

// ── DOM refs ──
const searchInput = document.getElementById('course-search');
const dropdown = document.getElementById('course-dropdown');
const courseInfo = document.getElementById('course-info');
const grossInput = document.getElementById('gross-score');
const hcpInput = document.getElementById('handicap-index');
const resultsEl = document.getElementById('results');

// ── Course search ──
function renderDropdown(filtered) {
  dropdown.innerHTML = '';

  if (filtered.length === 0) {
    dropdown.innerHTML = '<div class="dropdown-empty">No courses found</div>';
    dropdown.classList.remove('hidden');
    return;
  }

  filtered.slice(0, 40).forEach(course => {
    const item = document.createElement('div');
    item.className = 'dropdown-item';
    item.innerHTML = `
      <span>${highlightMatch(course.name, searchInput.value)}</span>
      <span class="region">${course.region}</span>
    `;
    item.addEventListener('mousedown', e => {
      e.preventDefault();
      selectCourse(course);
    });
    dropdown.appendChild(item);
  });

  dropdown.classList.remove('hidden');
}

function highlightMatch(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    text.slice(0, idx) +
    `<strong>${text.slice(idx, idx + query.length)}</strong>` +
    text.slice(idx + query.length)
  );
}

function selectCourse(course) {
  selectedCourse = course;
  searchInput.value = course.name;
  dropdown.classList.add('hidden');

  document.getElementById('info-region').textContent = course.region;
  document.getElementById('info-cr').textContent = course.courseRating.toFixed(1);
  document.getElementById('info-slope').textContent = course.slopeRating;
  document.getElementById('info-par').textContent = course.par;
  courseInfo.classList.remove('hidden');

  recalculate();
}

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  if (!q) {
    dropdown.classList.add('hidden');
    return;
  }
  const filtered = courses.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.region.toLowerCase().includes(q.toLowerCase())
  );
  renderDropdown(filtered);
});

searchInput.addEventListener('focus', () => {
  if (searchInput.value.trim()) {
    const filtered = courses.filter(c =>
      c.name.toLowerCase().includes(searchInput.value.toLowerCase())
    );
    renderDropdown(filtered);
  }
});

searchInput.addEventListener('blur', () => {
  setTimeout(() => dropdown.classList.add('hidden'), 150);
});

// ── Calculator ──
function recalculate() {
  if (!selectedCourse) return;

  const gross = parseFloat(grossInput.value);
  const hcpIndex = parseFloat(hcpInput.value);

  if (isNaN(gross) || isNaN(hcpIndex)) {
    resultsEl.classList.add('hidden');
    return;
  }

  const { courseRating, slopeRating, par } = selectedCourse;

  // WHS Score Differential
  const differential = (113 / slopeRating) * (gross - courseRating);

  // Course Handicap = HI × (Slope / 113) + (CR - Par)
  const courseHcp = Math.round(hcpIndex * (slopeRating / 113) + (courseRating - par));

  // Net Score
  const netScore = gross - courseHcp;

  // Difference vs handicap index (how this round compares to current handicap)
  const vsHcp = differential - hcpIndex;

  document.getElementById('res-differential').textContent = differential.toFixed(1);
  document.getElementById('res-course-hcp').textContent = courseHcp;
  document.getElementById('res-net').textContent = netScore;

  const vsEl = document.getElementById('res-vs-hcp');
  const verdict = document.getElementById('verdict');

  if (vsHcp < -1) {
    vsEl.textContent = vsHcp.toFixed(1);
    vsEl.style.color = '#166534';
    verdict.textContent = `Great round! Your score differential (${differential.toFixed(1)}) is ${Math.abs(vsHcp).toFixed(1)} better than your handicap index — this may reduce your handicap.`;
    verdict.className = 'verdict good';
  } else if (vsHcp > 1) {
    vsEl.textContent = `+${vsHcp.toFixed(1)}`;
    vsEl.style.color = '#991b1b';
    verdict.textContent = `Tough round. Your score differential (${differential.toFixed(1)}) is ${vsHcp.toFixed(1)} above your handicap index — your handicap won't increase from a single round.`;
    verdict.className = 'verdict bad';
  } else {
    vsEl.textContent = vsHcp >= 0 ? `+${vsHcp.toFixed(1)}` : vsHcp.toFixed(1);
    vsEl.style.color = '';
    verdict.textContent = `Solid round — your score differential (${differential.toFixed(1)}) is very close to your handicap index.`;
    verdict.className = 'verdict level';
  }

  resultsEl.classList.remove('hidden');
}

grossInput.addEventListener('input', recalculate);
hcpInput.addEventListener('input', recalculate);

loadCourses();
