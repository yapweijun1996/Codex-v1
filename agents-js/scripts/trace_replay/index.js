'use strict';

const { loadTraceFromFile, normalizeTraceObject, safeJsonParse } = require('./io');
const { analyzeTrace } = require('./analyze');
const { formatReport } = require('./report');
const { formatTimeline } = require('./timeline');
const { riskLabel, computeRiskAggregate, formatRiskAggregate } = require('./risk');

module.exports = {
    loadTraceFromFile,
    normalizeTraceObject,
    safeJsonParse,
    analyzeTrace,
    formatReport,
    formatTimeline,
    riskLabel,
    computeRiskAggregate,
    formatRiskAggregate,
};
