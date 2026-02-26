function isNodeRuntime() {
    return (typeof window === 'undefined' && typeof process !== 'undefined' && !!(process.versions && process.versions.node));
}

function getNodeDeps() {
    if (!isNodeRuntime()) return null;
    return { fs: require('fs'), path: require('path'), yaml: require('js-yaml'), url: require('url') };
}

module.exports = { isNodeRuntime, getNodeDeps };
