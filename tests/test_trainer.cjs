const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const summarySource=source.slice(source.indexOf('        function getTrainingSummary('),source.indexOf('        function readTrainingData('));
const context=vm.createContext({});vm.runInContext(summarySource,context);
let summary=context.getTrainingSummary({shots:0,hits:0,headshots:0,kills:0});
assert.equal(summary.accuracy,0);assert.equal(summary.headshots,0);
summary=context.getTrainingSummary({shots:8,hits:3,headshots:2,kills:1});
assert.equal(summary.accuracy,38);assert.equal(summary.headshots,67);assert.equal(summary.kills,1);
const groundSource=source.slice(source.indexOf('        function getGroundHeight('),source.indexOf('        function checkPlayerCollision('));
const groundContext=vm.createContext({realMap:{ready:false},mapColliders:[
    {min:{x:-2,y:0,z:-2},max:{x:2,y:.4,z:2}},
    {min:{x:-2,y:0,z:-2},max:{x:2,y:3.2,z:2}}
]});vm.runInContext(groundSource,groundContext);
assert.equal(groundContext.getGroundHeight({x:0,y:2.2,z:0}),.4);
assert.equal(groundContext.getGroundHeight({x:0,y:5.4,z:0}),3.2);
assert.equal(groundContext.getGroundHeight({x:5,y:2.2,z:0}),0);
console.log('PASS training rates use real shot/hit denominators and zero-safe results; ground supports stairs without stepping onto high walls');
