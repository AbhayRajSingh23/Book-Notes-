import axios from "axios";

export async function fetchBookIdentifiers(title, author) {
  try {
    const queries = [
      `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`,
      `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`,
    ];
    for (const url of queries) {
      const { data } = await axios.get(url);
      for (const doc of data.docs) {
        const isbn = doc.isbn?.find(i => i.length === 13) || doc.isbn?.find(i => i.length === 10);
        const olid = doc.cover_edition_key || null;
        if (isbn || olid) return { isbn: isbn || null, cover_edition_key: olid };
      }
    }
  } catch (err) {
    console.error("Error fetching book:", err.message);
  }
  return { isbn: null, cover_edition_key: null };
}


