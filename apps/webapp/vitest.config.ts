import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    plugins: [],
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        alias: {
            '@': resolve(__dirname, './'),
        },
        server: {
            deps: {
                inline: ['zustand'],
            },
        },
    },
});
