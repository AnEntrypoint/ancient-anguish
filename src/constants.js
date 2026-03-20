export const COLORS = { 30:'#000', 31:'#ff5555', 32:'#50fa7b', 33:'#f1fa8c', 34:'#bd93f9', 35:'#ff79c6', 36:'#8be9fd', 37:'#f8f8f2', 90:'#6272a4', 91:'#ff6e6e', 92:'#69ff94', 93:'#ffffa5', 94:'#d6acff', 95:'#ff92df', 96:'#a4ffff', 97:'#fff' };

export const c = (code, txt) => `\x1b[${code}m${txt}\x1b[0m`;

export const DIRS = { n:'north', s:'south', e:'east', w:'west', north:'north', south:'south', east:'east', west:'west' };
