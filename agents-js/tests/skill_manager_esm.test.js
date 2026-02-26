const path = require('path');
const { SkillManager } = require('../skill-manager');

describe('SkillManager ESM Loader', () => {
    it('can load ESM tools via loadSkillsAsync()', async () => {
        const skillsDir = path.resolve(__dirname, '../skills');
        const sm = new SkillManager(skillsDir);

        await sm.loadSkillsAsync({ preferEsmTools: true });

        const tools = sm.getTools();
        const runJs = tools.find(t => t.name === 'run_javascript' && t._skillSource === 'browser_js');
        expect(runJs).toBeTruthy();
        expect(typeof runJs.func).toBe('function');

        const meteo = tools.find(t => t.name === 'open_meteo_current' && t._skillSource === 'open_meteo_sg');
        expect(meteo).toBeTruthy();
        expect(typeof meteo.func).toBe('function');

        const fx = tools.find(t => t.name === 'frankfurter_fx_latest' && t._skillSource === 'frankfurter_fx');
        expect(fx).toBeTruthy();
        expect(typeof fx.func).toBe('function');

        const wt = tools.find(t => t.name === 'worldtime_now' && t._skillSource === 'worldtime_tz');
        expect(wt).toBeTruthy();
        expect(typeof wt.func).toBe('function');

        const dict = tools.find(t => t.name === 'dictionary_lookup' && t._skillSource === 'dictionaryapi_en');
        expect(dict).toBeTruthy();
        expect(typeof dict.func).toBe('function');

        const onemap = tools.find(t => t.name === 'onemap_postcode_lookup' && t._skillSource === 'onemap_postcode');
        expect(onemap).toBeTruthy();
        expect(typeof onemap.func).toBe('function');
    });

    it('keeps sync loadSkills() working (CommonJS tools.js)', () => {
        const skillsDir = path.resolve(__dirname, '../skills');
        const sm = new SkillManager(skillsDir);

        sm.loadSkills();

        const tools = sm.getTools();
        const runJs = tools.find(t => t.name === 'run_javascript' && t._skillSource === 'browser_js');
        expect(runJs).toBeTruthy();
        expect(typeof runJs.func).toBe('function');
    });
});
