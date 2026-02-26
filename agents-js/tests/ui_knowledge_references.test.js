describe('ui-knowledge-references', () => {
    it('extracts hit ids from supported tool result payloads', async () => {
        const { extractKnowledgeHitIdsFromToolEvent } = await import('../browser/ui-knowledge-references.js');
        const ids = extractKnowledgeHitIdsFromToolEvent({
            type: 'tool.result',
            tool: 'memory_search',
            result: { hits: [{ id: 'a-1' }, { id: 'b-2' }, { id: 'a-1' }] },
        });
        expect(ids).toEqual(['a-1', 'b-2']);
    });

    it('supports preview nodes shape and ignores unrelated tools', async () => {
        const { extractKnowledgeHitIdsFromToolEvent } = await import('../browser/ui-knowledge-references.js');
        const idsFromPreview = extractKnowledgeHitIdsFromToolEvent({
            type: 'tool.result',
            name: 'memory__search_nodes',
            result: { preview: { nodes: [{ id: 'n-1' }, { id: 'n-2' }] } },
        });
        const idsFromOtherTool = extractKnowledgeHitIdsFromToolEvent({
            type: 'tool.result',
            tool: 'run_command',
            result: { hits: [{ id: 'x-1' }] },
        });
        expect(idsFromPreview).toEqual(['n-1', 'n-2']);
        expect(idsFromOtherTool).toEqual([]);
    });

    it('filters low-score hits to avoid unrelated image references', async () => {
        const { extractKnowledgeHitIdsFromToolEvent } = await import('../browser/ui-knowledge-references.js');
        const ids = extractKnowledgeHitIdsFromToolEvent({
            type: 'tool.result',
            tool: 'kb_search',
            result: {
                hits: [
                    { id: 'low', score: 0.12 },
                    { id: 'high', score: 0.82 },
                ],
            },
        });
        expect(ids).toEqual(['high']);
    });

    it('resolves references from manifest jsonl files with image sources', async () => {
        const { createKnowledgeReferenceResolver } = await import('../browser/ui-knowledge-references.js');
        const jsonl = [
            JSON.stringify({
                id: 'doc-1',
                title: 'Doc One',
                images: [{ mime_type: 'image/png', data_base64: 'QUJD', source_page_index: 2 }],
            }),
            JSON.stringify({
                id: 'doc-2',
                title: 'Doc Two',
                images: [{ url: 'https://example.com/doc2.jpg', source_page_index: 9 }],
            }),
            '',
        ].join('\n');
        let fetchCount = 0;
        const resolver = createKnowledgeReferenceResolver({
            fetchManifest: async () => [{ knowledgeFiles: ['/skills/k.jsonl'] }],
            fetchImpl: async (path) => {
                fetchCount += 1;
                expect(path).toBe('/skills/k.jsonl');
                return {
                    ok: true,
                    text: async () => jsonl,
                };
            },
            maxImages: 3,
        });

        const refs = await resolver.resolveByHitIds(['doc-2', 'doc-1']);
        const refsSecondCall = await resolver.resolveByHitIds(['doc-1']);

        expect(fetchCount).toBe(1);
        expect(refs).toHaveLength(2);
        expect(refs[0].src).toBe('https://example.com/doc2.jpg');
        expect(refs[1].src).toBe('data:image/png;base64,QUJD');
        expect(refsSecondCall).toHaveLength(1);
        expect(refsSecondCall[0].hitId).toBe('doc-1');
    });

    it('extracts citation ids from final answer text', async () => {
        const { extractCitationIdsFromText } = await import('../browser/ui-knowledge-references.js');
        const ids = extractCitationIdsFromText(
            'Answer [source:#doc-1 p.6] and [source:doc-2 p7], repeated [source:#doc-1 p.8].'
        );
        expect(ids).toEqual(['doc-1', 'doc-2']);
    });

    it('extracts selected ids from knowledge.selected event payload', async () => {
        const { extractKnowledgeSelectedIdsFromEvent } = await import('../browser/ui-knowledge-references.js');
        const ids = extractKnowledgeSelectedIdsFromEvent({
            type: 'knowledge.selected',
            selectedIds: ['k-1', 'k-2', 'k-1'],
        });
        expect(ids).toEqual(['k-1', 'k-2']);
    });
});
