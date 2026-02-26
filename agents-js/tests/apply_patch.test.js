const fs = require('fs');
const os = require('os');
const path = require('path');
const { getBuiltInTools } = require('../agent-factory');

function createSkillManagerStub() {
    return {
        refreshSkillsAsync: async () => {},
        refreshSkills: () => {},
        getSkillList: () => [],
        getSkillDetail: () => null,
    };
}

async function withTempDir(fn) {
    const cwd = process.cwd();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-js-apply-patch-'));
    process.chdir(tmp);
    try {
        return await fn(tmp);
    } finally {
        process.chdir(cwd);
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}

describe('apply_patch tool', () => {
    it('adds, updates, moves, and deletes files', async () => {
        const tools = getBuiltInTools(createSkillManagerStub());
        const applyPatchTool = tools.find((tool) => tool.name === 'apply_patch');
        expect(applyPatchTool).toBeTruthy();

        await withTempDir(async (tmp) => {
            const addPatch = [
                '*** Begin Patch',
                '*** Add File: hello.txt',
                '+one',
                '*** End Patch',
            ].join('\n');
            const addResult = await applyPatchTool.func({ input: addPatch });
            expect(addResult.ok).toBe(true);
            expect(fs.readFileSync(path.join(tmp, 'hello.txt'), 'utf8')).toBe('one\n');

            const updatePatch = [
                '*** Begin Patch',
                '*** Update File: hello.txt',
                '@@',
                '-one',
                '+two',
                '*** End Patch',
            ].join('\n');
            const updateResult = await applyPatchTool.func({ input: updatePatch });
            expect(updateResult.ok).toBe(true);
            expect(fs.readFileSync(path.join(tmp, 'hello.txt'), 'utf8')).toBe('two\n');

            const movePatch = [
                '*** Begin Patch',
                '*** Update File: hello.txt',
                '*** Move to: moved/hello.txt',
                '@@',
                '-two',
                '+three',
                '*** End Patch',
            ].join('\n');
            const moveResult = await applyPatchTool.func({ input: movePatch });
            expect(moveResult.ok).toBe(true);
            expect(fs.existsSync(path.join(tmp, 'hello.txt'))).toBe(false);
            expect(fs.readFileSync(path.join(tmp, 'moved/hello.txt'), 'utf8')).toBe('three\n');

            const deletePatch = [
                '*** Begin Patch',
                '*** Delete File: moved/hello.txt',
                '*** End Patch',
            ].join('\n');
            const deleteResult = await applyPatchTool.func({ input: deletePatch });
            expect(deleteResult.ok).toBe(true);
            expect(fs.existsSync(path.join(tmp, 'moved/hello.txt'))).toBe(false);
        });
    });

    it('accepts unified diff for add and update', async () => {
        const tools = getBuiltInTools(createSkillManagerStub());
        const applyPatchTool = tools.find((tool) => tool.name === 'apply_patch');
        expect(applyPatchTool).toBeTruthy();

        await withTempDir(async (tmp) => {
            const addUnified = [
                'diff --git a/index.html b/index.html',
                'new file mode 100644',
                '--- /dev/null',
                '+++ b/index.html',
                '@@ -0,0 +1,2 @@',
                '+line1',
                '+line2',
            ].join('\n');
            const addResult = await applyPatchTool.func({ input: addUnified });
            expect(addResult.ok).toBe(true);
            expect(fs.readFileSync(path.join(tmp, 'index.html'), 'utf8')).toBe('line1\nline2\n');

            const updateUnified = [
                'diff --git a/index.html b/index.html',
                '--- a/index.html',
                '+++ b/index.html',
                '@@ -1,2 +1,2 @@',
                '-line1',
                '+line1 updated',
                ' line2',
            ].join('\n');
            const updateResult = await applyPatchTool.func({ input: updateUnified });
            expect(updateResult.ok).toBe(true);
            expect(fs.readFileSync(path.join(tmp, 'index.html'), 'utf8')).toBe('line1 updated\nline2\n');
        });
    });
});
