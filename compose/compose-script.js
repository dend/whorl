/**
 * Thunderbird @Mention - Compose Script
 * Handles autocomplete dropdown and mention insertion in compose window
 */

(function () {
  "use strict";

  // State
  let dropdown = null;
  let selectedIndex = -1;
  let currentContacts = [];
  let currentQuery = "";
  let atTriggerRange = null;

  /**
   * Initialize the mention system
   */
  function init() {
    // Listen for input events on the document body (the editable area)
    document.addEventListener("input", handleInput);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("click", handleDocumentClick);

    // Create dropdown element
    createDropdown();
  }

  /**
   * Create the autocomplete dropdown element
   */
  function createDropdown() {
    dropdown = document.createElement("div");
    dropdown.id = "at-mention-dropdown";
    dropdown.className = "at-mention-dropdown";
    dropdown.style.display = "none";
    document.body.appendChild(dropdown);
  }

  /**
   * Handle input events to detect @ trigger
   */
  function handleInput(event) {
    const atInfo = findAtTrigger();

    if (atInfo) {
      currentQuery = atInfo.query;
      atTriggerRange = atInfo.range;
      fetchAndShowContacts(atInfo.query);
    } else {
      hideDropdown();
    }
  }

  /**
   * Find @ trigger before cursor and extract query
   * @returns {Object|null} { query, range } or null if no trigger
   */
  function findAtTrigger() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    if (!range.collapsed) return null;

    // Get the text node and offset
    let node = range.startContainer;
    let offset = range.startOffset;

    // Must be in a text node
    if (node.nodeType !== Node.TEXT_NODE) {
      // Try to find text node child
      if (node.childNodes.length > 0 && offset > 0) {
        node = node.childNodes[offset - 1];
        if (node.nodeType === Node.TEXT_NODE) {
          offset = node.textContent.length;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }

    const text = node.textContent.substring(0, offset);

    // Find the last @ that's either at start or preceded by whitespace
    let atIndex = -1;
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] === "@") {
        // Check if @ is at start or preceded by whitespace
        if (i === 0 || /\s/.test(text[i - 1])) {
          atIndex = i;
          break;
        }
      }
      // Stop searching if we hit whitespace (query can't span whitespace for trigger)
      // Actually, allow spaces in names like "@Den Deli"
      // Just stop at another @ or certain punctuation
      if (text[i] === "@") {
        break; // Found @ but not valid trigger position
      }
    }

    if (atIndex === -1) return null;

    const query = text.substring(atIndex + 1);

    // Don't trigger if query is too long (probably not a mention)
    if (query.length > 50) return null;

    // Create a range from @ to cursor
    const triggerRange = document.createRange();
    triggerRange.setStart(node, atIndex);
    triggerRange.setEnd(node, offset);

    return { query, range: triggerRange };
  }

  /**
   * Fetch contacts from background script and show dropdown
   */
  async function fetchAndShowContacts(query) {
    try {
      // Request contacts from background script (it will use sender.tab.id)
      const contacts = await browser.runtime.sendMessage({
        type: "getContacts",
        query: query
      });

      currentContacts = contacts || [];
      showDropdown(currentContacts);
    } catch (e) {
      console.error("Error fetching contacts:", e);
      hideDropdown();
    }
  }

  /**
   * Show the dropdown with contacts
   */
  function showDropdown(contacts) {
    if (contacts.length === 0) {
      hideDropdown();
      return;
    }

    // Build dropdown content
    dropdown.innerHTML = "";
    contacts.forEach((contact, index) => {
      const item = document.createElement("div");
      item.className = "at-mention-item";
      if (index === selectedIndex) {
        item.classList.add("selected");
      }

      const nameSpan = document.createElement("span");
      nameSpan.className = "at-mention-item-name";
      nameSpan.textContent = contact.name || contact.email;

      const emailSpan = document.createElement("span");
      emailSpan.className = "at-mention-item-email";
      emailSpan.textContent = contact.email;

      item.appendChild(nameSpan);
      if (contact.name) {
        item.appendChild(emailSpan);
      }

      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectContact(index);
      });

      item.addEventListener("mouseenter", () => {
        selectedIndex = index;
        updateSelectedItem();
      });

      dropdown.appendChild(item);
    });

    // Position dropdown near cursor
    positionDropdown();
    dropdown.style.display = "block";
    selectedIndex = 0;
    updateSelectedItem();
  }

  /**
   * Position dropdown near the @ trigger
   */
  function positionDropdown() {
    if (!atTriggerRange) return;

    const rect = atTriggerRange.getBoundingClientRect();
    const bodyRect = document.body.getBoundingClientRect();

    // Position below the @ character
    let top = rect.bottom + window.scrollY + 2;
    let left = rect.left + window.scrollX;

    // Ensure dropdown doesn't go off-screen
    const dropdownRect = dropdown.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left + 250 > viewportWidth) {
      left = viewportWidth - 260;
    }

    if (top + 200 > viewportHeight + window.scrollY) {
      // Show above instead
      top = rect.top + window.scrollY - 200;
    }

    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
  }

  /**
   * Hide the dropdown
   */
  function hideDropdown() {
    dropdown.style.display = "none";
    selectedIndex = -1;
    currentContacts = [];
    currentQuery = "";
    atTriggerRange = null;
  }

  /**
   * Update visual selection in dropdown
   */
  function updateSelectedItem() {
    const items = dropdown.querySelectorAll(".at-mention-item");
    items.forEach((item, index) => {
      item.classList.toggle("selected", index === selectedIndex);
    });
  }

  /**
   * Handle keyboard navigation and selection
   */
  function handleKeyDown(event) {
    // Handle backspace on mentions
    if (event.key === "Backspace") {
      if (handleMentionBackspace()) {
        event.preventDefault();
        return;
      }
    }

    // Only handle other keys if dropdown is visible
    if (dropdown.style.display === "none") return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, currentContacts.length - 1);
        updateSelectedItem();
        scrollSelectedIntoView();
        break;

      case "ArrowUp":
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelectedItem();
        scrollSelectedIntoView();
        break;

      case "Enter":
      case "Tab":
        if (selectedIndex >= 0 && currentContacts.length > 0) {
          event.preventDefault();
          selectContact(selectedIndex);
        }
        break;

      case "Escape":
        event.preventDefault();
        hideDropdown();
        break;
    }
  }

  /**
   * Scroll selected item into view
   */
  function scrollSelectedIntoView() {
    const items = dropdown.querySelectorAll(".at-mention-item");
    if (items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: "nearest" });
    }
  }

  /**
   * Select a contact and insert mention
   */
  function selectContact(index) {
    const contact = currentContacts[index];
    if (!contact || !atTriggerRange) return;

    const displayName = contact.name || contact.email;
    const email = contact.email;

    // Create mention span
    const mentionSpan = document.createElement("span");
    mentionSpan.className = "at-mention";
    mentionSpan.contentEditable = "false";
    mentionSpan.dataset.email = email;
    mentionSpan.dataset.name = displayName;

    const link = document.createElement("a");
    link.href = `mailto:${email}`;
    link.innerHTML = `<strong>@${displayName}</strong>`;

    mentionSpan.appendChild(link);

    // Delete the @query text
    atTriggerRange.deleteContents();

    // Insert the mention span
    atTriggerRange.insertNode(mentionSpan);

    // Add a space after and move cursor there
    const space = document.createTextNode("\u00A0");
    mentionSpan.parentNode.insertBefore(space, mentionSpan.nextSibling);

    // Move cursor after the space
    const selection = window.getSelection();
    const newRange = document.createRange();
    newRange.setStartAfter(space);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    hideDropdown();
  }

  /**
   * Handle backspace on mentions - remove last word first
   * @returns {boolean} True if backspace was handled
   */
  function handleMentionBackspace() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;

    const range = selection.getRangeAt(0);
    if (!range.collapsed) return false;

    // Check if cursor is right after a mention span
    let node = range.startContainer;
    let offset = range.startOffset;

    // Find the previous sibling or check if we're at start of a text node after mention
    let mentionSpan = null;

    if (node.nodeType === Node.TEXT_NODE) {
      if (offset === 0) {
        // At start of text node, check previous sibling
        let prev = node.previousSibling;
        if (prev && prev.classList && prev.classList.contains("at-mention")) {
          mentionSpan = prev;
        }
      } else if (offset === 1 && node.textContent[0] === "\u00A0") {
        // Right after the nbsp we insert, check for mention before
        let prev = node.previousSibling;
        if (prev && prev.classList && prev.classList.contains("at-mention")) {
          mentionSpan = prev;
          // Also remove the nbsp
          node.textContent = node.textContent.substring(1);
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Check if child at offset-1 is a mention
      if (offset > 0) {
        const child = node.childNodes[offset - 1];
        if (child && child.classList && child.classList.contains("at-mention")) {
          mentionSpan = child;
        }
      }
    }

    if (!mentionSpan) return false;

    // Get current name words
    const name = mentionSpan.dataset.name;
    const words = name.split(/\s+/);

    if (words.length > 1) {
      // Remove last word
      words.pop();
      const newName = words.join(" ");

      // Update the mention
      mentionSpan.dataset.name = newName;
      const link = mentionSpan.querySelector("a");
      if (link) {
        link.innerHTML = `<strong>@${newName}</strong>`;
      }
    } else {
      // Remove entire mention
      mentionSpan.remove();
    }

    return true;
  }

  /**
   * Handle clicks outside dropdown to close it
   */
  function handleDocumentClick(event) {
    if (!dropdown.contains(event.target)) {
      hideDropdown();
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
