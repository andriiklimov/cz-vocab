#!/usr/bin/env python3
"""Fix Latin transcriptions and add Cyrillic transcriptions."""
import json

with open('data/words.json', 'r', encoding='utf-8-sig') as f:
    words = json.load(f)

def czech_to_latin(text):
    """Convert Czech text to Latin phonetic transcription."""
    result = []
    i = 0
    t = text.lower()
    while i < len(t):
        if i + 1 < len(t):
            two = t[i:i+2]
            if two == 'ch':
                result.append('kh'); i += 2; continue
            if two == 'dě':
                result.append('dye'); i += 2; continue
            if two == 'tě':
                result.append('tye'); i += 2; continue
            if two == 'ně':
                result.append('nye'); i += 2; continue
            if two == 'mě':
                result.append('mnye'); i += 2; continue
            if two == 'bě':
                result.append('bye'); i += 2; continue
            if two == 'pě':
                result.append('pye'); i += 2; continue
            if two == 'vě':
                result.append('vye'); i += 2; continue
        c = t[i]
        mapping = {
            'a': 'a', 'á': 'aa', 'b': 'b', 'c': 'ts', 'č': 'ch',
            'd': 'd', 'ď': 'dy', 'e': 'e', 'é': 'ee', 'ě': 'ye',
            'f': 'f', 'g': 'g', 'h': 'h', 'i': 'i', 'í': 'ii',
            'j': 'y', 'k': 'k', 'l': 'l', 'm': 'm', 'n': 'n',
            'ň': 'ny', 'o': 'o', 'ó': 'oo', 'p': 'p', 'r': 'r',
            'ř': 'rzh', 's': 's', 'š': 'sh', 't': 't', 'ť': 'ty',
            'u': 'u', 'ú': 'uu', 'ů': 'uu', 'v': 'v', 'w': 'v',
            'x': 'ks', 'y': 'i', 'ý': 'ii', 'z': 'z', 'ž': 'zh',
            ' ': ' ', "'": '', '?': '', '.': '', ',': '', '/': '/',
            '-': '-',
        }
        result.append(mapping.get(c, c))
        i += 1
    return ''.join(result)


def latin_to_cyrillic(latin):
    """Convert Latin transcription to Ukrainian Cyrillic."""
    result = []
    i = 0
    while i < len(latin):
        # 4-char
        if i + 3 < len(latin) and latin[i:i+4] == 'mnye':
            result.append('мнє'); i += 4; continue
        # 3-char
        if i + 2 < len(latin):
            three = latin[i:i+3]
            if three == 'rzh': result.append('рж'); i += 3; continue
            if three == 'nye': result.append('нє'); i += 3; continue
            if three == 'dye': result.append('дє'); i += 3; continue
            if three == 'tye': result.append('тє'); i += 3; continue
            if three == 'bye': result.append('бйе'); i += 3; continue
            if three == 'pye': result.append('пйе'); i += 3; continue
            if three == 'vye': result.append('вйе'); i += 3; continue
        # 2-char
        if i + 1 < len(latin):
            two = latin[i:i+2]
            if two == 'kh': result.append('х'); i += 2; continue
            if two == 'sh': result.append('ш'); i += 2; continue
            if two == 'zh': result.append('ж'); i += 2; continue
            if two == 'ch': result.append('ч'); i += 2; continue
            if two == 'ts': result.append('ц'); i += 2; continue
            if two == 'dy': result.append('дь'); i += 2; continue
            if two == 'ty': result.append('ть'); i += 2; continue
            if two == 'ny': result.append('нь'); i += 2; continue
            if two == 'aa': result.append('аа'); i += 2; continue
            if two == 'ee': result.append('ее'); i += 2; continue
            if two == 'ii': result.append('іі'); i += 2; continue
            if two == 'oo': result.append('оо'); i += 2; continue
            if two == 'uu': result.append('уу'); i += 2; continue
        # 1-char
        c = latin[i]
        m = {
            'a': 'а', 'b': 'б', 'd': 'д', 'e': 'е', 'f': 'ф',
            'g': 'ґ', 'h': 'г', 'i': 'і', 'k': 'к', 'l': 'л',
            'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р',
            's': 'с', 't': 'т', 'u': 'у', 'v': 'в', 'y': 'й',
            'z': 'з', ' ': ' ', '/': '/',
        }
        result.append(m.get(c, c))
        i += 1
    return ''.join(result)


# Manual overrides for special pronunciation rules
# (voicing assimilation, colloquial forms, word-final devoicing, etc.)
overrides_latin = {
    'w005': 'na skhledanou',       # s+h = [sx], not [sɦ]
    'w016': 'trzhi',               # tř devoices ř
    'w024': 'zkuste to przhelozhit',  # keep existing (good)
    'w026': 'laahef',              # word-final v → f
    'w027': 'zaaloha za laahef',   # word-final v → f
    'w033': 'yezdiim rikhle',      # jezdím: j→y, í→ii
    'w042': 'shaalek chaye',       # čaje: č→ch, a→a, j→y, e→e
    'w047': 'nemohl biste',        # mohl = [moxl], byste = biste
    'w049': 'dovoliite',           # dovolíte = dovolíte (no ě!)
    'w055': 'mlaadenets',          # c at end = ts
    'w058': 'inspiratse',          # short a, not long
    'w066': 'pitomets',            # c = ts
    'w082': 'rakovina',            # standard
    'w093': 'milaachek',           # á→aa, č→ch
    'w095': 'blaazen',             # á→aa
    'w105': 'sem f praatsi',       # jsem→sem (colloquial), v→f before p
    'w106': 'gdo',                 # k→g before voiced d
    'w108': 'aytaak',              # IT'ák
    'w110': 'mnyeyte se heski',    # mě→mnye, z→s before k
    'w111': 'yak se ymenuyete',    # jak→yak, jm→ym
    'w116': 'mnyey se heski',      # mě→mnye, z→s before k
    'w150': 'dyiiki',              # díky: soft ď + long í
}

# Also override Cyrillic for special cases
overrides_cyr = {
    'w005': 'на схледаноу',
    'w047': 'немогл бісте',
    'w105': 'сем ф прааці',
    'w106': 'ґдо',
    'w108': 'айтаак',
    'w150': 'дьіікі',
}

changes = []
for w in words:
    auto = czech_to_latin(w['czech'])
    wid = w['id']
    existing = w['transcription']
    final_latin = overrides_latin.get(wid, auto)

    # Generate Cyrillic
    final_cyr = overrides_cyr.get(wid, latin_to_cyrillic(final_latin))

    if final_latin != existing:
        changes.append(f"  {wid}: '{w['czech']}' | old='{existing}' → new='{final_latin}' | cyr='{final_cyr}'")

    w['transcription'] = final_latin
    w['transcriptionCyr'] = final_cyr

print(f"Total changes: {len(changes)}")
for c in changes:
    print(c)

# Write output
with open('data/words.json', 'w', encoding='utf-8') as f:
    # Write in same single-line-per-entry format
    f.write('[\n')
    for idx, w in enumerate(words):
        # Build ordered dict manually for consistent field order
        entry = {
            'id': w['id'],
            'czech': w['czech'],
            'gender': w['gender'],
            'type': w['type'],
            'transcription': w['transcription'],
            'transcriptionCyr': w['transcriptionCyr'],
            'ukrainian': w['ukrainian'],
            'example': w['example'],
            'tags': w['tags'],
            'difficulty': w['difficulty'],
        }
        line = json.dumps(entry, ensure_ascii=False)
        comma = ',' if idx < len(words) - 1 else ''
        f.write(f'  {line}{comma}\n')
    f.write(']\n')

print("\nFile written successfully!")
