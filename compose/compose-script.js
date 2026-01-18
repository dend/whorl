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
    // Mark as non-editable so it doesn't interfere with content editing
    dropdown.contentEditable = "false";
    document.body.appendChild(dropdown);
  }

  /**
   * Ensure dropdown exists in DOM (may have been deleted by Cmd+A, etc.)
   */
  function ensureDropdownExists() {
    if (!dropdown || !document.body.contains(dropdown)) {
      createDropdown();
    }
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

    // If not in a text node, search backwards for the nearest text node
    if (node.nodeType !== Node.TEXT_NODE) {
      const textNode = findPreviousTextNode(node, offset);
      if (textNode) {
        node = textNode;
        offset = textNode.textContent.length;
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
        } else {
          // Found @ but not valid trigger position (e.g., email@domain)
          break;
        }
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
   * Search backwards from cursor position to find the nearest text node
   * @param {Node} parentNode - The parent element node
   * @param {number} offset - Cursor offset within parent
   * @returns {Text|null} The text node or null
   */
  function findPreviousTextNode(parentNode, offset) {
    // Search backwards through children from cursor position
    for (let i = offset - 1; i >= 0; i--) {
      const child = parentNode.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE) {
        return child;
      }
      // If it's an element, check its last text node descendant
      if (child.nodeType === Node.ELEMENT_NODE) {
        const textNode = getLastTextNode(child);
        if (textNode) {
          return textNode;
        }
      }
    }
    return null;
  }

  /**
   * Get the last text node descendant of an element
   * @param {Node} node
   * @returns {Text|null}
   */
  function getLastTextNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node;
    }
    // Traverse children in reverse
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const result = getLastTextNode(node.childNodes[i]);
      if (result) {
        return result;
      }
    }
    return null;
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

    // Ensure dropdown exists (may have been deleted by Cmd+A, etc.)
    ensureDropdownExists();

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

    // With position:fixed, we use viewport coordinates directly (no scroll offset)
    let top = rect.bottom + 2;
    let left = rect.left;

    // If rect has no dimensions, try to get cursor position from selection
    if (rect.width === 0 && rect.height === 0) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const cursorRect = selection.getRangeAt(0).getBoundingClientRect();
        if (cursorRect.width > 0 || cursorRect.height > 0) {
          top = cursorRect.bottom + 2;
          left = cursorRect.left;
        } else {
          // Fallback: position near top-left of viewport
          top = 50;
          left = 20;
        }
      }
    }

    // Ensure dropdown doesn't go off-screen
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Ensure left is not negative
    if (left < 10) {
      left = 10;
    }

    if (left + 250 > viewportWidth) {
      left = Math.max(10, viewportWidth - 260);
    }

    if (top + 200 > viewportHeight) {
      // Show above instead
      top = Math.max(10, rect.top - 210);
    }

    // Ensure top is not negative
    if (top < 10) {
      top = 10;
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
    link.innerHTML = `@${displayName}`;

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
        link.innerHTML = `@${newName}`;
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
