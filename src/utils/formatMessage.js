import { marked } from 'marked';
import emojiDictionary from 'emoji-dictionary';

// --- Underline Extension ---
const underlineExtension = {
  name: 'underline',
  level: 'inline',
  start(src) {
    return src.indexOf('__');
  },
  tokenizer(src) {
    const match = /^__([\s\S]+?)__/.exec(src);
    if (match) {
      return {
        type: 'underline',
        raw: match[0],
        text: match[1],
        tokens: this.lexer.inlineTokens(match[1])
      };
    }
  },
  renderer(token) {
    return `<u>${marked.parser(token.tokens)}</u>`;
  }
};

function walkTokens(token) {
  if (token.type === 'strong' && token.raw?.startsWith('__')) {
    token.type = 'underline';
    token.tokens = token.tokens || [];
  }
}

// --- Emoji Parser ---
function parseEmojis(text) {
  return text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, emojiName) => {
    const emoji = emojiDictionary.getUnicode(emojiName);
    return emoji || match; // fallback to original if not found
  });
}

// --- Register extensions ---
marked.use({
  extensions: [underlineExtension],
  walkTokens,
  breaks: true
});

// --- Format message ---
export function formatMessage(text) {
  try {
    const withEmoji = parseEmojis(text.trim());
    return marked.parseInline(withEmoji);
  } catch (err) {
    console.error('[format error]', err);
    return text;
  }
}
