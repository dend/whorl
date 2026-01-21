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

// Cached settings
let settings = { ...DEFAULT_SETTINGS };

// Load settings on startup
loadSettings();

// Listen for settings changes
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    for (const key of Object.keys(changes)) {
      if (key in settings) {
        settings[key] = changes[key].newValue;
      }
    }
  }
});

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const result = await browser.storage.local.get(DEFAULT_SETTINGS);
    settings = { ...DEFAULT_SETTINGS, ...result };
  } catch (e) {
    console.error("Error loading settings:", e);
  }
}

// Register compose scripts when extension loads
browser.scripting.compose.registerScripts([
  {
    id: "whorl-compose",
    js: ["compose-script.js"],
    css: ["compose-styles.css"]
  }
]).then(() => {
  console.log("Compose script registered successfully");
}).catch((err) => {
  console.error("Compose script registration failed:", err);
});

// Handle messages from compose scripts and options page
browser.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id;

  if (message.type === "getContacts") {
    if (!tabId) {
      console.error("No tab ID available from sender");
      return Promise.resolve([]);
    }
    return getContactsForCompose(tabId, message.query);
  }

  if (message.type === "ensureRecipientInTo") {
    if (!tabId) {
      console.error("No tab ID available from sender");
      return Promise.resolve();
    }
    // Check if auto-add is enabled
    if (!settings.autoAddRecipient) {
      return Promise.resolve();
    }
    return ensureRecipientInTo(tabId, message.email, message.name);
  }

  if (message.type === "getSettings") {
    return Promise.resolve({
      triggerCharacter: settings.triggerCharacter
    });
  }

  return false; // Not handling this message
});

/**
 * Ensure a recipient is in the To field
 * - If already in To, do nothing
 * - If in CC or BCC, move to To
 * - If not present, add to To
 */
async function ensureRecipientInTo(tabId, email, name) {
  try {
    const details = await browser.compose.getComposeDetails(tabId);
    const emailLower = email.toLowerCase();

    const formattedRecipient = name ? `${name} <${email}>` : email;

    const inTo = (details.to || []).some((r) => {
      const parsed = parseRecipient(r);
      return parsed && parsed.email.toLowerCase() === emailLower;
    });

    if (inTo) {
      return;
    }

    const newCc = (details.cc || []).filter((r) => {
      const parsed = parseRecipient(r);
      return !parsed || parsed.email.toLowerCase() !== emailLower;
    });

    const newBcc = (details.bcc || []).filter((r) => {
      const parsed = parseRecipient(r);
      return !parsed || parsed.email.toLowerCase() !== emailLower;
    });

    const newTo = [...(details.to || []), formattedRecipient];

    await browser.compose.setComposeDetails(tabId, {
      to: newTo,
      cc: newCc,
      bcc: newBcc
    });
  } catch (e) {
    console.error("Error ensuring recipient in To:", e);
  }
}

/**
 * Get contacts for autocomplete, merging recipients, address book, and custom contacts
 */
async function getContactsForCompose(tabId, query) {
  const contacts = new Map();

  // Add current recipients if enabled
  if (settings.searchRecipients) {
    try {
      const composeDetails = await browser.compose.getComposeDetails(tabId);
      const recipientFields = ["to", "cc", "bcc"];

      for (const field of recipientFields) {
        const recipients = composeDetails[field] || [];
        for (const recipient of recipients) {
          const parsed = parseRecipient(recipient);
          if (parsed && matchesQuery(parsed, query) && !isBlocked(parsed)) {
            contacts.set(parsed.email.toLowerCase(), {
              ...parsed,
              isRecipient: true
            });
          }
        }
      }
    } catch (e) {
      console.error("Error fetching compose details:", e);
    }
  }

  // Add address book contacts if enabled
  if (settings.searchAddressBooks) {
    try {
      const queryOptions = query ? { searchString: query } : {};
      const addressBookContacts = await browser.addressBooks.contacts.query(queryOptions);

      for (const contact of addressBookContacts) {
        const parsed = parseVCard(contact.vCard);

        if (!parsed.emails.length) {
          continue;
        }

        for (const email of parsed.emails) {
          const emailLower = email.toLowerCase();
          if (!contacts.has(emailLower)) {
            const contactObj = { name: parsed.name, email };

            if (matchesQuery(contactObj, query) && !isBlocked(contactObj)) {
              contacts.set(emailLower, {
                ...contactObj,
                isRecipient: false
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Error searching address book:", e);
    }
  }

  // Add custom contacts if enabled
  if (settings.searchCustomContacts) {
    for (const customContact of settings.customContacts) {
      const emailLower = customContact.email.toLowerCase();
      if (!contacts.has(emailLower) && matchesQuery(customContact, query) && !isBlocked(customContact)) {
        contacts.set(emailLower, {
          ...customContact,
          isRecipient: false
        });
      }
    }
  }

  const results = Array.from(contacts.values());

  // Sort alphabetically by name/email
  results.sort((a, b) => {
    return (a.name || a.email).localeCompare(b.name || b.email);
  });

  return results.slice(0, settings.maxResults);
}

/**
 * Check if a contact is blocked
 */
function isBlocked(contact) {
  const name = (contact.name || "").toLowerCase();
  const email = (contact.email || "").toLowerCase();

  for (const entry of settings.blocklist) {
    const lowerEntry = entry.toLowerCase();
    if (name.includes(lowerEntry) || email.includes(lowerEntry)) {
      return true;
    }
  }
  return false;
}

/**
 * Parse a recipient string into name and email
 */
function parseRecipient(recipient) {
  if (!recipient) return null;

  if (typeof recipient === "object") {
    return {
      name: recipient.name || "",
      email: recipient.email || ""
    };
  }

  const match = recipient.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+@[^>]+)>?$/);
  if (match) {
    return {
      name: (match[1] || "").trim(),
      email: match[2].trim()
    };
  }

  return null;
}

/**
 * Parse vCard string to extract name and emails
 */
function parseVCard(vCard) {
  const result = { name: "", emails: [] };

  if (!vCard) return result;

  const lines = vCard.split(/\r?\n/);

  for (const line of lines) {
    if (line.startsWith("FN:")) {
      result.name = line.substring(3).trim();
    }

    if (line.startsWith("EMAIL")) {
      const colonIndex = line.indexOf(":");
      if (colonIndex !== -1) {
        const email = line.substring(colonIndex + 1).trim();
        if (email) {
          result.emails.push(email);
        }
      }
    }
  }

  return result;
}

/**
 * Check if contact matches the search query
 */
function matchesQuery(contact, query) {
  if (!query) return true;

  const lowerQuery = query.toLowerCase();
  const name = (contact.name || "").toLowerCase();
  const email = (contact.email || "").toLowerCase();

  return name.includes(lowerQuery) || email.includes(lowerQuery);
}
