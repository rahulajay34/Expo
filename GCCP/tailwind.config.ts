import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    // Dark mode disabled - light only
    darkMode: "class",
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Geist Mono', 'monospace'],
            },
            borderRadius: {
                lg: "8px",  // Linear uses smaller radii
                md: "6px",
                sm: "4px",
                xl: "12px", // Only for large modals
            },
            boxShadow: {
                // Linear style "lift"
                'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                'popover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
            colors: {
                background: 'var(--background)',
                'background-subtle': 'var(--background-subtle)',
                foreground: 'var(--foreground)',
                border: 'var(--border)',
                primary: {
                    DEFAULT: 'var(--primary)',
                    foreground: 'var(--primary-foreground)',
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
};
export default config;
