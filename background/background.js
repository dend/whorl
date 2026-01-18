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
  if (message.type === "getContacts") {
    // Use sender.tab.id to get the compose tab
    const tabId = sender.tab?.id;
    if (!tabId) {
      console.error("No tab ID available from sender");
      return [];
    }
    return await getContactsForCompose(tabId, message.query);
  }
});

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
    const addressBookContacts = await browser.contacts.quickSearch(query);

    for (const contact of addressBookContacts) {
      const emails = contact.properties.PrimaryEmail
        ? [contact.properties.PrimaryEmail]
        : [];

      // Also check SecondEmail if available
      if (contact.properties.SecondEmail) {
        emails.push(contact.properties.SecondEmail);
      }

      for (const email of emails) {
        const emailLower = email.toLowerCase();
        if (!contacts.has(emailLower)) {
          const name = buildContactName(contact.properties);
          const contactObj = { name, email };

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
 * Build display name from contact properties
 */
function buildContactName(properties) {
  const parts = [];
  if (properties.FirstName) parts.push(properties.FirstName);
  if (properties.LastName) parts.push(properties.LastName);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return properties.DisplayName || "";
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
