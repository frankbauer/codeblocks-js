import { createConfiguration } from 'tailwindcss'

export default createConfiguration({
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    theme: {
        extend: {},
    },
    plugins: [],
    // Prevent conflicts with Quasar
    corePlugins: {
        preflight: false,
    },
})
