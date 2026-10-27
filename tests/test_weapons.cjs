// Run: node tests/test_weapons.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const config = source.slice(source.indexOf('        const SMITE_SKIN ='), source.indexOf('        const AGENTS ='));
const context = vm.createContext({});
vm.runInContext(config + ';this.weapons=WEAPONS;', context);
const odin = context.weapons.odin;
assert.equal(odin.cost, 3200);
assert.equal(odin.magSize, 100);
assert.equal(odin.reserve, 200);
assert.equal(odin.auto, true);
assert.equal(odin.zoomLevels[0], 1.15);
assert.ok(odin.fullAutoFireRate < odin.fireRate);
assert.equal(odin.reloadTimeMs, 5000);
for (const key of ['vandal', 'phantom', 'odin', 'operator', 'classic', 'melee']) {
    assert.equal(context.weapons[key].skin, 'smite', key);
    assert.equal(context.weapons[key].glowColor, 0xb9f5ff, key);
}
console.log('PASS ODIN capacity, cost, ADS, accelerated fire and reload; all weapons share Smite skin');
