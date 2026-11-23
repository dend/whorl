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
  displayVersion();
  await loadSettings();
}

/**
 * Display extension version from manifest
 */
function displayVersion() {
  const manifest = browser.runtime.getManifest();
  const versionEl = document.getElementById("extensionVersion");
  if (versionEl) {
    versionEl.textContent = manifest.version;
  }
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
  elements.customContactsList.replaceChildren();

  if (contacts.length === 0) {
    const row = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.className = "empty-message";
    td.textContent = "No custom contacts added";
    row.appendChild(td);
    elements.customContactsList.appendChild(row);
    return;
  }

  contacts.forEach((contact, index) => {
    const row = document.createElement("tr");
    row.dataset.name = contact.name;
    row.dataset.email = contact.email;

    const tdName = document.createElement("td");
    tdName.textContent = contact.name;

    const tdEmail = document.createElement("td");
    tdEmail.textContent = contact.email;

    const tdAction = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.dataset.index = index;
    removeBtn.title = "Remove";
    removeBtn.textContent = "\u00D7";
    removeBtn.addEventListener("click", () => removeCustomContact(index));
    tdAction.appendChild(removeBtn);

    row.appendChild(tdName);
    row.appendChild(tdEmail);
    row.appendChild(tdAction);
    elements.customContactsList.appendChild(row);
  });
}

/**
 * Render blocklist
 */
function renderBlocklist(blocklist) {
  elements.blocklistItems.replaceChildren();

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

    const span = document.createElement("span");
    span.className = "blocklist-text";
    span.textContent = entry;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.dataset.index = index;
    removeBtn.title = "Remove";
    removeBtn.textContent = "\u00D7";
    removeBtn.addEventListener("click", () => removeBlocklistEntry(index));

    li.appendChild(span);
    li.appendChild(removeBtn);
    elements.blocklistItems.appendChild(li);
  });
}

/**
 * Add a custom contact (auto-saves)
 */
async function addCustomContact() {
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

  // Auto-save to storage
  try {
    await browser.storage.local.set({ customContacts: contacts });
    showStatus("Contact added");
  } catch (e) {
    console.error("Error saving contact:", e);
    showStatus("Error saving contact", true);
  }

  elements.newContactName.value = "";
  elements.newContactEmail.value = "";
  elements.newContactName.focus();
}

/**
 * Remove a custom contact (auto-saves)
 */
async function removeCustomContact(index) {
  const contacts = getCustomContactsFromUI();
  contacts.splice(index, 1);
  renderCustomContacts(contacts);

  // Auto-save to storage
  try {
    await browser.storage.local.set({ customContacts: contacts });
    showStatus("Contact removed");
  } catch (e) {
    console.error("Error saving contacts:", e);
    showStatus("Error removing contact", true);
  }
}

/**
 * Add a blocklist entry (auto-saves)
 */
async function addBlocklistEntry() {
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

  // Auto-save to storage
  try {
    await browser.storage.local.set({ blocklist });
    showStatus("Entry added to blocklist");
  } catch (e) {
    console.error("Error saving blocklist:", e);
    showStatus("Error saving blocklist", true);
  }

  elements.newBlocklistEntry.value = "";
  elements.newBlocklistEntry.focus();
}

/**
 * Remove a blocklist entry (auto-saves)
 */
async function removeBlocklistEntry(index) {
  const blocklist = getBlocklistFromUI();
  blocklist.splice(index, 1);
  renderBlocklist(blocklist);

  // Auto-save to storage
  try {
    await browser.storage.local.set({ blocklist });
    showStatus("Entry removed from blocklist");
  } catch (e) {
    console.error("Error saving blocklist:", e);
    showStatus("Error removing entry", true);
  }
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

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", init);
