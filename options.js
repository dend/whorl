/**
 * Whorl - Options Page
 * Handles loading and saving extension settings
 */

// Default settings
const DEFAULT_SETTINGS = {
  customContacts: [],
  blocklist: [],
  maxResults: 10,
  autoAddRecipient: true,
  searchAddressBooks: true,
  searchRecipients: true,
  searchCustomContacts: true,
  triggerCharacter: "@"
};

// DOM Elements
let elements = {};

/**
 * Initialize the options page
 */
async function init() {
  cacheElements();
  attachEventListeners();
  await loadSettings();
}

/**
 * Cache DOM element references
 */
function cacheElements() {
  elements = {
    triggerCharacter: document.getElementById("triggerCharacter"),
    maxResults: document.getElementById("maxResults"),
    autoAddRecipient: document.getElementById("autoAddRecipient"),
    searchAddressBooks: document.getElementById("searchAddressBooks"),
    searchRecipients: document.getElementById("searchRecipients"),
    searchCustomContacts: document.getElementById("searchCustomContacts"),
    customContactsList: document.getElementById("customContactsList"),
    newContactName: document.getElementById("newContactName"),
    newContactEmail: document.getElementById("newContactEmail"),
    addContactBtn: document.getElementById("addContactBtn"),
    blocklistItems: document.getElementById("blocklistItems"),
    newBlocklistEntry: document.getElementById("newBlocklistEntry"),
    addBlocklistBtn: document.getElementById("addBlocklistBtn"),
    saveBtn: document.getElementById("saveBtn"),
    saveStatus: document.getElementById("saveStatus")
  };
}

/**
 * Attach event listeners
 */
function attachEventListeners() {
  elements.addContactBtn.addEventListener("click", addCustomContact);
  elements.addBlocklistBtn.addEventListener("click", addBlocklistEntry);
  elements.saveBtn.addEventListener("click", saveSettings);

  // Allow Enter key to add items
  elements.newContactEmail.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addCustomContact();
  });
  elements.newBlocklistEntry.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addBlocklistEntry();
  });
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const result = await browser.storage.local.get(DEFAULT_SETTINGS);

    // General settings
    elements.triggerCharacter.value = result.triggerCharacter;
    elements.maxResults.value = result.maxResults;
    elements.autoAddRecipient.checked = result.autoAddRecipient;
    elements.searchAddressBooks.checked = result.searchAddressBooks;
    elements.searchRecipients.checked = result.searchRecipients;
    elements.searchCustomContacts.checked = result.searchCustomContacts;

    // Custom contacts
    renderCustomContacts(result.customContacts);

    // Blocklist
    renderBlocklist(result.blocklist);
  } catch (e) {
    console.error("Error loading settings:", e);
    showStatus("Error loading settings", true);
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    const settings = {
      triggerCharacter: elements.triggerCharacter.value || "@",
      maxResults: parseInt(elements.maxResults.value, 10) || 10,
      autoAddRecipient: elements.autoAddRecipient.checked,
      searchAddressBooks: elements.searchAddressBooks.checked,
      searchRecipients: elements.searchRecipients.checked,
      searchCustomContacts: elements.searchCustomContacts.checked,
      customContacts: getCustomContactsFromUI(),
      blocklist: getBlocklistFromUI()
    };

    await browser.storage.local.set(settings);
    showStatus("Settings saved!");
  } catch (e) {
    console.error("Error saving settings:", e);
    showStatus("Error saving settings", true);
  }
}

/**
 * Get custom contacts from the UI
 */
function getCustomContactsFromUI() {
  const contacts = [];
  const rows = elements.customContactsList.querySelectorAll("tr");
  rows.forEach(row => {
    const name = row.dataset.name;
    const email = row.dataset.email;
    if (name && email) {
      contacts.push({ name, email });
    }
  });
  return contacts;
}

/**
 * Get blocklist from the UI
 */
function getBlocklistFromUI() {
  const items = [];
  const listItems = elements.blocklistItems.querySelectorAll("li");
  listItems.forEach(li => {
    const text = li.dataset.entry;
    if (text) {
      items.push(text);
    }
  });
  return items;
}

/**
 * Render custom contacts list
 */
function renderCustomContacts(contacts) {
  elements.customContactsList.innerHTML = "";

  if (contacts.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="3" class="empty-message">No custom contacts added</td>';
    elements.customContactsList.appendChild(row);
    return;
  }

  contacts.forEach((contact, index) => {
    const row = document.createElement("tr");
    row.dataset.name = contact.name;
    row.dataset.email = contact.email;
    row.innerHTML = `
      <td>${escapeHtml(contact.name)}</td>
      <td>${escapeHtml(contact.email)}</td>
      <td><button type="button" class="remove-btn" data-index="${index}" title="Remove">&times;</button></td>
    `;
    row.querySelector(".remove-btn").addEventListener("click", () => removeCustomContact(index));
    elements.customContactsList.appendChild(row);
  });
}

/**
 * Render blocklist
 */
function renderBlocklist(blocklist) {
  elements.blocklistItems.innerHTML = "";

  if (blocklist.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-message";
    li.textContent = "No blocked entries";
    elements.blocklistItems.appendChild(li);
    return;
  }

  blocklist.forEach((entry, index) => {
    const li = document.createElement("li");
    li.dataset.entry = entry;
    li.innerHTML = `
      <span class="blocklist-text">${escapeHtml(entry)}</span>
      <button type="button" class="remove-btn" data-index="${index}" title="Remove">&times;</button>
    `;
    li.querySelector(".remove-btn").addEventListener("click", () => removeBlocklistEntry(index));
    elements.blocklistItems.appendChild(li);
  });
}

/**
 * Add a custom contact
 */
function addCustomContact() {
  const name = elements.newContactName.value.trim();
  const email = elements.newContactEmail.value.trim();

  if (!name || !email) {
    showStatus("Please enter both name and email", true);
    return;
  }

  if (!isValidEmail(email)) {
    showStatus("Please enter a valid email address", true);
    return;
  }

  const contacts = getCustomContactsFromUI();

  // Check for duplicate email
  if (contacts.some(c => c.email.toLowerCase() === email.toLowerCase())) {
    showStatus("This email is already in the list", true);
    return;
  }

  contacts.push({ name, email });
  renderCustomContacts(contacts);

  elements.newContactName.value = "";
  elements.newContactEmail.value = "";
  elements.newContactName.focus();
}

/**
 * Remove a custom contact
 */
function removeCustomContact(index) {
  const contacts = getCustomContactsFromUI();
  contacts.splice(index, 1);
  renderCustomContacts(contacts);
}

/**
 * Add a blocklist entry
 */
function addBlocklistEntry() {
  const entry = elements.newBlocklistEntry.value.trim();

  if (!entry) {
    showStatus("Please enter a name or email to block", true);
    return;
  }

  const blocklist = getBlocklistFromUI();

  if (blocklist.includes(entry)) {
    showStatus("This entry is already in the blocklist", true);
    return;
  }

  blocklist.push(entry);
  renderBlocklist(blocklist);

  elements.newBlocklistEntry.value = "";
  elements.newBlocklistEntry.focus();
}

/**
 * Remove a blocklist entry
 */
function removeBlocklistEntry(index) {
  const blocklist = getBlocklistFromUI();
  blocklist.splice(index, 1);
  renderBlocklist(blocklist);
}

/**
 * Show status message
 */
function showStatus(message, isError = false) {
  elements.saveStatus.textContent = message;
  elements.saveStatus.className = isError ? "error" : "";

  if (!isError) {
    setTimeout(() => {
      elements.saveStatus.textContent = "";
    }, 3000);
  }
}

/**
 * Validate email address
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);
