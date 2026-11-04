"""Recover firing rigs for the existing meshes from pinned open-aim payloads.

Input: aim-viewmodel/{weapon}.json/bin, operator.scope.png, plus the
corresponding aim-weapons definitions renamed {weapon}.parts.json for
Ghost, Guardian, Sheriff and Marshal. No upstream JavaScript is executed.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path
import numpy as np

KEYS = ['classic', 'operator', 'phantom', 'ghost', 'guardian', 'sheriff', 'marshal']
COMPOSITE = {'ghost', 'guardian', 'sheriff', 'marshal'}
src = Path(sys.argv[1])
root = Path('assets/mechanisms')
root.mkdir(parents=True, exist_ok=True)
manifest = json.loads(Path('assets/weapons/manifest.json').read_text())
provenance_path = root / 'provenance.json'
provenance = json.loads(provenance_path.read_text()) if provenance_path.exists() else {}
sources = provenance.setdefault('sourceFiles', {})

for key in sys.argv[2:] or KEYS:
    if key not in KEYS:
        raise ValueError('Unsupported weapon: ' + key)
    for ext in ['json', 'bin']:
        sources[key + '.' + ext] = hashlib.sha256((src / (key + '.' + ext)).read_bytes()).hexdigest()
    d = json.loads((src / (key + '.json')).read_text())
    binary = (src / (key + '.bin')).read_bytes()
    # The aim-weapons meshes mirror Y relative to aim-viewmodel. Preserve the
    # already installed vertex order, UVs and quantized positions; reflect both
    # local bind transforms and animation transforms to the installed space.
    mirror = key in COMPOSITE
    parts = [{'name': 'gun', 'verts': d['gun']['verts']}]
    if mirror:
        parts_file = src / (key + '.parts.json')
        sources[parts_file.name] = hashlib.sha256(parts_file.read_bytes()).hexdigest()
        parts = json.loads(parts_file.read_text())['parts']
    positions, indices, weights = [], [], []
    for part in parts:
        n = part['verts']
        offset, length = d['offsets'][part['name'] + '.mesh']
        positions.append(np.frombuffer(binary, '<f4', count=n*3, offset=offset).reshape(-1, 3))
        indices.append(np.frombuffer(binary, 'u1', count=n*4, offset=offset+n*32).reshape(-1, 4))
        weights.append(np.frombuffer(binary, 'u1', count=n*4, offset=offset+n*36).reshape(-1, 4))
    positions = np.concatenate(positions).copy()
    if mirror:
        positions[:, 1] *= -1
    n = manifest[key]['vertices']
    existing = np.fromfile('assets/weapons/' + key + '.bin', '<f4', count=n*3).reshape(-1, 3)
    assert positions.shape == existing.shape, key + ': vertex count mismatch'
    error = float(np.max(abs(positions-existing)))
    assert error < (.051 if mirror else .0001), (key, 'vertex correspondence mismatch', error)
    skin_indices, skin_weights = np.concatenate(indices), np.concatenate(weights)
    rig = d['gun']['skeleton']
    assert int(skin_indices[skin_weights > 0].max()) < len(rig['names']), key
    assert np.all(skin_weights.sum(axis=1) > 0), key
    (root / (key+'.weights.bin')).write_bytes(skin_indices.tobytes() + skin_weights.tobytes())
    clip = d['anims']['gunFire']
    offset, length = d['offsets']['gunFire.anim']
    frames = np.frombuffer(binary, '<f4', count=length//4, offset=offset).copy().reshape(clip['frames'], len(clip['bones']), 7)
    if mirror:
        t = np.asarray(rig['t']).reshape(-1, 3); t[:, 1] *= -1; rig['t'] = t.ravel().tolist()
        q = np.asarray(rig['q']).reshape(-1, 4); q[:, [0, 2]] *= -1; rig['q'] = q.ravel().tolist()
        frames[:, :, [1, 3, 5]] *= -1
    (root / (key+'.fire.bin')).write_bytes(frames.astype('<f4').tobytes())
    (root / (key+'.json')).write_text(json.dumps({'rig': rig, 'fire': clip}, separators=(',', ':')))
    print(key, n, 'vertices;', len(rig['names']), 'bones;', 'mirrored Y' if mirror else 'source space', 'max error', round(error, 6))
    if key == 'operator':
        part = d['scope']; offset, length = d['offsets']['scope.mesh']; n = part['verts']
        (root / 'operator.scope.bin').write_bytes(binary[offset:offset+n*32]+binary[offset+n*40:offset+length])
        (root / 'operator.scope.json').write_text(json.dumps(part))
        shutil.copyfile(src / 'operator.scope.png', root / 'operator.scope.png')
        sources['operator.scope.png'] = hashlib.sha256((src / 'operator.scope.png').read_bytes()).hexdigest()

provenance.pop('sourcePath', None)
provenance.update({
    'sourceRepository': 'https://github.com/unkwsr/open-aim',
    'sourceCommit': 'e1e81cf8ea37e5c363d7720c78cb17fedf0edd94',
    'sourcePaths': ['site/aim-viewmodel', 'site/aim-weapons'],
    'processing': 'Seven source gun bind rigs, per-vertex skin weights and full sampled gunFire clips. Composite parts retain installed vertex order/UVs. Ghost, Guardian, Sheriff and Marshal bind/animation transforms are reflected across Y to match installed aim-weapons geometry; vertex correspondence is checked before export. Operator retains its separate source scope. Existing Phoenix hands and local reload control remain.',
    'outputs': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.iterdir()) if p.is_file() and p.name != 'provenance.json'}
})
provenance_path.write_text(json.dumps(provenance, indent=2)+'\n')
