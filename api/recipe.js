export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const { ingredients } = req.body || {};

    if (
      !Array.isArray(ingredients) ||
      ingredients.length < 2 ||
      ingredients.length > 5
    ) {
      return res.status(400).json({
        error: "Seleziona da 2 a 5 ingredienti."
      });
    }

    const cleanIngredients = ingredients
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 5);

    const prompt = `
Crea una ricetta italiana originale per Le Geometriche.

INGREDIENTI SCELTI DAL CLIENTE:
${cleanIngredients.join(", ")}

La ricetta deve:
- essere per 2 persone;
- utilizzare Linguine Le Geometriche come pasta;
- valorizzare gli ingredienti scelti;
- essere realmente buona, equilibrata e gastronomicamente sensata;
- poter aggiungere ingredienti base utili come olio extravergine di oliva,
  sale, pepe, aglio, cipolla, erbe, spezie o acqua di cottura;
- indicare quantità precise;
- avere istruzioni concrete e specifiche;
- avere un titolo elegante ma comprensibile;
- avere una breve descrizione appetitosa;
- indicare tempo totale e difficoltà;
- essere scritta in italiano.

Restituisci ESCLUSIVAMENTE JSON valido in questo formato:
{
  "title": "Titolo della ricetta",
  "description": "Breve descrizione",
  "time": "25 min",
  "difficulty": "Facile",
  "portions": "2 persone",
  "ingredients": [
    "200 g Linguine Le Geometriche",
    "..."
  ],
  "method": [
    "Primo passaggio...",
    "Secondo passaggio..."
  ],
  "perfectShape": "Linguine Le Geometriche"
}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-6-luna",
        input: prompt
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({
        error: "Non è stato possibile creare la ricetta."
      });
    }

    const text =
      data.output_text ||
      data.output
        ?.flatMap((item) => item.content || [])
        ?.find((item) => item.type === "output_text")
        ?.text;

    if (!text) {
      throw new Error("Risposta AI vuota");
    }

    const cleanedText = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const recipe = JSON.parse(cleanedText);

    return res.status(200).json(recipe);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Si è verificato un errore durante la creazione della ricetta."
    });
  }
}
