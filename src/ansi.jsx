import React from 'react';
import { COLORS } from './constants.js';

export const PixelEmoji = ({ emoji, style }) => (
  <span className="relative inline-flex items-center justify-center mx-[8px] translate-y-[2px] z-10" style={{ transform: 'scale(2.2)' }}>
    <span style={{ ...style, textShadow: 'none', filter: 'url(#pixelate)', WebkitFilter: 'url(#pixelate)' }}>
      {emoji}
    </span>
  </span>
);

const EMOJI_RE = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/;

export const parseANSI = (txt) => {
  let style = { color: '#f8f8f2' };
  return txt.split(/(\x1b\[[0-9;]*m)/).map((p, i) => {
    if (p.startsWith('\x1b[')) {
      p.replace('\x1b[','').replace('m','').split(';').forEach(code => {
        if (code === '0') style = { color: '#f8f8f2', fontWeight: 'normal', textShadow: '0 0 4px rgba(248,248,242,0.4)' };
        else if (code === '1') style.fontWeight = 'bold';
        else if (COLORS[code]) { style.color = COLORS[code]; style.textShadow = `0 0 5px ${COLORS[code]}80`; }
      });
      return null;
    }
    if (!p) return null;
    return p.split(new RegExp(EMOJI_RE.source, 'g')).map((sp, j) => {
      if (!sp) return null;
      if (EMOJI_RE.test(sp)) return <PixelEmoji key={`${i}-${j}`} emoji={sp} style={style} />;
      return <span key={`${i}-${j}`} style={style}>{sp}</span>;
    });
  });
};
