// Public role identity is separate from the implemented ability kits. The legacy
// `phoenix` wire id refers to Sage and is kept for existing rooms and saves.
export const AGENTS=Object.freeze({
 jett:Object.freeze({id:'jett',short:'JETT',name:'Jett',model:'jett',role:'決鬥者',abilities:true,hands:{skin:0x9c624a,glove:0x030b10,sleeve:0x08171b,cuff:0x21616a}}),
 phoenix:Object.freeze({id:'phoenix',short:'SAGE',name:'Sage',model:'sage',role:'守衛者',abilities:true,hands:{skin:0x9c624a,glove:0xa3674d,sleeve:0x546761,cuff:0x0e7566}}),
 iso:Object.freeze({id:'iso',short:'ISO',name:'Iso',model:'iso',role:'決鬥者',abilities:false,hands:{skin:0xd6aa98,glove:0x192333,sleeve:0xd6dae3,cuff:0x68629c}}),
 clove:Object.freeze({id:'clove',short:'CLOVE',name:'Clove',model:'clove',role:'控場者',abilities:false,hands:{skin:0xdab6ac,glove:0xc4c9d5,sleeve:0xcfd5e1,cuff:0xb76caf}})
});
export const AGENT_KEYS=Object.freeze(Object.keys(AGENTS));
export const isAgent=key=>typeof key==='string'&&Object.hasOwn(AGENTS,key);
export const normalizeAgent=key=>isAgent(key)?key:'jett';
export const agentModelKey=key=>AGENTS[normalizeAgent(key)].model;
export const agentLabel=key=>AGENTS[normalizeAgent(key)].short;
