// Register compose scripts when extension loads
browser.scripting.compose.registerScripts([
  {
    id: "at-mention-compose",
    js: ["compose/compose-script.js"],
    css: ["compose/compose-styles.css"]
  }
]).catch((err) => {
  // A restarting background may try to re-register and fail - that's OK
  console.log("Compose script registration:", err.message);
});

// Handle messages from compose scripts
browser.runtime.onMessage.addListener(async (message, sender) => {
  const tabId = sender.tab?.id;

  if (message.type === "getContacts") {
    if (!tabId) {
      console.error("No tab ID available from sender");
      return [];
    }
    return await getContactsForCompose(tabId, message.query);
  }

  if (message.type === "ensureRecipientInTo") {
    if (!tabId) {
      console.error("No tab ID available from sender");
      return;
    }
    await ensureRecipientInTo(tabId, message.email, message.name);
  }
});

/**
 * Ensure a recipient is in the To field
 * - If already in To, do nothing
 * - If in CC or BCC, move to To
 * - If not present, add to To
 * @param {number} tabId - The compose tab ID
 * @param {string} email - The email address
 * @param {string} name - The display name
 */
async function ensureRecipientInTo(tabId, email, name) {
  try {
    const details = await browser.compose.getComposeDetails(tabId);
    const emailLower = email.toLowerCase();

    // Format the recipient
    const formattedRecipient = name ? `${name} <${email}>` : email;

    // Check if already in To
    const inTo = (details.to || []).some((r) => {
      const parsed = parseRecipient(r);
      return parsed && parsed.email.toLowerCase() === emailLower;
    });

    if (inTo) {
      // Already in To, nothing to do
      return;
    }

    // Remove from CC if present
    const newCc = (details.cc || []).filter((r) => {
      const parsed = parseRecipient(r);
      return !parsed || parsed.email.toLowerCase() !== emailLower;
    });

    // Remove from BCC if present
    const newBcc = (details.bcc || []).filter((r) => {
      const parsed = parseRecipient(r);
      return !parsed || parsed.email.toLowerCase() !== emailLower;
    });

    // Add to To
    const newTo = [...(details.to || []), formattedRecipient];

    // Update compose details
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
 * Get contacts for autocomplete, merging recipients and address book
 * @param {number} tabId - The compose tab ID
 * @param {string} query - Search query (text after @)
 * @returns {Promise<Array>} Array of contact objects
 */
async function getContactsForCompose(tabId, query) {
  const contacts = new Map(); // Use Map to dedupe by email

  // Get current recipients from compose window
  try {
    const composeDetails = await browser.compose.getComposeDetails(tabId);
    const recipientFields = ["to", "cc", "bcc"];

    for (const field of recipientFields) {
      const recipients = composeDetails[field] || [];
      for (const recipient of recipients) {
        const parsed = parseRecipient(recipient);
        if (parsed && matchesQuery(parsed, query)) {
          // Mark as recipient for priority sorting
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

  // Search address book contacts
  try {
    // Query address books - use searchString if provided, otherwise get all
    const queryOptions = query ? { searchString: query } : {};
    const addressBookContacts = await browser.addressBooks.contacts.query(queryOptions);

    console.log("Address book query returned:", addressBookContacts.length, "contacts");
    if (addressBookContacts.length > 0) {
      console.log("Sample contact:", JSON.stringify(addressBookContacts[0], null, 2));
    }

    for (const contact of addressBookContacts) {
      // Parse vCard to extract email and name
      const parsed = parseVCard(contact.vCard);

      if (!parsed.emails.length) {
        continue;
      }

      for (const email of parsed.emails) {
        const emailLower = email.toLowerCase();
        if (!contacts.has(emailLower)) {
          const contactObj = { name: parsed.name, email };

          if (matchesQuery(contactObj, query)) {
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

  // Convert to array and sort (recipients first, then alphabetically)
  const results = Array.from(contacts.values());
  results.sort((a, b) => {
    if (a.isRecipient && !b.isRecipient) return -1;
    if (!a.isRecipient && b.isRecipient) return 1;
    return (a.name || a.email).localeCompare(b.name || b.email);
  });

  // Limit results for performance
  return results.slice(0, 10);
}

/**
 * Parse a recipient string into name and email
 * Handles formats: "Name <email@example.com>" or "email@example.com"
 */
function parseRecipient(recipient) {
  if (!recipient) return null;

  // Handle object format (Thunderbird may return objects)
  if (typeof recipient === "object") {
    return {
      name: recipient.name || "",
      email: recipient.email || ""
    };
  }

  // Handle string format
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
 * @param {string} vCard - The vCard string
 * @returns {{name: string, emails: string[]}}
 */
function parseVCard(vCard) {
  const result = { name: "", emails: [] };

  if (!vCard) return result;

  const lines = vCard.split(/\r?\n/);

  for (const line of lines) {
    // Parse FN (Formatted Name)
    if (line.startsWith("FN:")) {
      result.name = line.substring(3).trim();
    }

    // Parse EMAIL (may have parameters like PREF=1)
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
