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
  let triggerCharacter = "@";

  /**
   * Initialize the mention system
   */
  async function init() {
    await loadSettings();
    document.addEventListener("input", handleInput);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("click", handleDocumentClick);
    createDropdown();
  }

  /**
   * Load settings from background script
   */
  async function loadSettings() {
    try {
      const settings = await browser.runtime.sendMessage({ type: "getSettings" });
      if (settings && settings.triggerCharacter) {
        triggerCharacter = settings.triggerCharacter;
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  }

  /**
   * Create the autocomplete dropdown element
   */
  function createDropdown() {
    dropdown = document.createElement("div");
    dropdown.id = "at-mention-dropdown";
    dropdown.className = "at-mention-dropdown";
    dropdown.style.display = "none";
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
   * Find trigger character before cursor and extract query
   */
  function findAtTrigger() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    if (!range.collapsed) return null;

    let node = range.startContainer;
    let offset = range.startOffset;

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

    let atIndex = -1;
    for (let i = text.length - 1; i >= 0; i--) {
      if (text[i] === triggerCharacter) {
        if (i === 0 || /\s/.test(text[i - 1])) {
          atIndex = i;
          break;
        } else {
          break;
        }
      }
    }

    if (atIndex === -1) return null;

    const query = text.substring(atIndex + 1);

    if (query.length > 50) return null;

    const triggerRange = document.createRange();
    triggerRange.setStart(node, atIndex);
    triggerRange.setEnd(node, offset);

    return { query, range: triggerRange };
  }

  /**
   * Search backwards from cursor position to find the nearest text node
   */
  function findPreviousTextNode(parentNode, offset) {
    for (let i = offset - 1; i >= 0; i--) {
      const child = parentNode.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE) {
        return child;
      }
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
   */
  function getLastTextNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node;
    }
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

    ensureDropdownExists();

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

    let top = rect.bottom + 2;
    let left = rect.left;

    if (rect.width === 0 && rect.height === 0) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const cursorRect = selection.getRangeAt(0).getBoundingClientRect();
        if (cursorRect.width > 0 || cursorRect.height > 0) {
          top = cursorRect.bottom + 2;
          left = cursorRect.left;
        } else {
          top = 50;
          left = 20;
        }
      }
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 10) {
      left = 10;
    }

    if (left + 250 > viewportWidth) {
      left = Math.max(10, viewportWidth - 260);
    }

    if (top + 200 > viewportHeight) {
      top = Math.max(10, rect.top - 210);
    }

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
    if (event.key === "Backspace") {
      if (handleMentionBackspace()) {
        event.preventDefault();
        return;
      }
    }

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
  async function selectContact(index) {
    const contact = currentContacts[index];
    if (!contact || !atTriggerRange) return;

    const displayName = contact.name || contact.email;
    const email = contact.email;

    const mentionSpan = document.createElement("span");
    mentionSpan.className = "at-mention";
    mentionSpan.contentEditable = "false";
    mentionSpan.dataset.email = email;
    mentionSpan.dataset.name = displayName;

    const link = document.createElement("a");
    link.href = `mailto:${email}`;
    link.textContent = `${triggerCharacter}${displayName}`;

    mentionSpan.appendChild(link);

    atTriggerRange.deleteContents();
    atTriggerRange.insertNode(mentionSpan);

    // Insert zero-width space as cursor anchor
    const cursorAnchor = document.createTextNode("\u200B");
    mentionSpan.parentNode.insertBefore(cursorAnchor, mentionSpan.nextSibling);

    hideDropdown();

    // Defer cursor positioning to next frame to let DOM settle
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      const newRange = document.createRange();
      newRange.setStart(cursorAnchor, 1);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    });

    try {
      await browser.runtime.sendMessage({
        type: "ensureRecipientInTo",
        email: email,
        name: displayName
      });
    } catch (e) {
      console.error("Error adding recipient to To:", e);
    }
  }

  /**
   * Handle backspace on mentions - remove last word first
   */
  function handleMentionBackspace() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;

    const range = selection.getRangeAt(0);
    if (!range.collapsed) return false;

    let node = range.startContainer;
    let offset = range.startOffset;

    let mentionSpan = null;

    if (node.nodeType === Node.TEXT_NODE) {
      // Check if we're in or right after a zero-width space anchor
      const text = node.textContent;
      const isZwsAnchor =
        text === "\u200B" || (offset <= 1 && text.startsWith("\u200B"));

      if (offset === 0 || isZwsAnchor) {
        // Look for mention span as previous sibling
        let prev = node.previousSibling;
        if (prev && prev.classList && prev.classList.contains("at-mention")) {
          mentionSpan = prev;
        }
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (offset > 0) {
        const child = node.childNodes[offset - 1];
        // Check if child is a zero-width space text node
        if (
          child &&
          child.nodeType === Node.TEXT_NODE &&
          child.textContent === "\u200B"
        ) {
          const prev = child.previousSibling;
          if (prev && prev.classList && prev.classList.contains("at-mention")) {
            mentionSpan = prev;
          }
        } else if (
          child &&
          child.classList &&
          child.classList.contains("at-mention")
        ) {
          mentionSpan = child;
        }
      }
    }

    if (!mentionSpan) return false;

    const name = mentionSpan.dataset.name;
    const words = name.split(/\s+/);

    if (words.length > 1) {
      // Remove last word, keep mention
      words.pop();
      const newName = words.join(" ");

      mentionSpan.dataset.name = newName;
      const link = mentionSpan.querySelector("a");
      if (link) {
        link.textContent = `${triggerCharacter}${newName}`;
      }
    } else {
      // Last word - remove the mention span and its zero-width space anchor
      const parent = mentionSpan.parentNode;
      const prevSibling = mentionSpan.previousSibling;

      const nextSibling = mentionSpan.nextSibling;
      if (
        nextSibling &&
        nextSibling.nodeType === Node.TEXT_NODE &&
        nextSibling.textContent === "\u200B"
      ) {
        nextSibling.remove();
      }
      mentionSpan.remove();

      // Reposition cursor where the mention was
      const selection = window.getSelection();
      const newRange = document.createRange();
      if (prevSibling) {
        // Position at end of previous sibling
        if (prevSibling.nodeType === Node.TEXT_NODE) {
          newRange.setStart(prevSibling, prevSibling.length);
        } else {
          newRange.setStartAfter(prevSibling);
        }
      } else if (parent) {
        // No previous sibling - position at start of parent
        newRange.setStart(parent, 0);
      }
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
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
