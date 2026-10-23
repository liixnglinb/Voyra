// Isolated browser data; no real account or cloud writes are used in UI checks.
export async function seedSchedulePreview(context, allowedOrigin = null) {
  await context.addInitScript(allowedOrigin => {
    if (allowedOrigin && location.origin !== allowedOrigin) return;
    const uid = 'schedule-ui-preview';
    const monday = new Date();
    monday.setHours(0,0,0,0);
    monday.setDate(monday.getDate() - ((monday.getDay()+6)%7) - 35);
    const iso = `${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;
    localStorage.setItem('voyra_session_v1', JSON.stringify({ uid, username: '布局预览', expiresAt: Date.now()+86400000 }));
    localStorage.setItem('voyra-sched-guide-v1', '1');
    localStorage.setItem(`ClassScheduleData_${uid}`, JSON.stringify({
      settings: { startDate: iso, overrideWeek: null, timeSlots: null },
      courses: [
        { id: 'preview-math', name: '高等数学', teacher: '王老师', room: '博学楼 A-501', credit: '4', periods: [{ day:4, slot:'1-2', f:1, t:20, type:'every' }] },
        { id: 'preview-design', name: '交互设计与产品实践', teacher: '李老师', room: '设计楼 302', note: '携带电脑', periods: [{ day:2, slot:'5-6', f:1, t:20, type:'every' }, { day:4, slot:'7-8', f:1, t:20, type:'every' }] },
      ],
    }));
    window.__scheduleWrites = [];
    const api = {
      async loadData() { return null; },
      async saveData(key, data) { window.__scheduleWrites.push({ key, data }); return data; },
      async openExternal() { return null; },
    };
    Object.defineProperty(window, 'electronAPI', { configurable: true, get: () => api, set: () => {} });
  }, allowedOrigin);
}
