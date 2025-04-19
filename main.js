// main.js - Logic for Author Publish & Reader Translate app

// Utility to get works from localStorage
function getWorks() {
  const works = localStorage.getItem('publishedWorks');
  return works ? JSON.parse(works) : [];
}

// Utility to save works to localStorage
function saveWorks(works) {
  localStorage.setItem('publishedWorks', JSON.stringify(works));
}

// Populate author filter dropdown
function populateAuthorFilter() {
  const works = getWorks();
  const authors = [...new Set(works.map(work => work.authorName))];
  const filterAuthor = document.getElementById('filterAuthor');
  filterAuthor.innerHTML = '<option value="all" selected>All Authors</option>';
  authors.forEach(author => {
    const option = document.createElement('option');
    option.value = author;
    option.textContent = author;
    filterAuthor.appendChild(option);
  });
}

const readerEmailInput = document.getElementById('readerEmail');

function getNotRecommendedWorks(email) {
  const data = localStorage.getItem(`notRecommended_${email}`);
  return data ? JSON.parse(data) : [];
}

function setNotRecommendedWorks(email, workTitle) {
  const current = getNotRecommendedWorks(email);
  if (!current.includes(workTitle)) {
    current.push(workTitle);
    localStorage.setItem(`notRecommended_${email}`, JSON.stringify(current));
  }
}

function renderWorks(filterAuthor = 'all') {
  const worksList = document.getElementById('worksList');
  worksList.innerHTML = '';
  const works = getWorks();

  const email = readerEmailInput ? readerEmailInput.value.trim().toLowerCase() : '';
  const notRecommended = email ? getNotRecommendedWorks(email) : [];

  let filteredWorks = filterAuthor === 'all' ? works : works.filter(w => w.authorName === filterAuthor);

  // Filter out not recommended works for this user
  if (email) {
    filteredWorks = filteredWorks.filter(w => !notRecommended.includes(w.title));
  }

  if (filteredWorks.length === 0) {
    worksList.innerHTML = '<p class="text-gray-400">No works found.</p>';
    document.getElementById('translationSection').classList.add('hidden');
    return;
  }

  filteredWorks.forEach((work, index) => {
    const workDiv = document.createElement('div');
    workDiv.className = 'bg-gray-700 p-4 rounded shadow cursor-pointer hover:bg-gray-600 transition flex gap-4 items-center';
    workDiv.tabIndex = 0;
    workDiv.setAttribute('role', 'button');
    workDiv.setAttribute('aria-pressed', 'false');

    const coverImg = work.coverData
      ? `<img src="${work.coverData}" alt="Cover image" class="w-16 h-20 object-cover rounded" />`
      : `<div class="w-16 h-20 bg-gray-600 rounded flex items-center justify-center text-gray-400 text-sm">No Cover</div>`;

    const genres = work.genres && work.genres.length > 0
      ? `<p class="text-sm text-gray-400 italic mb-1">Genres: ${work.genres.join(', ')}</p>`
      : '';

    const summary = work.summary
      ? `<p class="text-sm text-gray-300 mb-2">${work.summary}</p>`
      : '';

    workDiv.innerHTML = `
      ${coverImg}
      <div class="flex-grow">
        <h3 class="text-lg font-semibold">${work.title}</h3>
        <p class="italic text-sm text-gray-300">by ${work.authorName} - ${work.type}</p>
        ${genres}
        ${summary}
        <p class="mt-2 max-h-24 overflow-hidden">${work.content}</p>
      </div>
      <button class="not-recommend-btn bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1 ml-4 self-start" title="Do not recommend this work">
        <i class="fas fa-ban"></i> Not Recommend
      </button>
    `;

    // Click on work div opens reader page
    workDiv.addEventListener('click', (e) => {
      if (e.target.closest('.not-recommend-btn')) return; // Ignore if clicking the button
      selectWork(index);
    });
    workDiv.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectWork(index);
      }
    });

    // Handle not recommend button click
    const notRecommendBtn = workDiv.querySelector('.not-recommend-btn');
    notRecommendBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!email) {
        alert('Please enter your Gmail ID to use this feature.');
        return;
      }
      if (confirm(`Do you want to mark "${work.title}" as not recommended?`)) {
        setNotRecommendedWorks(email, work.title);
        renderWorks(filterAuthor);
      }
    });

    worksList.appendChild(workDiv);
  });

  // Hide translation section initially
  document.getElementById('translationSection').classList.add('hidden');
  document.getElementById('translatedText').textContent = '';
}

// Selected work index for translation
let selectedWorkIndex = null;

function selectWork(index) {
  const works = getWorks();
  const work = works[index];
  if (!work) return;

  // Save selected work to localStorage for reader.html
  localStorage.setItem('selectedWork', JSON.stringify(work));

  // Open reader.html in new tab
  window.open('reader.html', '_blank');
}

// Handle form submission to publish new work with optional PDF file, cover image, summary, and genres
document.getElementById('publishForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const authorName = document.getElementById('authorName').value.trim();
  const title = document.getElementById('workTitle').value.trim();
  const type = document.getElementById('workType').value;
  const content = document.getElementById('workContent').value.trim();
  const fileInput = document.getElementById('workFile');
  const file = fileInput.files[0];
  const coverInput = document.getElementById('coverImage');
  const coverFile = coverInput.files[0];
  const summary = document.getElementById('workSummary').value.trim();
  const genreSelect = document.getElementById('workGenre');
  const genres = Array.from(genreSelect.selectedOptions).map(option => option.value);

  if (!authorName || !title || !type || (!content && !file)) {
    alert('Please fill in all required fields or upload a PDF file.');
    return;
  }

  if (file && file.type !== 'application/pdf') {
    alert('Only PDF files are allowed.');
    return;
  }

  if (coverFile && !coverFile.type.startsWith('image/')) {
    alert('Cover image must be an image file.');
    return;
  }

  const works = getWorks();

  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const fileData = event.target.result; // base64 string

      if (coverFile) {
        const coverReader = new FileReader();
        coverReader.onload = function(coverEvent) {
          const coverData = coverEvent.target.result; // base64 string
          works.push({ authorName, title, type, content, summary, genres, fileData, fileName: file.name, coverData });
          saveWorks(works);
          e.target.reset();
          populateAuthorFilter();
          renderWorks();
          alert('Work with PDF, cover image, summary, and genres published successfully!');
        };
        coverReader.readAsDataURL(coverFile);
      } else {
        works.push({ authorName, title, type, content, summary, genres, fileData, fileName: file.name });
        saveWorks(works);
        e.target.reset();
        populateAuthorFilter();
        renderWorks();
        alert('Work with PDF, summary, and genres published successfully!');
      }
    };
    reader.readAsDataURL(file);
  } else {
    if (coverFile) {
      const coverReader = new FileReader();
      coverReader.onload = function(coverEvent) {
        const coverData = coverEvent.target.result; // base64 string
        works.push({ authorName, title, type, content, summary, genres, coverData });
        saveWorks(works);
        e.target.reset();
        populateAuthorFilter();
        renderWorks();
        alert('Work with cover image, summary, and genres published successfully!');
      };
      coverReader.readAsDataURL(coverFile);
    } else {
      works.push({ authorName, title, type, content, summary, genres });
      saveWorks(works);
      e.target.reset();
      populateAuthorFilter();
      renderWorks();
      alert('Work with summary and genres published successfully!');
    }
  }
});

// Handle author filter change and search
const filterAuthor = document.getElementById('filterAuthor');
const authorSearch = document.getElementById('authorSearch');
const searchBtn = document.getElementById('searchBtn');

function filterAndSearchWorks() {
  const filterValue = filterAuthor.value;
  const searchValue = authorSearch.value.trim().toLowerCase();

  const worksList = document.getElementById('worksList');
  worksList.innerHTML = '';
  const works = getWorks();

  let filteredWorks = works;

  if (filterValue !== 'all') {
    filteredWorks = filteredWorks.filter(w => w.authorName === filterValue);
  }

  if (searchValue !== '') {
    filteredWorks = filteredWorks.filter(w =>
      w.authorName.toLowerCase().includes(searchValue) ||
      w.title.toLowerCase().includes(searchValue)
    );
  }

  if (filteredWorks.length === 0) {
    worksList.innerHTML = '<p class="text-gray-400">No works found.</p>';
    document.getElementById('translationSection').classList.add('hidden');
    return;
  }

  filteredWorks.forEach((work, index) => {
    const workDiv = document.createElement('div');
    workDiv.className = 'bg-gray-700 p-4 rounded shadow cursor-pointer hover:bg-gray-600 transition';
    workDiv.tabIndex = 0;
    workDiv.setAttribute('role', 'button');
    workDiv.setAttribute('aria-pressed', 'false');

    workDiv.innerHTML = `
      <h3 class="text-lg font-semibold">${work.title}</h3>
      <p class="italic text-sm text-gray-300">by ${work.authorName} - ${work.type}</p>
      <p class="mt-2 max-h-24 overflow-hidden">${work.content}</p>
    `;

    workDiv.addEventListener('click', () => {
      selectWork(index);
    });
    workDiv.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectWork(index);
      }
    });

    worksList.appendChild(workDiv);
  });

  // Hide translation section initially
  document.getElementById('translationSection').classList.add('hidden');
  document.getElementById('translatedText').textContent = '';
}

filterAuthor.addEventListener('change', filterAndSearchWorks);
searchBtn.addEventListener('click', filterAndSearchWorks);
authorSearch.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    filterAndSearchWorks();
  }
});

if (document.getElementById('translateBtn')) {
  document.getElementById('translateBtn').removeEventListener('click', () => {});
  document.getElementById('translateBtn').style.display = 'none';
}

if (typeof simulateTranslation === 'function') {
  simulateTranslation = null;
}

let currentRole = 'reader'; // default role

// Show or hide sections based on role
function updateRoleView() {
  const roleSelection = document.getElementById('roleSelection');
  const readerSection = document.getElementById('readerSection');
  const authorSection = document.getElementById('authorSection');

  if (currentRole === 'reader') {
    roleSelection.classList.add('hidden');
    readerSection.classList.remove('hidden');
    authorSection.classList.add('hidden');
  } else if (currentRole === 'author') {
    roleSelection.classList.add('hidden');
    readerSection.classList.add('hidden');
    authorSection.classList.remove('hidden');
  }
}

// Populate author works list for management
function renderAuthorWorks(authorName) {
  const authorWorksList = document.getElementById('authorWorksList');
  authorWorksList.innerHTML = '';
  const works = getWorks().filter(work => work.authorName === authorName);

  if (works.length === 0) {
    authorWorksList.innerHTML = '<p class="text-gray-400">You have not published any works yet.</p>';
    return;
  }

  works.forEach((work, index) => {
    const workDiv = document.createElement('div');
    workDiv.className = 'bg-gray-700 p-4 rounded shadow flex flex-col gap-2';

    const title = document.createElement('h3');
    title.className = 'text-lg font-semibold';
    title.textContent = work.title;

    const type = document.createElement('p');
    type.className = 'italic text-sm text-gray-300';
    type.textContent = `${work.type}`;

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'flex gap-3';

    const editBtn = document.createElement('button');
    editBtn.className = 'bg-yellow-500 hover:bg-yellow-600 text-black rounded px-3 py-1 font-semibold';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      // Populate form with work data for editing
      document.getElementById('authorName').value = work.authorName;
      document.getElementById('workTitle').value = work.title;
      document.getElementById('workType').value = work.type;
      document.getElementById('workContent').value = work.content || '';
      // Note: File editing not supported, user must re-upload if needed
      // Scroll to form
      document.getElementById('authorSection').scrollIntoView({ behavior: 'smooth' });
      // Remove the work being edited
      removeWorkByIndex(index, authorName, false);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'bg-red-600 hover:bg-red-700 rounded px-3 py-1 font-semibold';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this work?')) {
        removeWorkByIndex(index, authorName, true);
      }
    });

    buttonsDiv.appendChild(editBtn);
    buttonsDiv.appendChild(deleteBtn);

    workDiv.appendChild(title);
    workDiv.appendChild(type);
    workDiv.appendChild(buttonsDiv);

    authorWorksList.appendChild(workDiv);
  });
}

// Remove work by index for author management
function removeWorkByIndex(index, authorName, updateUI) {
  let works = getWorks();
  // Find all works by author
  const authorWorks = works.filter(work => work.authorName === authorName);
  const workToRemove = authorWorks[index];
  if (!workToRemove) return;

  // Remove from main works array
  works = works.filter(work => work !== workToRemove);
  saveWorks(works);

  if (updateUI) {
    renderAuthorWorks(authorName);
  }
  populateAuthorFilter();
  renderWorks();
}

// Handle role selection buttons
document.getElementById('readerBtn').addEventListener('click', () => {
  currentRole = 'reader';
  updateRoleView();
  populateAuthorFilter();
  renderWorks();
});

document.getElementById('authorBtn').addEventListener('click', () => {
  currentRole = 'author';
  updateRoleView();
  // Clear form and author works list
  document.getElementById('publishForm').reset();
  document.getElementById('authorName').focus();
  renderAuthorWorks('');
});

// New: Handle hamburger menu toggle
const menuBtn = document.getElementById('menuBtn');
const roleMenu = document.getElementById('roleMenu');

menuBtn.addEventListener('click', () => {
  if (roleMenu.classList.contains('hidden')) {
    roleMenu.classList.remove('hidden');
  } else {
    roleMenu.classList.add('hidden');
  }
});

// Close menu if clicking outside
document.addEventListener('click', (e) => {
  if (!menuBtn.contains(e.target) && !roleMenu.contains(e.target)) {
    roleMenu.classList.add('hidden');
  }
});

// Handle role selection from menu
document.getElementById('menuReaderBtn').addEventListener('click', () => {
  currentRole = 'reader';
  updateRoleView();
  populateAuthorFilter();
  renderWorks();
  roleMenu.classList.add('hidden');
});

document.getElementById('menuAuthorBtn').addEventListener('click', () => {
  currentRole = 'author';
  updateRoleView();
  document.getElementById('publishForm').reset();
  document.getElementById('authorName').focus();
  renderAuthorWorks('');
  roleMenu.classList.add('hidden');
});

// Override publish form submission to update author works list if in author mode
document.getElementById('publishForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const authorName = document.getElementById('authorName').value.trim();
  if (!authorName) {
    alert('Please enter your author name.');
    return;
  }
  // Proceed with existing submission logic
  const title = document.getElementById('workTitle').value.trim();
  const type = document.getElementById('workType').value;
  const content = document.getElementById('workContent').value.trim();
  const fileInput = document.getElementById('workFile');
  const file = fileInput.files[0];

  if (!authorName || !title || !type || (!content && !file)) {
    alert('Please fill in all required fields or upload a PDF file.');
    return;
  }

  if (file && file.type !== 'application/pdf') {
    alert('Only PDF files are allowed.');
    return;
  }

  const works = getWorks();

  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const fileData = event.target.result; // base64 string
      works.push({ authorName, title, type, content, fileData, fileName: file.name });
      saveWorks(works);
      e.target.reset();
      renderAuthorWorks(authorName);
      alert('Work with PDF published successfully!');
    };
    reader.readAsDataURL(file);
  } else {
    works.push({ authorName, title, type, content });
    saveWorks(works);
    e.target.reset();
    renderAuthorWorks(authorName);
    alert('Work published successfully!');
  }
});

// Initialize app
function init() {
  updateRoleView();
  populateAuthorFilter();
  renderWorks();
}

init();

init();
