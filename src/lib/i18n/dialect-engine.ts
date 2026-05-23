/**
 * b4skills Dialect Variation Engine
 * British / American / Australian / Canadian / Indian / Irish English adaptations.
 * Also handles formal / informal register switching.
 */

export type EnglishDialect = "british" | "american" | "australian" | "canadian" | "indian" | "irish";
export type RegisterLevel = "formal" | "neutral" | "informal" | "colloquial";

interface DialectMap {
  spelling: Record<string, string>;
  vocabulary: Record<string, string>;
}

const DIALECT_MAPS: Record<EnglishDialect, DialectMap> = {
  british: {
    spelling: { color: "colour", center: "centre", realize: "realise", organize: "organise", defense: "defence", program: "programme", analyze: "analyse", fulfill: "fulfil" },
    vocabulary: { elevator: "lift", apartment: "flat", truck: "lorry", pants: "trousers", cookie: "biscuit", eraser: "rubber", gasoline: "petrol", french_fries: "chips", chips: "crisps", subway: "underground", drugstore: "chemist" },
  },
  american: {
    spelling: { colour: "color", centre: "center", realise: "realize", organise: "organize", defence: "defense", programme: "program", analyse: "analyze", fulfil: "fulfill" },
    vocabulary: { lift: "elevator", flat: "apartment", lorry: "truck", trousers: "pants", biscuit: "cookie", rubber: "eraser", petrol: "gasoline", chips: "french fries", crisps: "chips", underground: "subway", chemist: "drugstore" },
  },
  australian: {
    spelling: { color: "colour", organize: "organise" },
    vocabulary: { friend: "mate", great: "ripper", "very well": "no worries", afternoon: "arvo", sunglasses: "sunnies", service_station: "servo" },
  },
  canadian: {
    spelling: { color: "colour", realize: "realise", organize: "organise" },
    vocabulary: { pop: "soda", "knit hat": "toque", "convenience store": "corner store", "washroom": "bathroom" },
  },
  indian: {
    spelling: { color: "colour", organize: "organise" },
    vocabulary: { "prepone": "move earlier", "revert": "respond", "do the needful": "do what is necessary" },
  },
  irish: {
    spelling: { color: "colour", organize: "organise" },
    vocabulary: { great: "deadly", sure: "grand", "very": "fierce", friend: "pal" },
  },
};

const REGISTER_REPLACEMENTS: Record<RegisterLevel, Array<[RegExp, string]>> = {
  formal: [
    [/\bstart\b/gi, "commence"],
    [/\buse\b/gi, "utilise"],
    [/\bask\b/gi, "enquire"],
    [/\bget\b/gi, "obtain"],
    [/\bhelp\b/gi, "assist"],
  ],
  neutral: [],
  informal: [
    [/\bcommence\b/gi, "start"],
    [/\butilise\b/gi, "use"],
    [/\benquire\b/gi, "ask"],
    [/\bobtain\b/gi, "get"],
    [/\bassist\b/gi, "help"],
  ],
  colloquial: [
    [/\bcommence\b/gi, "kick off"],
    [/\butilise\b/gi, "use"],
    [/\benquire\b/gi, "ask"],
  ],
};

export class DialectEngine {
  adaptText(text: string, dialect: EnglishDialect, register: RegisterLevel = "neutral"): string {
    const map = DIALECT_MAPS[dialect];
    let adapted = text;

    // Apply spelling
    for (const [from, to] of Object.entries(map.spelling)) {
      adapted = adapted.replace(new RegExp(`\\b${from}\\b`, "gi"), to);
    }

    // Apply vocabulary
    for (const [from, to] of Object.entries(map.vocabulary)) {
      const fromEscaped = from.replace(/_/g, " ").replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      adapted = adapted.replace(new RegExp(`\\b${fromEscaped}\\b`, "gi"), to);
    }

    // Apply register
    const regPairs = REGISTER_REPLACEMENTS[register] ?? [];
    for (const [pattern, replacement] of regPairs) {
      adapted = adapted.replace(pattern, replacement);
    }

    return adapted;
  }

  detectDialect(text: string): EnglishDialect {
    const britishSignals = ["colour", "centre", "realise", "organise", "lift", "flat", "petrol"];
    const americanSignals = ["color", "center", "realize", "organize", "elevator", "apartment", "gasoline"];
    let britishScore = 0;
    let americanScore = 0;
    const lower = text.toLowerCase();
    for (const w of britishSignals) if (lower.includes(w)) britishScore++;
    for (const w of americanSignals) if (lower.includes(w)) americanScore++;
    return americanScore > britishScore ? "american" : "british";
  }

  mapRegionToDialect(region: string): EnglishDialect {
    const mapping: Record<string, EnglishDialect> = {
      GB: "british", AU: "australian", IE: "irish",
      US: "american", CA: "canadian",
      IN: "indian",
    };
    return mapping[region] ?? "british";
  }
}

export const dialectEngine = new DialectEngine();
