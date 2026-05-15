'use strict';

/**
 * Fallback API untuk Ask (endpoint & model bisa di-override via AEGIS_* env).
 */
module.exports = {
    /** Fallback bila AEGIS_API_KEY tidak di-set — jangan pakai untuk produksi publik */
    AEGIS_TOKEN: 'sk-fcc206047ecc4f97bc5d5d97e81054cc',
    DEFAULT_ENDPOINT: 'https://api.deepseek.com/chat/completions',
    DEFAULT_MODEL: 'deepseek-chat',
};
