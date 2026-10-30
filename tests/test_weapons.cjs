// Run: node tests/test_weapons.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const config = source.slice(source.indexOf('        const SMITE_SKIN ='), source.indexOf('        const AGENTS ='));
const catalogText=fs.readFileSync(path.join(__dirname,'../multiplayer/firearms.mjs'),'utf8');const FIREARMS=JSON.parse(catalogText.split('export const FIREARMS=')[1].split(';\nexport const FIREARM_KEYS')[0]);
const context = vm.createContext({FIREARMS});
vm.runInContext(config + ';this.weapons=WEAPONS;', context);
const odin = context.weapons.odin;
assert.equal(odin.cost, 3200);
assert.equal(odin.magSize, 100);
assert.equal(odin.reserve, 200);
assert.equal(odin.auto, true);
assert.equal(odin.zoomLevels[0], 1.15);
assert.ok(odin.fullAutoFireRate < odin.fireRate);
assert.equal(odin.reloadTimeMs, 5000);
for (const key of ['vandal', 'phantom', 'odin', 'operator', 'classic']) {
    assert.equal(context.weapons[key].skin, 'smite', key);
    assert.equal(context.weapons[key].glowColor, 0xb9f5ff, key);
}
assert.equal(context.weapons.melee.skin,'prime2-karambit');
console.log('PASS ODIN capacity, cost, ADS, accelerated fire and reload; firearms share Smite and melee uses Prime//2.0 reference shape');
