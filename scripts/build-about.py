#!/usr/bin/env python3
"""Builds public/about.html (the Dev notes page) from docs/CONCEPT_SKETCHES.md so the page and the notes never drift apart. Run: python3 scripts/build-about.py"""
import re, html
md = open('docs/CONCEPT_SKETCHES.md').read()
rules = open('public/rules.html').read()
style = rules[rules.index('<style>'):rules.index('</style>') + 8]

def inline(t):
    t = html.escape(t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'`(.+?)`', r'<code>\1</code>', t)
    t = re.sub(r'\[(.+?)\]\((https?://[^)]+)\)', r'<a href="\2" target="_blank" rel="noopener">\1</a>', t)
    t = re.sub(r'(?<![">])(https://[^\s<)]+[A-Za-z0-9/@])', lambda m: f'<a href="{m.group(1)}" target="_blank" rel="noopener">{m.group(1)}</a>', t)
    return t

out, sections, lis, tbl = [], 0, False, []
def close_list():
    global lis
    if lis: out.append('</ul>'); lis = False
def flush_table():
    global tbl
    if not tbl: return
    rows = [[c.strip() for c in r.strip().strip('|').split('|')] for r in tbl if not re.match(r'^\|?\s*-', r)]
    head, body = rows[0], rows[1:]
    out.append('<table><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in head) + '</tr>' + ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in body) + '</table>')
    tbl = []
for line in md.split('\n'):
    if line.startswith('|'): close_list(); tbl.append(line); continue
    flush_table()
    if line.strip() == '---': close_list(); out.append('</section><section>'); continue
    m = re.match(r'!\[(.*?)\]\((.+?)\)', line)
    if m:
        close_list(); src = '/' + m.group(2)
        out.append(f'<p><a href="{src}" target="_blank" rel="noopener"><img src="{src}" alt="{html.escape(m.group(1))}" style="max-width:100%;border-radius:10px;border:1px solid var(--line)" /></a></p>'); continue
    if line.startswith('# '): close_list(); out.append(f'<h1>{inline(line[2:])}</h1>'); continue
    if line.startswith('## '): close_list(); out.append(f'<h2>{inline(line[3:])}</h2>'); continue
    if line.startswith('### '): close_list(); out.append(f'<h3>{inline(line[4:])}</h3>'); continue
    if line.startswith('- '):
        if not lis: out.append('<ul>'); lis = True
        out.append(f'<li>{inline(line[2:])}</li>'); continue
    close_list()
    if line.strip(): out.append(f'<p>{inline(line)}</p>')
close_list(); flush_table()
body = '\n'.join(out)
open('public/about.html', 'w').write(f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PongFall: Dev notes</title>
<meta name="description" content="Dev notes for PongFall, made for Trijam 393: the jam write-up, the concept sketch with a transcription, and how it maps to the build." />
{style}
</head>
<body>
<div class="wrap">
<header><span class="brand">PongFall · Dev notes</span><span><a class="btn ghost" href="/rules.html">Rules</a> <a class="btn" href="/">Play</a></span></header>
<section>
{body}
</section>
</div>
</body>
</html>
''')
