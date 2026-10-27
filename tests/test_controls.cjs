// Run: node tests/test_controls.cjs (Node built-ins only).
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = readFileSync(join(__dirname, '../index.html'), 'utf8');
const helpers = source.slice(source.indexOf('        function getAimFov('), source.indexOf('        // End tactical control helpers.'));
const context = vm.createContext({});
vm.runInContext(helpers, context);
const {getAimFov, getMovementSpeed, getShotSpread} = context;
const rifle = {id:'vandal', spreadBase:0.0025, spreadMove:0.062, moveSpeedMult:1};
const posture = {moving:false, walking:false, crouched:false, airborne:false, scoped:false, recoil:0};
assert.ok(Math.abs(getAimFov(75, 1) - 75) < 1e-10);
for (const zoom of [1.25, 2.5, 5]) {
    const angle = getAimFov(75, zoom) * Math.PI / 360;
    assert.ok(Math.abs(Math.tan(75 * Math.PI / 360) / Math.tan(angle) - zoom) < 1e-10);
}
assert.ok(getMovementSpeed(rifle, true, false, false) < getMovementSpeed(rifle, false, true, false));
assert.ok(getMovementSpeed(rifle, false, true, false) < getMovementSpeed(rifle, false, false, false));
assert.ok(getMovementSpeed(rifle, false, false, true) < getMovementSpeed(rifle, false, false, false));
const standing = getShotSpread(rifle, posture);
assert.ok(getShotSpread(rifle, {...posture,crouched:true}) < standing);
assert.ok(getShotSpread(rifle, {...posture,moving:true}) > standing * 10);
assert.ok(getShotSpread(rifle, {...posture,airborne:true,scoped:true}) > standing * 10);
assert.ok(getShotSpread(rifle, {...posture,moving:true,scoped:true}) > getShotSpread(rifle, {...posture,scoped:true}) * 10);
const op = {...rifle,id:'operator'};
assert.ok(getShotSpread(op, posture) > getShotSpread(op, {...posture,scoped:true}) * 10);
const knives = {...rifle,id:'bladestorm'};
assert.equal(getShotSpread(knives, {...posture,moving:true,airborne:true,recoil:0.1}), knives.spreadBase);
console.log('PASS optical magnification, movement speeds, crouch stability, moving/airborne penalties and sniper hip-fire accuracy');
