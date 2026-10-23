export const healthFixture = [
  { id:'existing-1', sys:128, dia:82, hr:73, time:'2026-10-23T07:30', period:'晨起', note:'晨起静息测量，保留这段原始备注。', device:{name:'既有血压计', calibration:1} },
  { id:'existing-2', sys:136, dia:88, hr:76, time:'2026-10-22T21:10', period:'晚间', note:'晚间散步后静息' },
  { id:'existing-3', sys:190, dia:102, hr:81, time:'2026-10-22T07:45', period:'晨起', note:'此条用于验证高读数不会被趋势图截断' },
  { id:'existing-4', sys:122, dia:78, hr:70, time:'2026-10-21T14:20', period:'午后', note:'' },
  { id:'existing-5', sys:118, dia:75, hr:68, time:'2026-10-20T08:00', period:'晨起', note:'' },
  { id:'existing-6', sys:125, dia:80, hr:72, time:'2026-10-19T21:30', period:'晚间', note:'' },
  { id:'existing-7', sys:120, dia:77, hr:69, time:'2026-10-19T07:50', period:'晨起', note:'' },
];
// Runs only in disposable browser contexts. All cloud calls use this local fake.
export async function seedHealthPreview(context, options = {}) {
  await context.addInitScript(({ records, options }) => {
    const uid = 'health-ui-preview';
    const key = `HealthBpData_${uid}`;
    if (options.authed !== false) localStorage.setItem('voyra_session_v1', JSON.stringify({ uid, username:'血压界面验证', expiresAt:Date.now()+86400000 }));
    const dataKey = options.authed === false ? 'HealthBpData_local' : key;
    // Seeding once lets reloads test actual persistence.
    if (!localStorage.getItem('__healthSeeded')) {
      if (!options.empty) localStorage.setItem(dataKey, JSON.stringify(options.legacy ? records : { records, customEnvelope:'preserved' }));
      localStorage.setItem('HealthBpData_other-account', JSON.stringify({records:[{id:'private-other',sys:111,dia:77,hr:66,time:'2026-10-23T06:00'}]}));
      localStorage.setItem('__healthSeeded', '1');
    }
    window.__healthWrites = [];
    window.__healthCloud = options.cloudEmpty ? {records:[]} : options.empty ? null : options.legacyCloud ? records : {records};
    window.__healthFail = !!options.offline;
    const api = {
      async loadData() {
        if (options.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
        if (window.__healthFail) throw Error('测试离线');
        return structuredClone(window.__healthCloud);
      },
      async saveData(key, value) {
        if (window.__healthFail) throw Error('测试离线');
        window.__healthWrites.push({key, value:structuredClone(value)});
        window.__healthCloud = structuredClone(value);
        return {ok:true};
      },
      async openExternal() {},
    };
    Object.defineProperty(window, 'electronAPI', {configurable:true,get:()=>api,set:()=>{}});
  }, { records:healthFixture, options });
}
