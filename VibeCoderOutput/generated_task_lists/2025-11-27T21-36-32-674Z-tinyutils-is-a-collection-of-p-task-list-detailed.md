# Task List: TinyUtils SvelteKit Migration

## Phase: Foundation and Infrastructure

### Epic: Project Setup & Core Components

- **ID:** T-101
  **Title:** Initialize SvelteKit Project
  *(Description):* Set up a new SvelteKit project with TypeScript, Vite, ESLint, and Prettier configurations.
  *(User Story):* N/A
  *(Priority):* High
  *(Dependencies):* None
  *(Est. Effort):* Small
  - **Sub-Task ID:** T-101.1
    **Goal:** Create a new SvelteKit project using the official template.
    **Task:** Execute the SvelteKit scaffolding command to initialize a new project with TypeScript support.
    **Rationale:** This is the foundational step to start any SvelteKit project, ensuring the basic project structure and necessary files are generated.
    **Expected Outcome:** A new directory containing a basic SvelteKit project structure with TypeScript enabled.
    **Objectives:**
      * The `create-svelte` command is successfully run.
      * A new project directory is created.
      * The project is initialized with TypeScript.
    **Implementation Prompt:** Use the `npm create svelte@latest <your-project-name>` command, selecting the 'SvelteKit demo app' template and choosing TypeScript during the interactive prompts.
    **Example Code:**
    ```bash
    npm create svelte@latest my-svelte-app
    cd my-svelte-app
    # Follow interactive prompts, selecting TypeScript
    ```

  - **Sub-Task ID:** T-101.2
    **Goal:** Install project dependencies.
    **Task:** Run the package manager's install command to download and link all necessary project dependencies.
    **Rationale:** The scaffolding process creates `package.json` but doesn't install the listed dependencies. This step makes the project runnable.
    **Expected Outcome:** All dependencies listed in `package.json` are installed in the `node_modules` directory.
    **Objectives:**
      * `npm install` (or `yarn install` / `pnpm install`) command is executed.
      * The `node_modules` directory is populated with packages.
      * No dependency installation errors occur.
    **Implementation Prompt:** Navigate to the project root directory and run `npm install`.
    **Example Code:**
    ```bash
    npm install
    ```

  - **Sub-Task ID:** T-101.3
    **Goal:** Configure ESLint for code linting.
    **Task:** Install ESLint and its Svelte-specific plugin, then configure ESLint to enforce code quality standards.
    **Rationale:** ESLint helps maintain code consistency and catch potential errors early in the development process.
    **Expected Outcome:** ESLint is installed and configured, with a `.eslintrc.cjs` file present and functional.
    **Objectives:**
      * ESLint and `@sveltejs/eslint-plugin-svelte` are added as dev dependencies.
      * A `.eslintrc.cjs` configuration file is created.
      * Basic ESLint rules are defined in the configuration.
    **Implementation Prompt:** Install ESLint and the Svelte plugin (`npm install -D eslint @sveltejs/eslint-plugin-svelte`). Create a `.eslintrc.cjs` file in the project root with a basic configuration extending recommended Svelte rules.
    **Example Code:**
    ```javascript
    // .eslintrc.cjs
    /** @type {import('eslint').ESLint.ConfigData} */
    module.exports = {
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint', 'svelte3'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:svelte3/recommended',
      ],
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020,
      },
      env: {
        browser: true,
        es2017: true,
        node: true,
      },
      overrides: [
        {
          files: ['*.svelte'],
          processor: 'svelte3/svelte3',
        },
      ],
    };
    ```

  - **Sub-Task ID:** T-101.4
    **Goal:** Configure Prettier for code formatting.
    **Task:** Install Prettier and its Svelte plugin, then configure Prettier to format code according to defined style guidelines.
    **Rationale:** Prettier automates code formatting, ensuring a consistent style across the entire project and reducing manual formatting efforts.
    **Expected Outcome:** Prettier is installed and configured, with a `.prettierrc.cjs` file present and functional.
    **Objectives:**
      * Prettier and `prettier-plugin-svelte` are added as dev dependencies.
      * A `.prettierrc.cjs` configuration file is created.
      * Basic Prettier options (e.g., tab width, print width) are defined.
    **Implementation Prompt:** Install Prettier and the Svelte plugin (`npm install -D prettier prettier-plugin-svelte`). Create a `.prettierrc.cjs` file in the project root with standard formatting options.
    **Example Code:**
    ```javascript
    // .prettierrc.cjs
    /** @type {import('prettier').Config} */
    module.exports = {
      plugins: ['prettier-plugin-svelte'],
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      semi: true,
      singleQuote: true,
      trailingComma: 'always',
      svelteBracketNewLine: true,
      svelteSortOrder: 'options-styles-scripts-events-markup',
    };
    ```

  - **Sub-Task ID:** T-101.5
    **Goal:** Integrate ESLint and Prettier.
    **Task:** Configure ESLint to disable rules that conflict with Prettier and ensure Prettier formats Svelte files.
    **Rationale:** Proper integration prevents conflicts between linting and formatting tools, ensuring a smooth developer experience.
    **Expected Outcome:** ESLint and Prettier work harmoniously, with ESLint respecting Prettier's formatting decisions.
    **Objectives:**
      * `eslint-config-prettier` is added as a dev dependency.
      * ESLint configuration is updated to extend `prettier`.
      * Prettier is configured to handle `.svelte` files correctly via `prettier-plugin-svelte`.
    **Implementation Prompt:** Install `eslint-config-prettier` (`npm install -D eslint-config-prettier`). Add `'prettier'` to the `extends` array in `.eslintrc.cjs`, ensuring it's the last item. Verify `.prettierrc.cjs` includes `prettier-plugin-svelte`.
    **Example Code:**
    ```javascript
    // .eslintrc.cjs (updated extends)
    // ...
    extends: [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:svelte3/recommended',
      'prettier', // Add prettier as the last item
    ],
    // ...
    ```

  - **Sub-Task ID:** T-101.6
    **Goal:** Add scripts for linting and formatting.
    **Task:** Add `lint` and `format` scripts to `package.json` for easy execution of ESLint and Prettier.
    **Rationale:** Providing convenient scripts in `package.json` simplifies common development tasks for the team.
    **Expected Outcome:** `npm run lint` and `npm run format` commands are available and functional.
    **Objectives:**
      * A `lint` script is added to `package.json` that runs ESLint.
      * A `format` script is added to `package.json` that runs Prettier.
      * Scripts correctly target relevant files (e.g., `.js`, `.ts`, `.svelte`).
    **Implementation Prompt:** Add the following scripts to the `scripts` section of `package.json`: `"lint": "eslint . --ext .js,.ts,.svelte"` and `"format": "prettier --write . --plugin prettier-plugin-svelte"`.
    **Example Code:**
    ```json
    // package.json (scripts section)
    "scripts": {
      // ... other scripts
      "lint": "eslint . --ext .js,.ts,.svelte",
      "format": "prettier --write . --plugin prettier-plugin-svelte"
    },
    ```

  - **Sub-Task ID:** T-101.7
    **Goal:** Verify project setup and configurations.
    **Task:** Run the development server and execute the lint/format scripts to ensure everything is set up correctly.
    **Rationale:** This final verification step confirms that all configurations are applied correctly and the project is ready for development.
    **Expected Outcome:** The SvelteKit development server starts without errors, and the lint/format scripts run without issues.
    **Objectives:**
      * `npm run dev` command successfully starts the development server.
      * `npm run lint` command runs without reporting errors (assuming clean code).
      * `npm run format` command runs without making changes (assuming code is already formatted).
    **Implementation Prompt:** Execute `npm run dev` to start the SvelteKit development server. Then, run `npm run lint` and `npm run format` in separate terminal instances to verify their functionality.
    **Example Code:**
    ```bash
    npm run dev
    # In another terminal:
    npm run lint
    npm run format
    ```
- **ID:** T-102
  **Title:** Implement Global Layout and Sticky Header
  *(Description):* Create the main `+layout.svelte` file to include a sticky header with navigation and essential UI elements.
  *(User Story):* N/A
  *(Priority):* High
  *(Dependencies):* T-101
  *(Est. Effort):* Medium
  - **Sub-Task ID:** T-102.1
    **Goal:** Set up the basic SvelteKit layout structure.
    **Task:** Create the `src/routes/+layout.svelte` file and define its basic Svelte component structure.
    **Rationale:** This is the foundational file for all pages in the SvelteKit application, enabling shared layout components.
    **Expected Outcome:** A valid `+layout.svelte` file exists in the correct directory.
    **Objectives:**
      * The `+layout.svelte` file is created at `src/routes/+layout.svelte`.
      * The file contains a basic `<script>` and `<main>` tag.
      * The `<slot />` component is included within the `<main>` tag to render page content.
    **Implementation Prompt:** Create a Svelte component file named `+layout.svelte` in the `src/routes/` directory. Include a `<script>` block and a `<main>` tag. Inside the `<main>` tag, render the `<slot />` component.
    **Example Code:**
    ```svelte
    <script>
      // Layout script logic will go here
    </script>

    <main>
      <slot />
    </main>
    ```

  - **Sub-Task ID:** T-102.2
    **Goal:** Implement the main header component structure.
    **Task:** Create a `Header.svelte` component and import it into `+layout.svelte`.
    **Rationale:** Encapsulates header logic and UI, making the layout file cleaner and promoting reusability.
    **Expected Outcome:** A `Header.svelte` component is created and rendered within the `+layout.svelte` file.
    **Objectives:**
      * Create a `Header.svelte` file in a suitable components directory (e.g., `src/lib/components/Header.svelte`).
      * Import `Header.svelte` into `src/routes/+layout.svelte`.
      * Render the `<Header />` component within the `<main>` tag of `+layout.svelte`, before the `<slot />`.
    **Implementation Prompt:** Create a Svelte component file named `Header.svelte` in `src/lib/components/`. Add a basic `<div>` with placeholder text "Header". Import this `Header` component into `src/routes/+layout.svelte` and render it above the `<slot />`.
    **Example Code:**
    ```svelte
    <!-- src/routes/+layout.svelte -->
    <script>
      import Header from '$lib/components/Header.svelte';
    </script>

    <main>
      <Header />
      <slot />
    </main>
    ```
    ```svelte
    <!-- src/lib/components/Header.svelte -->
    <div>
      Header Content
    </div>
    ```

  - **Sub-Task ID:** T-102.3
    **Goal:** Style the header to be sticky.
    **Task:** Apply CSS to the header element to make it stick to the top of the viewport when scrolling.
    **Rationale:** Ensures the header remains visible and accessible as the user scrolls through page content.
    **Expected Outcome:** The header element is fixed to the top of the browser window.
    **Objectives:**
      * Add CSS to the `Header.svelte` component (or a linked CSS file) to set `position: sticky; top: 0;`.
      * Ensure the header has a background color and z-index to appear above other content.
      * Test scrolling behavior with sufficient content to trigger scrolling.
    **Implementation Prompt:** Add the following CSS to `Header.svelte` within a `<style>` tag: `div { position: sticky; top: 0; background-color: white; z-index: 100; padding: 1rem; }`. Ensure the `div` is the root element of `Header.svelte`.
    **Example Code:**
    ```svelte
    <!-- src/lib/components/Header.svelte -->
    <div class="sticky-header">
      Header Content
    </div>

    <style>
      .sticky-header {
        position: sticky;
        top: 0;
        background-color: white; /* Or your theme's primary color */
        z-index: 100;
        padding: 1rem;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1); /* Optional: subtle shadow */
      }
    </style>
    ```

  - **Sub-Task ID:** T-102.4
    **Goal:** Implement basic navigation links within the header.
    **Task:** Add navigation links (e.g., Home, About, Contact) to the `Header.svelte` component.
    **Rationale:** Provides primary navigation access from the persistent header.
    **Expected Outcome:** Navigation links are displayed within the header.
    **Objectives:**
      * Add an unordered list (`<ul>`) or similar structure within `Header.svelte`.
      * Include list items (`<li>`) for each navigation link.
      * Use anchor tags (`<a>`) for each link, pointing to placeholder routes (e.g., `/`, `/about`, `/contact`).
      * Add basic styling to make links appear horizontally.
    **Implementation Prompt:** Update `Header.svelte` to include a `<nav>` element containing an unordered list with links for "Home", "About", and "Contact". Use SvelteKit's `<a href="...">` for navigation. Add basic inline styles or a class for horizontal layout.
    **Example Code:**
    ```svelte
    <!-- src/lib/components/Header.svelte -->
    <div class="sticky-header">
      <nav>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
    </div>

    <style>
      /* ... existing styles ... */
      nav ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        gap: 1rem;
      }
      nav li {
        display: inline;
      }
      nav a {
        text-decoration: none;
        color: inherit; /* Inherit color from parent */
      }
    </style>
    ```

  - **Sub-Task ID:** T-102.5
    **Goal:** Add padding to the main content area to avoid overlap with the sticky header.
    **Task:** Apply top padding to the `main` element in `+layout.svelte` that is equal to or greater than the header's height.
    **Rationale:** Prevents the header from obscuring the top portion of the page content when it's sticky.
    **Expected Outcome:** Page content starts below the sticky header, with no overlap.
    **Objectives:**
      * Determine the approximate height of the header (consider padding and content).
      * Add a CSS class or inline style to the `<main>` tag in `+layout.svelte`.
      * Set `padding-top` on the `main` element to accommodate the header's height.
      * Verify visually that content is not hidden behind the header.
    **Implementation Prompt:** Add a class `main-content` to the `<main>` tag in `src/routes/+layout.svelte`. Add the following CSS to a global stylesheet (e.g., `src/app.css`) or within a `<style global>` block in `+layout.svelte`: `.main-content { padding-top: 80px; /* Adjust value based on header height */ }`.
    **Example Code:**
    ```svelte
    <!-- src/routes/+layout.svelte -->
    <script>
      import Header from '$lib/components/Header.svelte';
    </script>

    <Header />
    <main class="main-content">
      <slot />
    </main>

    <style>
      .main-content {
        padding-top: 80px; /* Adjust this value based on your header's actual height */
      }
    </style>
    ```

  - **Sub-Task ID:** T-102.6
    **Goal:** Add basic styling and structure to the header content.
    **Task:** Refine the visual appearance of the header, including potential logo/title placement and navigation alignment.
    **Rationale:** Improves the user interface and provides a more polished look for the main application header.
    **Expected Outcome:** The header has a defined layout, potentially including a site title or logo and well-aligned navigation.
    **Objectives:**
      * Add a placeholder for a site title or logo within `Header.svelte`.
      * Use Flexbox or Grid to align the title/logo and navigation within the header.
      * Apply basic font styles and colors.
      * Ensure responsiveness for different screen sizes (basic level).
    **Implementation Prompt:** Modify `Header.svelte`. Add a `div` for a site title (e.g., "My App") before the `<nav>`. Use Flexbox on the root header `div` to align items: `display: flex; justify-content: space-between; align-items: center;`. Adjust padding and margins as needed.
    **Example Code:**
    ```svelte
    <!-- src/lib/components/Header.svelte -->
    <div class="sticky-header">
      <div class="site-title">My App</div>
      <nav>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </nav>
    </div>

    <style>
      .sticky-header {
        position: sticky;
        top: 0;
        background-color: white;
        z-index: 100;
        padding: 1rem 2rem; /* More horizontal padding */
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        display: flex;
        justify-content: space-between; /* Pushes title and nav apart */
        align-items: center; /* Vertically centers items */
        min-height: 60px; /* Ensure a minimum height */
      }
      .site-title {
        font-size: 1.5rem;
        font-weight: bold;
      }
      nav ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        gap: 1.5rem; /* Increased gap */
      }
      nav a {
        text-decoration: none;
        color: #333; /* Darker link color */
        font-weight: 500;
      }
      nav a:hover {
        color: #007bff; /* Hover effect */
      }
    </style>
    ```

  - **Sub-Task ID:** T-102.7
    **Goal:** Add basic unit tests for the Header component.
    **Task:** Write tests to ensure the Header component renders correctly and contains the expected navigation links.
    **Rationale:** Verifies the basic functionality and content of the header component, ensuring it meets requirements.
    **Expected Outcome:** A test suite for `Header.svelte` passes.
    **Objectives:**
      * Set up a testing environment if not already present (e.g., Vitest).
      * Write a test case to check if the `Header.svelte` component mounts without errors.
      * Write a test case to verify that the navigation links ("Home", "About", "Contact") are present in the rendered output.
    **Implementation Prompt:** Using Vitest and Svelte Testing Library, create a test file (e.g., `src/lib/components/Header.test.js`). Write tests to mount the `Header` component and assert the presence of navigation links.
    **Example Code:**
    ```javascript
    // src/lib/components/Header.test.js
    import { render } from '@testing-library/svelte';
    import Header from './Header.svelte';

    describe('Header Component', () => {
      test('should render the header with navigation links', () => {
        const { getByText } = render(Header);

        expect(getByText('My App')).toBeInTheDocument(); // Assuming site title is rendered
        expect(getByText('Home')).toBeInTheDocument();
        expect(getByText('About')).toBeInTheDocument();
        expect(getByText('Contact')).toBeInTheDocument();
      });
    });
    ```
- **ID:** T-103
  **Title:** Develop Theme Support System
  *(Description):* Implement theme switching (light/dark mode) using Svelte stores and persist the preference in localStorage.
  *(User Story):* N/A
  *(Priority):* High
  *(Dependencies):* T-101
  *(Est. Effort):* Medium
  - **Sub-Task ID:** T-103.1
    **Goal:** Define the structure for theme-related data.
    **Task:** Create a TypeScript interface or type alias to represent the available themes and their properties.
    **Rationale:** Establishes a clear contract for theme data, improving type safety and maintainability.
    **Expected Outcome:** A defined type/interface for theme objects.
    **Objectives:**
      * Define an interface `Theme` with properties like `name` (string), `colors` (object), etc.
      * Define an enum or union type for `ThemeName` (e.g., 'light', 'dark').
    **Implementation Prompt:** "Create a TypeScript interface named `Theme` and a type alias `ThemeName` representing 'light' and 'dark' themes. The `Theme` interface should include a `name` property of type `ThemeName` and a `colors` object with example color properties like `primary`, `secondary`, `background`, `text`."
    **Example Code:**
    ```typescript
    export type ThemeName = 'light' | 'dark';

    export interface Theme {
      name: ThemeName;
      colors: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
      };
    }
    ```
  - **Sub-Task ID:** T-103.2
    **Goal:** Create a Svelte store to manage the current theme.
    **Task:** Initialize a writable Svelte store that holds the current theme object.
    **Rationale:** Provides a reactive mechanism to access and update the application's theme state across components.
    **Expected Outcome:** A Svelte writable store instance holding the initial theme.
    **Objectives:**
      * Import `writable` from 'svelte/store'.
      * Initialize the store with a default theme (e.g., 'light').
      * Export the store for use in other components.
    **Implementation Prompt:** "Create a Svelte writable store named `themeStore`. Initialize it with a default theme object conforming to the `Theme` interface (defined in T-103.1), setting `name` to 'light' and providing placeholder color values. Export this store."
    **Example Code:**
    ```javascript
    import { writable } from 'svelte/store';
    import type { Theme } from './themeTypes'; // Assuming themeTypes.ts contains the interface

    const defaultTheme: Theme = {
      name: 'light',
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        background: '#ffffff',
        text: '#212529',
      }
    };

    export const themeStore = writable<Theme>(defaultTheme);
    ```
  - **Sub-Task ID:** T-103.3
    **Goal:** Implement logic to load the theme preference from localStorage.
    **Task:** Write a function that attempts to retrieve the theme preference from localStorage and updates the store accordingly.
    **Rationale:** Ensures the user's previously selected theme is restored upon page load.
    **Expected Outcome:** A function that reads localStorage and updates the `themeStore`.
    **Objectives:**
      * Check if `localStorage` is available (e.g., in browser environment).
      * Attempt to get an item named 'app-theme' from localStorage.
      * If found, parse the value and update the `themeStore`.
      * Handle potential parsing errors gracefully.
    **Implementation Prompt:** "Create a function `loadThemeFromLocalStorage` that checks for the 'app-theme' key in `localStorage`. If found, it should parse the JSON string and use it to update the `themeStore` (imported from './themeStore'). Include error handling for JSON parsing and localStorage access. This function should be called once when the application initializes."
    **Example Code:**
    ```javascript
    import { themeStore } from './themeStore';
    import type { Theme } from './themeTypes';

    export function loadThemeFromLocalStorage() {
      if (typeof window !== 'undefined') {
        try {
          const storedTheme = localStorage.getItem('app-theme');
          if (storedTheme) {
            const parsedTheme = JSON.parse(storedTheme) as Theme;
            // Basic validation could be added here
            themeStore.set(parsedTheme);
          }
        } catch (error) {
          console.error("Failed to load theme from localStorage:", error);
          // Optionally set a default theme or keep the initial one
        }
      }
    }
    ```
  - **Sub-Task ID:** T-103.4
    **Goal:** Implement logic to persist the theme preference to localStorage.
    **Task:** Create a function that subscribes to the `themeStore` and saves the current theme to localStorage whenever it changes.
    **Rationale:** Saves the user's theme choice so it persists across sessions.
    **Expected Outcome:** A mechanism that automatically saves the theme to localStorage on change.
    **Objectives:**
      * Subscribe to the `themeStore`.
      * Inside the subscription callback, stringify the current theme object.
      * Save the stringified theme to localStorage under the key 'app-theme'.
      * Ensure this subscription is set up once during application initialization.
    **Implementation Prompt:** "Create a function `persistThemeToLocalStorage` that subscribes to the `themeStore`. In the subscription callback, stringify the received theme object and save it to `localStorage` using the key 'app-theme'. This function should be called once during application initialization to set up the persistence."
    **Example Code:**
    ```javascript
    import { themeStore } from './themeStore';

    export function persistThemeToLocalStorage() {
      themeStore.subscribe(theme => {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('app-theme', JSON.stringify(theme));
          } catch (error) {
            console.error("Failed to save theme to localStorage:", error);
          }
        }
      });
    }
    ```
  - **Sub-Task ID:** T-103.5
    **Goal:** Create a Svelte component to toggle between themes.
    **Task:** Develop a UI component (e.g., a button or dropdown) that allows users to switch between light and dark themes.
    **Rationale:** Provides the user interface for interacting with the theme switching functionality.
    **Expected Outcome:** A functional Svelte component for theme selection.
    **Objectives:**
      * Create a Svelte component file (e.g., `ThemeToggle.svelte`).
      * Import the `themeStore`.
      * Display the current theme name or a toggle control.
      * Implement a click handler or change event listener.
      * Inside the handler, update the `themeStore` with the new theme object (defining the 'dark' theme structure if needed).
    **Implementation Prompt:** "Create a Svelte component `ThemeToggle.svelte`. It should display a button that, when clicked, toggles the theme between 'light' and 'dark'. Import `themeStore` and update it accordingly. Define the 'dark' theme's color properties within the component or import them. Ensure the button text reflects the *next* theme state."
    **Example Code:**
    ```svelte
    <script lang="ts">
      import { themeStore } from './themeStore';
      import type { Theme, ThemeName } from './themeTypes';

      // Define themes (could be imported from a central config)
      const themes: Record<ThemeName, Theme> = {
        light: {
          name: 'light',
          colors: { primary: '#007bff', secondary: '#6c757d', background: '#ffffff', text: '#212529' }
        },
        dark: {
          name: 'dark',
          colors: { primary: '#0056b3', secondary: '#343a40', background: '#343a40', text: '#f8f9fa' }
        }
      };

      function toggleTheme() {
        themeStore.update(currentTheme => {
          const nextThemeName = currentTheme.name === 'light' ? 'dark' : 'light';
          return themes[nextThemeName];
        });
      }

      $: currentThemeName = $themeStore.name;
    </script>

    <button on:click={toggleTheme}>
      Switch to {$themeStore.name === 'light' ? 'Dark' : 'Light'} Mode
    </button>
    ```
  - **Sub-Task ID:** T-103.6
    **Goal:** Apply theme styles dynamically to the application.
    **Task:** Implement a mechanism to apply the selected theme's CSS variables or styles globally.
    **Rationale:** Visually updates the application's appearance based on the active theme.
    **Expected Outcome:** Application UI reflects the selected theme's colors and styles.
    **Objectives:**
      * Create a mechanism (e.g., a Svelte `head` tag, a dedicated component, or CSS variables) to apply styles.
      * Subscribe to the `themeStore`.
      * When the theme changes, update the applied styles/CSS variables based on the `theme.colors` object.
      * Ensure initial theme styles are applied correctly on load.
    **Implementation Prompt:** "Create a Svelte component or a script that subscribes to `themeStore`. This component/script should dynamically set CSS variables on the `document.documentElement` (e.g., `--primary-color`, `--background-color`) based on the `colors` object of the current theme. Ensure this is applied when the component mounts and updates whenever the theme changes."
    **Example Code:**
    ```svelte
    <script lang="ts">
      import { themeStore } from './themeStore';
      import { onMount } from 'svelte';

      function applyThemeStyles(theme) {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', theme.colors.primary);
        root.style.setProperty('--background-color', theme.colors.background);
        root.style.setProperty('--text-color', theme.colors.text);
        // Add other theme variables as needed
      }

      onMount(() => {
        const unsubscribe = themeStore.subscribe(theme => {
          applyThemeStyles(theme);
        });
        // Apply initial theme
        applyThemeStyles($themeStore);

        return () => unsubscribe(); // Cleanup subscription on component destroy
      });
    </script>

    <!-- This component doesn't need to render anything visible, -->
    <!-- its purpose is to manage global styles. -->
    <!-- Alternatively, this logic could be in the main App.svelte -->
    ```
  - **Sub-Task ID:** T-103.7
    **Goal:** Initialize theme loading and persistence on application start.
    **Task:** Call the functions responsible for loading the theme from localStorage and setting up the persistence subscription.
    **Rationale:** Ensures that theme state is correctly managed from the very beginning of the application lifecycle.
    **Expected Outcome:** Theme loading and saving are active as soon as the app boots.
    **Objectives:**
      * Identify the main application entry point or layout component.
      * Import `loadThemeFromLocalStorage` and `persistThemeToLocalStorage`.
      * Call `loadThemeFromLocalStorage()` once.
      * Call `persistThemeToLocalStorage()` once.
    **Implementation Prompt:** "In the main Svelte application file (e.g., `App.svelte` or `main.js`), import `loadThemeFromLocalStorage` and `persistThemeToLocalStorage` from their respective modules. Call `loadThemeFromLocalStorage()` immediately after imports. Call `persistThemeToLocalStorage()` immediately after that to set up the subscription."
    **Example Code:**
    ```javascript
    // Example in App.svelte or main.js
    import { onMount } from 'svelte';
    import { loadThemeFromLocalStorage } from './themePersistence'; // Adjust path
    import { persistThemeToLocalStorage } from './themePersistence'; // Adjust path
    import ThemeToggle from './ThemeToggle.svelte'; // Example usage
    import ThemeStyleApplier from './ThemeStyleApplier.svelte'; // Example usage

    // Load theme preference when the app starts
    loadThemeFromLocalStorage();
    // Set up listener to save theme preference whenever it changes
    persistThemeToLocalStorage();

    // ... rest of your app setup
    ```
  - **Sub-Task ID:** T-103.8
    **Goal:** Write unit tests for theme store and persistence logic.
    **Task:** Create unit tests to verify the functionality of the theme store, loading, and persistence.
    **Rationale:** Ensures the theme system behaves as expected and catches regressions.
    **Expected Outcome:** A suite of unit tests covering the core theme logic.
    **Objectives:**
      * Test the initial state of the `themeStore`.
      * Test updating the `themeStore` directly.
      * Mock `localStorage` to test `loadThemeFromLocalStorage`.
      * Mock `localStorage` to test `persistThemeToLocalStorage` (verify `setItem` calls).
    **Implementation Prompt:** "Write unit tests using Vitest (or Jest) for the theme store and persistence logic. Mock `localStorage` using `vi.spyOn` or similar. Test that `loadThemeFromLocalStorage` correctly sets the store from localStorage data and that `persistThemeToLocalStorage` correctly calls `localStorage.setItem` when the store is updated. Ensure tests cover edge cases like empty localStorage or invalid JSON."
    **Example Code:**
    ```javascript
    // Example using Vitest and mocking localStorage
    import { describe, it, expect, beforeEach, vi } from 'vitest';
    import { themeStore, loadThemeFromLocalStorage, persistThemeToLocalStorage } from '../src/themeStore'; // Adjust path

    // Mock localStorage
    const mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    global.localStorage = mockLocalStorage;

    describe('Theme Store and Persistence', () => {
      beforeEach(() => {
        // Reset mocks and store before each test
        mockLocalStorage.getItem.mockClear();
        mockLocalStorage.setItem.mockClear();
        themeStore.set({ name: 'light', colors: { /* ... */ } }); // Reset to default
      });

      it('should load theme from localStorage', () => {
        const mockTheme = { name: 'dark', colors: { /* ... */ } };
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockTheme));
        loadThemeFromLocalStorage();
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('app-theme');
        // Need to subscribe or use a getter if themeStore is not directly accessible
        // For simplicity, assuming direct access or a getter function exists
        // expect(themeStore.get()).toEqual(mockTheme); // Hypothetical getter
      });

      it('should persist theme to localStorage', () => {
        persistThemeToLocalStorage(); // Sets up the subscription
        const newTheme = { name: 'dark', colors: { /* ... */ } };
        themeStore.set(newTheme);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('app-theme', JSON.stringify(newTheme));
      });
    });
    ```
- **ID:** T-104
  **Title:** Integrate Consent Banner
  *(Description):* Implement a consent banner component and logic for managing user consent, including cookie storage.
  *(User Story):* N/A
  *(Priority):* High
  *(Dependencies):* T-101
  *(Est. Effort):* Medium
  - **Sub-Task ID:** T-104.1
    **Goal:** Define the structure and initial state for consent management.
    **Task:** Create a TypeScript interface or type definition for the consent state, including properties for different consent categories (e.g., analytics, marketing) and a timestamp for when consent was last updated.
    **Rationale:** Establishes a clear, type-safe contract for how consent data will be represented throughout the application.
    **Expected Outcome:** A defined `ConsentState` type/interface in a shared types file.
    **Objectives:**
      * Define an interface/type named `ConsentState`.
      * Include boolean flags for common consent categories (e.g., `analytics`, `marketing`, `functional`).
      * Include a `lastUpdated` property of type `Date` or `number` (timestamp).
    **Implementation Prompt:** "Generate a TypeScript interface named `ConsentState` that includes boolean properties for `analytics`, `marketing`, and `functional` consent, plus a `lastUpdated` property of type `Date`."
    **Example Code:**
    ```typescript
    interface ConsentState {
      analytics: boolean;
      marketing: boolean;
      functional: boolean;
      lastUpdated: Date;
    }
    ```
  - **Sub-Task ID:** T-104.2
    **Goal:** Create a React context for managing consent state.
    **Task:** Implement a React Context API provider (`ConsentProvider`) that will hold and manage the `ConsentState`. This provider should include functions to update the consent state.
    **Rationale:** Provides a centralized and accessible way to manage and update user consent across the application without prop drilling.
    **Expected Outcome:** A `ConsentProvider` component and a `useConsent` hook.
    **Objectives:**
      * Create a React Context object.
      * Implement a `ConsentProvider` component that wraps its children.
      * Initialize the `ConsentState` within the provider (initially all false or from storage).
      * Create a `useConsent` hook to access the context value.
      * Include functions within the context value to update specific consent categories and the `lastUpdated` timestamp.
    **Implementation Prompt:** "Create a React Context named `ConsentContext` with a `ConsentProvider` component and a `useConsent` hook. The context value should include the `ConsentState` object and an `updateConsent` function that accepts a category (string) and a boolean value, updating the state and `lastUpdated` timestamp. Initialize state to default values."
    **Example Code:**
    ```jsx
    import React, { createContext, useState, useContext, ReactNode } from 'react';
    // Assume ConsentState interface is defined elsewhere

    interface ConsentContextType {
      consentState: ConsentState;
      updateConsent: (category: keyof ConsentState, value: boolean) => void;
    }

    const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

    export const ConsentProvider = ({ children }: { children: ReactNode }) => {
      const [consentState, setConsentState] = useState<ConsentState>({
        analytics: false,
        marketing: false,
        functional: false,
        lastUpdated: new Date(),
      });

      const updateConsent = (category: keyof ConsentState, value: boolean) => {
        setConsentState(prevState => ({
          ...prevState,
          [category]: value,
          lastUpdated: new Date(),
        }));
      };

      return (
        <ConsentContext.Provider value={{ consentState, updateConsent }}>
          {children}
        </ConsentContext.Provider>
      );
    };

    export const useConsent = () => {
      const context = useContext(ConsentContext);
      if (!context) {
        throw new Error('useConsent must be used within a ConsentProvider');
      }
      return context;
    };
    ```
  - **Sub-Task ID:** T-104.3
    **Goal:** Implement cookie storage and retrieval for consent state.
    **Task:** Add functionality to the `ConsentProvider` to save the `ConsentState` to browser cookies when it changes and load the state from cookies when the application initializes. Use a library like `js-cookie` or implement basic cookie handling.
    **Rationale:** Persists user consent choices across sessions, ensuring the banner doesn't reappear unnecessarily and respecting user preferences.
    **Expected Outcome:** Consent state is saved to and loaded from cookies.
    **Objectives:**
      * Integrate a cookie handling utility (e.g., `js-cookie`).
      * Implement a function to save the `ConsentState` to a cookie (e.g., named `user-consent`).
      * Implement a function to load `ConsentState` from the cookie on provider initialization.
      * Ensure the `updateConsent` function also triggers the save operation.
      * Handle cases where the cookie might not exist or be malformed.
    **Implementation Prompt:** "Within the `ConsentProvider` component, use the `js-cookie` library to: 1. Load consent state from a cookie named `user-consent` on initial mount. If the cookie doesn't exist, use default values. 2. Save the `consentState` to the `user-consent` cookie whenever it's updated via `updateConsent` or initial load. Ensure the cookie is set with an appropriate expiration date."
    **Example Code:**
    ```jsx
    // Inside ConsentProvider component
    import Cookies from 'js-cookie';
    // ... other imports and state setup

    const COOKIE_NAME = 'user-consent';

    // Load initial state from cookie
    const initialConsentState = Cookies.get(COOKIE_NAME)
      ? JSON.parse(Cookies.get(COOKIE_NAME)!)
      : { analytics: false, marketing: false, functional: false, lastUpdated: new Date() };

    const [consentState, setConsentState] = useState<ConsentState>(initialConsentState);

    // Update function needs to save cookie
    const updateConsent = (category: keyof ConsentState, value: boolean) => {
      setConsentState(prevState => {
        const newState = {
          ...prevState,
          [category]: value,
          lastUpdated: new Date(),
        };
        Cookies.set(COOKIE_NAME, JSON.stringify(newState), { expires: 365 }); // Expires in 1 year
        return newState;
      });
    };

    // Also save on initial load if state was derived from cookie
    React.useEffect(() => {
       Cookies.set(COOKIE_NAME, JSON.stringify(consentState), { expires: 365 });
    }, [consentState]); // Re-run effect if consentState changes
    ```
  - **Sub-Task ID:** T-104.4
    **Goal:** Develop the UI for the consent banner.
    **Task:** Create a reusable React component (`ConsentBanner`) that displays the consent options (e.g., accept all, reject all, customize). This component should be conditionally rendered based on whether consent has been given.
    **Rationale:** Provides the user interface for interacting with the consent management system.
    **Expected Outcome:** A visible `ConsentBanner` component that can be controlled by the consent state.
    **Objectives:**
      * Create a `ConsentBanner` React component.
      * Include UI elements for accepting, rejecting, and potentially customizing consent.
      * Style the banner to be noticeable (e.g., fixed at the bottom of the viewport).
      * Use the `useConsent` hook to access and update consent state when user interacts with buttons.
      * Implement logic to hide the banner once consent is given.
    **Implementation Prompt:** "Create a React component `ConsentBanner.tsx`. It should display a message like 'We use cookies...' with buttons for 'Accept All', 'Reject All', and 'Manage Settings'. Use the `useConsent` hook to: 1. Determine if the banner should be visible (e.g., if `analytics` or `marketing` consent is false). 2. Call `updateConsent` with appropriate values when buttons are clicked. Style it as a fixed banner at the bottom of the screen."
    **Example Code:**
    ```jsx
    import React from 'react';
    import { useConsent } from './ConsentContext'; // Assuming context is in './ConsentContext'

    const ConsentBanner = () => {
      const { consentState, updateConsent } = useConsent();

      // Determine if banner should be shown (e.g., if any non-functional consent is false)
      const needsConsent = !consentState.functional || !consentState.analytics || !consentState.marketing;

      if (!needsConsent) {
        return null;
      }

      const handleAcceptAll = () => {
        updateConsent('functional', true);
        updateConsent('analytics', true);
        updateConsent('marketing', true);
      };

      const handleRejectAll = () => {
        updateConsent('functional', false); // Or true if functional is always required
        updateConsent('analytics', false);
        updateConsent('marketing', false);
      };

      return (
        <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', background: '#333', color: 'white', padding: '10px', textAlign: 'center', zIndex: 1000 }}>
          <p>We use cookies to improve your experience. By continuing, you agree to our cookie policy.</p>
          <button onClick={handleAcceptAll} style={{ margin: '0 10px' }}>Accept All</button>
          <button onClick={handleRejectAll} style={{ margin: '0 10px' }}>Reject All</button>
          {/* Add Manage Settings button/link */}
        </div>
      );
    };

    export default ConsentBanner;
    ```
  - **Sub-Task ID:** T-104.5
    **Goal:** Integrate the Consent Banner into the application layout.
    **Task:** Wrap the main application component (e.g., `App.tsx`) with the `ConsentProvider` and conditionally render the `ConsentBanner` component at the appropriate place in the layout.
    **Rationale:** Ensures the consent management system is active application-wide and the banner is displayed correctly.
    **Expected Outcome:** The `ConsentProvider` is active, and the `ConsentBanner` is rendered and functional.
    **Objectives:**
      * Locate the main application entry point or layout component.
      * Wrap the relevant part of the component tree with `ConsentProvider`.
      * Import and render the `ConsentBanner` component within the layout, likely at the top level.
      * Ensure the banner's visibility logic works correctly based on consent state.
    **Implementation Prompt:** "In the main application file (e.g., `App.tsx` or `index.tsx`), import `ConsentProvider` and `ConsentBanner`. Wrap the main application content with `ConsentProvider`. Render the `ConsentBanner` component, ensuring it appears correctly within the application's structure (e.g., directly inside the provider or at the root)."
    **Example Code:**
    ```jsx
    // App.tsx
    import React from 'react';
    import { ConsentProvider } from './components/ConsentManager/ConsentContext'; // Adjust path
    import ConsentBanner from './components/ConsentManager/ConsentBanner'; // Adjust path
    import MainContent from './MainContent'; // Your app's main content

    function App() {
      return (
        <ConsentProvider>
          {/* Other components like Header, Footer */}
          <ConsentBanner />
          <MainContent />
          {/* Other components */}
        </ConsentProvider>
      );
    }

    export default App;
    ```
  - **Sub-Task ID:** T-104.6
    **Goal:** Implement logic to disable/enable tracking scripts based on consent.
    **Task:** Create utility functions or hooks that check the current consent state before initializing third-party scripts (e.g., analytics, marketing tags).
    **Rationale:** Ensures that tracking scripts are only loaded and executed when the user has explicitly consented to them, respecting privacy regulations.
    **Expected Outcome:** A mechanism to conditionally load or initialize tracking scripts.
    **Objectives:**
      * Create a helper function `hasConsent(category: 'analytics' | 'marketing')` that uses `useConsent` to check the state.
      * Modify existing script loading logic (or create new placeholders) to call `hasConsent` before execution.
      * Ensure this logic is applied to all relevant third-party scripts.
    **Implementation Prompt:** "Create a React hook `useConsentCheck` that returns a function `checkConsent(category: 'analytics' | 'marketing' | 'functional')`. This function should internally use `useConsent` to check if the specified consent category is granted. Provide an example of how to use this hook to conditionally load a hypothetical analytics script."
    **Example Code:**
    ```jsx
    import { useConsent } from './ConsentContext';

    const useConsentCheck = () => {
      const { consentState } = useConsent();

      const checkConsent = (category: keyof Pick<ConsentState, 'analytics' | 'marketing' | 'functional'>): boolean => {
        return consentState[category];
      };

      return { checkConsent };
    };

    // Example Usage in another component:
    // import React, { useEffect } from 'react';
    // import { useConsentCheck } from './useConsentCheck';
    //
    // const AnalyticsTracker = () => {
    //   const { checkConsent } = useConsentCheck();
    //
    //   useEffect(() => {
    //     if (checkConsent('analytics')) {
    //       // Load and initialize analytics script here
    //       console.log('Analytics enabled, initializing script...');
    //       // Example: loadAnalyticsScript();
    //     } else {
    //       console.log('Analytics disabled.');
    //       // Optionally, clean up any existing analytics instance
    //     }
    //   }, [checkConsent]); // Dependency array includes checkConsent
    //
    //   return null; // This component doesn't render anything itself
    // };
    ```
  - **Sub-Task ID:** T-104.7
    **Goal:** Write unit tests for the consent management logic.
    **Task:** Create unit tests for the `ConsentProvider`, `useConsent` hook, and potentially the cookie storage logic to ensure they function as expected.
    **Rationale:** Verifies the correctness and reliability of the consent management system's core logic.
    **Expected Outcome:** A suite of unit tests covering the consent context and state management.
    **Objectives:**
      * Test the initial state of the `ConsentProvider`.
      * Test the `updateConsent` function's ability to modify state correctly.
      * Test the `useConsent` hook's return values.
      * Mock cookie interactions if testing persistence directly within the provider tests.
      * Ensure tests pass consistently.
    **Implementation Prompt:** "Write Jest unit tests for the `ConsentProvider` and `useConsent` hook. Use `@testing-library/react` to render the provider and test hook interactions. Mock `js-cookie` to simulate saving and loading. Test initial state, updating consent categories, and the `lastUpdated` timestamp."
    **Example Code:**
    ```jsx
    // Example using Jest and @testing-library/react
    import React from 'react';
    import { render, screen, fireEvent, act } from '@testing-library/react';
    import { ConsentProvider, useConsent } from './ConsentContext';
    import Cookies from 'js-cookie';

    // Mock js-cookie
    jest.mock('js-cookie');
    const mockCookies = Cookies as jest.Mocked<typeof Cookies>;

    const TestComponent = () => {
      const { consentState, updateConsent } = useConsent();
      return (
        <div>
          <div data-testid="analytics-consent">{consentState.analytics.toString()}</div>
          <button onClick={() => updateConsent('analytics', true)}>Enable Analytics</button>
        </div>
      );
    };

    describe('ConsentProvider', () => {
      beforeEach(() => {
        // Reset mocks before each test
        mockCookies.get.mockClear();
        mockCookies.set.mockClear();
      });

      it('should load initial state from cookie or use defaults', () => {
        mockCookies.get.mockReturnValue(JSON.stringify({ analytics: true, marketing: false, functional: false, lastUpdated: new Date() }));
        render(<TestComponent />);
        expect(screen.getByTestId('analytics-consent')).toHaveTextContent('true');
      });

      it('should update consent state and save to cookie', () => {
        mockCookies.get.mockReturnValue(null); // Start with no cookie
        const { rerender } = render(
          <ConsentProvider>
            <TestComponent />
          </ConsentProvider>
        );

        // Simulate clicking the button to enable analytics
        act(() => {
          fireEvent.click(screen.getByText('Enable Analytics'));
        });

        // Check if state updated
        expect(screen.getByTestId('analytics-consent')).toHaveTextContent('true');

        // Check if cookie was set
        expect(mockCookies.set).toHaveBeenCalledTimes(1);
        expect(mockCookies.set).toHaveBeenCalledWith(expect.any(String), expect.any(String), { expires: 365 });
      });
    });
    ```
  - **Sub-Task ID:** T-104.8
    **Goal:** Write integration tests for the consent banner interaction.
    **Task:** Create integration tests that verify the `ConsentBanner` component's behavior, including its conditional rendering and the correct invocation of consent update functions when buttons are clicked.
    **Rationale:** Ensures the user-facing component works correctly in conjunction with the consent management logic.
    **Expected Outcome:** Integration tests validating the banner's UI and interaction flow.
    **Objectives:**
      * Test that the banner renders when no consent is present.
      * Test that the banner does not render when consent is present.
      * Test that clicking 'Accept All' updates all consent states correctly.
      * Test that clicking 'Reject All' updates consent states correctly.
      * Verify that cookie saving is triggered by banner interactions.
    **Implementation Prompt:** "Write integration tests using `@testing-library/react` for the `ConsentBanner` component. Render the `ConsentProvider` and `ConsentBanner`. Test scenarios: 1. Banner visibility when initial consent is false. 2. Banner visibility when initial consent is true. 3. Clicking 'Accept All' updates consent state and calls `updateConsent` for all categories. Mock `js-cookie` to verify persistence."
    **Example Code:**
    ```jsx
    // Example using Jest and @testing-library/react
    import React from 'react';
    import { render, screen, fireEvent, act } from '@testing-library/react';
    import { ConsentProvider } from './ConsentContext';
    import ConsentBanner from './ConsentBanner';
    import Cookies from 'js-cookie';

    // Mock js-cookie
    jest.mock('js-cookie');
    const mockCookies = Cookies as jest.Mocked<typeof Cookies>;

    // Mock a component that uses consent, to check if it renders/behaves differently
    const MockTrackingComponent = ({ category }: { category: 'analytics' | 'marketing' }) => {
        const { consentState } = React.useContext(ConsentContext); // Assuming ConsentContext is exported
        return <div data-testid={`${category}-status`}>{consentState[category] ? 'Enabled' : 'Disabled'}</div>;
    };

    describe('ConsentBanner Integration', () => {
      beforeEach(() => {
        mockCookies.get.mockClear();
        mockCookies.set.mockClear();
        // Default to no consent initially for most tests
        mockCookies.get.mockReturnValue(null);
      });

      it('should display the banner when no consent is given', () => {
        render(
          <ConsentProvider>
            <ConsentBanner />
            <MockTrackingComponent category="analytics" />
          </ConsentProvider>
        );
        expect(screen.getByText(/We use cookies/i)).toBeInTheDocument();
        expect(screen.getByText('Enabled')).toBeInTheDocument(); // MockTrackingComponent should show disabled
      });

      it('should hide the banner when all consent is given', () => {
        const initialConsent = JSON.stringify({ analytics: true, marketing: true, functional: true, lastUpdated: new Date() });
        mockCookies.get.mockReturnValue(initialConsent);

        render(
          <ConsentProvider>
            <ConsentBanner />
            <MockTrackingComponent category="analytics" />
          </ConsentProvider>
        );
        expect(screen.queryByText(/We use cookies/i)).not.toBeInTheDocument();
        expect(screen.getByTestId('analytics-status')).toHaveTextContent('Enabled');
      });

      it('should update consent and hide banner when "Accept All" is clicked', () => {
        render(
          <ConsentProvider>
            <ConsentBanner />
            <MockTrackingComponent category="analytics" />
          </ConsentProvider>
        );

        act(() => {
          fireEvent.click(screen.getByText('Accept All'));
        });

        expect(screen.queryByText(/We use cookies/i)).not.toBeInTheDocument();
        expect(screen.getByTestId('analytics-status')).toHaveTextContent('Enabled');
        expect(mockCookies.set).toHaveBeenCalledTimes(3); // Called for each updateConsent
      });
    });
    ```
- **ID:** T-105
  **Title:** Configure AdSense Integration
  *(Description):* Set up AdSense scripts and server-side logic, respecting user consent.
  *(User Story):* N/A
  *(Priority):* Medium
  *(Dependencies):* T-101, T-104
  *(Est. Effort):* Medium
  - **Sub-Task ID:** T-105.1
    **Goal:** Add AdSense auto-ads script to the website's header.
    **Task:** Implement the necessary code to include the AdSense auto-ads script in the `<head>` section of all relevant HTML pages.
    **Rationale:** This is the primary step to enable AdSense to serve ads on the website.
    **Expected Outcome:** The AdSense auto-ads script tag is present in the HTML source of the website.
    **Objectives:**
      * Locate the appropriate template or layout file for injecting scripts into the header.
      * Add the AdSense auto-ads script tag (`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUB_ID" crossorigin="anonymous"></script>`) to the header.
      * Ensure the script is loaded asynchronously.
      * Replace `YOUR_PUB_ID` with the actual AdSense publisher ID.
    **Implementation Prompt:** "In a [Specify Framework/Language, e.g., React, Next.js, Django, Flask] application, modify the main layout or head component to include the AdSense auto-ads script. The script should be placed within the `<head>` tags. Use the provided AdSense publisher ID `ca-pub-YOUR_PUB_ID`. Ensure the script has `async` attribute and `crossorigin="anonymous"`."
    **Example Code:**
    ```html
    <head>
      <meta charset="utf-8" />
      <link rel="icon" href="/favicon.ico" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#000000" />
      <meta
        name="description"
        content="Web site created using create-react-app"
      />
      <link rel="apple-touch-icon" href="/logo192.png" />
      <link rel="manifest" href="/manifest.json" />
      <title>My App</title>
      <!-- AdSense Auto-ads Script -->
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUB_ID" crossorigin="anonymous"></script>
    </head>
    ```

  - **Sub-Task ID:** T-105.2
    **Goal:** Implement server-side logic to conditionally load AdSense based on user consent.
    **Task:** Develop backend logic that checks for user consent before allowing AdSense scripts to be rendered or loaded.
    **Rationale:** This ensures compliance with privacy regulations (e.g., GDPR, CCPA) by only serving ads to users who have explicitly consented.
    **Expected Outcome:** AdSense scripts are only included in the HTML output when the user has provided consent.
    **Objectives:**
      * Identify or create a mechanism to store and retrieve user consent status (e.g., from cookies, session, or a consent management platform).
      * Create a server-side function or middleware that checks this consent status.
      * Integrate this check into the rendering process of pages where AdSense is intended to appear.
    **Implementation Prompt:** "Create a server-side function `shouldLoadAdsense()` that checks for a user consent flag. Assume consent is stored in a cookie named `user_consent` with a value of `true`. If the cookie exists and is `true`, return `true`; otherwise, return `false`. This function will be used in a [Specify Backend Language/Framework, e.g., Node.js with Express, Python with Flask] application."
    **Example Code:**
    ```javascript
    // Example for Node.js/Express
    function shouldLoadAdsense(req) {
      const userConsentCookie = req.cookies.user_consent;
      return userConsentCookie === 'true';
    }
    ```

  - **Sub-Task ID:** T-105.3
    **Goal:** Conditionally render the AdSense script tag based on consent.
    **Task:** Modify the frontend rendering logic to conditionally include the AdSense script tag (from T-105.1) based on the server-side consent check (from T-105.2).
    **Rationale:** This directly links the user's consent to the actual loading of AdSense, completing the privacy compliance requirement.
    **Expected Outcome:** The AdSense script tag is only present in the final HTML served to the user if they have consented.
    **Objectives:**
      * Pass the consent status from the server-side logic to the frontend template/component.
      * Use conditional rendering logic in the frontend to include the AdSense script tag only when consent is `true`.
    **Implementation Prompt:** "In a [Specify Frontend Framework/Language, e.g., React, Vue, server-side templating like EJS/Jinja2], update the header component or template. It should receive a prop or variable `consentGiven` (boolean). If `consentGiven` is true, render the AdSense script tag defined in T-105.1. Otherwise, do not render it."
    **Example Code:**
    ```jsx
    // Example for React
    function Header({ consentGiven }) {
      return (
        <head>
          {/* Other head elements */}
          {consentGiven && (
            <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_PUB_ID" crossorigin="anonymous"></script>
          )}
        </head>
      );
    }
    ```

  - **Sub-Task ID:** T-105.4
    **Goal:** Implement AdSense ad units (if required beyond auto-ads).
    **Task:** Define and implement specific AdSense ad units (e.g., display ads, in-feed ads) using `adsbygoogle` push method, respecting user consent.
    **Rationale:** While auto-ads are configured, specific placements might require manual ad unit configuration for better control and performance.
    **Expected Outcome:** Defined ad units are correctly placed and rendered on the page when consent is given.
    **Objectives:**
      * Identify areas on the website where specific ad units should be placed.
      * Create `div` elements with appropriate `data-ad-client` and `data-ad-slot` attributes for each ad unit.
      * Implement the `(adsbygoogle = window.adsbygoogle || []).push({});` call, ensuring it's only executed if consent is given.
    **Implementation Prompt:** "For a [Specify Framework/Language, e.g., JavaScript, React], create a reusable `AdUnit` component. This component should accept `client` and `slot` props. It should render a `div` with `adsbygoogle` class and the provided `data-ad-client` and `data-ad-slot` attributes. The component should only render the `div` and trigger the `push` method if a `consentGiven` prop is true. Include the necessary `(adsbygoogle = window.adsbygoogle || []).push({});` call within the component's effect or render logic."
    **Example Code:**
    ```jsx
    // Example for React
    function AdUnit({ client, slot, consentGiven }) {
      React.useEffect(() => {
        if (consentGiven) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      }, [consentGiven]);

      return consentGiven ? (
        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client={client}
             data-ad-slot={slot}
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
      ) : null;
    }
    ```

  - **Sub-Task ID:** T-105.5
    **Goal:** Write unit tests for AdSense consent logic.
    **Task:** Create unit tests to verify that the server-side and client-side logic correctly handles user consent for AdSense.
    **Rationale:** Ensures the consent mechanism functions as expected and prevents accidental serving of ads to users who haven't consented.
    **Expected Outcome:** A suite of unit tests that pass, confirming the correct behavior of the consent-based AdSense loading.
    **Objectives:**
      * Write tests for the server-side consent checking function (T-105.2).
      * Write tests for the client-side conditional rendering logic (T-105.3).
      * Cover cases for consent given, consent not given, and missing consent status.
    **Implementation Prompt:** "Using a testing framework like [Specify Testing Framework, e.g., Jest, Mocha, Pytest], write unit tests for the `shouldLoadAdsense` function (from T-105.2) and the conditional rendering logic (T-105.3). Mock necessary dependencies like request objects or component props to simulate different consent states."
    **Example Code:**
    ```javascript
    // Example for Jest (testing shouldLoadAdsense)
    describe('shouldLoadAdsense', () => {
      test('should return true if user_consent cookie is true', () => {
        const mockReq = { cookies: { user_consent: 'true' } };
        expect(shouldLoadAdsense(mockReq)).toBe(true);
      });

      test('should return false if user_consent cookie is false or missing', () => {
        const mockReqFalse = { cookies: { user_consent: 'false' } };
        const mockReqMissing = { cookies: {} };
        expect(shouldLoadAdsense(mockReqFalse)).toBe(false);
        expect(shouldLoadAdsense(mockReqMissing)).toBe(false);
      });
    });
    ```

  - **Sub-Task ID:** T-105.6
    **Goal:** Perform integration testing for AdSense loading with consent.
    **Task:** Conduct integration tests to ensure AdSense scripts and ad units load correctly only when user consent is provided and are blocked otherwise.
    **Rationale:** Verifies that the server-side and client-side components work together seamlessly to manage AdSense loading based on consent.
    **Expected Outcome:** Successful integration tests demonstrating the correct behavior of AdSense loading across different consent scenarios.
    **Objectives:**
      * Set up test scenarios that simulate user interactions with a consent banner/mechanism.
      * Verify that AdSense scripts are injected into the DOM only after consent is granted.
      * Verify that AdSense scripts are *not* injected if consent is denied or not yet given.
      * Check that ad units render correctly when consent is active.
    **Implementation Prompt:** "Write integration tests using a framework like [Specify Integration Testing Framework, e.g., Cypress, Playwright, Selenium]. Simulate a user journey: first denying consent, then granting consent, and verify the presence or absence of AdSense script tags and ad placeholders in the DOM at each stage."
    **Example Code:**
    ```javascript
    // Example for Cypress
    describe('AdSense Integration with Consent', () => {
      beforeEach(() => {
        // Mock setting consent cookie to false initially
        cy.setCookie('user_consent', 'false');
        cy.visit('/'); // Visit the page
      });

      it('should not load AdSense when consent is false', () => {
        cy.get('script[src*="googlesyndication.com"]').should('not.exist');
        cy.get('ins.adsbygoogle').should('not.exist');
      });

      it('should load AdSense when consent is granted', () => {
        // Simulate granting consent (e.g., clicking a button)
        cy.setCookie('user_consent', 'true');
        cy.reload(); // Reload page to reflect new consent

        cy.get('script[src*="googlesyndication.com"]').should('exist');
        // Add checks for specific ad units if applicable
        // cy.get('ins.adsbygoogle').should('exist');
      });
    });
    ```
- **ID:** T-106
  **Title:** Implement Reusable Export Utilities
  *(Description):* Create utility functions for generating and downloading CSV and JSON files.
  *(User Story):* N/A
  *(Priority):* High
  *(Dependencies):* T-101
  *(Est. Effort):* Medium
  - **Sub-Task ID:** T-106.1
    **Goal:** Define the core structure for CSV export utility.
    **Task:** Create a JavaScript/TypeScript function that accepts an array of objects and a list of column headers, and returns a CSV formatted string.
    **Rationale:** This is the foundational piece for CSV export, enabling data transformation into the correct format.
    **Expected Outcome:** A reusable function `generateCsvString(data: object[], columns: string[])` that produces a valid CSV string.
    **Objectives:**
      * Objective 1: Function signature is correctly defined.
      * Objective 2: Handles basic data types (strings, numbers, booleans).
      * Objective 3: Correctly formats headers.
      * Objective 4: Correctly formats rows, ensuring proper comma separation.
      * Objective 5: Handles potential commas or newlines within data fields by quoting them.
    **Implementation Prompt:** Create a TypeScript function `generateCsvString` that takes an array of objects (`data`) and an array of strings (`columns`) representing the desired CSV headers. The function should return a single string formatted as CSV. Ensure that values containing commas or newlines are properly quoted.
    **Example Code:**
    ```typescript
    function generateCsvString(data: Record<string, any>[], columns: string[]): string {
      const headerRow = columns.join(',');
      const dataRows = data.map(row =>
        columns.map(col => {
          const value = row[col] === undefined || row[col] === null ? '' : String(row[col]);
          // Basic handling for quotes and commas - more robust escaping might be needed
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      );
      return [headerRow, ...dataRows].join('\n');
    }
    ```

  - **Sub-Task ID:** T-106.2
    **Goal:** Implement a function to trigger CSV file download.
    **Task:** Create a JavaScript function that takes a CSV string and a filename, and initiates a browser download of a `.csv` file.
    **Rationale:** This function will bridge the generated CSV string with the user's action of downloading the file.
    **Expected Outcome:** A reusable function `downloadFile(content: string, filename: string, mimeType: string)` that triggers a file download.
    **Objectives:**
      * Objective 1: Function signature is correctly defined.
      * Objective 2: Creates a Blob object from the content and MIME type.
      * Objective 3: Creates an object URL for the Blob.
      * Objective 4: Creates a temporary anchor (`<a>`) element.
      * Objective 5: Sets the `href` and `download` attributes of the anchor element.
      * Objective 6: Programmatically clicks the anchor element.
      * Objective 7: Revokes the object URL after download initiation.
    **Implementation Prompt:** Create a JavaScript function `downloadFile(content: string, filename: string, mimeType: string)` that generates a downloadable file. It should create a Blob, generate an object URL, create a hidden anchor tag, set its `href` and `download` attributes, simulate a click, and then clean up the object URL.
    **Example Code:**
    ```javascript
    function downloadFile(content, filename, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    ```

  - **Sub-Task ID:** T-106.3
    **Goal:** Combine CSV generation and download logic.
    **Task:** Create a higher-level function that orchestrates the CSV string generation and subsequent file download.
    **Rationale:** This provides a single entry point for users to export data as a CSV file, encapsulating the two previous steps.
    **Expected Outcome:** A function `exportToCsv(data: object[], columns: string[], filename: string)` that generates and downloads a CSV file.
    **Objectives:**
      * Objective 1: Function signature is correctly defined.
      * Objective 2: Calls `generateCsvString` with provided data and columns.
      * Objective 3: Calls `downloadFile` with the generated CSV string, filename, and correct MIME type ('text/csv').
    **Implementation Prompt:** Create a TypeScript function `exportToCsv` that accepts `data` (array of objects), `columns` (array of strings), and `filename` (string). This function should internally call `generateCsvString` and then `downloadFile` to create and download the CSV.
    **Example Code:**
    ```typescript
    // Assuming generateCsvString and downloadFile are defined elsewhere
    function exportToCsv(data: Record<string, any>[], columns: string[], filename: string): void {
      const csvContent = generateCsvString(data, columns);
      downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
    }
    ```

  - **Sub-Task ID:** T-106.4
    **Goal:** Define the core structure for JSON export utility.
    **Task:** Create a JavaScript/TypeScript function that accepts an array of objects and returns a JSON formatted string.
    **Rationale:** This is the foundational piece for JSON export, enabling data transformation into the correct format.
    **Expected Outcome:** A reusable function `generateJsonString(data: object[])` that produces a valid JSON string.
    **Objectives:**
      * Objective 1: Function signature is correctly defined.
      * Objective 2: Correctly stringifies the input array of objects.
      * Objective 3: Optionally allows for pretty-printing (indentation).
    **Implementation Prompt:** Create a TypeScript function `generateJsonString` that takes an array of objects (`data`). The function should return a JSON string representation of the data. Include an optional parameter for indentation level to support pretty-printing.
    **Example Code:**
    ```typescript
    function generateJsonString(data: Record<string, any>[], indent?: number): string {
      return JSON.stringify(data, null, indent);
    }
    ```

  - **Sub-Task ID:** T-106.5
    **Goal:** Combine JSON generation and download logic.
    **Task:** Create a higher-level function that orchestrates the JSON string generation and subsequent file download.
    **Rationale:** This provides a single entry point for users to export data as a JSON file, encapsulating the JSON generation and download steps.
    **Expected Outcome:** A function `exportToJson(data: object[], filename: string, prettyPrint?: boolean)` that generates and downloads a JSON file.
    **Objectives:**
      * Objective 1: Function signature is correctly defined.
      * Objective 2: Determines the indentation level based on the `prettyPrint` flag.
      * Objective 3: Calls `generateJsonString` with the provided data and indentation level.
      * Objective 4: Calls `downloadFile` with the generated JSON string, filename, and correct MIME type ('application/json').
    **Implementation Prompt:** Create a TypeScript function `exportToJson` that accepts `data` (array of objects), `filename` (string), and an optional `prettyPrint` boolean. This function should internally call `generateJsonString` (using `JSON.stringify` with appropriate indentation if `prettyPrint` is true) and then `downloadFile` to create and download the JSON file.
    **Example Code:**
    ```typescript
    // Assuming generateJsonString and downloadFile are defined elsewhere
    function exportToJson(data: Record<string, any>[], filename: string, prettyPrint: boolean = false): void {
      const indent = prettyPrint ? 2 : undefined; // Use 2 spaces for pretty printing
      const jsonContent = generateJsonString(data, indent);
      downloadFile(jsonContent, `${filename}.json`, 'application/json;charset=utf-8;');
    }
    ```

  - **Sub-Task ID:** T-106.6
    **Goal:** Add unit tests for CSV export utilities.
    **Task:** Write unit tests for the `generateCsvString` and `exportToCsv` functions.
    **Rationale:** Ensures the CSV export functionality works correctly under various conditions and prevents regressions.
    **Expected Outcome:** A suite of unit tests covering edge cases for CSV generation and the combined export function.
    **Objectives:**
      * Objective 1: Test `generateCsvString` with empty data.
      * Objective 2: Test `generateCsvString` with simple data.
      * Objective 3: Test `generateCsvString` with data containing commas, quotes, and newlines.
      * Objective 4: Test `generateCsvString` with missing values.
      * Objective 5: Test `exportToCsv` to ensure it calls `generateCsvString` and `downloadFile` correctly (mocking `downloadFile`).
    **Implementation Prompt:** Write unit tests using a framework like Jest for the `generateCsvString` and `exportToCsv` functions. Mock the `downloadFile` function to verify it's called with the correct arguments. Cover various data scenarios including empty arrays, special characters, and missing fields.
    **Example Code:**
    ```javascript
    // Example using Jest
    describe('CSV Export Utilities', () => {
      // ... tests for generateCsvString ...

      it('exportToCsv should call downloadFile with correct arguments', () => {
        const mockDownloadFile = jest.fn();
        // Temporarily replace the global downloadFile or import it differently for mocking
        // global.downloadFile = mockDownloadFile;

        const data = [{ id: 1, name: 'Test' }];
        const columns = ['id', 'name'];
        exportToCsv(data, columns, 'test-export');

        expect(mockDownloadFile).toHaveBeenCalledWith(expect.any(String), 'test-export.csv', 'text/csv;charset=utf-8;');
        // Further assertions on the content passed to downloadFile if needed
      });
    });
    ```

  - **Sub-Task ID:** T-106.7
    **Goal:** Add unit tests for JSON export utilities.
    **Task:** Write unit tests for the `generateJsonString` and `exportToJson` functions.
    **Rationale:** Ensures the JSON export functionality works correctly under various conditions and prevents regressions.
    **Expected Outcome:** A suite of unit tests covering edge cases for JSON generation and the combined export function.
    **Objectives:**
      * Objective 1: Test `generateJsonString` with empty data.
      * Objective 2: Test `generateJsonString` with simple data.
      * Objective 3: Test `generateJsonString` with nested objects/arrays (if applicable to expected data structure).
      * Objective 4: Test `generateJsonString` with pretty-printing enabled.
      * Objective 5: Test `exportToJson` to ensure it calls `generateJsonString` and `downloadFile` correctly (mocking `downloadFile`).
    **Implementation Prompt:** Write unit tests using a framework like Jest for the `generateJsonString` and `exportToJson` functions. Mock the `downloadFile` function to verify it's called with the correct arguments. Cover various data scenarios including empty arrays and pretty-printing options.
    **Example Code:**
    ```javascript
    // Example using Jest
    describe('JSON Export Utilities', () => {
      // ... tests for generateJsonString ...

      it('exportToJson should call downloadFile with correct arguments', () => {
        const mockDownloadFile = jest.fn();
        // Temporarily replace the global downloadFile or import it differently for mocking
        // global.downloadFile = mockDownloadFile;

        const data = [{ id: 1, value: 'abc' }];
        exportToJson(data, 'test-export', true);

        expect(mockDownloadFile).toHaveBeenCalledWith(expect.any(String), 'test-export.json', 'application/json;charset=utf-8;');
        // Further assertions on the content passed to downloadFile if needed, e.g., checking indentation
      });
    });
    ```
- **ID:** T-107
  **Title:** Set Up Deployment Pipeline
  *(Description):* Configure the CI/CD pipeline for automated builds and deployments (e.g., Vercel, Netlify).
  *(User Story):* N/A
  *(Priority):* High
  *(Dependencies):* T-101
  *(Est. Effort):* Medium

## Phase: Tool Development

### Epic: Encoding Doctor
  - **Sub-Task ID:** T-107.1
    **Goal:** Initialize a new GitHub Actions workflow file.
    **Task:** Create a `.github/workflows/ci.yml` file in the root of the repository.
    **Rationale:** This file will serve as the entry point for defining the CI/CD pipeline using GitHub Actions.
    **Expected Outcome:** A new YAML file exists at the specified path.
    **Objectives:**
      * The file `.github/workflows/ci.yml` is created.
      * The file is empty or contains basic YAML structure.
    **Implementation Prompt:** Create a new YAML file named `ci.yml` inside the `.github/workflows` directory at the root of the project.
    **Example Code:**
    ```yaml
    # .github/workflows/ci.yml
    name: CI/CD Pipeline
    ```

  - **Sub-Task ID:** T-107.2
    **Goal:** Define the trigger for the CI/CD pipeline.
    **Task:** Configure the `on` event in the `ci.yml` workflow to trigger on pushes to the `main` branch and on pull requests targeting `main`.
    **Rationale:** This ensures that the pipeline runs automatically whenever code is merged or proposed for merging into the main production branch.
    **Expected Outcome:** The workflow is configured to run on relevant Git events.
    **Objectives:**
      * The `on` section is added to the workflow file.
      * The workflow is set to trigger on `push` events to `main`.
      * The workflow is set to trigger on `pull_request` events targeting `main`.
    **Implementation Prompt:** Add the `on` section to the `ci.yml` file to trigger the workflow on pushes and pull requests to the `main` branch.
    **Example Code:**
    ```yaml
    # .github/workflows/ci.yml
    name: CI/CD Pipeline

    on:
      push:
        branches: [ main ]
      pull_request:
        branches: [ main ]
    ```

  - **Sub-Task ID:** T-107.3
    **Goal:** Define the build environment and steps.
    **Task:** Add a `jobs` section to the `ci.yml` file, defining a `build` job that uses a Node.js environment and checks out the code.
    **Rationale:** This sets up the foundational environment where subsequent build and test steps will execute.
    **Expected Outcome:** A `build` job is defined within the workflow, capable of checking out the repository's code.
    **Objectives:**
      * A `jobs` section is present in the workflow file.
      * A job named `build` is defined.
      * The `build` job specifies a runner environment (e.g., `ubuntu-latest`).
      * The `build` job includes a step to check out the repository code.
    **Implementation Prompt:** Add a `jobs` section to `ci.yml`. Define a job named `build` that runs on `ubuntu-latest`. Include a step to checkout the repository using the `actions/checkout@v3` action.
    **Example Code:**
    ```yaml
    # .github/workflows/ci.yml
    name: CI/CD Pipeline

    on:
      push:
        branches: [ main ]
      pull_request:
        branches: [ main ]

    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v3
    ```

  - **Sub-Task ID:** T-107.4
    **Goal:** Set up the Node.js environment for the build job.
    **Task:** Add a step to the `build` job to set up the required Node.js version (e.g., Node 18.x).
    **Rationale:** The application is built using Node.js, so the correct runtime environment must be available during the CI process.
    **Expected Outcome:** The build job environment has the specified Node.js version installed and configured.
    **Objectives:**
      * A step using `actions/setup-node@v3` is added to the `build` job.
      * The Node.js version is specified (e.g., `18.x`).
    **Implementation Prompt:** Add a step to the `build` job in `ci.yml` to set up Node.js version 18.x using `actions/setup-node@v3`.
    **Example Code:**
    ```yaml
    # .github/workflows/ci.yml
    # ... previous sections ...
        steps:
          - uses: actions/checkout@v3
          - name: Set up Node.js
            uses: actions/setup-node@v3
            with:
              node-version: '18.x'
    ```

  - **Sub-Task ID:** T-107.5
    **Goal:** Install project dependencies.
    **Task:** Add a step to the `build` job to install project dependencies using `npm ci`.
    **Rationale:** Before building or testing, all necessary packages must be installed reliably. `npm ci` is preferred in CI environments for faster, more deterministic installs.
    **Expected Outcome:** Project dependencies are installed in the build environment.
    **Objectives:**
      * A step to run `npm ci` is added to the `build` job.
      * The command is executed after Node.js setup.
    **Implementation Prompt:** Add a step to the `build` job in `ci.yml` to install dependencies using `npm ci`.
    **Example Code:**
    ```yaml
    # .github/workflows/ci.yml
    # ... previous sections ...
        steps:
          - uses: actions/checkout@v3
          - name: Set up Node.js
            uses: actions/setup-node@v3
            with:
              node-version: '18.x'
          - name: Install dependencies
            run: npm ci
    ```

  - **Sub-Task ID:** T-107.6
    **Goal:** Run project build command.
    **Task:** Add a step to the `build` job to execute the project's build script (e.g., `npm run build`).
    **Rationale:** This step compiles the application code, generates static assets, and prepares it for deployment.
    **Expected Outcome:** The application's build process completes successfully.
    **Objectives:**
      * A step to run `npm run build` is added to the `build` job.
      * This step runs after dependency installation.
    **Implementation Prompt:** Add a step to the `build` job in `ci.yml` to execute the `npm run build` command.
    **Example Code:**
    ```yaml
    # .github/workflows/ci.yml
    # ... previous sections ...
          - name: Install dependencies
            run: npm ci
          - name: Build project
            run: npm run build
    ```

  - **Sub-Task ID:** T-107.7
    **Goal:** Run project tests.
    **Task:** Add a step to the `build` job to execute the project's test suite (e.g., `npm test`).
    **Rationale:** Ensures that code changes do not introduce regressions and meet quality standards before proceeding to deployment.
    **Expected Outcome:** The project's test suite runs and all tests pass.
    **Objectives:**
      * A step to run `npm test` is added to the `build` job.
      * This step runs after the build process.
    **Implementation Prompt:** Add a step to the `build` job in `ci.yml` to execute the `npm test` command.
    **Example Code:**
    ```yaml
    # .github/workflows/ci.yml
    # ... previous sections ...
          - name: Build project
            run: npm run build
          - name: Run tests
            run: npm test
    ```

  - **Sub-Task ID:** T-107.8
    **Goal:** Configure deployment to Vercel.
    **Task:** Add a deployment job to the `ci.yml` workflow that uses the Vercel action to deploy the `main` branch.
    **Rationale:** Automates the deployment process to Vercel upon successful builds and tests on the main branch.
    **Expected Outcome:** A new job is defined that handles deployment to Vercel.
    **Objectives:**
      * A new job named `deploy` is defined in the workflow.
      * The `deploy` job depends on the `build` job completing successfully (`needs: build`).
      * The `deploy` job is configured to run only on pushes to the `main` branch.
      * The `deploy` job uses the `vercel-action/setup-vercel@v1` action.
      * Environment variables for Vercel token and project are configured.
    **Implementation Prompt:** Add a `deploy` job to `ci.yml`. This job should run on `ubuntu-latest`, depend on the `build` job, and only trigger for pushes to `main`. Use `vercel-action/setup-vercel@v1` and configure necessary environment variables like `VERCEL_TOKEN` and `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
    **Example Code:**
    ```yaml
    # .github/workflows/ci.yml
    # ... previous sections ...
      deploy:
        runs-on: ubuntu-latest
        needs: build
        if: github.ref == 'refs/heads/main'
        steps:
          - name: Checkout code
            uses: actions/checkout@v3
          - name: Install Vercel CLI
            run: npm install --global vercel@latest
          - name: Deploy to Vercel
            run: vercel --token ${{ secrets.VERCEL_TOKEN }}
            env:
              VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
              VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
    ```

  - **Sub-Task ID:** T-107.9
    **Goal:** Configure Vercel environment variables in GitHub.
    **Task:** Add instructions or a note on how to add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as GitHub secrets.
    **Rationale:** The deployment job requires sensitive credentials to authenticate with Vercel, which must be securely stored in GitHub repository secrets.
    **Expected Outcome:** Clear guidance is available for setting up the necessary secrets in the GitHub repository settings.
    **Objectives:**
      * A comment or documentation section is added to the workflow file explaining the required secrets.
      * The specific secret names (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) are listed.
    **Implementation Prompt:** Add comments to the `ci.yml` file explaining that `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` need to be configured as GitHub repository secrets.
    **Example Code:**
    ```yaml
    # .github/workflows/ci.yml
    # ... deploy job ...
            env:
              VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
              VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
    # IMPORTANT: Ensure the following secrets are configured in your GitHub repository settings:
    # - VERCEL_TOKEN: Your Vercel API token.
    # - VERCEL_ORG_ID: Your Vercel organization ID.
    # - VERCEL_PROJECT_ID: Your Vercel project ID.
    ```

  - **Sub-Task ID:** T-107.10
    **Goal:** Add deployment step for preview branches (optional but recommended).
    **Task:** Add a separate job or modify the existing deploy job to handle deployments for pull requests or feature branches, creating preview deployments on Vercel.
    **Rationale:** Preview deployments allow developers to easily review changes from feature branches before merging them into `main`.
    **Expected Outcome:** The pipeline is capable of creating preview deployments for non-main branches.
    **Objectives:**
      * A new job or conditional logic is added to deploy preview builds.
      * This job/logic triggers on `pull_request` events.
      * It uses the Vercel CLI to create a preview deployment.
    **Implementation Prompt:** Add a new job named `preview` to `ci.yml`. This job should run on `ubuntu-latest`, depend on `build`, and trigger on `pull_request` events. Use the Vercel CLI to create a preview deployment, ensuring the correct environment variables are passed.
    **Example Code:**
    ```yaml
    # .github/workflows/ci.yml
    # ... other jobs ...
      preview:
        runs-on: ubuntu-latest
        needs: build
        if: github.event_name == 'pull_request'
        steps:
          - name: Checkout code
            uses: actions/checkout@v3
          - name: Install Vercel CLI
            run: npm install --global vercel@latest
          - name: Deploy Preview
            run: vercel --token ${{ secrets.VERCEL_TOKEN }} --preview
            env:
              VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
              VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
    ```
- **ID:** T-201
  **Title:** Implement Encoding Doctor UI and Logic
  *(Description):* Develop the user interface for inputting text, detecting encoding issues, and applying fixes. Implement the core fixing logic.
  *(User Story):* As an SEO professional, I want to fix broken encoding in text files so that special characters display correctly.
  *(Priority):* High
  *(Dependencies):* T-101, T-102, T-103
  *(Est. Effort):* Large
  - **Sub-Task ID:** T-201.1
    **Goal:** Set up the basic React component structure for the Encoding Doctor tool.
    **Task:** Create a new React functional component named `EncodingDoctor` and set up its initial file structure (e.g., `EncodingDoctor.jsx`, `EncodingDoctor.module.css`, `EncodingDoctor.test.js`).
    **Rationale:** Establishes the foundational component for the entire Encoding Doctor feature, allowing for subsequent UI and logic development.
    **Expected Outcome:** A new React component file with basic structure and associated CSS/test files.
    **Objectives:**
      * A new `EncodingDoctor.jsx` file is created.
      * A corresponding `EncodingDoctor.module.css` file is created.
      * A corresponding `EncodingDoctor.test.js` file is created.
    **Implementation Prompt:** Create a basic React functional component named `EncodingDoctor`. Include a placeholder `div` in the JSX. Also, create an empty CSS module file and an empty Jest test file for this component.
    **Example Code:**
    ```jsx
    // EncodingDoctor.jsx
    import React from 'react';
    import styles from './EncodingDoctor.module.css';

    const EncodingDoctor = () => {
      return (
        <div className={styles.container}>
          <h1>Encoding Doctor</h1>
          {/* UI elements will go here */}
        </div>
      );
    };

    export default EncodingDoctor;
    ```
    ```css
    /* EncodingDoctor.module.css */
    .container {
      padding: 20px;
    }
    ```
    ```javascript
    // EncodingDoctor.test.js
    import React from 'react';
    import { render, screen } from '@testing-library/react';
    import EncodingDoctor from './EncodingDoctor';

    test('renders EncodingDoctor component', () => {
      render(<EncodingDoctor />);
      expect(screen.getByText(/Encoding Doctor/i)).toBeInTheDocument();
    });
    ```

  - **Sub-Task ID:** T-201.2
    **Goal:** Create the input area for the Encoding Doctor.
    **Task:** Add a `textarea` element within the `EncodingDoctor` component to allow users to paste or type text. Include a label for clarity.
    **Rationale:** Provides the primary mechanism for users to input the text they want to analyze and fix.
    **Expected Outcome:** A `textarea` element is visible in the UI, ready to accept user input.
    **Objectives:**
      * A `label` element is added for the text input.
      * A `textarea` element is added and associated with the label.
      * Basic styling is applied to the textarea via CSS modules.
    **Implementation Prompt:** Within the `EncodingDoctor.jsx` component, add a `label` with the text "Input Text:" and a `textarea` element. Use state management (e.g., `useState`) to handle the textarea's value. Add a CSS class `inputTextarea` to the textarea for styling.
    **Example Code:**
    ```jsx
    // Inside EncodingDoctor.jsx
    import React, { useState } from 'react';
    import styles from './EncodingDoctor.module.css';

    // ... component definition
    const [inputText, setInputText] = useState('');

    return (
      <div className={styles.container}>
        <h1>Encoding Doctor</h1>
        <label htmlFor="encodingInput" className={styles.inputLabel}>Input Text:</label>
        <textarea
          id="encodingInput"
          className={styles.inputTextarea}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste or type your text here..."
          rows="10"
        />
        {/* Other elements */}
      </div>
    );
    // ...
    ```
    ```css
    /* EncodingDoctor.module.css */
    .inputLabel {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    .inputTextarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-sizing: border-box; /* Include padding and border in the element's total width and height */
      margin-bottom: 15px;
    }
    ```

  - **Sub-Task ID:** T-201.3
    **Goal:** Implement the "Detect Encoding Issues" button and its associated logic.
    **Task:** Add a button that, when clicked, triggers the encoding detection process using the input text. Display a status message or indicator.
    **Rationale:** Allows the user to initiate the analysis of their input text for encoding problems.
    **Expected Outcome:** A button is present, and clicking it initiates a (currently simulated) detection process, updating a status indicator.
    **Objectives:**
      * A "Detect Encoding Issues" button is rendered.
      * Clicking the button calls a handler function.
      * The handler function updates a state variable to indicate detection is in progress or completed.
      * A visual indicator (e.g., text message) reflects the detection status.
    **Implementation Prompt:** Add a button with the text "Detect Encoding Issues". Create a state variable `detectionStatus` (e.g., 'idle', 'detecting', 'detected'). Implement an `handleDetectEncoding` function that sets `detectionStatus` to 'detecting', simulates a delay (e.g., using `setTimeout`), and then sets it to 'detected'. Display the current `detectionStatus`.
    **Example Code:**
    ```jsx
    // Inside EncodingDoctor.jsx
    import React, { useState } from 'react';
    import styles from './EncodingDoctor.module.css';

    // ... component definition
    const [detectionStatus, setDetectionStatus] = useState('idle');

    const handleDetectEncoding = () => {
      setDetectionStatus('detecting');
      // Simulate API call or processing
      setTimeout(() => {
        setDetectionStatus('detected');
        // In a real scenario, this would trigger the actual detection logic
      }, 1500);
    };

    return (
      <div className={styles.container}>
        {/* ... textarea ... */}
        <button onClick={handleDetectEncoding} className={styles.detectButton}>
          Detect Encoding Issues
        </button>
        <p>Status: {detectionStatus}</p>
        {/* Other elements */}
      </div>
    );
    // ...
    ```
    ```css
    /* EncodingDoctor.module.css */
    .detectButton {
      padding: 10px 15px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
    }
    .detectButton:hover {
      background-color: #0056b3;
    }
    ```

  - **Sub-Task ID:** T-201.4
    **Goal:** Implement the display area for detected encoding issues.
    **Task:** Create a section in the UI to show the results of the encoding detection, such as the detected encoding and any problematic characters or sequences.
    **Rationale:** Provides feedback to the user about the specific encoding problems found in their input text.
    **Expected Outcome:** A designated area in the UI appears (conditionally, perhaps) after detection, displaying details about the encoding issues.
    **Objectives:**
      * A state variable `encodingIssues` (e.g., an array or object) is introduced to store detection results.
      * This state is updated after the detection process completes.
      * A UI section is conditionally rendered based on `detectionStatus` and the presence of `encodingIssues`.
      * The UI section displays relevant information from `encodingIssues`.
    **Implementation Prompt:** Add a state variable `encodingIssues` initialized to `null`. Modify `handleDetectEncoding` to populate this state with mock data after detection. Conditionally render a `div` with the class `issuesDisplay` only when `detectionStatus` is 'detected' and `encodingIssues` is not null. Inside this div, display mock issue details (e.g., "Detected Encoding: UTF-8", "Problematic Chars: [, ]").
    **Example Code:**
    ```jsx
    // Inside EncodingDoctor.jsx
    import React, { useState } from 'react';
    import styles from './EncodingDoctor.module.css';

    // ... component definition
    const [encodingIssues, setEncodingIssues] = useState(null);

    const handleDetectEncoding = () => {
      setDetectionStatus('detecting');
      setTimeout(() => {
        // Mock detection results
        const mockIssues = {
          detectedEncoding: 'UTF-8',
          problematicChars: ['', '™'],
          suggestions: ['Consider converting to UTF-8']
        };
        setEncodingIssues(mockIssues);
        setDetectionStatus('detected');
      }, 1500);
    };

    return (
      <div className={styles.container}>
        {/* ... textarea and button ... */}
        {detectionStatus === 'detected' && encodingIssues && (
          <div className={styles.issuesDisplay}>
            <h3>Detected Issues:</h3>
            <p><strong>Encoding:</strong> {encodingIssues.detectedEncoding}</p>
            <p><strong>Problematic Characters:</strong> {encodingIssues.problematicChars.join(', ')}</p>
            {/* Display suggestions if any */}
            {encodingIssues.suggestions && encodingIssues.suggestions.length > 0 && (
              <div>
                <strong>Suggestions:</strong>
                <ul>
                  {encodingIssues.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
        {/* ... status message ... */}
      </div>
    );
    // ...
    ```
    ```css
    /* EncodingDoctor.module.css */
    .issuesDisplay {
      margin-top: 20px;
      padding: 15px;
      border: 1px solid #ffc107;
      background-color: #fff3cd;
      border-radius: 4px;
    }
    .issuesDisplay h3 {
      margin-top: 0;
      color: #856404;
    }
    ```

  - **Sub-Task ID:** T-201.5
    **Goal:** Implement the "Fix Encoding" button and its logic.
    **Task:** Add a button that, when clicked, applies the necessary fixes to the input text based on the detected issues. Update the UI to show the fixed text.
    **Rationale:** Provides the core functionality for the user to resolve encoding problems.
    **Expected Outcome:** A "Fix Encoding" button is present, and clicking it triggers a fixing process, updating the display with the corrected text.
    **Objectives:**
      * A "Fix Encoding" button is rendered, possibly enabled only after detection.
      * Clicking the button calls a handler function `handleFixEncoding`.
      * `handleFixEncoding` uses the `inputText` and potentially `encodingIssues` to perform the fix.
      * A new state variable `fixedText` is introduced and updated with the result.
      * The `fixedText` is displayed in the UI.
    **Implementation Prompt:** Add a "Fix Encoding" button. Create a state variable `fixedText` initialized to `''`. Implement `handleFixEncoding`. This function should take `inputText`, simulate a fixing process (e.g., replacing specific characters), and update `fixedText`. Display `fixedText` in a new section, perhaps conditionally shown after fixing. Ensure the button is disabled if `inputText` is empty or `detectionStatus` is not 'detected'.
    **Example Code:**
    ```jsx
    // Inside EncodingDoctor.jsx
    import React, { useState } from 'react';
    import styles from './EncodingDoctor.module.css';

    // ... component definition
    const [fixedText, setFixedText] = useState('');

    const handleFixEncoding = () => {
      // Basic mock fixing logic: replace specific problematic characters
      let tempText = inputText;
      if (encodingIssues && encodingIssues.problematicChars) {
        encodingIssues.problematicChars.forEach(char => {
          // Example: replace '' with a placeholder or known correct char
          tempText = tempText.replace(new RegExp(char.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), ''); // Basic replacement, needs refinement
        });
      }
      // More sophisticated fixing logic would go here, potentially using external libraries
      setFixedText(tempText);
    };

    return (
      <div className={styles.container}>
        {/* ... textarea, detect button, issues display ... */}
        {detectionStatus === 'detected' && (
          <button
            onClick={handleFixEncoding}
            className={styles.fixButton}
            disabled={!inputText || !encodingIssues}
          >
            Fix Encoding
          </button>
        )}

        {fixedText && (
          <div className={styles.fixedTextDisplay}>
            <h3>Fixed Text:</h3>
            <textarea readOnly value={fixedText} rows="10" className={styles.outputTextarea}></textarea>
          </div>
        )}
      </div>
    );
    // ...
    ```
    ```css
    /* EncodingDoctor.module.css */
    .fixButton {
      padding: 10px 15px;
      background-color: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .fixButton:hover:not(:disabled) {
      background-color: #218838;
    }
    .fixButton:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    .fixedTextDisplay {
      margin-top: 20px;
    }
    .outputTextarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: #f8f9fa;
      box-sizing: border-box;
    }
    ```

  - **Sub-Task ID:** T-201.6
    **Goal:** Integrate actual encoding detection logic (placeholder).
    **Task:** Replace the mock detection logic with a call to a backend API or a client-side library function that performs actual encoding detection.
    **Rationale:** Moves from simulated functionality to real-world data processing, fulfilling the core purpose of the tool.
    **Expected Outcome:** The `handleDetectEncoding` function now calls a real detection mechanism, and `encodingIssues` state is populated with actual results.
    **Objectives:**
      * Identify and integrate a suitable encoding detection library or API endpoint.
      * Update `handleDetectEncoding` to make an asynchronous call to this detection mechanism.
      * Handle potential errors during detection.
      * Ensure the response from the detection mechanism correctly populates the `encodingIssues` state.
    **Implementation Prompt:** Assume an API endpoint `POST /api/detect-encoding` exists that accepts text and returns `{ detectedEncoding: string, problematicChars: string[] }`. Modify `handleDetectEncoding` to use `fetch` to call this endpoint. Update `detectionStatus` based on the API response or errors. Handle the case where the API call fails.
    **Example Code:**
    ```javascript
    // Inside handleDetectEncoding function in EncodingDoctor.jsx
    const handleDetectEncoding = async () => {
      setDetectionStatus('detecting');
      setEncodingIssues(null); // Clear previous issues
      try {
        const response = await fetch('/api/detect-encoding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: inputText }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // Assuming data structure matches { detectedEncoding: string, problematicChars: string[] }
        setEncodingIssues(data);
        setDetectionStatus('detected');

      } catch (error) {
        console.error("Encoding detection failed:", error);
        setDetectionStatus('error');
        // Optionally set specific error message state
      }
    };
    ```

  - **Sub-Task ID:** T-201.7
    **Goal:** Integrate actual encoding fixing logic (placeholder).
    **Task:** Replace the mock fixing logic with a call to a backend API or a client-side library function that performs actual encoding correction.
    **Rationale:** Implements the core transformation functionality required by the user story.
    **Expected Outcome:** The `handleFixEncoding` function now applies real encoding fixes, and `fixedText` state is populated with the corrected output.
    **Objectives:**
      * Identify and integrate a suitable encoding fixing library or API endpoint.
      * Update `handleFixEncoding` to make an asynchronous call to this fixing mechanism, passing necessary context (input text, detected issues).
      * Handle potential errors during fixing.
      * Ensure the response from the fixing mechanism correctly populates the `fixedText` state.
    **Implementation Prompt:** Assume an API endpoint `POST /api/fix-encoding` exists that accepts text and detected issues, returning `{ fixedText: string }`. Modify `handleFixEncoding` to use `fetch` to call this endpoint, sending `inputText` and `encodingIssues`. Update `fixedText` state with the result. Handle API errors.
    **Example Code:**
    ```javascript
    // Inside handleFixEncoding function in EncodingDoctor.jsx
    const handleFixEncoding = async () => {
      // Optionally update status to 'fixing'
      try {
        const response = await fetch('/api/fix-encoding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: inputText,
            issues: encodingIssues // Pass detected issues for context
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // Assuming data structure matches { fixedText: string }
        setFixedText(data.fixedText);
        // Optionally update status to 'fixed'

      } catch (error) {
        console.error("Encoding fixing failed:", error);
        // Optionally set specific error message state
      }
    };
    ```

  - **Sub-Task ID:** T-201.8
    **Goal:** Add unit tests for the `EncodingDoctor` component.
    **Task:** Write Jest unit tests to cover the core functionality of the `EncodingDoctor` component, including state changes and button interactions.
    **Rationale:** Ensures the component behaves as expected and provides a safety net for future modifications.
    **Expected Outcome:** A comprehensive suite of unit tests for the `EncodingDoctor` component passes.
    **Objectives:**
      * Test that the component renders correctly initially.
      * Test that typing into the `textarea` updates the `inputText` state.
      * Test that clicking the "Detect Encoding Issues" button triggers the detection logic (mocked or actual).
      * Test that the status messages update correctly.
      * Test that the "Fix Encoding" button is enabled/disabled appropriately.
      * Test that clicking "Fix Encoding" triggers the fixing logic and updates `fixedText`.
    **Implementation Prompt:** Using `@testing-library/react`, write tests for the `EncodingDoctor` component. Mock the `fetch` calls for the API endpoints. Simulate user interactions like typing and button clicks. Assert that state updates and UI changes occur as expected.
    **Example Code:**
    ```javascript
    // EncodingDoctor.test.js
    import React from 'react';
    import { render, screen, fireEvent, waitFor } from '@testing-library/react';
    import EncodingDoctor from './EncodingDoctor';

    // Mock the fetch API
    global.fetch = jest.fn();

    beforeEach(() => {
      fetch.mockClear();
      // Reset mocks before each test if needed
    });

    test('renders and allows text input', () => {
      render(<EncodingDoctor />);
      const textarea = screen.getByPlaceholderText(/Paste or type your text here.../i);
      fireEvent.change(textarea, { target: { value: 'Test text' } });
      expect(textarea.value).toBe('Test text');
    });

    test('handles encoding detection click', async () => {
      // Mock fetch response for detection
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ detectedEncoding: 'UTF-8', problematicChars: [''] }),
      });

      render(<EncodingDoctor />);
      const textarea = screen.getByPlaceholderText(/Paste or type your text here.../i);
      fireEvent.change(textarea, { target: { value: 'Test text ' } });

      const detectButton = screen.getByRole('button', { name: /Detect Encoding Issues/i });
      fireEvent.click(detectButton);

      expect(screen.getByText('Status: detecting')).toBeInTheDocument();
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/detect-encoding'), expect.any(Object));

      // Wait for the status to update after mock resolution
      await waitFor(() => expect(screen.getByText('Status: detected')).toBeInTheDocument());
      expect(screen.getByText('Detected Issues:')).toBeInTheDocument();
      expect(screen.getByText('Encoding: UTF-8')).toBeInTheDocument();
    });

    // Add more tests for fixing logic, error handling, etc.
    ```
- **ID:** T-202
  **Title:** Add Encoding Doctor Export Functionality
  *(Description):* Integrate CSV export for the Encoding Doctor tool, including original and fixed text.
  *(User Story):* As an SEO professional, I want to fix broken encoding in text files so that special characters display correctly.
  *(Priority):* Medium
  *(Dependencies):* T-201, T-106
  *(Est. Effort):* Small

### Epic: Keyword Density Analyzer
  - **Sub-Task ID:** T-202.1
    **Goal:** Define the data structure for the CSV export.
    **Task:** Create a clear definition for the columns and their expected data types in the CSV file that will be generated by the Encoding Doctor.
    **Rationale:** A well-defined data structure ensures consistency and clarity for both the export logic and the consumer of the CSV file.
    **Expected Outcome:** A documented data structure (e.g., in a README or a schema definition) specifying columns like 'Original Text', 'Fixed Text', and any relevant metadata.
    **Objectives:**
      * Identify all necessary columns for the export.
      * Define the data type for each column.
      * Specify the order of columns.
    **Implementation Prompt:** Document the CSV export schema. Define columns such as 'original_text' and 'fixed_text', specifying their data types and expected content.
    **Example Code:**
    ```json
    {
      "columns": [
        {"name": "original_text", "type": "string"},
        {"name": "fixed_text", "type": "string"}
      ],
      "column_order": ["original_text", "fixed_text"]
    }
    ```
  - **Sub-Task ID:** T-202.2
    **Goal:** Implement the CSV generation logic.
    **Task:** Write the backend function that takes the processed text data (original and fixed) and formats it into a CSV string.
    **Rationale:** This is the core logic for transforming the tool's output into the desired export format.
    **Expected Outcome:** A reusable function that accepts a list of text pairs and returns a CSV-formatted string.
    **Objectives:**
      * Create a function that accepts an array of objects, each containing original and fixed text.
      * Implement CSV escaping for special characters within text fields (e.g., commas, quotes, newlines).
      * Ensure the function returns a string representing the complete CSV content, including headers.
    **Implementation Prompt:** Implement a Python function `generate_encoding_doctor_csv(data)` that takes a list of dictionaries (each with 'original_text' and 'fixed_text' keys) and returns a CSV-formatted string. Use the `csv` module for proper escaping.
    **Example Code:**
    ```python
    import csv
    from io import StringIO

    def generate_encoding_doctor_csv(data):
        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=['original_text', 'fixed_text'])
        writer.writeheader()
        writer.writerows(data)
        return output.getvalue()
    ```
  - **Sub-Task ID:** T-202.3
    **Goal:** Create an API endpoint to trigger CSV export.
    **Task:** Develop a new backend API endpoint that, when called, will gather the necessary data and return the generated CSV file.
    **Rationale:** This endpoint provides the interface for the frontend or other services to request the export functionality.
    **Expected Outcome:** A functional API endpoint (e.g., `/api/encoding-doctor/export/csv`) that returns a CSV file download.
    **Objectives:**
      * Define the HTTP method and URL for the endpoint.
      * Implement logic to retrieve the latest processed data relevant for export.
      * Call the CSV generation function (T-202.2).
      * Set appropriate HTTP headers for file download (e.g., `Content-Type`, `Content-Disposition`).
      * Return the CSV content as the response body.
    **Implementation Prompt:** Create a Flask/Django API endpoint (e.g., POST `/api/encoding-doctor/export/csv`) that retrieves data processed by the Encoding Doctor (assuming a function `get_processed_data()` exists) and returns it as a CSV file download. Use the `generate_encoding_doctor_csv` function.
    **Example Code:**
    ```python
    from flask import Flask, Response, jsonify
    # Assume generate_encoding_doctor_csv and get_processed_data are defined elsewhere

    app = Flask(__name__)

    @app.route('/api/encoding-doctor/export/csv', methods=['POST'])
    def export_csv():
        processed_data = get_processed_data() # Placeholder for actual data retrieval
        csv_content = generate_encoding_doctor_csv(processed_data)
        return Response(
            csv_content,
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=encoding_doctor_export.csv"}
        )
    ```
  - **Sub-Task ID:** T-202.4
    **Goal:** Add a UI button to trigger the CSV export.
    **Task:** Integrate a new button into the Encoding Doctor's user interface that, when clicked, initiates the CSV export process via the API.
    **Rationale:** Provides a user-friendly way to access the new export functionality.
    **Expected Outcome:** A visible button on the Encoding Doctor page that, upon clicking, prompts the user to download a CSV file.
    **Objectives:**
      * Add a new button element to the relevant UI component.
      * Implement an event handler for the button's click event.
      * In the click handler, make a request to the export API endpoint (T-202.3).
      * Handle the response to trigger the file download.
    **Implementation Prompt:** Add a "Download CSV" button to the Encoding Doctor React component. On click, trigger a POST request to `/api/encoding-doctor/export/csv` and handle the file download response.
    **Example Code:**
    ```jsx
    import React from 'react';
    import axios from 'axios';

    function EncodingDoctorUI() {
      const handleExportClick = async () => {
        try {
          const response = await axios.post('/api/encoding-doctor/export/csv', {}, {
            responseType: 'blob', // Important for file downloads
          });
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'encoding_doctor_export.csv');
          document.body.appendChild(link);
          link.click();
          link.remove();
        } catch (error) {
          console.error("Export failed:", error);
          // Handle error display to user
        }
      };

      return (
        <div>
          {/* ... other Encoding Doctor UI elements ... */}
          <button onClick={handleExportClick}>Download CSV Export</button>
        </div>
      );
    }

    export default EncodingDoctorUI;
    ```
  - **Sub-Task ID:** T-202.5
    **Goal:** Write unit tests for the CSV generation logic.
    **Task:** Create comprehensive unit tests for the `generate_encoding_doctor_csv` function to ensure it correctly formats data and handles edge cases.
    **Rationale:** Verifies the correctness and robustness of the core CSV export logic independently.
    **Expected Outcome:** A suite of unit tests that pass, covering various data inputs and scenarios for the CSV generation function.
    **Objectives:**
      * Test with empty data.
      * Test with a single row of data.
      * Test with multiple rows of data.
      * Test data containing commas, quotes, and newlines to ensure proper escaping.
      * Verify the header row is correctly generated.
    **Implementation Prompt:** Write Python unit tests for the `generate_encoding_doctor_csv` function using the `unittest` framework. Include test cases for empty input, single/multiple records, and data requiring CSV escaping.
    **Example Code:**
    ```python
    import unittest
    # Assume generate_encoding_doctor_csv is imported from your_module

    class TestCsvExport(unittest.TestCase):
        def test_empty_data(self):
            self.assertEqual(generate_encoding_doctor_csv([]), "original_text,fixed_text\r\n")

        def test_single_record(self):
            data = [{'original_text': 'hello', 'fixed_text': 'world'}]
            expected = "original_text,fixed_text\r\nhello,world\r\n"
            self.assertEqual(generate_encoding_doctor_csv(data), expected)

        # Add more test cases for complex data and escaping
    ```
  - **Sub-Task ID:** T-202.6
    **Goal:** Write integration tests for the export API endpoint.
    **Task:** Develop integration tests to verify that the API endpoint correctly processes requests, generates the CSV, and returns it with the appropriate headers.
    **Rationale:** Ensures the API endpoint functions correctly in conjunction with the CSV generation logic and server configuration.
    **Expected Outcome:** Integration tests that confirm the API endpoint's behavior, including successful response codes and correct file content/headers.
    **Objectives:**
      * Test a successful export request.
      * Verify the response status code (e.g., 200 OK).
      * Assert the `Content-Type` header is `text/csv`.
      * Assert the `Content-Disposition` header is set correctly for download.
      * Optionally, verify a portion of the CSV content if feasible within integration tests.
    **Implementation Prompt:** Write integration tests for the Flask/Django export API endpoint using a testing client. Simulate a POST request to the export endpoint and assert the response status, headers, and potentially the content type.
    **Example Code:**
    ```python
    # Example using Flask test client
    def test_export_csv_endpoint(self):
        with app.test_client() as client:
            response = client.post('/api/encoding-doctor/export/csv')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.mimetype, 'text/csv')
            self.assertIn('attachment;filename=encoding_doctor_export.csv', response.headers['Content-Disposition'])
            # Further assertions on response.data can be added if needed
    ```
  - **Sub-Task ID:** T-202.7
    **Goal:** Add basic error handling for the export process.
    **Task:** Implement error handling for potential issues during data retrieval or CSV generation, providing informative feedback to the user.
    **Rationale:** Improves the user experience by gracefully handling failures and informing the user instead of crashing or returning cryptic errors.
    **Expected Outcome:** The application handles errors during export gracefully, potentially displaying an error message to the user or logging the error appropriately.
    **Objectives:**
      * Add try-catch blocks around critical operations (data retrieval, CSV generation).
      * Log errors server-side.
      * Return appropriate error responses from the API (e.g., 500 Internal Server Error with a message).
      * Display a user-friendly error message in the UI if the API call fails.
    **Implementation Prompt:** Enhance the API endpoint (T-202.3) and the UI handler (T-202.4) to include try-catch blocks. Log server errors using a logging framework and return a JSON error response from the API. Update the UI handler to display a user-friendly message on error.
    **Example Code:**
    ```python
    # In API endpoint
    @app.route('/api/encoding-doctor/export/csv', methods=['POST'])
    def export_csv():
        try:
            processed_data = get_processed_data()
            csv_content = generate_encoding_doctor_csv(processed_data)
            # ... return response ...
        except Exception as e:
            app.logger.error(f"CSV export failed: {e}", exc_info=True)
            return jsonify({"error": "Failed to generate CSV export. Please try again later."}), 500

    # In UI handler (axios part)
    } catch (error) {
        console.error("Export failed:", error);
        if (error.response && error.response.data && error.response.data.error) {
            alert(error.response.data.error); // Display server-provided error message
        } else {
            alert("An unexpected error occurred during export.");
        }
    }
    ```
- **ID:** T-301
  **Title:** Implement Keyword Density UI and Logic
  *(Description):* Develop the interface for text input and display keyword frequency analysis results. Implement the analysis algorithm.
  *(User Story):* As a content creator, I want to analyze keyword density in my articles so that I can optimize for search engines.
  *(Priority):* High
  *(Dependencies):* T-101, T-102, T-103
  *(Est. Effort):* Large
  - **Sub-Task ID:** T-301.1
    **Goal:** Set up the basic UI structure for keyword density analysis.
    **Task:** Create a new React component for the Keyword Density Analyzer, including a text area for input and a designated area for displaying results.
    **Rationale:** This component will serve as the main container for all UI elements related to the keyword density analysis feature.
    **Expected Outcome:** A functional React component with a text area and a placeholder for results, ready for further styling and logic integration.
    **Objectives:**
      * Create a new file `KeywordDensityAnalyzer.jsx`.
      * Implement a basic functional component structure.
      * Include a `<textarea>` element for user input.
      * Include a `<div>` or similar element to act as a placeholder for analysis results.
    **Implementation Prompt:** "Create a React functional component named `KeywordDensityAnalyzer`. It should contain a `<textarea>` element with a placeholder like 'Paste your text here...' and a `<div>` element with the id `results-display` to show the analysis output. Use basic HTML structure within the JSX."
    **Example Code:**
    ```jsx
    import React from 'react';

    function KeywordDensityAnalyzer() {
      return (
        <div>
          <h2>Keyword Density Analyzer</h2>
          <textarea placeholder="Paste your text here..." rows="10" cols="50"></textarea>
          <div id="results-display">
            {/* Analysis results will be displayed here */}
          </div>
        </div>
      );
    }

    export default KeywordDensityAnalyzer;
    ```

  - **Sub-Task ID:** T-301.2
    **Goal:** Implement state management for user input in the Keyword Density Analyzer.
    **Task:** Add state to the `KeywordDensityAnalyzer` component to manage the text entered by the user in the text area.
    **Rationale:** This state will hold the user's input, which is necessary for performing the keyword density analysis.
    **Expected Outcome:** The text area in the UI is connected to a React state variable, and changes in the text area update this state.
    **Objectives:**
      * Import the `useState` hook from React.
      * Initialize a state variable (e.g., `textInput`) to store the text area content.
      * Create a handler function to update `textInput` when the text area's value changes.
      * Bind the `value` and `onChange` props of the `<textarea>` to the state variable and handler function.
    **Implementation Prompt:** "In the `KeywordDensityAnalyzer` React component, use the `useState` hook to manage the text input. Initialize the state with an empty string. Add an `onChange` handler to the `<textarea>` that updates this state. Ensure the `<textarea>`'s `value` prop is controlled by the state."
    **Example Code:**
    ```jsx
    import React, { useState } from 'react';

    function KeywordDensityAnalyzer() {
      const [textInput, setTextInput] = useState('');

      const handleInputChange = (event) => {
        setTextInput(event.target.value);
      };

      return (
        <div>
          <h2>Keyword Density Analyzer</h2>
          <textarea
            placeholder="Paste your text here..."
            rows="10"
            cols="50"
            value={textInput}
            onChange={handleInputChange}
          ></textarea>
          <div id="results-display">
            {/* Analysis results will be displayed here */}
          </div>
        </div>
      );
    }

    export default KeywordDensityAnalyzer;
    ```

  - **Sub-Task ID:** T-301.3
    **Goal:** Implement the core keyword density calculation logic.
    **Task:** Create a JavaScript function that takes a string of text and returns an object mapping keywords to their density percentages.
    **Rationale:** This function encapsulates the business logic for analyzing keyword density, separating it from the UI concerns.
    **Expected Outcome:** A reusable JavaScript function that accurately calculates keyword density for a given text.
    **Objectives:**
      * Define a function `calculateKeywordDensity(text)`.
      * Preprocess the input text: convert to lowercase, remove punctuation, and split into words.
      * Count the frequency of each word.
      * Calculate the density percentage for each word (word count / total word count * 100).
      * Return an object where keys are words and values are their density percentages.
    **Implementation Prompt:** "Create a JavaScript function `calculateKeywordDensity(text)`. This function should: 1. Convert the input `text` to lowercase. 2. Remove common punctuation (e.g., '.', ',', '!', '?'). 3. Split the text into an array of words. 4. Count the occurrences of each word. 5. Calculate the density percentage for each word based on the total number of words. 6. Return an object mapping each unique word to its calculated density percentage. Consider edge cases like empty input."
    **Example Code:**
    ```javascript
    function calculateKeywordDensity(text) {
      if (!text) return {};

      const words = text.toLowerCase().match(/\b\w+\b/g) || [];
      const wordCount = words.length;
      if (wordCount === 0) return {};

      const frequencyMap = {};
      words.forEach(word => {
        frequencyMap[word] = (frequencyMap[word] || 0) + 1;
      });

      const densityMap = {};
      for (const word in frequencyMap) {
        densityMap[word] = (frequencyMap[word] / wordCount) * 100;
      }

      return densityMap;
    }
    ```

  - **Sub-Task ID:** T-301.4
    **Goal:** Integrate the keyword density calculation logic into the UI component.
    **Task:** Add a button to trigger the analysis and call the `calculateKeywordDensity` function when clicked, updating the UI with the results.
    **Rationale:** This step connects the user interface actions (button click) to the backend logic (calculation) and displays the output.
    **Expected Outcome:** Clicking the "Analyze" button processes the text in the text area and displays the keyword densities in the designated results area.
    **Objectives:**
      * Add an "Analyze" button to the `KeywordDensityAnalyzer` component.
      * Implement a handler function for the button's `onClick` event.
      * Inside the handler, retrieve the current `textInput` state.
      * Call `calculateKeywordDensity` with the `textInput`.
      * Store the returned density results in a new state variable (e.g., `analysisResults`).
      * Conditionally render the `analysisResults` in the `results-display` div.
    **Implementation Prompt:** "In the `KeywordDensityAnalyzer` React component, add a button with the text 'Analyze'. Create an `onClick` handler for this button. This handler should: 1. Get the current value from the `textInput` state. 2. Call the `calculateKeywordDensity` function (assume it's imported or defined in the same file). 3. Store the result in a new state variable called `analysisResults`. Add another state variable `analysisResults` initialized to null. Modify the `results-display` div to conditionally render the results based on the `analysisResults` state."
    **Example Code:**
    ```jsx
    import React, { useState } from 'react';
    // Assume calculateKeywordDensity is imported or defined above

    function KeywordDensityAnalyzer() {
      const [textInput, setTextInput] = useState('');
      const [analysisResults, setAnalysisResults] = useState(null);

      const handleInputChange = (event) => {
        setTextInput(event.target.value);
      };

      const handleAnalyzeClick = () => {
        const results = calculateKeywordDensity(textInput);
        setAnalysisResults(results);
      };

      return (
        <div>
          <h2>Keyword Density Analyzer</h2>
          <textarea
            placeholder="Paste your text here..."
            rows="10"
            cols="50"
            value={textInput}
            onChange={handleInputChange}
          ></textarea>
          <button onClick={handleAnalyzeClick}>Analyze</button>
          <div id="results-display">
            {analysisResults && (
              <ul>
                {Object.entries(analysisResults).map(([keyword, density]) => (
                  <li key={keyword}>{keyword}: {density.toFixed(2)}%</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      );
    }

    // Placeholder for the calculation function
    function calculateKeywordDensity(text) { /* ... implementation from T-301.3 ... */ return {}; }

    export default KeywordDensityAnalyzer;
    ```

  - **Sub-Task ID:** T-301.5
    **Goal:** Refine the display of analysis results for better readability.
    **Task:** Format the keyword density results (e.g., sort by density, limit displayed keywords) and improve the visual presentation in the UI.
    **Rationale:** Raw data is often hard to interpret. Presenting results in a sorted and potentially limited manner makes the analysis more actionable for the user.
    **Expected Outcome:** The keyword density results are displayed in a user-friendly format, likely sorted by frequency or density, within the `results-display` area.
    **Objectives:**
      * Modify the rendering logic in `results-display` to sort keywords by density in descending order.
      * Optionally, limit the number of displayed keywords (e.g., top 10).
      * Ensure percentages are displayed with a reasonable number of decimal places (e.g., two).
      * Add clear labels for the displayed data.
    **Implementation Prompt:** "Update the rendering logic within the `results-display` div in `KeywordDensityAnalyzer.jsx`. If `analysisResults` is available: 1. Convert the `analysisResults` object into an array of `[keyword, density]` pairs. 2. Sort this array in descending order based on the density value. 3. Take the top N items (e.g., N=10) from the sorted array. 4. Render these items as a list (`<ul>`, `<li>`), displaying the keyword and its density formatted to two decimal places (e.g., `keyword: XX.XX%`)."
    **Example Code:**
    ```jsx
    // Inside the return statement of KeywordDensityAnalyzer component:
    <div id="results-display">
      {analysisResults && Object.keys(analysisResults).length > 0 ? (
        <div>
          <h3>Top Keywords:</h3>
          <ul>
            {Object.entries(analysisResults)
              .sort(([, densityA], [, densityB]) => densityB - densityA) // Sort descending
              .slice(0, 10) // Take top 10
              .map(([keyword, density]) => (
                <li key={keyword}>
                  {keyword}: {density.toFixed(2)}%
                </li>
              ))}
          </ul>
        </div>
      ) : analysisResults ? (
        <p>No keywords found or text is empty.</p>
      ) : null}
    </div>
    ```

  - **Sub-Task ID:** T-301.6
    **Goal:** Add unit tests for the keyword density calculation logic.
    **Task:** Write unit tests for the `calculateKeywordDensity` function to ensure its accuracy and robustness.
    **Rationale:** Thorough testing of the core logic function prevents regressions and verifies its correctness under various conditions.
    **Expected Outcome:** A suite of unit tests that pass, confirming the `calculateKeywordDensity` function works as expected for different inputs.
    **Objectives:**
      * Set up a testing environment (e.g., Jest).
      * Write test cases for basic text input.
      * Write test cases for empty or null input.
      * Write test cases for text with punctuation and mixed casing.
      * Write test cases for text with repeated words.
      * Assert that the output format and calculated densities are correct.
    **Implementation Prompt:** "Using Jest, write unit tests for the `calculateKeywordDensity` function. Create a test file (e.g., `keywordDensity.test.js`). Include tests for: 1. A simple sentence with unique words. 2. A sentence with repeated words. 3. An empty string input. 4. A string with only punctuation. 5. Text with mixed casing and punctuation. Ensure the expected output object matches the actual output for each case."
    **Example Code:**
    ```javascript
    // keywordDensity.test.js
    import { calculateKeywordDensity } from './path/to/your/function'; // Adjust path

    describe('calculateKeywordDensity', () => {
      test('should return correct densities for simple text', () => {
        const text = "the quick brown fox jumps over the lazy dog";
        const expected = {
          the: 2 / 9 * 100,
          quick: 1 / 9 * 100,
          brown: 1 / 9 * 100,
          fox: 1 / 9 * 100,
          jumps: 1 / 9 * 100,
          over: 1 / 9 * 100,
          lazy: 1 / 9 * 100,
          dog: 1 / 9 * 100,
        };
        expect(calculateKeywordDensity(text)).toEqual(expect.objectContaining(expected));
      });

      test('should handle empty string input', () => {
        expect(calculateKeywordDensity('')).toEqual({});
      });

      // Add more test cases...
    });
    ```

  - **Sub-Task ID:** T-301.7
    **Goal:** Add basic styling to the Keyword Density Analyzer component.
    **Task:** Apply CSS styles to make the text area, button, and results display visually appealing and user-friendly.
    **Rationale:** Good UI/UX is crucial for user adoption. Basic styling improves the component's appearance and usability.
    **Expected Outcome:** The Keyword Density Analyzer component has a clean and organized visual presentation.
    **Objectives:**
      * Create a CSS file (e.g., `KeywordDensityAnalyzer.css`) or use styled-components/inline styles.
      * Style the main container, text area, button, and results list.
      * Ensure elements are properly aligned and spaced.
      * Consider responsiveness for different screen sizes (optional, depending on project scope).
    **Implementation Prompt:** "Create a CSS file named `KeywordDensityAnalyzer.css` and import it into `KeywordDensityAnalyzer.jsx`. Add styles for the main container, the `<textarea>` (e.g., `width`, `padding`, `border`), the `<button>` (e.g., `padding`, `margin`, `background-color`, `color`, `border-radius`), and the results list (`<ul>`, `<li>`). Ensure adequate spacing between elements."
    **Example Code:**
    ```css
    /* KeywordDensityAnalyzer.css */
    .keyword-analyzer-container {
      padding: 20px;
      border: 1px solid #ccc;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .keyword-analyzer-container textarea {
      width: 100%;
      padding: 10px;
      margin-bottom: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box; /* Include padding and border in the element's total width and height */
    }

    .keyword-analyzer-container button {
      padding: 10px 15px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 10px;
    }

    .keyword-analyzer-container button:hover {
      background-color: #0056b3;
    }

    #results-display ul {
      list-style: none;
      padding: 0;
    }

    #results-display li {
      margin-bottom: 5px;
      padding: 5px;
      background-color: #f8f9fa;
      border-radius: 3px;
    }
    ```
- **ID:** T-302
  **Title:** Add Keyword Density Export Functionality
  *(Description):* Integrate CSV export for the Keyword Density tool, including keywords and their frequencies.
  *(User Story):* As a content creator, I want to analyze keyword density in my articles so that I can optimize for search engines.
  *(Priority):* Medium
  *(Dependencies):* T-301, T-106
  *(Est. Effort):* Small

### Epic: Meta Preview Tool
  - **Sub-Task ID:** T-302.1
    **Goal:** Define the data structure for the CSV export.
    **Task:** Determine the exact columns and their order for the CSV file that will represent the keyword density data.
    **Rationale:** A clear data structure is essential for consistent and predictable export, ensuring the generated CSV is easily consumable.
    **Expected Outcome:** A documented list of CSV columns (e.g., "Keyword", "Frequency").
    **Objectives:**
      * Identify all necessary data points for export.
      * Define the header row for the CSV.
      * Specify the order of columns.
    **Implementation Prompt:** Define the schema for the CSV export of keyword density data. The CSV should include the keyword itself and its corresponding frequency count. Specify the header row and the order of columns.
    **Example Code:**
    ```json
    {
      "columns": [
        {"header": "Keyword", "key": "keyword"},
        {"header": "Frequency", "key": "frequency"}
      ]
    }
    ```

  - **Sub-Task ID:** T-302.2
    **Goal:** Implement the backend logic to fetch keyword density data.
    **Task:** Create a function or method that retrieves the calculated keyword and frequency data from the existing data store or service (likely related to T-301).
    **Rationale:** This is a prerequisite for exporting the data; the data must first be accessible.
    **Expected Outcome:** A callable function that returns an array or list of keyword-frequency objects.
    **Objectives:**
      * Identify the source of keyword density data.
      * Implement a data retrieval function.
      * Ensure the function returns data in a structured format suitable for CSV generation.
    **Implementation Prompt:** Implement a Python function `get_keyword_density_data()` that retrieves keyword and frequency data. Assume the data is stored in a dictionary or list of dictionaries, where each dictionary has 'keyword' and 'frequency' keys. Return this data structure.
    **Example Code:**
    ```python
    def get_keyword_density_data():
        # Placeholder for actual data retrieval logic
        return [
            {"keyword": "example", "frequency": 15},
            {"keyword": "keyword", "frequency": 10},
            {"keyword": "density", "frequency": 8}
        ]
    ```

  - **Sub-Task ID:** T-302.3
    **Goal:** Implement the CSV generation logic.
    **Task:** Write the code that takes the fetched keyword density data and formats it into a CSV string or file.
    **Rationale:** This is the core logic for creating the export file in the specified format.
    **Expected Outcome:** A function that accepts the data structure from T-302.2 and outputs a CSV-formatted string or file.
    **Objectives:**
      * Use a reliable CSV library (e.g., Python's `csv` module).
      * Incorporate the defined CSV headers (from T-302.1).
      * Handle potential edge cases like empty data.
    **Implementation Prompt:** Implement a Python function `generate_keyword_density_csv(data)` that takes a list of dictionaries (each with 'keyword' and 'frequency' keys) and returns a CSV-formatted string. Use the `csv` module and `io.StringIO` for in-memory CSV creation. Include the headers "Keyword" and "Frequency".
    **Example Code:**
    ```python
    import csv
    import io

    def generate_keyword_density_csv(data):
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["Keyword", "Frequency"])
        writer.writeheader()
        for row in data:
            writer.writerow({"Keyword": row['keyword'], "Frequency": row['frequency']})
        return output.getvalue()
    ```

  - **Sub-Task ID:** T-302.4
    **Goal:** Create an API endpoint for CSV export.
    **Task:** Develop a new API endpoint (e.g., `/api/keyword-density/export/csv`) that triggers the data fetching and CSV generation process and returns the CSV file.
    **Rationale:** This endpoint will be consumed by the frontend or other services to initiate the export action.
    **Expected Outcome:** A functional API endpoint that, when called, returns a CSV file with the correct content type.
    **Objectives:**
      * Define the HTTP method (e.g., GET).
      * Integrate the data fetching (T-302.2) and CSV generation (T-302.3) logic.
      * Set the appropriate `Content-Type` header (e.g., `text/csv`).
      * Set the `Content-Disposition` header for file download (e.g., `attachment; filename="keyword_density.csv"`).
    **Implementation Prompt:** Implement a Flask (or similar framework) route `/export-keyword-density-csv` that handles GET requests. This route should call `get_keyword_density_data()` and `generate_keyword_density_csv()`. It should return a Flask `Response` object with the CSV data, setting `Content-Type` to `text/csv` and `Content-Disposition` to `attachment; filename="keyword_density.csv"`.
    **Example Code:**
    ```python
    from flask import Flask, Response, jsonify

    app = Flask(__name__)

    # Assume get_keyword_density_data and generate_keyword_density_csv are defined elsewhere

    @app.route('/export-keyword-density-csv', methods=['GET'])
    def export_csv():
        data = get_keyword_density_data()
        csv_data = generate_keyword_density_csv(data)
        return Response(
            csv_data,
            mimetype='text/csv',
            headers={"Content-Disposition": "attachment;filename=keyword_density.csv"}
        )
    ```

  - **Sub-Task ID:** T-302.5
    **Goal:** Add a UI button to trigger the CSV export.
    **Task:** Integrate a new button or link into the Keyword Density tool's user interface that, when clicked, initiates a request to the new export API endpoint.
    **Rationale:** Provides the user with a direct way to access the export functionality from the frontend.
    **Expected Outcome:** A visible and functional button/link in the UI that downloads the CSV file upon clicking.
    **Objectives:**
      * Locate the relevant component in the Keyword Density tool's UI.
      * Add a new button/link element.
      * Implement an event handler for the click event.
      * Make an HTTP request to the export API endpoint (T-302.4).
    **Implementation Prompt:** In the React component responsible for the Keyword Density tool (assume it's named `KeywordDensityTool.jsx`), add a button with the text "Export CSV". Attach an `onClick` handler to this button that makes a `GET` request to `/api/keyword-density/export/csv` using `fetch` or `axios`. Ensure the browser handles the file download.
    **Example Code:**
    ```jsx
    // Inside a React component
    const handleExportClick = async () => {
      try {
        const response = await fetch('/api/keyword-density/export/csv');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'keyword_density.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to export CSV:", error);
        // Handle error display to user
      }
    };

    return (
      <div>
        {/* ... other UI elements ... */}
        <button onClick={handleExportClick}>Export CSV</button>
      </div>
    );
    ```

  - **Sub-Task ID:** T-302.6
    **Goal:** Write unit tests for the CSV generation logic.
    **Task:** Create unit tests to verify that the `generate_keyword_density_csv` function correctly formats data into CSV, including headers and data rows.
    **Rationale:** Ensures the core CSV formatting logic is robust and works as expected, preventing regressions.
    **Expected Outcome:** A suite of unit tests that pass, covering various scenarios for the CSV generation function.
    **Objectives:**
      * Test with sample data.
      * Test with empty data.
      * Test with data containing special characters (if applicable).
      * Verify headers are correctly included.
      * Verify data rows match input.
    **Implementation Prompt:** Write Python unit tests using the `unittest` framework for the `generate_keyword_density_csv` function. Include test cases for a typical data set, an empty data set, and potentially data with commas or quotes to ensure proper CSV escaping. Assert that the output string matches the expected CSV format.
    **Example Code:**
    ```python
    import unittest
    # Assume generate_keyword_density_csv is imported

    class TestCsvExport(unittest.TestCase):
        def test_generate_csv_with_data(self):
            data = [{"keyword": "test", "frequency": 5}]
            expected_csv = "Keyword,Frequency\ntest,5\n"
            self.assertEqual(generate_keyword_density_csv(data), expected_csv)

        def test_generate_csv_empty(self):
            data = []
            expected_csv = "Keyword,Frequency\n"
            self.assertEqual(generate_keyword_density_csv(data), expected_csv)

    # if __name__ == '__main__':
    #     unittest.main()
    ```

  - **Sub-Task ID:** T-302.7
    **Goal:** Write integration tests for the export API endpoint.
    **Task:** Create integration tests to verify that the `/api/keyword-density/export/csv` endpoint functions correctly, from request to response.
    **Rationale:** Ensures the entire export flow, including data retrieval, CSV generation, and API response handling, works together seamlessly.
    **Expected Outcome:** Integration tests that confirm the API endpoint returns a valid CSV file with the correct headers and content.
    **Objectives:**
      * Simulate a GET request to the export endpoint.
      * Mock or control the data source for keyword density.
      * Assert the response status code is 200 OK.
      * Assert the `Content-Type` header is `text/csv`.
      * Assert the `Content-Disposition` header is set correctly.
      * Parse the response body and verify its CSV content.
    **Implementation Prompt:** Write integration tests for the Flask API endpoint using `pytest` and Flask's test client. Mock the `get_keyword_density_data` function to return predictable data. Assert the response status, headers, and that the response data is a correctly formatted CSV string matching the mocked input.
    **Example Code:**
    ```python
    import pytest
    from your_app import app # Assuming your Flask app instance is named 'app'
    # Assume get_keyword_density_data is imported and can be mocked

    @pytest.fixture
    def client():
        app.config['TESTING'] = True
        with app.test_client() as client:
            yield client

    def test_export_csv_endpoint(monkeypatch, client):
        mock_data = [{"keyword": "integration", "frequency": 7}]
        # Mock the data retrieval function
        monkeypatch.setattr('your_module.get_keyword_density_data', lambda: mock_data)

        response = client.get('/export-keyword-density-csv')

        assert response.status_code == 200
        assert response.mimetype == 'text/csv'
        assert 'attachment; filename="keyword_density.csv"' in response.headers['Content-Disposition']
        assert response.get_data(as_text=True) == "Keyword,Frequency\nintegration,7\n"
    ```

  - **Sub-Task ID:** T-302.8
    **Goal:** Document the export functionality.
    **Task:** Add necessary documentation for the new CSV export feature, including how to trigger it from the UI and potentially details about the CSV format.
    **Rationale:** Ensures users and other developers understand how to use and maintain the new feature.
    **Expected Outcome:** Updated user guides or developer documentation explaining the export functionality.
    **Objectives:**
      * Describe the purpose of the export.
      * Explain how to initiate the export via the UI.
      * Detail the structure of the exported CSV file.
      * Mention any prerequisites (e.g., T-301 completion).
    **Implementation Prompt:** Update the project's documentation (e.g., in a `docs/` folder or wiki) to include a section on the "Keyword Density CSV Export". Explain the steps a user needs to take in the UI to download the file and provide a clear description of the CSV columns ("Keyword", "Frequency").
    **Example Code:**
    ```markdown
    ## Keyword Density Export

    The Keyword Density tool provides functionality to export the calculated keyword frequencies to a CSV file for further analysis.

    ### How to Export

    1. Navigate to the Keyword Density tool page.
    2. Click the "Export CSV" button located [describe location, e.g., near the top right].
    3. A file named `keyword_density.csv` will be downloaded to your browser's default download location.

    ### CSV File Format

    The exported CSV file contains the following columns:

    *   **Keyword**: The specific keyword analyzed.
    *   **Frequency**: The number of times the keyword appeared in the analyzed text.
    ```
- **ID:** T-401
  **Title:** Implement Meta Preview UI and Logic
  *(Description):* Build the form for Open Graph and Twitter Card meta tags and create a live preview component.
  *(User Story):* As a social media manager, I want to preview how my meta tags will appear on Facebook/Twitter so that I can ensure proper sharing.
  *(Priority):* High
  *(Dependencies):* T-101, T-102, T-103
  *(Est. Effort):* Large
  - **Sub-Task ID:** T-401.1
    **Goal:** Define the data structure for meta tags.
    **Task:** Create a TypeScript interface or a similar data structure definition to represent the Open Graph and Twitter Card meta tag properties.
    **Rationale:** A clear data structure is essential for managing and passing meta tag data between components and for API interactions.
    **Expected Outcome:** A defined interface (e.g., `MetaTags`) that includes properties like `title`, `description`, `imageUrl`, `siteName`, `twitterCardType`, etc.
    **Objectives:**
      * Define an interface for Open Graph tags.
      * Define an interface for Twitter Card tags.
      * Combine these into a single, comprehensive `MetaTags` interface.
      * Ensure type safety for all relevant meta tag properties.
    **Implementation Prompt:** "Create a TypeScript interface named `MetaTags` that includes properties for Open Graph tags (like `ogTitle`, `ogDescription`, `ogImageUrl`, `ogSiteName`) and Twitter Card tags (like `twitterCard`, `twitterSite`, `twitterTitle`, `twitterDescription`, `twitterImage`). Use appropriate types (string, enum for card type) and make properties optional where applicable."
    **Example Code:**
    ```typescript
    export interface MetaTags {
      ogTitle?: string;
      ogDescription?: string;
      ogImageUrl?: string;
      ogSiteName?: string;
      twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
      twitterSite?: string;
      twitterTitle?: string;
      twitterDescription?: string;
      twitterImage?: string;
    }
    ```

  - **Sub-Task ID:** T-401.2
    **Goal:** Create the input form component for meta tags.
    **Task:** Develop a React component that renders form fields for all the defined meta tag properties.
    **Rationale:** This component will allow users to input and edit the meta tag data.
    **Expected Outcome:** A functional React form component with input fields for title, description, image URL, site name, and Twitter card type.
    **Objectives:**
      * Create a new React component (e.g., `MetaTagsForm`).
      * Add input fields for `ogTitle`, `ogDescription`, `ogImageUrl`, `ogSiteName`.
      * Add a select/dropdown for `twitterCard` type.
      * Add input fields for `twitterTitle`, `twitterDescription`, `twitterImage`.
      * Ensure fields are properly labeled.
    **Implementation Prompt:** "Create a React functional component named `MetaTagsForm` using TypeScript and JSX. It should accept `metaTags` (of type `MetaTags` defined in T-401.1) as a prop and an `onChange` handler function. Render form inputs for each property in `MetaTags`, including a select element for `twitterCard`. The inputs should be controlled components, updating the `metaTags` prop via the `onChange` handler."
    **Example Code:**
    ```jsx
    import React from 'react';
    import { MetaTags } from './types'; // Assuming types are in './types'

    interface MetaTagsFormProps {
      metaTags: MetaTags;
      onChange: (newMetaTags: MetaTags) => void;
    }

    const MetaTagsForm: React.FC<MetaTagsFormProps> = ({ metaTags, onChange }) => {
      const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onChange({ ...metaTags, [name]: value });
      };

      return (
        <form>
          {/* Input fields for ogTitle, ogDescription, ogImageUrl, ogSiteName */}
          <label htmlFor="twitterCard">Twitter Card Type:</label>
          <select name="twitterCard" id="twitterCard" value={metaTags.twitterCard || ''} onChange={handleChange}>
            <option value="">Select a card type</option>
            <option value="summary">Summary</option>
            <option value="summary_large_image">Summary Card with Large Image</option>
            {/* Add other options if needed */}
          </select>
          {/* Input fields for twitterTitle, twitterDescription, twitterImage */}
        </form>
      );
    };

    export default MetaTagsForm;
    ```

  - **Sub-Task ID:** T-401.3
    **Goal:** Implement the live preview component for meta tags.
    **Task:** Create a React component that visually simulates how the meta tags will appear on social media platforms (e.g., Facebook and Twitter).
    **Rationale:** This component provides immediate visual feedback to the user, helping them refine their meta tag content.
    **Expected Outcome:** A React component that renders mock previews for Facebook (Open Graph) and Twitter, dynamically updating based on the provided meta tag data.
    **Objectives:**
      * Create a new React component (e.g., `MetaPreview`).
      * Design a mock UI for a Facebook post preview.
      * Design a mock UI for a Twitter post preview.
      * Implement logic to render `ogTitle`, `ogDescription`, `ogImageUrl` in the Facebook preview.
      * Implement logic to render `twitterTitle`, `twitterDescription`, `twitterImage`, and `twitterCard` type in the Twitter preview.
      * Ensure previews update reactively when meta tag data changes.
    **Implementation Prompt:** "Create a React functional component named `MetaPreview` using TypeScript and JSX. It should accept `metaTags` (of type `MetaTags` defined in T-401.1) as a prop. Render two distinct sections: one simulating a Facebook post preview (displaying OG title, description, and image) and another simulating a Twitter post preview (displaying Twitter title, description, image, and card type). Use placeholder images or default styling if image URLs are missing. The component should dynamically update based on the `metaTags` prop."
    **Example Code:**
    ```jsx
    import React from 'react';
    import { MetaTags } from './types'; // Assuming types are in './types'

    interface MetaPreviewProps {
      metaTags: MetaTags;
    }

    const MetaPreview: React.FC<MetaPreviewProps> = ({ metaTags }) => {
      return (
        <div className="meta-previews">
          <div className="facebook-preview">
            <h3>Facebook Preview</h3>
            {metaTags.ogImageUrl && <img src={metaTags.ogImageUrl} alt="OG Image" />}
            <h4>{metaTags.ogTitle || 'Default Title'}</h4>
            <p>{metaTags.ogDescription || 'Default description...'}</p>
            {metaTags.ogSiteName && <small>{metaTags.ogSiteName}</small>}
          </div>
          <div className="twitter-preview">
            <h3>Twitter Preview</h3>
            {metaTags.twitterImage && <img src={metaTags.twitterImage} alt="Twitter Image" />}
            <h4>{metaTags.twitterTitle || 'Default Title'}</h4>
            <p>{metaTags.twitterDescription || 'Default description...'}</p>
            <small>Card Type: {metaTags.twitterCard || 'N/A'}</small>
          </div>
        </div>
      );
    };

    export default MetaPreview;
    ```

  - **Sub-Task ID:** T-401.4
    **Goal:** Integrate form and preview components and manage state.
    **Task:** Create a parent component that holds the state for the meta tags and renders both the `MetaTagsForm` and `MetaPreview` components, passing data and handlers between them.
    **Rationale:** This component orchestrates the user interaction, state management, and display of the form and its live preview.
    **Expected Outcome:** A parent component (e.g., `MetaTagEditor`) that manages the `MetaTags` state, allows the form to update it, and passes the updated state to the preview component.
    **Objectives:**
      * Create a new React component (e.g., `MetaTagEditor`).
      * Initialize the `MetaTags` state with default or empty values.
      * Implement a state update handler function.
      * Render `MetaTagsForm`, passing the current state and the update handler.
      * Render `MetaPreview`, passing the current state.
      * Ensure the preview updates correctly when form inputs change.
    **Implementation Prompt:** "Create a React functional component named `MetaTagEditor` using TypeScript and JSX. It should use the `useState` hook to manage the `MetaTags` state (initialized with default values or empty strings). Define a `handleMetaTagsChange` function that updates this state. Render the `MetaTagsForm` component, passing the current `metaTags` state and `handleMetaTagsChange` as props. Render the `MetaPreview` component, passing the current `metaTags` state as a prop."
    **Example Code:**
    ```jsx
    import React, { useState } from 'react';
    import MetaTagsForm from './MetaTagsForm';
    import MetaPreview from './MetaPreview';
    import { MetaTags } from './types';

    const MetaTagEditor: React.FC = () => {
      const [metaTags, setMetaTags] = useState<MetaTags>({
        ogTitle: 'My Awesome Page',
        ogDescription: 'This is a description of my awesome page.',
        ogImageUrl: 'https://example.com/default-og-image.jpg',
        twitterCard: 'summary_large_image',
        twitterTitle: 'My Awesome Page',
        twitterDescription: 'This is a description of my awesome page.',
        twitterImage: 'https://example.com/default-twitter-image.jpg',
      });

      const handleMetaTagsChange = (newMetaTags: MetaTags) => {
        setMetaTags(newMetaTags);
      };

      return (
        <div>
          <h2>Edit Meta Tags</h2>
          <MetaTagsForm metaTags={metaTags} onChange={handleMetaTagsChange} />
          <MetaPreview metaTags={metaTags} />
        </div>
      );
    };

    export default MetaTagEditor;
    ```

  - **Sub-Task ID:** T-401.5
    **Goal:** Add basic styling for the preview components.
    **Task:** Apply CSS styles to make the `MetaPreview` component visually resemble actual social media post previews.
    **Rationale:** Clear visual representation is key for the preview's effectiveness.
    **Expected Outcome:** Styled preview components that look like plausible Facebook and Twitter posts.
    **Objectives:**
      * Create a CSS file (or use CSS-in-JS/styled-components) for preview styling.
      * Style the container for Facebook preview.
      * Style the container for Twitter preview.
      * Ensure images, titles, and descriptions are laid out appropriately within each preview.
      * Add borders, padding, and margins to mimic real posts.
    **Implementation Prompt:** "Add CSS styles to the `MetaPreview` component (or its associated CSS file) to make the Facebook and Twitter previews look more realistic. Style the preview containers, images (ensure they fit appropriately, e.g., `max-width: 100%`), titles (font size, weight), and descriptions (line height, truncation if necessary). Use appropriate spacing and borders."
    **Example Code:**
    ```css
    .facebook-preview, .twitter-preview {
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
      background-color: #f9f9f9;
      font-family: sans-serif;
    }

    .facebook-preview img, .twitter-preview img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin-bottom: 10px;
    }

    .facebook-preview h4, .twitter-preview h4 {
      font-size: 1.2em;
      margin-bottom: 8px;
      color: #333;
    }
    /* Add more specific styles for each preview type */
    ```

  - **Sub-Task ID:** T-401.6
    **Goal:** Implement validation for meta tag inputs.
    **Task:** Add client-side validation to the `MetaTagsForm` component to ensure users provide valid data (e.g., valid URLs, character limits).
    **Rationale:** Prevents users from submitting invalid data and improves the quality of generated meta tags.
    **Expected Outcome:** Form inputs provide visual feedback (e.g., error messages, red borders) for invalid entries.
    **Objectives:**
      * Validate image URLs to ensure they are valid URL formats.
      * Implement character limit checks for title and description fields (e.g., OG title ~60 chars, Twitter title ~70 chars, OG desc ~200 chars, Twitter desc ~160 chars).
      * Display clear error messages next to invalid fields.
      * Optionally, disable a submit button if validation fails.
    **Implementation Prompt:** "Enhance the `MetaTagsForm` component to include client-side validation. Add checks for valid URL format for `ogImageUrl` and `twitterImage` fields. Implement character count limits for `ogTitle`, `ogDescription`, `twitterTitle`, and `twitterDescription`. Display inline error messages for each invalid field. Update the `onChange` handler to manage validation state and potentially return an overall validation status."
    **Example Code:**
    ```jsx
    // Inside MetaTagsForm component
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateField = (name: string, value: string): string | undefined => {
      if (name === 'ogImageUrl' || name === 'twitterImage') {
        try {
          new URL(value);
        } catch (_) {
          return 'Invalid URL format';
        }
      }
      // Add character limit checks here...
      return undefined;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      const validationError = validateField(name, value);
      setErrors(prevErrors => ({ ...prevErrors, [name]: validationError }));
      onChange({ ...metaTags, [name]: value });
    };

    // Render error messages conditionally next to inputs
    // <p style={{ color: 'red' }}>{errors[name]}</p>
    ```

  - **Sub-Task ID:** T-401.7
    **Goal:** Write unit tests for the meta tag form and preview components.
    **Task:** Create unit tests using a testing framework (e.g., Jest, React Testing Library) to verify the functionality of `MetaTagsForm` and `MetaPreview`.
    **Rationale:** Ensures the components behave as expected and helps prevent regressions in the future.
    **Expected Outcome:** A suite of unit tests covering rendering, user interactions, and state updates for both components.
    **Objectives:**
      * Write tests for `MetaTagsForm` to check rendering of all fields.
      * Write tests for `MetaTagsForm` to verify state updates on input change.
      * Write tests for `MetaPreview` to check rendering of provided meta tag data.
      * Write tests for `MetaPreview` to ensure default content is shown when data is missing.
      * Mock necessary dependencies (like types).
    **Implementation Prompt:** "Write unit tests for the `MetaTagsForm` and `MetaPreview` React components using Jest and React Testing Library. For `MetaTagsForm`, test that all input fields render correctly and that the `onChange` prop is called with the correct updated data when a user interacts with the form. For `MetaPreview`, test that it renders the correct title, description, and image based on the `metaTags` prop, and that it displays fallback content when properties are undefined."
    **Example Code:**
    ```jsx
    // Example test for MetaTagsForm
    import { render, screen, fireEvent } from '@testing-library/react';
    import MetaTagsForm from './MetaTagsForm';
    import { MetaTags } from './types';

    const mockMetaTags: MetaTags = { ogTitle: 'Initial Title' };
    const mockOnChange = jest.fn();

    test('updates ogTitle on input change', () => {
      render(<MetaTagsForm metaTags={mockMetaTags} onChange={mockOnChange} />);
      const titleInput = screen.getByLabelText(/Open Graph Title/i); // Adjust label text
      fireEvent.change(titleInput, { target: { name: 'ogTitle', value: 'New Title' } });
      expect(mockOnChange).toHaveBeenCalledWith({ ...mockMetaTags, ogTitle: 'New Title' });
    });

    // Example test for MetaPreview
    test('renders OG title correctly', () => {
      const testMetaTags: MetaTags = { ogTitle: 'Test OG Title' };
      render(<MetaPreview metaTags={testMetaTags} />);
      expect(screen.getByText('Test OG Title')).toBeInTheDocument();
    });
    ```
- **ID:** T-402
  **Title:** Add Meta Preview Export Functionality
  *(Description):* Implement export functionality for the generated meta tag HTML snippet.
  *(User Story):* As a social media manager, I want to preview how my meta tags will appear on Facebook/Twitter so that I can ensure proper sharing.
  *(Priority):* Medium
  *(Dependencies):* T-401, T-106
  *(Est. Effort):* Small

### Epic: Sitemap Generator
  - **Sub-Task ID:** T-402.1
    **Goal:** Create a new button or link to trigger the export action.
    **Task:** Add a UI element (e.g., a button with text "Export HTML" or an icon) to the meta tag preview section. This element should be visually distinct and clearly indicate its purpose.
    **Rationale:** Provides the user with a direct and intuitive way to initiate the export process.
    **Expected Outcome:** A new, clickable UI element is visible in the meta tag preview area.
    **Objectives:**
      * A button or link element is added to the DOM.
      * The element has appropriate text or an icon indicating export functionality.
      * The element is styled to be easily discoverable.
    **Implementation Prompt:** "In the `MetaPreview` component (assuming React/JSX), add a new button element with the ID `export-meta-button` and the text 'Export HTML'. Ensure it's placed below the preview iframe or div. Add a basic CSS class `export-button` for potential styling."
    **Example Code:**
    ```jsx
    // Inside the MetaPreview component's render method
    return (
      <div>
        {/* Existing preview content */}
        <button id="export-meta-button" className="export-button">Export HTML</button>
      </div>
    );
    ```

  - **Sub-Task ID:** T-402.2
    **Goal:** Implement the event handler for the export button click.
    **Task:** Attach an `onClick` event handler to the newly created export button. This handler will initiate the process of retrieving the meta tag HTML and preparing it for export.
    **Rationale:** Connects the UI element to the underlying logic that performs the export.
    **Expected Outcome:** Clicking the export button triggers a JavaScript function.
    **Objectives:**
      * An `onClick` handler is attached to the export button.
      * The handler calls a designated function (e.g., `handleExportMetaHtml`).
      * The `handleExportMetaHtml` function is defined within the component or a relevant utility.
    **Implementation Prompt:** "In the `MetaPreview` component, add an `onClick` prop to the `export-meta-button`. This prop should call a function named `handleExportMetaHtml`. Define the `handleExportMetaHtml` function within the component, initially logging a message like 'Export button clicked' to the console."
    **Example Code:**
    ```jsx
    // Inside the MetaPreview component
    const handleExportMetaHtml = () => {
      console.log('Export button clicked');
      // Further logic will be added here
    };

    return (
      <div>
        {/* ... */}
        <button id="export-meta-button" className="export-button" onClick={handleExportMetaHtml}>
          Export HTML
        </button>
      </div>
    );
    ```

  - **Sub-Task ID:** T-402.3
    **Goal:** Retrieve the generated meta tag HTML content.
    **Task:** Within the `handleExportMetaHtml` function, access and retrieve the complete HTML string representing the meta tags that are currently displayed or generated. This might involve reading from component state, a ref, or a specific DOM element.
    **Rationale:** The core data needed for export is the meta tag HTML itself. This step ensures we have that data available.
    **Expected Outcome:** The `handleExportMetaHtml` function successfully obtains the meta tag HTML string.
    **Objectives:**
      * The function identifies the source of the meta tag HTML.
      * The HTML string is correctly extracted.
      * The extracted HTML is stored in a variable within the function scope.
    **Implementation Prompt:** "Modify the `handleExportMetaHtml` function in the `MetaPreview` component. Assuming the meta tag HTML is stored in a state variable `metaHtmlContent`, retrieve this variable. If it's not in state, assume it's available via a ref `metaHtmlRef`. Log the retrieved HTML content to the console."
    **Example Code:**
    ```jsx
    // Inside the MetaPreview component
    const handleExportMetaHtml = () => {
      // Assuming metaHtmlContent is a state variable
      console.log('Meta HTML Content:', metaHtmlContent);
      // Or if using a ref:
      // console.log('Meta HTML Content:', metaHtmlRef.current.innerHTML);
    };
    ```

  - **Sub-Task ID:** T-402.4
    **Goal:** Create a downloadable HTML file containing the meta tags.
    **Task:** Convert the retrieved meta tag HTML string into a downloadable file. This typically involves creating a Blob object and then generating a temporary URL for it, which can be used to trigger a file download.
    **Rationale:** Enables the user to save the meta tag snippet as a standalone HTML file for local use or sharing.
    **Expected Outcome:** A mechanism is in place to generate and initiate the download of an HTML file.
    **Objectives:**
      * The meta tag HTML string is converted into a Blob with the MIME type `text/html`.
      * A temporary URL is created for the Blob.
      * A mechanism (e.g., creating an anchor tag) is prepared to trigger the download.
    **Implementation Prompt:** "Extend the `handleExportMetaHtml` function. After retrieving `metaHtmlContent`, create a new Blob object: `const blob = new Blob([metaHtmlContent], { type: 'text/html' });`. Then, create a temporary URL: `const url = URL.createObjectURL(blob);`. Store this `url` in a state variable or a local variable for the next step."
    **Example Code:**
    ```javascript
    // Inside handleExportMetaHtml function
    const blob = new Blob([metaHtmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    // Proceed to download trigger
    ```

  - **Sub-Task ID:** T-402.5
    **Goal:** Trigger the file download for the user.
    **Task:** Implement the logic to prompt the user to download the generated HTML file. This is usually done by creating a temporary anchor (`<a>`) element, setting its `href` to the Blob URL, setting the `download` attribute with a desired filename (e.g., `meta-preview.html`), programmatically clicking the anchor, and then cleaning up the temporary URL.
    **Rationale:** Completes the user-facing export functionality by initiating the file download.
    **Expected Outcome:** The user's browser prompts them to save an HTML file named `meta-preview.html`.
    **Objectives:**
      * A temporary anchor element is created in the DOM.
      * The anchor's `href` attribute is set to the Blob URL.
      * The anchor's `download` attribute is set to `meta-preview.html`.
      * The anchor element is programmatically clicked.
      * The temporary Blob URL is revoked using `URL.revokeObjectURL()`.
    **Implementation Prompt:** "Complete the `handleExportMetaHtml` function. After creating the `url` from the Blob: create an anchor element `const link = document.createElement('a');`. Set `link.href = url;`. Set `link.download = 'meta-preview.html';`. Append the link to the body, click it (`link.click();`), remove it from the body (`document.body.removeChild(link);`), and finally revoke the object URL (`URL.revokeObjectURL(url);`)."
    **Example Code:**
    ```javascript
    // Inside handleExportMetaHtml function, after creating 'url'
    const link = document.createElement('a');
    link.href = url;
    link.download = 'meta-preview.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    ```

  - **Sub-Task ID:** T-402.6
    **Goal:** Add unit tests for the export functionality.
    **Task:** Write unit tests to verify that the export functionality works as expected. This includes testing that the button click triggers the correct functions, that the HTML is correctly retrieved, and that the download mechanism is initiated (mocking browser APIs if necessary).
    **Rationale:** Ensures the reliability and correctness of the export feature and prevents regressions.
    **Expected Outcome:** A suite of unit tests passes, confirming the export logic.
    **Objectives:**
      * Test that clicking the export button calls the `handleExportMetaHtml` function.
      * Test that the correct meta tag HTML is retrieved.
      * Mock browser APIs (`URL.createObjectURL`, `Blob`, `link.click`) to verify download initiation.
      * Ensure `URL.revokeObjectURL` is called.
    **Implementation Prompt:** "Write Jest unit tests for the `MetaPreview` component. Mock the necessary browser APIs (`URL.createObjectURL`, `document.createElement`, `link.click`, `URL.revokeObjectURL`). Test that clicking the export button correctly triggers the retrieval of meta HTML and the subsequent download initiation process. Ensure the mocked functions are called with the expected arguments."
    **Example Code:**
    ```javascript
    // Example using Jest and React Testing Library
    import { render, screen, fireEvent } from '@testing-library/react';
    import MetaPreview from './MetaPreview'; // Assuming MetaPreview is in this path

    // Mock browser APIs
    const mockCreateObjectURL = jest.fn();
    const mockRevokeObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock Blob constructor
    let mockBlob = null;
    global.Blob = function(content, options) {
      mockBlob = { content, options };
      return mockBlob;
    };

    // Mock anchor element creation and click
    let mockLink = null;
    const mockLinkClick = jest.fn();
    document.createElement = jest.fn((tag) => {
      if (tag === 'a') {
        mockLink = {
          href: '',
          download: '',
          click: mockLinkClick,
          appendChild: jest.fn(),
          removeChild: jest.fn(),
        };
        return mockLink;
      }
      return document.createElement(tag); // Fallback for other elements
    });

    test('should trigger meta tag export on button click', () => {
      // Render component with mock meta HTML content
      render(<MetaPreview initialMetaHtml="<title>Test</title>" />); // Assuming a prop or state setup

      const exportButton = screen.getByText('Export HTML');
      fireEvent.click(exportButton);

      // Assertions
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
      expect(mockBlob.content[0]).toBe('<title>Test</title>'); // Check content
      expect(mockLink.download).toBe('meta-preview.html');
      expect(mockLinkClick).toHaveBeenCalledTimes(1);
      expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
    });
    ```
- **ID:** T-501
  **Title:** Implement Sitemap Generator UI and Logic
  *(Description):* Develop the interface for URL input and implement the XML sitemap generation logic, including options for priority and change frequency.
  *(User Story):* As a developer, I want to generate XML sitemaps from URL lists so that search engines can crawl my site efficiently.
  *(Priority):* High
  *(Dependencies):* T-101, T-102, T-103
  *(Est. Effort):* Large
  - **Sub-Task ID:** T-501.1
    **Goal:** Create the basic UI structure for the sitemap generator.
    **Task:** Develop the React component for the sitemap generator UI, including input fields for URLs, and controls for priority and change frequency.
    **Rationale:** This sub-task establishes the foundational UI elements required for user interaction with the sitemap generation feature.
    **Expected Outcome:** A functional React component displaying the necessary input fields and controls.
    **Objectives:**
      * Create a new React component file (e.g., `SitemapGenerator.jsx`).
      * Implement a text area for multiple URL inputs.
      * Add input fields or dropdowns for 'priority' (e.g., 0.0 to 1.0).
      * Add input fields or dropdowns for 'change frequency' (e.g., always, hourly, daily, weekly, monthly, yearly, never).
      * Include a button to trigger the sitemap generation.
    **Implementation Prompt:** Create a React functional component named `SitemapGenerator`. It should contain a `textarea` for URL input, an `input type="number"` for priority with min/max attributes, a `select` dropdown for change frequency, and a `button` to submit. Manage the state for these inputs using `useState`.
    **Example Code:**
    ```jsx
    import React, { useState } from 'react';

    function SitemapGenerator() {
      const [urls, setUrls] = useState('');
      const [priority, setPriority] = useState('0.5');
      const [changeFreq, setChangeFreq] = useState('weekly');

      const handleGenerate = () => {
        // Logic to handle generation will go here
        console.log({ urls, priority, changeFreq });
      };

      return (
        <div>
          <h2>Sitemap Generator</h2>
          <textarea
            placeholder="Enter URLs, one per line..."
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            rows="10"
            cols="50"
          />
          <div>
            <label>Priority: </label>
            <input
              type="number"
              step="0.1"
              min="0.0"
              max="1.0"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
          </div>
          <div>
            <label>Change Frequency: </label>
            <select value={changeFreq} onChange={(e) => setChangeFreq(e.target.value)}>
              <option value="always">Always</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="never">Never</option>
            </select>
          </div>
          <button onClick={handleGenerate}>Generate Sitemap</button>
        </div>
      );
    }

    export default SitemapGenerator;
    ```

  - **Sub-Task ID:** T-501.2
    **Goal:** Implement the logic to parse the user-provided URLs.
    **Task:** Write a function that takes the raw string of URLs from the UI and splits it into an array of individual, trimmed URL strings.
    **Rationale:** The raw input needs to be processed into a usable format (an array) for further manipulation and sitemap generation.
    **Expected Outcome:** A JavaScript function that returns an array of clean URL strings.
    **Objectives:**
      * Create a utility function (e.g., `parseUrlsFromString`).
      * The function should accept a single string argument.
      * Split the string by newline characters.
      * Trim whitespace from each resulting URL string.
      * Filter out any empty strings that result from the split.
    **Implementation Prompt:** Implement a JavaScript function `parseUrlsFromString(urlInputString)` that splits the input string by newline characters (`\n`), trims whitespace from each line, and returns a new array containing only non-empty, trimmed URL strings.
    **Example Code:**
    ```javascript
    function parseUrlsFromString(urlInputString) {
      if (!urlInputString) return [];
      return urlInputString
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    }
    ```

  - **Sub-Task ID:** T-501.3
    **Goal:** Implement the core XML sitemap generation logic.
    **Task:** Develop a function that takes an array of URLs and the selected priority/change frequency, and constructs the XML sitemap string according to the sitemap protocol.
    **Rationale:** This is the central logic for transforming user input into the desired XML output format.
    **Expected Outcome:** A function that returns a valid XML sitemap string.
    **Objectives:**
      * Create a function (e.g., `generateSitemapXml`).
      * The function should accept an array of URLs, a default priority, and a default change frequency.
      * It must include the XML declaration and sitemap index schema.
      * For each URL, create a `<url>` entry with `<loc>`, `<lastmod>`, `<changefreq>`, and `<priority>` tags.
      * Use the current date for `<lastmod>`.
    **Implementation Prompt:** Implement a JavaScript function `generateSitemapXml(urls, defaultPriority, defaultChangeFreq)` that generates an XML sitemap string. It should start with `<?xml version="1.0" encoding="UTF-8"?>` and `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`. For each URL in the `urls` array, create a `<url>` element containing `<loc>`, `<lastmod>` (formatted as YYYY-MM-DD), `<changefreq>`, and `<priority>`. Use the provided defaults for priority and change frequency.
    **Example Code:**
    ```javascript
    function generateSitemapXml(urls, defaultPriority, defaultChangeFreq) {
      const today = new Date().toISOString().split('T')[0];
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

      urls.forEach(url => {
        xml += `
    <url>
      <loc>${url}</loc>
      <lastmod>${today}</lastmod>
      <changefreq>${defaultChangeFreq}</changefreq>
      <priority>${defaultPriority}</priority>
    </url>`;
      });

      xml += `
  </urlset>`;
      return xml;
    }
    ```

  - **Sub-Task ID:** T-501.4
    **Goal:** Integrate UI state changes with sitemap generation logic.
    **Task:** Connect the UI input fields and the generate button to the parsing and XML generation functions.
    **Rationale:** This sub-task bridges the UI and the backend logic, making the feature interactive and functional.
    **Expected Outcome:** The "Generate Sitemap" button successfully triggers the process, using current UI values.
    **Objectives:**
      * Update the `handleGenerate` function in the `SitemapGenerator` component.
      * Call `parseUrlsFromString` with the `urls` state.
      * Call `generateSitemapXml` with the parsed URLs and the `priority` and `changeFreq` states.
      * Store the generated XML in a new state variable.
      * Add a way to display or download the generated XML.
    **Implementation Prompt:** Modify the `handleGenerate` function within the `SitemapGenerator` component. It should call `parseUrlsFromString` and `generateSitemapXml` using the component's state variables (`urls`, `priority`, `changeFreq`). Store the resulting XML string in a new state variable called `generatedSitemapXml`. Add a `pre` tag or a download link to display/access the generated XML.
    **Example Code:**
    ```jsx
    // Inside SitemapGenerator component
    const [generatedSitemapXml, setGeneratedSitemapXml] = useState('');

    const handleGenerate = () => {
      const parsedUrls = parseUrlsFromString(urls); // Assuming parseUrlsFromString is imported/defined
      const xml = generateSitemapXml(parsedUrls, priority, changeFreq); // Assuming generateSitemapXml is imported/defined
      setGeneratedSitemapXml(xml);
    };

    // ... in return statement ...
    {generatedSitemapXml && (
      <div>
        <h3>Generated Sitemap:</h3>
        <pre>{generatedSitemapXml}</pre>
        {/* Add download link functionality here */}
      </div>
    )}
    ```

  - **Sub-Task ID:** T-501.5
    **Goal:** Add functionality to download the generated sitemap.
    **Task:** Implement a download mechanism for the generated XML string, allowing users to save it as a `sitemap.xml` file.
    **Rationale:** Users need a way to obtain the generated sitemap file for deployment.
    **Expected Outcome:** A working download button or link for the generated sitemap.
    **Objectives:**
      * Create a function to handle the download.
      * Generate a Blob object from the XML string.
      * Create an object URL for the Blob.
      * Create an anchor tag (`<a>`) dynamically, set its `href` and `download` attributes, and trigger a click event.
      * Add a "Download Sitemap" button next to the generated XML display.
    **Implementation Prompt:** Add a function `handleDownload` to the `SitemapGenerator` component. This function should take the `generatedSitemapXml` state, create a Blob with type `application/xml`, generate an object URL, create a temporary anchor element, set its `href` to the object URL and `download` attribute to `sitemap.xml`, click the anchor, and then revoke the object URL. Add a button that calls this function when clicked.
    **Example Code:**
    ```javascript
    // Inside SitemapGenerator component
    const handleDownload = () => {
      if (!generatedSitemapXml) return;
      const blob = new Blob([generatedSitemapXml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 's
- **ID:** T-502
  **Title:** Add Sitemap Generator Export Functionality
  *(Description):* Implement XML file export for the generated sitemap.
  *(User Story):* As a developer, I want to generate XML sitemaps from URL lists so that search engines can crawl my site efficiently.
  *(Priority):* Medium
  *(Dependencies):* T-501, T-106
  *(Est. Effort):* Small

### Epic: Formats Page
  - **Sub-Task ID:** T-502.1
    **Goal:** Define the structure and content of the XML sitemap file.
    **Task:** Determine the standard XML schema for sitemaps (e.g., `<urlset>`, `<url>`, `<loc>`, `<lastmod>`, `<changefreq>`, `<priority>`) and decide which elements will be included based on the data available from T-501.
    **Rationale:** A well-defined XML structure is crucial for generating a valid and useful sitemap that search engines can parse correctly.
    **Expected Outcome:** A clear specification of the XML sitemap format, including required and optional fields.
    **Objectives:**
      * Identify the core XML sitemap schema.
      * List all data points required for each sitemap entry (URL, last modified date, etc.).
      * Document any decisions on optional fields to be included.
    **Implementation Prompt:** "Based on the sitemap protocol (https://www.sitemaps.org/protocol.html), outline the XML structure for a sitemap file. Specify the mandatory elements and common optional elements like `<lastmod>`, `<changefreq>`, and `<priority>`. Assume data for `<loc>` and potentially `<lastmod>` will be available from a previous task."
    **Example Code:**
    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
            <loc>http://www.example.com/page1</loc>
            <lastmod>2023-10-27</lastmod>
            <changefreq>daily</changefreq>
            <priority>0.8</priority>
        </url>
        <!-- More url entries -->
    </urlset>
    ```

  - **Sub-Task ID:** T-502.2
    **Goal:** Create a function to generate the XML sitemap content from processed URL data.
    **Task:** Develop a reusable function that takes a list of URL objects (as produced by T-501) and constructs the XML string according to the defined schema (from T-502.1).
    **Rationale:** This function will be the core logic for transforming data into the sitemap format, abstracting the XML generation process.
    **Expected Outcome:** A function that accepts URL data and returns a valid XML string representing the sitemap.
    **Objectives:**
      * Implement the function signature, accepting a list of URL data structures.
      * Dynamically build the XML string, iterating through the provided URL data.
      * Ensure correct XML formatting, including proper element nesting and attribute handling.
      * Handle potential edge cases like missing optional data fields gracefully.
    **Implementation Prompt:** "Write a Python function `generate_sitemap_xml(urls_data)` that takes a list of dictionaries, where each dictionary represents a URL and its metadata (e.g., `{'loc': 'http://...', 'lastmod': 'YYYY-MM-DD', ...}`). The function should return a string containing the XML sitemap content, adhering to the standard sitemap protocol. Use Python's `xml.etree.ElementTree` or a similar library for robust XML generation."
    **Example Code:**
    ```python
    import xml.etree.ElementTree as ET
    from datetime import datetime

    def generate_sitemap_xml(urls_data):
        # ... implementation using ET ...
        # root = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
        # for url_info in urls_data:
        #     url_element = ET.SubElement(root, "url")
        #     ET.SubElement(url_element, "loc").text = url_info['loc']
        #     if 'lastmod' in url_info and url_info['lastmod']:
        #         ET.SubElement(url_element, "lastmod").text = url_info['lastmod']
        #     # ... handle other optional fields ...
        # tree = ET.ElementTree(root)
        # ET.indent(tree, space="  ") # For pretty printing
        # return ET.tostring(root, encoding='unicode')
        pass # Placeholder
    ```

  - **Sub-Task ID:** T-502.3
    **Goal:** Implement the file export mechanism for the generated XML sitemap.
    **Task:** Create functionality to save the XML string generated by `generate_sitemap_xml` to a file with a `.xml` extension. This should include defining a default filename or allowing user specification.
    **Rationale:** The primary goal is to export the sitemap, so saving it to a file is a direct requirement.
    **Expected Outcome:** A mechanism to write the sitemap XML content to a specified file path.
    **Objectives:**
      * Implement a function or method to accept the XML content and a desired file path.
      * Write the XML content to the specified file, ensuring correct encoding (UTF-8).
      * Handle potential file I/O errors (e.g., permissions, disk full).
      * Define a default filename convention (e.g., `sitemap.xml`).
    **Implementation Prompt:** "Create a Python function `export_sitemap_to_file(xml_content, file_path='sitemap.xml')` that takes the generated XML string and saves it to the specified `file_path`. Ensure the file is opened in write mode with UTF-8 encoding. Include basic error handling for file operations."
    **Example Code:**
    ```python
    def export_sitemap_to_file(xml_content, file_path='sitemap.xml'):
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(xml_content)
            print(f"Sitemap successfully exported to {file_path}")
        except IOError as e:
            print(f"Error exporting sitemap to {file_path}: {e}")
    ```

  - **Sub-Task ID:** T-502.4
    **Goal:** Integrate sitemap generation and export into a cohesive workflow.
    **Task:** Create a main function or entry point that orchestrates the process: fetching URL data (implicitly from T-501's output/availability), generating the XML content using `generate_sitemap_xml`, and exporting it using `export_sitemap_to_file`.
    **Rationale:** This ties the previous sub-tasks together, providing a complete, runnable feature for generating and exporting the sitemap.
    **Expected Outcome:** A script or function that can be called to produce a `sitemap.xml` file.
    **Objectives:**
      * Define the main execution flow.
      * Ensure data is correctly passed between the generation and export steps.
      * Add basic logging or confirmation messages for the user.
      * Consider how this integrates with T-106 (likely as a command-line interface command or a button click in a UI).
    **Implementation Prompt:** "Create a main function `run_sitemap_export(url_data_source)` that orchestrates the sitemap generation and export. It should accept a source for URL data (e.g., a list of dictionaries or a function to fetch it), call `generate_sitemap_xml`, and then call `export_sitemap_to_file`. Add print statements to indicate progress and success/failure."
    **Example Code:**
    ```python
    # Assuming url_data is available from T-501 or fetched here
    # url_data = fetch_urls_from_source() # Placeholder

    def run_sitemap_export(url_data):
        print("Generating sitemap XML...")
        xml_content = generate_sitemap_xml(url_data) # Assumes generate_sitemap_xml is defined
        if xml_content:
            print("Exporting sitemap to file...")
            export_sitemap_to_file(xml_content) # Assumes export_sitemap_to_file is defined
        else:
            print("Failed to generate sitemap XML.")

    # Example usage:
    # if __name__ == "__main__":
    #     # Replace with actual data source retrieval
    #     sample_url_data = [
    #         {'loc': 'http://example.com/', 'lastmod': '2023-10-27'},
    #         {'loc': 'http://example.com/about', 'lastmod': '2023-10-26'}
    #     ]
    #     run_sitemap_export(sample_url_data)
    ```

  - **Sub-Task ID:** T-502.5
    **Goal:** Write unit tests for the sitemap XML generation and export functions.
    **Task:** Create comprehensive unit tests for `generate_sitemap_xml` and `export_sitemap_to_file` to ensure they function correctly under various conditions.
    **Rationale:** Testing is crucial for verifying the correctness and robustness of the XML generation and file saving logic, ensuring valid sitemaps are produced.
    **Expected Outcome:** A suite of unit tests that pass, confirming the reliability of the sitemap export functionality.
    **Objectives:**
      * Test `generate_sitemap_xml` with empty input, single URL, multiple URLs, and URLs with/without optional metadata.
      * Verify the output XML structure and content against expected valid XML.
      * Test `export_sitemap_to_file` for successful file writing.
      * Test `export_sitemap_to_file` error handling (e.g., invalid path, no write permissions - may require mocking).
      * Ensure tests cover the integration logic in `run_sitemap_export` if applicable.
    **Implementation Prompt:** "Write unit tests using Python's `unittest` or `pytest` framework for the `generate_sitemap_xml` and `export_sitemap_to_file` functions. Use mock objects where necessary, especially for file operations in `export_sitemap_to_file`. Ensure tests cover edge cases like missing data and verify the generated XML structure."
    **Example Code:**
    ```python
    import unittest
    from xml.etree import ElementTree as ET
    # Assume generate_sitemap_xml and export_sitemap_to_file are imported

    class TestSitemapExport(unittest.TestCase):

        def test_generate_sitemap_xml_basic(self):
            urls = [{'loc': 'http://example.com/page1', 'lastmod': '2023-10-27'}]
            xml_string = generate_sitemap_xml(urls)
            root = ET.fromstring(xml_string)
            self.assertEqual(root.tag, 'urlset')
            self.assertEqual(len(root.findall('url')), 1)
            self.assertEqual(root.find('.//loc').text, 'http://example.com/page1')
            # ... more assertions ...

        # def test_export_sitemap_to_file_success(self, mock_open): ...
        # def test_generate_sitemap_xml_empty(self): ...

    ```
- **ID:** T-601
  **Title:** Implement Formats Page Content and UI
  *(Description):* Create the page to list supported document converter formats, including search/filter functionality.
  *(User Story):* As a user, I want to see which document formats the converter supports so that I know what files I can upload.
  *(Priority):* Medium
  *(Dependencies):* T-101, T-102, T-103
  *(Est. Effort):* Medium

## Phase: Cross-Cutting Features

### Epic: Keyboard Shortcuts
  - **Sub-Task ID:** T-601.1
    **Goal:** Define the data structure for a document format.
    **Task:** Create a TypeScript interface or type definition for a single document format object.
    **Rationale:** This defines the shape of the data that will be displayed and filtered, ensuring consistency across the application.
    **Expected Outcome:** A clear, reusable type definition for document formats.
    **Objectives:**
      * Define properties for format name (e.g., 'PDF', 'DOCX').
      * Define properties for file extensions (e.g., ['.pdf', '.docx']).
      * Define properties for MIME types (e.g., 'application/pdf').
      * Define properties for input/output capability (e.g., boolean flags).
    **Implementation Prompt:** "Create a TypeScript interface named `DocumentFormat` with properties for `name` (string), `extensions` (string array), `mimeTypes` (string array), `canInput` (boolean), and `canOutput` (boolean)."
    **Example Code:**
    ```typescript
    interface DocumentFormat {
      name: string;
      extensions: string[];
      mimeTypes: string[];
      canInput: boolean;
      canOutput: boolean;
    }
    ```
  - **Sub-Task ID:** T-601.2
    **Goal:** Fetch and manage the list of supported document formats.
    **Task:** Implement a mechanism (e.g., a React hook or a service) to fetch the list of supported document formats and manage their state.
    **Rationale:** This provides the data needed for the page and abstracts the data fetching logic.
    **Expected Outcome:** A function or hook that returns the list of `DocumentFormat` objects and loading/error states.
    **Objectives:**
      * Define a mock data source for `DocumentFormat` objects.
      * Create a function `getSupportedFormats` that returns a Promise resolving to an array of `DocumentFormat`.
      * Implement basic loading and error handling.
    **Implementation Prompt:** "Create a React hook `useSupportedFormats` that simulates fetching an array of `DocumentFormat` objects after a short delay. It should return an object containing `formats` (array of DocumentFormat), `isLoading` (boolean), and `error` (any)."
    **Example Code:**
    ```typescript
    // Assuming DocumentFormat interface is defined elsewhere
    const mockFormats: DocumentFormat[] = [
      { name: 'PDF', extensions: ['.pdf'], mimeTypes: ['application/pdf'], canInput: true, canOutput: true },
      // ... more formats
    ];

    const useSupportedFormats = () => {
      const [formats, setFormats] = useState<DocumentFormat[]>([]);
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState<any>(null);

      useEffect(() => {
        setIsLoading(true);
        setTimeout(() => {
          setFormats(mockFormats);
          setIsLoading(false);
        }, 500); // Simulate network delay
      }, []);

      return { formats, isLoading, error };
    };
    ```
  - **Sub-Task ID:** T-601.3
    **Goal:** Create the main UI component for the Formats page.
    **Task:** Develop a React component that will serve as the container for the Formats page content.
    **Rationale:** This component will orchestrate the fetching of data and the rendering of the format list and search/filter UI.
    **Expected Outcome:** A React component (`FormatsPage`) that renders basic structure and integrates with the data fetching hook.
    **Objectives:**
      * Create a functional React component named `FormatsPage`.
      * Integrate the `useSupportedFormats` hook to get format data.
      * Render a loading state while data is being fetched.
      * Render an error message if fetching fails.
      * Render a placeholder for the format list and search/filter controls when data is available.
    **Implementation Prompt:** "Create a React component `FormatsPage` that uses the `useSupportedFormats` hook. It should display 'Loading...' when `isLoading` is true, an error message if `error` is present, and a placeholder div for content when data is ready."
    **Example Code:**
    ```jsx
    import React from 'react';
    import useSupportedFormats from './useSupportedFormats'; // Assuming hook is in this file

    const FormatsPage = () => {
      const { formats, isLoading, error } = useSupportedFormats();

      if (isLoading) {
        return <div>Loading supported formats...</div>;
      }

      if (error) {
        return <div>Error loading formats: {error.message}</div>;
      }

      return (
        <div>
          <h1>Supported Document Formats</h1>
          {/* Placeholder for search/filter and list */}
          <div>Search/Filter Controls Here</div>
          <div>Format List Here</div>
        </div>
      );
    };

    export default FormatsPage;
    ```
  - **Sub-Task ID:** T-601.4
    **Goal:** Implement the search and filter input fields.
    **Task:** Create UI elements for searching and filtering the list of document formats.
    **Rationale:** Allows users to quickly find specific formats or filter by input/output capabilities.
    **Expected Outcome:** Input fields and potentially dropdowns/checkboxes for search and filtering.
    **Objectives:**
      * Add a text input field for searching format names or extensions.
      * Add a mechanism (e.g., checkboxes or dropdowns) to filter by 'Can Input' and 'Can Output'.
      * Manage the state of the search query and filter selections within the `FormatsPage` component or a dedicated child component.
    **Implementation Prompt:** "Within the `FormatsPage` component, add a text input for search and two checkboxes labeled 'Supports Input' and 'Supports Output'. Add state variables `searchQuery`, `filterInput`, and `filterOutput` to the `FormatsPage` component and update handlers for these inputs."
    **Example Code:**
    ```jsx
    // Inside FormatsPage component's return statement
    const [searchQuery, setSearchQuery] = useState('');
    const [filterInput, setFilterInput] = useState(false);
    const [filterOutput, setFilterOutput] = useState(false);

    // ... other JSX
    <input
      type="text"
      placeholder="Search formats..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
    <label>
      <input
        type="checkbox"
        checked={filterInput}
        onChange={(e) => setFilterInput(e.target.checked)}
      />
      Supports Input
    </label>
    <label>
      <input
        type="checkbox"
        checked={filterOutput}
        onChange={(e) => setFilterOutput(e.target.checked)}
      />
      Supports Output
    </label>
    // ... rest of JSX
    ```
  - **Sub-Task ID:** T-601.5
    **Goal:** Implement the logic to filter and search the formats list.
    **Task:** Write the code that applies the search query and filter states to the fetched list of document formats.
    **Rationale:** This is the core functionality for the search/filter feature.
    **Expected Outcome:** A derived list of formats that matches the user's search and filter criteria.
    **Objectives:**
      * Filter formats based on `searchQuery` matching `name`, `extensions`, or `mimeTypes`.
      * Filter formats based on `filterInput` state (only show if `canInput` is true).
      * Filter formats based on `filterOutput` state (only show if `canOutput` is true).
      * Combine all filtering logic.
    **Implementation Prompt:** "In the `FormatsPage` component, after fetching `formats`, create a `filteredFormats` variable using `useMemo`. This variable should filter the `formats` array based on `searchQuery` (case-insensitive check against name and extensions) and the `filterInput` and `filterOutput` boolean states."
    **Example Code:**
    ```jsx
    // Inside FormatsPage component, after hook call and state declarations
    const filteredFormats = useMemo(() => {
      return formats.filter(format => {
        const matchesSearch = format.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              format.extensions.some(ext => ext.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesInput = !filterInput || format.canInput;
        const matchesOutput = !filterOutput || format.canOutput;
        return matchesSearch && matchesInput && matchesOutput;
      });
    }, [formats, searchQuery, filterInput, filterOutput]);
    ```
  - **Sub-Task ID:** T-601.6
    **Goal:** Display the filtered list of document formats.
    **Task:** Render the `filteredFormats` array into a user-friendly list or table.
    **Rationale:** Presents the final, filtered results to the user.
    **Expected Outcome:** A visual representation (e.g., list items, table rows) of the document formats.
    **Objectives:**
      * Iterate over the `filteredFormats` array.
      * For each format, display its name, supported extensions, and input/output capabilities.
      * Use appropriate HTML elements (e.g., `<ul>`, `<li>`, `<table>`, `<tr>`, `<td>`).
    **Implementation Prompt:** "In the `FormatsPage` component, replace the 'Format List Here' placeholder with a `<ul>` element. Map over the `filteredFormats` array and render an `<li>` for each format, displaying its `name`, `extensions`, and whether it `canInput` or `canOutput`."
    **Example Code:**
    ```jsx
    // Inside FormatsPage component's return statement, after search/filter controls
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {filteredFormats.map((format) => (
        <li key={format.name} style={{ border: '1px solid #ccc', margin: '5px', padding: '10px' }}>
          <h3>{format.name}</h3>
          <p>Extensions: {format.extensions.join(', ')}</p>
          <p>Input: {format.canInput ? 'Yes' : 'No'}</p>
          <p>Output: {format.canOutput ? 'Yes' : 'No'}</p>
        </li>
      ))}
    </ul>
    ```
  - **Sub-Task ID:** T-601.7
    **Goal:** Add basic styling to the Formats page.
    **Task:** Apply CSS or styling to make the Formats page presentable.
    **Rationale:** Improves user experience and visual appeal.
    **Expected Outcome:** A reasonably styled page with readable text and organized layout.
    **Objectives:**
      * Style the main container, headings, search bar, filter controls, and the list items/table.
      * Ensure consistent spacing and alignment.
      * Make the page responsive if necessary (though not explicitly required by parent task, good practice).
    **Implementation Prompt:** "Add basic CSS styles to the `FormatsPage` component using inline styles or a separate CSS module. Style the main container for padding, the search input and checkboxes for spacing, and the list items for clarity (e.g., borders, margins)."
    **Example Code:**
    ```jsx
    // Example inline styles within FormatsPage component
    const pageStyle = {
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
    };
    const listItemStyle = {
      border: '1px solid #eee',
      borderRadius: '4px',
      marginBottom: '10px',
      padding: '15px',
      backgroundColor: '#f9f9f9',
    };
    // ... apply these styles to JSX elements
    ```
  - **Sub-Task ID:** T-601.8
    **Goal:** Write unit tests for the `useSupportedFormats` hook.
    **Task:** Create tests to verify the behavior of the `useSupportedFormats` hook.
    **Rationale:** Ensures the data fetching and state management logic works correctly.
    **Expected Outcome:** A suite of unit tests that pass for the hook.
    **Objectives:**
      * Test that the hook returns initial loading state.
      * Test that the hook returns formats after simulated delay.
      * Test that the hook handles potential errors (if error simulation is added).
    **Implementation Prompt:** "Write unit tests for the `useSupportedFormats` hook using React Testing Library and Jest. Mock `useEffect` and `setTimeout` to control the timing. Test the initial loading state and the state after the mock data is 'fetched'."
    **Example Code:**
    ```javascript
    // Assuming useSupportedFormats.js and DocumentFormat.ts exist
    import { renderHook, act } from '@testing-library/react-hooks';
    import useSupportedFormats from './useSupportedFormats';

    // Mock setTimeout and useEffect for testing
    jest.useFakeTimers();

    test('should return loading state initially and formats after delay', async () => {
      const { result } = renderHook(() => useSupportedFormats());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.formats).toEqual([]);

      // Advance timers to simulate the delay
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Re-render or wait for state update if necessary (often implicit with act)
      // await new Promise(resolve => setTimeout(resolve, 0)); // Ensure async updates are processed

      expect(result.current.isLoading).toBe(false);
      expect(result.current.formats.length).toBeGreaterThan(0); // Check if data is loaded
    });
    ```
  - **Sub-Task ID:** T-601.9
    **Goal:** Write unit tests for the filtering and search logic.
    **Task:** Create tests to verify that the search and filter functionality correctly processes the format data.
    **Rationale:** Ensures the core user interaction for finding formats is reliable.
    **Expected Outcome:** Unit tests that confirm the `filteredFormats` logic works as expected.
    **Objectives:**
      * Test filtering by name.
      * Test filtering by extension.
      * Test filtering by `canInput` and `canOutput` flags.
      * Test combined filtering scenarios.
    **Implementation Prompt:** "Write unit tests for the filtering logic within the `FormatsPage` component. Create a mock `formats` array and simulate changes to `searchQuery`, `filterInput`, and `filterOutput` states, asserting that the `filteredFormats` (or the output of the filtering function) matches the expected results."
    **Example Code:**
    ```javascript
    // Example test logic (might need to extract filtering function or test component state)
    // Assuming a helper function `applyFilters` exists or testing state updates
    const mockFormats = [
      { name: 'PDF', extensions: ['.pdf'], mimeTypes: ['application/pdf'], canInput: true, canOutput: true },
      { name: 'Word', extensions: ['.doc', '.docx'], mimeTypes: ['application/msword'], canInput: true, canOutput: false },
      { name: 'Image', extensions: ['.png', '.jpg'], mimeTypes: ['image/png'], canInput: true, canOutput: true },
    ];

    // Test case example (simplified)
    test('should filter by name and input capability', () => {
      // Simulate state updates and call the filtering logic
      const searchQuery = 'pdf';
      const filterInput = true;
      const filterOutput = false; // Should not match PDF output

      const result = mockFormats.filter(format => {
         const matchesSearch = format.name.toLowerCase().includes(searchQuery.toLowerCase());
         const matchesInput = !filterInput || format.canInput;
         const matchesOutput = !filterOutput || format.canOutput;
         return matchesSearch && matchesInput && matchesOutput;
      });

      expect(result.length).toBe(0); // PDF matches search and input, but not output filter

      const filterOutputTrue = true;
      const result2 = mockFormats.filter(format => {
         const matchesSearch = format.name.toLowerCase().includes(searchQuery.toLowerCase());
         const matchesInput = !filterInput || format.canInput;
         const matchesOutput = !filterOutputTrue || format.canOutput;
         return matchesSearch && matchesInput && matchesOutput;
      });
       expect(result2.length).toBe(1); // PDF matches search, input, and output
       expect(result2[0].name).toBe('PDF');
    });
    ```
- **ID:** T-701
  **Title:** Implement Global Keyboard Shortcut Handling
  *(Description):* Implement the system for handling keyboard shortcuts, including the global Cmd/Ctrl+Enter trigger and a help modal.
  *(User Story):* All tools (implicit requirement for existing patterns)
  *(Priority):* High
  *(Dependencies):* T-101, T-102
  *(Est. Effort):* Medium
  - **Sub-Task ID:** T-701.1
    **Goal:** Set up the core keyboard event listener.
    **Task:** Implement a global event listener for `keydown` events on the `window` object.
    **Rationale:** This listener will be the central point for capturing all keyboard interactions across the application.
    **Expected Outcome:** A function that is attached to the `window`'s `keydown` event and logs the event object.
    **Objectives:**
      * A `keydown` event listener is attached to the `window`.
      * The listener correctly captures and logs the `event` object.
      * The listener is implemented in a way that can be easily enabled/disabled.
    **Implementation Prompt:** Create a JavaScript function `handleGlobalKeyDown` that accepts an event object. Attach this function as a listener to `window.addEventListener('keydown', handleGlobalKeyDown)`. Ensure the listener is added once and can be removed.
    **Example Code:**
    ```javascript
    function handleGlobalKeyDown(event) {
      console.log('Keydown event:', event);
      // Further processing will be added here
    }

    window.addEventListener('keydown', handleGlobalKeyDown);

    // To remove: window.removeEventListener('keydown', handleGlobalKeyDown);
    ```
  - **Sub-Task ID:** T-701.2
    **Goal:** Detect the global Cmd/Ctrl+Enter shortcut.
    **Task:** Within the global `keydown` listener, add logic to detect if the Cmd (macOS) or Ctrl (Windows/Linux) key is pressed simultaneously with the Enter key.
    **Rationale:** This is the primary shortcut defined for the task, triggering a specific action.
    **Expected Outcome:** The `handleGlobalKeyDown` function logs a specific message or sets a flag when Cmd/Ctrl+Enter is pressed.
    **Objectives:**
      * Check for `event.metaKey` (Cmd) or `event.ctrlKey` (Ctrl).
      * Check for `event.key === 'Enter'` or `event.code === 'Enter'`.
      * Ensure both conditions are met simultaneously.
    **Implementation Prompt:** Modify the `handleGlobalKeyDown` function to include conditional logic. If `(event.metaKey || event.ctrlKey)` is true AND `(event.key === 'Enter' || event.code === 'Enter')`, then execute a specific action (e.g., `console.log('Cmd/Ctrl+Enter detected');`). Prevent default browser behavior for this shortcut.
    **Example Code:**
    ```javascript
    function handleGlobalKeyDown(event) {
      const isCmdOrCtrl = event.metaKey || event.ctrlKey;
      const isEnter = event.key === 'Enter' || event.code === 'Enter';

      if (isCmdOrCtrl && isEnter) {
        console.log('Cmd/Ctrl+Enter detected!');
        event.preventDefault(); // Prevent default browser action
        // Trigger submission or other action
      }
      // ... other shortcut handling
    }
    ```
  - **Sub-Task ID:** T-701.3
    **Goal:** Implement the help modal component.
    **Task:** Create a reusable React component for the help modal that displays shortcut information.
    **Rationale:** This modal will provide users with information about available shortcuts, including the global Cmd/Ctrl+Enter.
    **Expected Outcome:** A functional React component `HelpModal` that can be opened and closed, displaying predefined shortcut information.
    **Objectives:**
      * Create a `HelpModal` component.
      * The component should accept `isOpen` and `onClose` props.
      * Display a title (e.g., "Keyboard Shortcuts").
      * List at least the Cmd/Ctrl+Enter shortcut with its description.
      * Include a close button.
    **Implementation Prompt:** Develop a `HelpModal` component using React and a UI library (e.g., Material-UI, Ant Design, or custom CSS). It should conditionally render based on the `isOpen` prop. The `onClose` prop should be called when the close button is clicked. Structure the modal content to list shortcuts clearly.
    **Example Code:**
    ```jsx
    // Assuming a basic modal structure
    import React from 'react';

    function HelpModal({ isOpen, onClose }) {
      if (!isOpen) return null;

      return (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Keyboard Shortcuts</h2>
            <ul>
              <li>
                <strong>Cmd/Ctrl + Enter:</strong> Submit Form / Perform Action
              </li>
              {/* Add other shortcuts here */}
            </ul>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      );
    }

    export default HelpModal;
    ```
  - **Sub-Task ID:** T-701.4
    **Goal:** Integrate the help modal with a shortcut trigger.
    **Task:** Add a new keyboard shortcut (e.g., Cmd/Ctrl+Shift+?) to open the `HelpModal`.
    **Rationale:** Provides an easy way for users to access help information directly from the application.
    **Expected Outcome:** Pressing the defined shortcut opens the `HelpModal` component.
    **Objectives:**
      * Define a new shortcut combination (e.g., Cmd/Ctrl+Shift+?).
      * Add logic to the global `keydown` listener to detect this new shortcut.
      * Implement state management (e.g., using `useState` in a parent component) to control the `isOpen` prop of `HelpModal`.
      * Render the `HelpModal` component conditionally based on the state.
    **Implementation Prompt:** In the main application component (or a relevant context provider), manage a state variable `isHelpModalOpen`. Add a condition to `handleGlobalKeyDown` to detect the new shortcut (e.g., `event.metaKey || event.ctrlKey` AND `event.shiftKey` AND `event.key === '?'`). If detected, set `isHelpModalOpen` to `true` and call `event.preventDefault()`. Pass `isHelpModalOpen` and a function to set it to `false` (for `onClose`) to the `HelpModal` component.
    **Example Code:**
    ```jsx
    // In a parent component
    import React, { useState } from 'react';
    import HelpModal from './HelpModal'; // Assuming HelpModal is in this path

    function App() {
      const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

      // ... handleGlobalKeyDown logic would be here or passed down ...
      // Example snippet within the handler:
      // if (isCmdOrCtrl && event.shiftKey && event.key === '?') {
      //   setIsHelpModalOpen(true);
      //   event.preventDefault();
      // }

      return (
        <div>
          {/* ... other app content ... */}
          <HelpModal
            isOpen={isHelpModalOpen}
            onClose={() => setIsHelpModalOpen(false)}
          />
        </div>
      );
    }
    ```
  - **Sub-Task ID:** T-701.5
    **Goal:** Define and manage shortcut configurations.
    **Task:** Create a configuration object or array to store all defined keyboard shortcuts, their key combinations, and associated actions/descriptions.
    **Rationale:** Centralizing shortcut definitions makes the system more maintainable, scalable, and easier to update or add new shortcuts.
    **Expected Outcome:** A data structure (e.g., an array of objects) that maps shortcut keys to functions or descriptions.
    **Objectives:**
      * Define a structure for each shortcut (e.g., `{ keys: ['Meta', 'Enter'], action: 'submit', description: 'Submit Form' }`).
      * Include the Cmd/Ctrl+Enter shortcut in this configuration.
      * Include the Help Modal shortcut in this configuration.
      * Create a function or mechanism to iterate over this configuration to register listeners or check key presses.
    **Implementation Prompt:** Create a file (e.g., `shortcuts.js`) exporting an array of shortcut objects. Each object should define `keyCombination` (e.g., an array of key names like `['Control', 'Enter']` or `['Meta', 'Shift', '?']`), an optional `action` identifier (string), and a `description` (string). Refactor the `handleGlobalKeyDown` logic to dynamically check against this configuration.
    **Example Code:**
    ```javascript
    // shortcuts.js
    export const shortcuts = [
      {
        keyCombination: ['Control', 'Enter'], // or ['Meta', 'Enter']
        action: 'submitForm',
        description: 'Submit Form'
      },
      {
        keyCombination: ['Control', 'Shift', '?'], // or ['Meta', 'Shift', '?']
        action: 'openHelp',
        description: 'Open Help Modal'
      }
      // ... other shortcuts
    ];

    // In your event handler:
    // function handleGlobalKeyDown(event) {
    //   const pressedKeys = getPressedKeys(event); // Helper function to get keys
    //   const matchingShortcut = shortcuts.find(shortcut =>
    //     arraysAreEqual(shortcut.keyCombination, pressedKeys)
    //   );
    //   if (matchingShortcut) {
    //     event.preventDefault();
    //     if (matchingShortcut.action === 'submitForm') { /* ... */ }
    //     if (matchingShortcut.action === 'openHelp') { /* ... */ }
    //   }
    // }
    ```
  - **Sub-Task ID:** T-701.6
    **Goal:** Write unit tests for the keyboard shortcut handling logic.
    **Task:** Create unit tests to verify that the correct actions are triggered for the defined keyboard shortcuts.
    **Rationale:** Ensures the shortcut handling logic is robust and functions as expected under various conditions.
    **Expected Outcome:** A suite of unit tests that pass, covering the Cmd/Ctrl+Enter and Help Modal shortcuts.
    **Objectives:**
      * Test the detection of Cmd/Ctrl+Enter.
      * Test the detection of the Help Modal shortcut.
      * Test that `event.preventDefault()` is called for recognized shortcuts.
      * Test that unknown key combinations do not trigger actions.
      * Mock necessary browser event properties (`metaKey`, `ctrlKey`, `shiftKey`, `key`, `preventDefault`).
    **Implementation Prompt:** Using a testing framework like Jest, write tests for the `handleGlobalKeyDown` function (or the module containing it). Simulate `KeyboardEvent` objects with different combinations of modifier keys and main keys. Assert that the correct functions are called (e.g., `preventDefault`, state setters) or that specific outcomes occur.
    **Example Code:**
    ```javascript
    // Example using Jest
    describe('Keyboard Shortcut Handling', () => {
      let mockEvent;
      let preventDefaultSpy;

      beforeEach(() => {
        preventDefaultSpy = jest.fn();
        mockEvent = {
          metaKey: false,
          ctrlKey: false,
          shiftKey: false,
          key: '',
          preventDefault: preventDefaultSpy,
        };
        // Assume handleGlobalKeyDown is imported and available
      });

      test('should trigger submit action on Cmd/Ctrl + Enter', () => {
        mockEvent.ctrlKey = true;
        mockEvent.key = 'Enter';
        // Assume a mock function for submit action is passed or globally available
        // handleGlobalKeyDown(mockEvent);
        // expect(mockSubmitAction).toHaveBeenCalledTimes(1);
        expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
      });

      test('should open help modal on Cmd/Ctrl + Shift + ?', () => {
        mockEvent.metaKey = true;
        mockEvent.shiftKey = true;
        mockEvent.key = '?';
        // Assume a mock function for opening help is passed or globally available
        // handleGlobalKeyDown(mockEvent);
        // expect(mockOpenHelpAction).toHaveBeenCalledTimes(1);
        expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
      });

      test('should not trigger action for unknown keys', () => {
        mockEvent.key = 'a';
        // handleGlobalKeyDown(mockEvent);
        // expect(mockSubmitAction).not.toHaveBeenCalled();
        // expect(mockOpenHelpAction).not.toHaveBeenCalled();
        expect(preventDefaultSpy).not.toHaveBeenCalled();
      });
    });
    ```
- **ID:** T-702
  **Title:** Integrate Keyboard Shortcuts into Each Tool
  *(Description):* Ensure the global shortcut handler correctly triggers the primary action for each of the 5 tools.
  *(User Story):* All tools (implicit requirement for existing patterns)
  *(Priority):* High
  *(Dependencies):* T-701, T-201, T-301, T-401, T-501, T-601
  *(Est. Effort):* Medium

### Epic: Testing and Quality Assurance
  - **Sub-Task ID:** T-702.1
    **Goal:** Define the keyboard shortcut mapping for each tool.
    **Task:** Create a configuration or mapping that associates a specific key combination with the primary action of each of the 5 tools.
    **Rationale:** This mapping is essential for the global shortcut handler to know which action to trigger for each tool.
    **Expected Outcome:** A clear, documented mapping of shortcuts to tool actions.
    **Objectives:**
      * Identify the primary action for each of the 5 tools.
      * Select a unique and intuitive keyboard shortcut for each tool's primary action.
      * Document these mappings in a structured format (e.g., JSON, JS object).
    **Implementation Prompt:** "Create a JavaScript object that maps tool identifiers to their primary action shortcuts. For example, `{ 'tool1': 'Ctrl+Shift+A', 'tool2': 'Alt+B', ... }`. Ensure the shortcuts are represented as strings."
    **Example Code:**
    ```javascript
    const toolShortcutMap = {
      'tool1': 'Ctrl+Shift+A',
      'tool2': 'Alt+B',
      'tool3': 'Cmd+C',
      'tool4': 'Ctrl+D',
      'tool5': 'Shift+E'
    };
    ```
  - **Sub-Task ID:** T-702.2
    **Goal:** Implement the global shortcut handler logic.
    **Task:** Develop the core JavaScript function that listens for keyboard events, checks if a defined shortcut is pressed, and dispatches the corresponding action.
    **Rationale:** This is the central piece of logic that intercepts user input and translates it into tool actions.
    **Expected Outcome:** A functional event listener that can detect and process shortcut key presses.
    **Objectives:**
      * Set up a global event listener for 'keydown' events.
      * Implement logic to capture the pressed key combination (e.g., Ctrl, Shift, Alt, Meta, and the key itself).
      * Compare the captured combination against the defined shortcut map.
      * Ensure the handler only triggers when the application has focus or is globally active as intended.
    **Implementation Prompt:** "Create a JavaScript function `handleGlobalShortcuts(event)` that takes a keyboard event. Inside this function, determine the pressed key combination (e.g., 'Ctrl+Shift+A'). If this combination exists in a provided `toolShortcutMap`, call a placeholder function `triggerToolAction(toolId)` with the corresponding `toolId`. Prevent default browser behavior for recognized shortcuts."
    **Example Code:**
    ```javascript
    function handleGlobalShortcuts(event, toolShortcutMap) {
      const shortcutString = getShortcutStringFromEvent(event); // Assume this helper exists
      if (toolShortcutMap[shortcutString]) {
        const toolId = toolShortcutMap[shortcutString];
        triggerToolAction(toolId); // Assume this function exists
        event.preventDefault();
      }
    }
    ```
  - **Sub-Task ID:** T-702.3
    **Goal:** Integrate the shortcut handler with the application's event system.
    **Task:** Attach the global shortcut handler function to the appropriate event listener in the application's main entry point or a dedicated event management module.
    **Rationale:** The handler needs to be active and listening for events across the application to be effective.
    **Expected Outcome:** The global shortcut handler is registered and actively listening for keyboard events.
    **Objectives:**
      * Identify the correct DOM element or global scope to attach the event listener (e.g., `document`, `window`).
      * Ensure the listener is added only once.
      * Ensure the listener is removed if the component/application unmounts to prevent memory leaks.
    **Implementation Prompt:** "In a main application file (e.g., `App.js` or `main.js`), import the `handleGlobalShortcuts` function and the `toolShortcutMap`. Attach `handleGlobalShortcuts` as a 'keydown' event listener to the `document` object. Ensure proper cleanup by removing the listener on component unmount or application exit."
    **Example Code:**
    ```javascript
    import { handleGlobalShortcuts } from './shortcutHandler';
    import { toolShortcutMap } from './shortcutMap';

    document.addEventListener('keydown', (event) => handleGlobalShortcuts(event, toolShortcutMap));

    // Example cleanup (if using React)
    // useEffect(() => {
    //   document.addEventListener('keydown', (event) => handleGlobalShortcuts(event, toolShortcutMap));
    //   return () => {
    //     document.removeEventListener('keydown', (event) => handleGlobalShortcuts(event, toolShortcutMap));
    //   };
    // }, []);
    ```
  - **Sub-Task ID:** T-702.4
    **Goal:** Implement the `triggerToolAction` function.
    **Task:** Create a function that takes a `toolId` and dispatches the correct action or calls the primary function associated with that tool.
    **Rationale:** This function acts as the bridge between the shortcut handler and the actual functionality of each tool.
    **Expected Outcome:** A function that can reliably activate the primary action of any given tool based on its ID.
    **Objectives:**
      * Create a `triggerToolAction(toolId)` function.
      * Implement a mechanism (e.g., switch statement, object lookup) to map `toolId` to the specific function/method that activates the tool's primary action.
      * Ensure this function can be called from the global shortcut handler.
    **Implementation Prompt:** "Create a JavaScript function `triggerToolAction(toolId)` that accepts a string `toolId`. Use a switch statement or an object lookup to call the corresponding primary action function for each tool (e.g., `activateTool1()`, `activateTool2()`). Assume these tool activation functions are globally available or imported."
    **Example Code:**
    ```javascript
    // Assume these functions are defined elsewhere and imported/available
    // import { activateTool1 } from './tool1';
    // import { activateTool2 } from './tool2';
    // ...

    function triggerToolAction(toolId) {
      switch (toolId) {
        case 'tool1':
          // activateTool1();
          console.log('Activating Tool 1'); // Placeholder
          break;
        case 'tool2':
          // activateTool2();
          console.log('Activating Tool 2'); // Placeholder
          break;
        // ... other tools
        default:
          console.warn(`Unknown toolId: ${toolId}`);
      }
    }
    ```
  - **Sub-Task ID:** T-702.5
    **Goal:** Write unit tests for the shortcut handler logic.
    **Task:** Create comprehensive unit tests to verify that the global shortcut handler correctly identifies shortcuts and triggers the appropriate actions.
    **Rationale:** Ensures the shortcut system functions as expected and prevents regressions in the future.
    **Expected Outcome:** A suite of unit tests that pass, confirming the functionality of the shortcut handler.
    **Objectives:**
      * Test that the handler correctly identifies a valid shortcut.
      * Test that the handler does not trigger for invalid or non-mapped shortcuts.
      * Test that `event.preventDefault()` is called for valid shortcuts.
      * Test that the correct `triggerToolAction` is called with the correct `toolId`.
      * Mock necessary dependencies like `triggerToolAction` and event creation.
    **Implementation Prompt:** "Write unit tests using Jest (or a similar framework) for the `handleGlobalShortcuts` function. Mock the `triggerToolAction` function and create synthetic keyboard events to simulate user input. Assert that `triggerToolAction` is called with the correct arguments for valid shortcuts and not called otherwise. Also, assert that `event.preventDefault()` is called."
    **Example Code:**
    ```javascript
    // Assuming Jest and a testing utility for creating events
    import { handleGlobalShortcuts } from './shortcutHandler';
    import { toolShortcutMap } from './shortcutMap';

    // Mock triggerToolAction
    const mockTriggerToolAction = jest.fn();
    global.triggerToolAction = mockTriggerToolAction; // Or pass as argument

    describe('handleGlobalShortcuts', () => {
      it('should trigger the correct tool action for a valid shortcut', () => {
        const event = new KeyboardEvent('keydown', {
          key: 'A',
          ctrlKey: true,
          shiftKey: true,
          metaKey: false,
          altKey: false
        });
        handleGlobalShortcuts(event, toolShortcutMap);
        expect(mockTriggerToolAction).toHaveBeenCalledWith('tool1');
        expect(event.defaultPrevented).toBe(true);
      });

      it('should not trigger an action for an invalid shortcut', () => {
        const event = new KeyboardEvent('keydown', { key: 'Z' });
        handleGlobalShortcuts(event, toolShortcutMap);
        expect(mockTriggerToolAction).not.toHaveBeenCalled();
      });
    });
    ```
  - **Sub-Task ID:** T-702.6
    **Goal:** Test the integration of shortcuts across all 5 tools.
    **Task:** Perform end-to-end testing to ensure that each of the 5 tools' primary actions can be triggered via their assigned keyboard shortcuts in a live environment.
    **Rationale:** Verifies the complete workflow from key press to tool action execution in the actual application context.
    **Expected Outcome:** Confirmation that all 5 tool shortcuts function correctly.
    **Objectives:**
      * Manually test each of the 5 defined shortcuts.
      * Verify that the correct primary action for each tool is executed.
      * Check for any conflicts or unexpected behavior with other application elements.
      * Document any issues found.
    **Implementation Prompt:** "Manually test the application. For each of the 5 tools, press its assigned keyboard shortcut. Observe and confirm that the tool's primary action is initiated correctly. Note any deviations or errors encountered."
    **Example Code:**
    ```
    // Manual testing steps:
    // 1. Ensure application is running.
    // 2. Press 'Ctrl+Shift+A'. Verify Tool 1 primary action.
    // 3. Press 'Alt+B'. Verify Tool 2 primary action.
    // 4. Press 'Cmd+C'. Verify Tool 3 primary action.
    // 5. Press 'Ctrl+D'. Verify Tool 4 primary action.
    // 6. Press 'Shift+E'. Verify Tool 5 primary action.
    ```
- **ID:** T-801
  **Title:** Develop Unit and Integration Tests
  *(Description):* Write unit tests for shared components and utilities, and integration tests for each tool's core functionality.
  *(User Story):* N/A
  *(Priority):* High
  *(Dependencies):* T-101, T-201, T-301, T-401, T-501, T-601
  *(Est. Effort):* Large
  - **Sub-Task ID:** T-801.1
    **Goal:** Write unit tests for the `formatDate` utility function.
    **Task:** Implement a comprehensive suite of unit tests for the `formatDate` utility function located in `src/utils/dateUtils.js`.
    **Rationale:** Ensures the date formatting utility behaves as expected across various valid and edge-case inputs, preventing potential display issues in the UI.
    **Expected Outcome:** A passing test suite for the `formatDate` function, covering different date formats, timezones, and invalid inputs.
    **Objectives:**
      * Test formatting of standard dates.
      * Test formatting with different locale options.
      * Test formatting of dates with time components.
      * Test handling of null, undefined, and invalid date inputs.
      * Test edge cases like leap years and month boundaries.
    **Implementation Prompt:** Write unit tests for the `formatDate` function using Jest. Cover valid date inputs, different locale formats, dates with and without time, and invalid/edge case inputs. Ensure the tests are located in `src/utils/__tests__/dateUtils.test.js`.
    **Example Code:**
    ```javascript
    // src/utils/__tests__/dateUtils.test.js
    import { formatDate } from '../dateUtils';

    describe('formatDate', () => {
      test('should format a standard date correctly', () => {
        const date = new Date(2023, 10, 21); // November 21, 2023
        expect(formatDate(date)).toBe('November 21, 2023');
      });

      // ... other test cases
    });
    ```

  - **Sub-Task ID:** T-801.2
    **Goal:** Write unit tests for the `calculateTotal` utility function.
    **Task:** Implement unit tests for the `calculateTotal` utility function found in `src/utils/mathUtils.js`.
    **Rationale:** Verifies the accuracy of the total calculation logic, crucial for financial or quantitative features.
    **Expected Outcome:** A passing test suite for the `calculateTotal` function, covering various scenarios including empty arrays, arrays with zero values, and arrays with negative numbers.
    **Objectives:**
      * Test calculation with a typical array of numbers.
      * Test calculation with an empty array.
      * Test calculation with an array containing zero values.
      * Test calculation with an array containing negative numbers.
      * Test calculation with floating-point numbers.
    **Implementation Prompt:** Write unit tests for the `calculateTotal` function using Jest. The function is in `src/utils/mathUtils.js`. Cover scenarios like empty arrays, arrays with positive/negative numbers, zeros, and floats. Place tests in `src/utils/__tests__/mathUtils.test.js`.
    **Example Code:**
    ```javascript
    // src/utils/__tests__/mathUtils.test.js
    import { calculateTotal } from '../mathUtils';

    describe('calculateTotal', () => {
      test('should return 0 for an empty array', () => {
        expect(calculateTotal([])).toBe(0);
      });

      test('should calculate the sum of positive numbers', () => {
        expect(calculateTotal([1, 2, 3])).toBe(6);
      });

      // ... other test cases
    });
    ```

  - **Sub-Task ID:** T-801.3
    **Goal:** Write unit tests for the `Button` shared component.
    **Task:** Create unit tests for the `Button` component located in `src/components/common/Button.jsx`.
    **Rationale:** Ensures the `Button` component renders correctly, handles props like `onClick`, `disabled`, and `variant` as expected, and is accessible.
    **Expected Outcome:** A passing test suite for the `Button` component, verifying its rendering, event handling, and prop functionality.
    **Objectives:**
      * Test rendering of the button with default props.
      * Test rendering with different `variant` props (e.g., 'primary', 'secondary').
      * Test the `onClick` handler is called when the button is clicked.
      * Test that the button is correctly rendered as `disabled` when the `disabled` prop is true.
      * Test accessibility attributes if applicable.
    **Implementation Prompt:** Write unit tests for the `Button` component using React Testing Library and Jest. The component is in `src/components/common/Button.jsx`. Test rendering, different variants, click events, and the disabled state. Place tests in `src/components/common/__tests__/Button.test.jsx`.
    **Example Code:**
    ```jsx
    // src/components/common/__tests__/Button.test.jsx
    import React from 'react';
    import { render, screen, fireEvent } from '@testing-library/react';
    import Button from '../Button';

    describe('Button', () => {
      test('renders button with text', () => {
        render(<Button>Click Me</Button>);
        expect(screen.getByText('Click Me')).toBeInTheDocument();
      });

      test('calls onClick handler when clicked', () => {
        const handleClick = jest.fn();
        render(<Button onClick={handleClick}>Clickable</Button>);
        fireEvent.click(screen.getByText('Clickable'));
        expect(handleClick).toHaveBeenCalledTimes(1);
      });

      // ... other test cases
    });
    ```

  - **Sub-Task ID:** T-801.4
    **Goal:** Write unit tests for the `Input` shared component.
    **Task:** Develop unit tests for the `Input` component located in `src/components/common/Input.jsx`.
    **Rationale:** Guarantees the `Input` component handles user input, state changes, and various props (like `type`, `placeholder`, `value`, `onChange`) correctly.
    **Expected Outcome:** A passing test suite for the `Input` component, verifying its rendering, input handling, and prop interactions.
    **Objectives:**
      * Test rendering of the input field with a placeholder.
      * Test that the input value is correctly displayed.
      * Test that the `onChange` handler is called with the correct value when the input changes.
      * Test different input types (e.g., 'text', 'password', 'email').
      * Test the `disabled` state.
    **Implementation Prompt:** Write unit tests for the `Input` component using React Testing Library and Jest. The component is in `src/components/common/Input.jsx`. Test rendering, value display, input change events, different types, and the disabled state. Place tests in `src/components/common/__tests__/Input.test.jsx`.
    **Example Code:**
    ```jsx
    // src/components/common/__tests__/Input.test.jsx
    import React from 'react';
    import { render, screen, fireEvent } from '@testing-library/react';
    import Input from '../Input';

    describe('Input', () => {
      test('renders input with placeholder', () => {
        render(<Input placeholder="Enter text" />);
        expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
      });

      test('updates value on change', () => {
        const handleChange = jest.fn();
        render(<Input onChange={handleChange} value="" />);
        const inputElement = screen.getByRole('textbox');
        fireEvent.change(inputElement, { target: { value: 'test input' } });
        expect(handleChange).toHaveBeenCalledTimes(1);
        // Note: Testing the actual value update might require managing state in the test
        // or asserting on the event object passed to the handler.
      });

      // ... other test cases
    });
    ```

  - **Sub-Task ID:** T-801.5
    **Goal:** Write integration tests for the User Profile Tool.
    **Task:** Create integration tests for the User Profile Tool, ensuring end-to-end functionality from API interaction to UI display. Assume the tool's entry point is `src/tools/userProfile/UserProfileTool.jsx`.
    **Rationale:** Validates that the User Profile Tool functions correctly as a whole, including data fetching, state management, and rendering, by simulating user interactions.
    **Expected Outcome:** A passing integration test suite that covers key user flows for the User Profile Tool.
    **Objectives:**
      * Test fetching and displaying user profile data.
      * Test updating user profile information and verifying the changes.
      * Test handling of API errors during data fetching or updates.
      * Test loading states.
    **Implementation Prompt:** Write integration tests for the User Profile Tool using React Testing Library and Jest, potentially mocking API calls using `jest.mock`. Assume the main component is `src/tools/userProfile/UserProfileTool.jsx` and related API functions are in `src/api/userProfileApi.js`. Cover fetching, updating, and error scenarios. Place tests in `src/tools/userProfile/__tests__/UserProfileTool.integration.test.jsx`.
    **Example Code:**
    ```jsx
    // src/tools/userProfile/__tests__/UserProfileTool.integration.test.jsx
    import React from 'react';
    import { render, screen, fireEvent, waitFor } from '@testing-library/react';
    import UserProfileTool from '../UserProfileTool';
    import * as userProfileApi from '../../../api/userProfileApi'; // Mock this

    // Mock the API module
    jest.mock('../../../api/userProfileApi');

    describe('UserProfileTool Integration Tests', () => {
      beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        // Set default mock implementations
        userProfileApi.fetchUserProfile.mockResolvedValue({ id: 1, name: 'John Doe', email: 'john@example.com' });
        userProfileApi.updateUserProfile.mockResolvedValue({ success: true });
      });

      test('fetches and displays user profile data', async () => {
        render(<UserProfileTool userId={1} />);
        expect(await screen.findByText('Loading profile...')).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByText('Loading profile...')).not.toBeInTheDocument());
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      // ... other integration test cases
    });
    ```

  - **Sub-Task ID:** T-801.6
    **Goal:** Write integration tests for the Data Visualization Tool.
    **Task:** Develop integration tests for the Data Visualization Tool, ensuring its core functionality works end-to-end. Assume the tool's entry point is `src/tools/dataVisualization/DataVisualizationTool.jsx`.
    **Rationale:** Verifies that the Data Visualization Tool correctly fetches data, processes it, and renders charts or visualizations as expected.
    **Expected Outcome:** A passing integration test suite covering the primary data loading and visualization rendering paths for the Data Visualization Tool.
    **Objectives:**
      * Test fetching and rendering of chart data.
      * Test re-rendering of charts when data filters or parameters change.
      * Test handling of empty data sets or API errors.
      * Test different chart types if applicable.
    **Implementation Prompt:** Write integration tests for the Data Visualization Tool using React Testing Library and Jest, mocking necessary API calls. Assume the main component is `src/tools/dataVisualization/DataVisualizationTool.jsx` and related API functions are in `src/api/dataVisualizationApi.js`. Cover data fetching, rendering, and potential error states. Place tests in `src/tools/dataVisualization/__tests__/DataVisualizationTool.integration.test.jsx`.
    **Example Code:**
    ```jsx
    // src/tools/dataVisualization/__tests__/DataVisualizationTool.integration.test.jsx
    import React from 'react';
    import { render, screen, waitFor } from '@testing-library/react';
    import DataVisualizationTool from '../DataVisualizationTool';
    import * as dataVisualizationApi from '../../../api/dataVisualizationApi';

    jest.mock('../../../api/dataVisualizationApi');

    describe('DataVisualizationTool Integration Tests', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        dataVisualizationApi.fetchChartData.mockResolvedValue([
          { x: 'A', y: 10 },
          { x: 'B', y: 20 },
        ]);
      });

      test('renders chart with fetched data', async () => {
        render(<DataVisualizationTool />);
        // Assuming the chart component renders after data is fetched
        await waitFor(() => {
          // Assert based on how the chart is rendered or identifiable elements
          // This might involve checking for canvas elements, SVG elements, or specific text labels
          expect(screen.getByText('Chart Area')).toBeInTheDocument(); // Example placeholder
        });
        expect(dataVisualizationApi.fetchChartData).toHaveBeenCalledTimes(1);
      });

      // ... other integration test cases
    });
    ```

  - **Sub-Task ID:** T-801.7
    **Goal:** Write integration tests for the Reporting Tool.
    **Task:** Create integration tests for the Reporting Tool, verifying its ability to generate and display reports. Assume the tool's entry point is `src/tools/reporting/ReportingTool.jsx`.
    **Rationale:** Ensures the Reporting Tool correctly fetches report data, applies filters, and renders the report content accurately.
    **Expected Outcome:** A passing integration test suite for the Reporting Tool, covering report generation and display scenarios.
    **Objectives:**
      * Test fetching and displaying a default report.
      * Test applying filters (e.g., date range, category) and updating the report.
      * Test handling of empty report data or generation errors.
      * Test export functionality if applicable.
    **Implementation Prompt:** Write integration tests for the Reporting Tool using React Testing Library and Jest, mocking API calls. Assume the main component is `src/tools/reporting/ReportingTool.jsx` and related API functions are in `src/api/reportingApi.js`. Cover default report display, filtering, and error handling. Place tests in `src/tools/reporting/__tests__/ReportingTool.integration.test.jsx`.
    **Example Code:**
    ```jsx
    // src/tools/reporting/__tests__/ReportingTool.integration.test.jsx
    import React from 'react';
    import { render, screen, fireEvent, waitFor } from '@testing-library/react';
    import ReportingTool from '../ReportingTool';
    import * as reportingApi from '../../../api/reportingApi';

    jest.mock('../../../api/reportingApi');

    describe('ReportingTool Integration Tests', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        reportingApi.generateReport.mockResolvedValue({
          title: 'Sample Report',
          data: [['Header1', 'Header2'], ['Row1Col1', 'Row1Col2']],
        });
      });

      test('displays default report data', async () => {
        render(<ReportingTool />);
        await waitFor(() => expect(screen.getByText('Sample Report')).toBeInTheDocument());
        expect(screen.getByText('Row1Col1')).toBeInTheDocument();
      });

      test('updates report when filters are applied', async () => {
        reportingApi.generateReport.mockResolvedValueOnce({ // Mock for initial load
          title: 'Default Report', data: [['A', '1']]
        }).mockResolvedValueOnce({ // Mock for filtered load
          title: 'Filtered Report', data: [['B', '2']]
        });

        render(<ReportingTool />);
        await waitFor(() => expect(screen.getByText('Default Report')).toBeInTheDocument());

        // Simulate applying a filter (e.g., changing a date picker)
        // fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2023-12-31' } });
        // await waitFor(() => expect(screen.getByText('Filtered Report')).toBeInTheDocument());
        // expect(reportingApi.generateReport).toHaveBeenCalledTimes(2);
      });

      // ... other integration test cases
    });
    ```

  - **Sub-Task ID:** T-801.8
    **Goal:** Write integration tests for the Settings Management Tool.
    **Task:** Develop integration tests for the Settings Management Tool, ensuring CRUD operations for settings function correctly. Assume the tool's entry point is `src/tools/settings/SettingsManagementTool.jsx`.
    **Rationale:** Verifies that users can view, create, update, and delete settings through the UI, and that these changes are persisted correctly.
    **Expected Outcome:** A passing integration test suite for the Settings Management Tool, covering the full lifecycle of managing settings.
    **Objectives:**
      * Test fetching and displaying existing settings.
      * Test creating a new setting.
      * Test updating an existing setting.
      * Test deleting a setting.
      * Test handling of validation errors or API failures.
    **Implementation Prompt:** Write integration tests for the Settings Management Tool using React Testing Library and Jest, mocking API calls. Assume the main component is `src/tools/settings/SettingsManagementTool.jsx` and related API functions are in `src/api/settingsApi.js`. Cover all CRUD operations and error handling. Place tests in `src/tools/settings/__tests__/SettingsManagementTool.integration.test.jsx`.
    **Example Code:**
    ```jsx
    // src/tools/settings/__tests__/SettingsManagementTool.integration.test.jsx
    import React from 'react';
    import { render, screen, fireEvent, waitFor } from '@testing-library/react';
    import SettingsManagementTool from '../SettingsManagementTool';
    import * as settingsApi from '../../../api/settingsApi';

    jest.mock('../../../api/settingsApi');

    describe('SettingsManagementTool Integration Tests', () => {
      const mockSettings = [{ id: 'theme', value: 'dark' }];

      beforeEach(() => {
        jest.clearAllMocks();
        settingsApi.fetchSettings.mockResolvedValue(mockSettings);
        settingsApi.createSetting.mockResolvedValue({ id: 'language', value: 'en' });
        settingsApi.updateSetting.mockResolvedValue({ success: true });
        settingsApi.deleteSetting.mockResolvedValue({ success: true });
      });

      test('displays existing settings', async () => {
        render(<SettingsManagementTool />);
        await waitFor(() => expect(screen.getByText('theme')).toBeInTheDocument());
        expect(screen.getByText('dark')).toBeInTheDocument();
      });

      test('creates a new setting', async () => {
        render(<SettingsManagementTool />);
        await waitFor(() => expect(screen.getByText('theme')).toBeInTheDocument()); // Ensure initial load

        fireEvent.click(screen.getByText('Add Setting'));
        fireEvent.change(screen.getByLabelText('Setting ID'), { target: { value: 'language' } });
        fireEvent.change(screen.getByLabelText('Setting Value'), { target: { value: 'en' } });
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => expect(settingsApi.createSetting).toHaveBeenCalledTimes(1));
        expect(screen.getByText('language')).toBeInTheDocument();
      });

      // ... other CRUD test cases (update, delete)
    });
    ```

  - **Sub-Task ID:** T-801.9
    **Goal:** Write integration tests for the User Authentication Tool.
    **Task:** Create integration tests for the User Authentication Tool, covering login, logout, and registration flows. Assume the tool's entry point is `src/tools/authentication/AuthenticationTool.jsx`.
    **Rationale:** Ensures the authentication process is secure and functional, validating user credentials, session management, and user registration.
    **Expected Outcome:** A passing integration test suite for the User Authentication Tool, covering successful and failed login/logout/registration attempts.
    **Objectives:**
      * Test successful user login.
      * Test failed login with incorrect credentials.
      * Test user logout.
      * Test user registration.
      * Test handling of API errors during authentication processes.
    **Implementation Prompt:** Write integration tests for the User Authentication Tool using React Testing Library and Jest, mocking API calls. Assume the main component is `src/tools/authentication/AuthenticationTool.jsx` and related API functions are in `src/api/authApi.js`. Cover login (success/fail), logout, and registration. Place tests in `src/tools/authentication/__tests__/AuthenticationTool.integration.test.jsx`.
    **Example Code:**
    ```jsx
    // src/tools/authentication/__tests__/AuthenticationTool.integration.test.jsx
    import React from 'react';
    import { render, screen, fireEvent, waitFor } from '@testing-library/react';
    import AuthenticationTool from '../AuthenticationTool';
    import * as authApi from '../../../api/authApi';

    jest.mock('../../../api/authApi');

    describe('AuthenticationTool Integration Tests', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        authApi.login.mockResolvedValue({ success: true, token: 'fake-token' });
        authApi.logout.mockResolvedValue({ success: true });
        authApi.register.mockResolvedValue({ success: true });
      });

      test('allows successful user login', async () => {
        render(<AuthenticationTool />);
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
        fireEvent.click(screen.getByText('Login'));

        await waitFor(() => expect(authApi.login).toHaveBeenCalledTimes(1));
        // Assert redirection or UI change indicating successful login
        expect(screen.getByText('Welcome, test@example.com!')).toBeInTheDocument(); // Example
      });

      test('shows error message for failed login', async () => {
        authApi.login.mockRejectedValue(new Error('Invalid credentials'));
        render(<AuthenticationTool />);
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'wrong@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpassword' } });
        fireEvent.click(screen.getByText('Login'));

        await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeInTheDocument());
      });

      // ... test cases for logout and registration
    });
    ```
- **ID:** T-802
  **Title:** Perform Cross-Browser and Device Testing
  *(Description):* Test the application's UI and functionality across major browsers (Chrome, Firefox, Safari, Edge) and different screen sizes.
  *(User Story):* N/A
  *(Priority):* High
  *(Dependencies):* T-201, T-301, T-401, T-501, T-601
  *(Est. Effort):* Medium
  - **Sub-Task ID:** T-802.1
    **Goal:** Set up a testing environment for cross-browser and device compatibility.
    **Task:** Configure a local or cloud-based testing environment that allows for simulating different browsers and devices.
    **Rationale:** A dedicated environment is crucial for consistent and reproducible testing across various platforms.
    **Expected Outcome:** A functional testing environment capable of rendering the application in target browsers and device viewports.
    **Objectives:**
      * Identify and select a suitable cross-browser testing tool/service (e.g., BrowserStack, Sauce Labs, local VMs, Docker containers).
      * Install and configure the chosen testing tool/service.
      * Verify that the environment can launch specified browser versions.
      * Verify that the environment can simulate different device viewports (e.g., mobile, tablet, desktop).
    **Implementation Prompt:** "Set up a cross-browser and device testing environment using [Chosen Tool/Service, e.g., BrowserStack]. Configure it to support the latest versions of Chrome, Firefox, Safari, and Edge, as well as common mobile and tablet viewports. Provide instructions on how to access and use this environment for testing."
    **Example Code:**
    ```bash
    # Example command for launching a test session (tool-specific)
    # browserstack-local --config browserstack.yml
    # npx cypress run --browser chrome --config viewportWidth=375,viewportHeight=667
    ```

  - **Sub-Task ID:** T-802.2
    **Goal:** Test core UI elements and layout responsiveness in Chrome.
    **Task:** Execute a series of UI tests on the latest version of Google Chrome, focusing on layout, element rendering, and responsiveness across different viewport sizes.
    **Rationale:** Chrome is a widely used browser, and ensuring its compatibility is a primary step in cross-browser testing. Responsiveness checks are vital for a good user experience on all devices.
    **Expected Outcome:** A report detailing any UI discrepancies or responsiveness issues found in Chrome, along with screenshots or recordings.
    **Objectives:**
      * Test the application on a desktop Chrome viewport.
      * Test the application on common mobile viewports (e.g., iPhone X, Android phone) in Chrome.
      * Test the application on common tablet viewports (e.g., iPad) in Chrome.
      * Verify that all UI elements (buttons, forms, navigation, images) render correctly without visual glitches.
      * Verify that the layout adapts appropriately to different screen sizes without breaking or overlapping elements.
    **Implementation Prompt:** "Using the configured testing environment, perform UI and responsiveness testing for the application in Google Chrome (latest version). Focus on verifying the correct rendering of all UI components and the adaptive nature of the layout across desktop, tablet, and mobile viewports. Document any visual bugs or layout issues found."
    **Example Code:**
    ```javascript
    // Example Cypress test snippet for viewport testing
    describe('Responsive UI Tests - Chrome', () => {
      it('should render correctly on mobile viewport', () => {
        cy.viewport('iphone-6'); // Sets viewport to iPhone 6 dimensions
        cy.visit('/your-app-url');
        cy.matchImageSnapshot('mobile-view-chrome'); // Example for visual regression testing
        // Add assertions for specific UI elements
      });

      it('should render correctly on desktop viewport', () => {
        cy.viewport(1280, 720); // Sets custom desktop viewport
        cy.visit('/your-app-url');
        cy.matchImageSnapshot('desktop-view-chrome');
        // Add assertions for specific UI elements
      });
    });
    ```

  - **Sub-Task ID:** T-802.3
    **Goal:** Test core UI elements and layout responsiveness in Firefox.
    **Task:** Execute a series of UI tests on the latest version of Mozilla Firefox, focusing on layout, element rendering, and responsiveness across different viewport sizes.
    **Rationale:** Firefox is another major browser, and ensuring compatibility is essential for reaching a wider audience.
    **Expected Outcome:** A report detailing any UI discrepancies or responsiveness issues found in Firefox, along with screenshots or recordings.
    **Objectives:**
      * Test the application on a desktop Firefox viewport.
      * Test the application on common mobile viewports in Firefox.
      * Test the application on common tablet viewports in Firefox.
      * Verify that all UI elements render correctly without visual glitches.
      * Verify that the layout adapts appropriately to different screen sizes.
    **Implementation Prompt:** "Perform UI and responsiveness testing for the application in Mozilla Firefox (latest version). Verify correct rendering and layout adaptation across desktop, tablet, and mobile viewports. Document any visual bugs or layout issues."
    **Example Code:**
    ```javascript
    // Example Playwright test snippet for viewport testing
    import { test, expect } from '@playwright/test';

    test('Firefox mobile responsiveness', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE dimensions
      await page.goto('/your-app-url');
      // Add assertions for specific UI elements or visual checks
      await expect(page).toHaveScreenshot('firefox-mobile.png');
    });
    ```

  - **Sub-Task ID:** T-802.4
    **Goal:** Test core UI elements and layout responsiveness in Safari.
    **Task:** Execute a series of UI tests on the latest version of Apple Safari, focusing on layout, element rendering, and responsiveness across different viewport sizes.
    **Rationale:** Safari is the default browser on Apple devices, making its compatibility critical, especially for mobile users.
    **Expected Outcome:** A report detailing any UI discrepancies or responsiveness issues found in Safari, along with screenshots or recordings.
    **Objectives:**
      * Test the application on a desktop Safari viewport.
      * Test the application on common iOS mobile viewports (e.g., iPhone) in Safari.
      * Test the application on common iPad viewports in Safari.
      * Verify that all UI elements render correctly without visual glitches.
      * Verify that the layout adapts appropriately to different screen sizes.
    **Implementation Prompt:** "Perform UI and responsiveness testing for the application in Apple Safari (latest version). Verify correct rendering and layout adaptation across desktop, tablet, and mobile viewports, paying close attention to iOS device simulations. Document any visual bugs or layout issues."
    **Example Code:**
    ```javascript
    // Example Selenium WebDriver test snippet for viewport testing (using capabilities)
    const { Builder, By, Key, until } = require('selenium-webdriver');
    const Safari = require('selenium-webdriver/safari');

    async function testSafariResponsiveness() {
      let driver = await new Builder()
        .forBrowser(Browser.SAFARI)
        .setSafariOptions(new Safari.Options().setTechnologyPreview(false)) // Or true if needed
        .build();

      await driver.manage().window().setRect({ width: 375, height: 667 }); // Simulate iPhone X
      await driver.get('/your-app-url');
      // Add assertions for specific UI elements
      await driver.takeScreenshot().then(png => { /* save screenshot */ });
      await driver.quit();
    }
    ```

  - **Sub-Task ID:** T-802.5
    **Goal:** Test core UI elements and layout responsiveness in Edge.
    **Task:** Execute a series of UI tests on the latest version of Microsoft Edge, focusing on layout, element rendering, and responsiveness across different viewport sizes.
    **Rationale:** Edge is the default browser on Windows and is increasingly popular, necessitating thorough compatibility checks.
    **Expected Outcome:** A report detailing any UI discrepancies or responsiveness issues found in Edge, along with screenshots or recordings.
    **Objectives:**
      * Test the application on a desktop Edge viewport.
      * Test the application on common mobile viewports in Edge.
      * Test the application on common tablet viewports in Edge.
      * Verify that all UI elements render correctly without visual glitches.
      * Verify that the layout adapts appropriately to different screen sizes.
    **Implementation Prompt:** "Perform UI and responsiveness testing for the application in Microsoft Edge (latest version). Verify correct rendering and layout adaptation across desktop, tablet, and mobile viewports. Document any visual bugs or layout issues."
    **Example Code:**
    ```python
    # Example Playwright test snippet for viewport testing (Python)
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge") # Use msedge channel for Edge
        context = browser.new_context(
            viewport={"width": 768, "height": 1024} # Simulate iPad viewport
        )
        page = context.new_page()
        page.goto("/your-app-url")
        # Add assertions for specific UI elements
        page.screenshot(path="edge-tablet.png")
        browser.close()
    ```

  - **Sub-Task ID:** T-802.6
    **Goal:** Test core application functionality across all target browsers and devices.
    **Task:** Execute key user flows and critical functionalities of the application in each target browser (Chrome, Firefox, Safari, Edge) and across representative device viewports.
    **Rationale:** UI rendering is only one aspect; ensuring that the application's core features work as expected on different platforms is paramount for user satisfaction and application stability.
    **Expected Outcome:** A report detailing any functional bugs or regressions found across different browser/device combinations.
    **Objectives:**
      * Identify 3-5 critical user flows/features to test (e.g., user login, data submission, core feature interaction).
      * Execute each critical flow in Chrome (desktop and mobile).
      * Execute each critical flow in Firefox (desktop and mobile).
      * Execute each critical flow in Safari (desktop and mobile).
      * Execute each critical flow in Edge (desktop and mobile).
      * Document any functional errors, unexpected behavior, or performance degradation.
    **Implementation Prompt:** "Execute the following critical user flows: [List critical flows, e.g., User Registration, Item Purchase, Form Submission]. Test these flows across the latest versions of Chrome, Firefox, Safari, and Edge, simulating both desktop and common mobile viewports for each. Record any functional discrepancies or errors encountered."
    **Example Code:**
    ```javascript
    // Example Jest/Puppeteer test for a functional flow
    const puppeteer = require('puppeteer');

    async function testLoginFlow(browserType, viewport) {
      const browser = await puppeteer[browserType].launch();
      const page = await browser.newPage();
      await page.setViewportSize(viewport);
      await page.goto('/login');
      await page.type('#username', 'testuser');
      await page.type('#password', 'password');
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      // Assert that login was successful (e.g., check for dashboard element)
      expect(await page.$('#dashboard')).not.toBeNull();
      await browser.close();
    }

    // Call testLoginFlow for each browser/viewport combination
    ```

  - **Sub-Task ID:** T-802.7
    **Goal:** Consolidate and report cross-browser/device testing results.
    **Task:** Gather all findings from the UI and functional testing performed across different browsers and devices, and compile them into a comprehensive report.
    **Rationale:** A consolidated report provides a clear overview of the application's compatibility status, highlights areas needing attention, and informs release decisions.
    **Expected Outcome:** A detailed report summarizing the testing scope, methodologies, identified issues (with severity and priority), and overall compatibility assessment.
    **Objectives:**
      * Compile all documented UI issues (visual glitches, layout problems).
      * Compile all documented functional issues (bugs, regressions).
      * Categorize issues by browser/device where they occurred.
      * Assign severity and priority to each identified issue.
      * Provide screenshots or recordings for critical issues.
      * Summarize the overall compatibility status of the application.
    **Implementation Prompt:** "Create a comprehensive report detailing the results of the cross-browser and device testing. Include sections for: Testing Scope (browsers, devices, versions tested), Methodology, Summary of Findings, Detailed Issue Log (with descriptions, affected platforms, severity, priority, and evidence), and Overall Compatibility Assessment. Ensure the report is clear, concise, and actionable."
    **Example Code:**
    ```markdown
    # Cross-Browser & Device Testing Report - [Date]

    ## 1. Testing Scope
    * **Browsers:** Chrome (Latest), Firefox (Latest), Safari (Latest), Edge (Latest)
    * **Devices/Viewports:** Desktop, iPhone X (Mobile), iPad (Tablet)
    * **Key Features Tested:** [List key features/flows]

    ## 2. Methodology
    * Manual testing and automated checks were performed using [Tool/Service Name].
    * Visual regression checks were conducted where applicable.

    ## 3. Summary of Findings
    * Overall compatibility is [Good/Fair/Poor].
    * [X] Critical issues found.
    * [Y] Major issues found.
    * [Z] Minor issues found.

    ## 4. Detailed Issue Log
    ### Issue T-802.7.1: [Issue Title]
    * **Description:** [Detailed description of the bug]
    * **Affected Platforms:** Chrome (Desktop), Firefox (Mobile)
    * **Severity:** Critical
    * **Priority:** High
    * **Evidence:** [Link to screenshot/recording]

    ## 5. Overall Compatibility Assessment
    * [Concluding remarks on the application's readiness for release across platforms]
    ```
- **ID:** T-803
  **Title:** Conduct Accessibility Testing
  *(Description):* Audit the application for WCAG 2.1 AA compliance and address any identified issues.
  *(User Story):* N/A
  *(Priority):* Medium
  *(Dependencies):* T-201, T-301, T-401, T-501, T-601
  *(Est. Effort):* Medium

## Phase: Deployment and Polish

### Epic: Optimization and Deployment
  - **Sub-Task ID:** T-803.1
    **Goal:** Plan and prepare for accessibility testing.
    **Task:** Define the scope, methodology, and tools for WCAG 2.1 AA compliance testing.
    **Rationale:** A clear plan ensures comprehensive and efficient testing, covering all critical areas of the application.
    **Expected Outcome:** A documented testing plan including target pages/features, testing tools (e.g., Axe, Lighthouse, screen readers), and success criteria.
    **Objectives:**
      * Identify key user flows and pages to be tested.
      * Select appropriate automated accessibility testing tools.
      * Determine manual testing procedures (e.g., keyboard navigation, screen reader testing).
      * Define the specific WCAG 2.1 AA success criteria to be verified.
    **Implementation Prompt:** "Generate a detailed accessibility testing plan document. Include sections for: Scope (list of pages/features), Methodology (automated tools, manual checks like keyboard navigation, screen reader testing), Tools (specific software/extensions), and Success Criteria (referencing WCAG 2.1 AA guidelines). Assume the application is a web-based React application."
    **Example Code:**
    ```markdown
    # Accessibility Testing Plan - [Application Name]

    ## 1. Scope
    - Key User Flows: [e.g., User Registration, Login, Product Search, Checkout]
    - Critical Pages: [e.g., Homepage, Product Listing, Product Detail, Cart, Settings]

    ## 2. Methodology
    ### Automated Testing
    - Tools: Axe DevTools, Lighthouse
    - Process: Run automated scans on all scoped pages, review reported issues.

    ### Manual Testing
    - Keyboard Navigation: Ensure all interactive elements are focusable and operable via keyboard.
    - Screen Reader Testing: Test key flows with NVDA/JAWS/VoiceOver, verifying content structure and ARIA attributes.
    - Color Contrast: Verify contrast ratios for text and interactive elements.
    - Zoom/Magnification: Test responsiveness and readability at 200% zoom.

    ## 3. Tools
    - Browser Extensions: Axe DevTools, WAVE
    - Performance/Audit Tools: Lighthouse (Chrome DevTools)
    - Screen Readers: NVDA (Windows), VoiceOver (macOS), JAWS (Windows)

    ## 4. Success Criteria
    - Adherence to WCAG 2.1 Level AA guidelines.
    - All automated tool findings addressed.
    - Successful completion of manual testing checklist.
    ```

  - **Sub-Task ID:** T-803.2
    **Goal:** Perform automated accessibility scans.
    **Task:** Execute automated accessibility testing tools (e.g., Axe, Lighthouse) across the application's key pages and components.
    **Rationale:** Automated tools quickly identify common accessibility violations, providing a baseline for further manual testing.
    **Expected Outcome:** A report detailing all automated accessibility violations found, categorized by severity and type.
    **Objectives:**
      * Run Axe DevTools scans on all identified critical pages.
      * Utilize Lighthouse accessibility audits for key pages.
      * Consolidate results from all automated scans.
      * Document the number and types of violations found.
    **Implementation Prompt:** "Using the provided list of critical pages [e.g., Homepage, Login, Product Detail], execute automated accessibility scans using Axe DevTools and Lighthouse. Document the findings, including violation type, affected element, and severity, in a structured report."
    **Example Code:**
    ```javascript
    // Example using Axe-core programmatically (simplified)
    import axe from 'axe-core';

    async function runAccessibilityScan(pageUrl) {
      // In a real scenario, this would involve a browser automation tool like Puppeteer or Playwright
      console.log(`Scanning: ${pageUrl}`);
      const results = await axe.run(document); // 'document' would be the DOM of the page
      console.log(`Found ${results.violations.length} violations.`);
      return results.violations;
    }

    // Usage:
    // const violations = await runAccessibilityScan('http://localhost:3000/login');
    // console.log(violations);
    ```

  - **Sub-Task ID:** T-803.3
    **Goal:** Conduct manual accessibility testing (keyboard navigation and screen reader).
    **Task:** Manually test the application's core user flows using only a keyboard and common screen readers (e.g., NVDA, VoiceOver).
    **Rationale:** Manual testing is crucial for catching issues that automated tools miss, particularly those related to logical flow, context, and screen reader interpretation.
    **Expected Outcome:** A detailed report of issues identified during manual keyboard and screen reader testing, including steps to reproduce.
    **Objectives:**
      * Verify all interactive elements are focusable and operable via keyboard (Tab, Shift+Tab, Enter, Space).
      * Test logical focus order throughout key user flows.
      * Use a screen reader to navigate critical pages and flows, checking for proper announcement of content, headings, links, and form elements.
      * Ensure ARIA attributes are used correctly where necessary.
    **Implementation Prompt:** "Perform manual accessibility testing for the following user flows [e.g., Login, Add to Cart]: 1. Keyboard Navigation: Ensure all interactive elements are focusable and operable using Tab, Shift+Tab, Enter, Space. Verify logical focus order. 2. Screen Reader Testing (NVDA/VoiceOver): Navigate key pages, verifying content structure, headings, links, form labels, and error messages are announced correctly. Document any issues found with steps to reproduce."
    **Example Code:**
    ```javascript
    // Example of checking focusability and order (conceptual)
    function checkKeyboardNavigation() {
      const interactiveElements = document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]');
      let lastTabIndex = -1;
      let issues = [];

      interactiveElements.forEach(el => {
        const tabindex = parseInt(el.getAttribute('tabindex') || '0', 10);
        if (tabindex < 0) {
          issues.push(`Element ${el.tagName} has negative tabindex.`);
        }
        if (tabindex > 0 && tabindex <= lastTabIndex) {
          issues.push(`Focus order issue: Element ${el.tagName} has tabindex ${tabindex} after element with tabindex ${lastTabIndex}.`);
        }
        lastTabIndex = tabindex;
        // Further checks: is it focusable? Does it receive focus visually?
      });
      console.log("Keyboard Navigation Issues:", issues);
      return issues;
    }
    ```

  - **Sub-Task ID:** T-803.4
    **Goal:** Conduct manual accessibility testing (visual & cognitive aspects).
    **Task:** Manually test the application for issues related to color contrast, text resizing, focus indicators, and clear language.
    **Rationale:** These aspects are critical for users with visual impairments, cognitive disabilities, and low vision, and are often best assessed manually.
    **Expected Outcome:** A report detailing issues related to color contrast, text scaling, focus visibility, and clarity of language.
    **Objectives:**
      * Verify color contrast ratios meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text).
      * Test application layout and readability when zoomed to 200%.
      * Ensure focus indicators are clearly visible for all interactive elements.
      * Assess the clarity and simplicity of language used in instructions, labels, and error messages.
    **Implementation Prompt:** "Perform manual accessibility testing focusing on visual and cognitive aspects: 1. Color Contrast: Use a contrast checker tool to verify text/background ratios meet WCAG AA (4.5:1 / 3:1). 2. Text Resizing: Zoom the browser to 200% and check for content overlap or loss. 3. Focus Indicators: Ensure clear visual outlines are present when elements receive keyboard focus. 4. Language Clarity: Review instructions, labels, and error messages for simplicity and understandability. Document all findings."
    **Example Code:**
    ```css
    /* Example CSS for focus indicator */
    :focus {
      outline: 3px solid blue; /* Ensure a clear, visible outline */
      outline-offset: 2px;
    }

    /* Example of checking contrast (conceptual, requires tool) */
    .element-with-text {
      color: #333; /* Dark gray */
      background-color: #f0f0f0; /* Light gray */
      /* Use a tool to calculate contrast ratio */
    }
    ```

  - **Sub-Task ID:** T-803.5
    **Goal:** Consolidate and prioritize accessibility issues.
    **Task:** Combine findings from automated and manual testing into a single report, prioritizing issues based on severity and impact.
    **Rationale:** A consolidated and prioritized list ensures that the most critical accessibility barriers are addressed first, maximizing the impact of remediation efforts.
    **Expected Outcome:** A master list of all identified accessibility issues, each with a description, location, severity rating (e.g., Critical, High, Medium, Low), and recommended fix.
    **Objectives:**
      * Merge results from automated scans (T-803.2) and manual testing (T-803.3, T-803.4).
      * Remove duplicate or related issues.
      * Assign a severity level to each unique issue.
      * Group issues by page or component for easier tracking.
    **Implementation Prompt:** "Consolidate the accessibility findings from the automated scans and manual testing reports. Create a master list that includes: Issue Description, Affected Component/Page, WCAG Guideline Violated, Severity (Critical, High, Medium, Low), and Steps to Reproduce/Location. Prioritize the list, placing Critical and High severity issues at the top."
    **Example Code:**
    ```json
    [
      {
        "id": "A11y-001",
        "description": "Login button has insufficient color contrast.",
        "component": "LoginForm",
        "page": "/login",
        "guideline": "WCAG 1.4.3 Contrast (Minimum)",
        "severity": "High",
        "status": "Open",
        "stepsToReproduce": "Inspect the login button element."
      },
      {
        "id": "A11y-002",
        "description": "Main navigation menu is not fully keyboard navigable.",
        "component": "Navigation",
        "page": "All",
        "guideline": "WCAG 2.1.1 Keyboard",
        "severity": "Critical",
        "status": "Open",
        "stepsToReproduce": "Attempt to navigate the main menu using only the Tab key."
      }
      // ... more issues
    ]
    ```

  - **Sub-Task ID:** T-803.6
    **Goal:** Remediate identified accessibility issues.
    **Task:** Implement code changes to fix the prioritized accessibility violations identified in the previous step.
    **Rationale:** This is the core action step to bring the application into compliance with WCAG 2.1 AA standards.
    **Expected Outcome:** Code modifications applied to the codebase that resolve the prioritized accessibility issues.
    **Objectives:**
      * Address all Critical and High severity issues first.
      * Implement fixes according to best practices for accessibility (e.g., semantic HTML, ARIA attributes, keyboard support).
      * Ensure fixes do not introduce new accessibility issues or regressions.
      * Update relevant code components or modules.
    **Implementation Prompt:** "For the following accessibility issue: [Issue Description, e.g., 'Image missing alt text'], located in [Component/File, e.g., 'ProductCard.jsx'], fix it by [Specific instruction, e.g., 'adding a descriptive alt attribute to the img tag']. Ensure the fix adheres to WCAG 2.1 AA guidelines. Provide the updated code snippet."
    **Example Code:**
    ```jsx
    // Before
    // <img src="/images/product.jpg" />

    // After
    <img src="/images/product.jpg" alt="Description of the product image" />
    ```

  - **Sub-Task ID:** T-803.7
    **Goal:** Re-test and verify accessibility fixes.
    **Task:** Re-run automated scans and perform targeted manual testing to confirm that the implemented fixes have resolved the accessibility issues without introducing new ones.
    **Rationale:** Verification is essential to ensure the remediation efforts were successful and the application is now compliant.
    **Expected Outcome:** Confirmation that the previously identified issues are resolved, and an updated report indicating the status of each issue (Resolved, Open, Won't Fix).
    **Objectives:**
      * Re-run automated accessibility scans on affected pages/components.
      * Perform specific manual checks related to the fixed issues.
      * Verify that no new accessibility regressions were introduced.
      * Update the status of issues in the master list.
    **Implementation Prompt:** "Verify the accessibility fixes implemented for [List of specific issues, e.g., 'A11y-001', 'A11y-002']. Re-run automated accessibility scans on the affected pages ([List pages]). Perform targeted manual checks for keyboard navigation and screen reader behavior related to the fixes. Confirm resolution and update the status of these issues in the master accessibility report."
    **Example Code:**
    ```javascript
    // Example: Re-running a specific check after a fix
    async function verifyFix(issueId, pageUrl) {
      console.log(`Verifying fix for issue: ${issueId} on ${pageUrl}`);
      const results = await axe.run(document); // Run scan again
      const violation = results.violations.find(v => v.id === issueId); // Check if the specific issue persists

      if (violation) {
        console.error(`Issue ${issueId} still present.`);
        return false;
      } else {
        console.log(`Issue ${issueId} successfully resolved.`);
        return true;
      }
    }
    ```

  - **Sub-Task ID:** T-803.8
    **Goal:** Document accessibility testing results and final compliance status.
    **Task:** Create a final report summarizing the entire accessibility testing process, including initial findings, remediation actions taken, and the final compliance status.
    **Rationale:** A comprehensive final report provides a record of the accessibility efforts, demonstrates compliance, and serves as a reference for future development.
    **Expected Outcome:** A final accessibility compliance report detailing the scope, methodology, issues found, fixes applied, and the overall WCAG 2.1 AA compliance level achieved.
    **Objectives:**
      * Summarize the testing scope and methodology used.
      * Detail the key accessibility issues identified (prioritized).
      * List the remediation actions taken.
      * State the final compliance status against WCAG 2.1 AA.
      * Include any remaining known issues or areas for future improvement.
    **Implementation Prompt:** "Generate a final Accessibility Compliance Report. Include the following sections: 1. Introduction (Purpose, Scope, Standards - WCAG 2.1 AA). 2. Testing Methodology (Tools, Manual Checks). 3. Summary of Findings (Number of issues by severity). 4. Remediation Actions Taken. 5. Final Compliance Status (e.g., Compliant, Partially Compliant with exceptions). 6. Outstanding Issues (if any)."
    **Example Code:**
    ```markdown
    # Accessibility Compliance Report - [Application Name]

    ## 1. Introduction
    - **Purpose:** To assess and ensure compliance with WCAG 2.1 Level AA standards.
    - **Scope:** [List of pages/features tested]
    - **Standard:** Web Content Accessibility Guidelines (WCAG) 2.1 Level AA

    ## 2. Testing Methodology
    - **Automated Tools:** Axe DevTools, Lighthouse
    - **Manual Testing:** Keyboard navigation, screen reader testing (NVDA, VoiceOver), visual checks, zoom testing.

    ## 3. Summary of Findings
    - Total Issues Found: [Number]
    - Critical: [Number]
    - High: [Number]
    - Medium: [Number]
    - Low: [Number]

    ## 4. Remediation Actions
    - All Critical and High severity issues have been addressed.
    - [Brief summary of types of fixes applied, e.g., Added alt text, improved keyboard navigation, corrected ARIA roles].

    ## 5. Final Compliance Status
    - The application is considered [Compliant / Partially Compliant] with WCAG 2.1 Level AA standards based on the testing conducted.

    ## 6. Outstanding Issues (Optional)
    - [List any known issues that were deferred or marked as 'Won't Fix', with justifications].
    ```
- **ID:** T-901
  **Title:** Optimize Application Performance
  *(Description):* Analyze and optimize bundle sizes, loading times, and runtime performance. Implement code splitting per route.
  *(User Story):* N/A
  *(Priority):* High
  *(Dependencies):* T-701, T-801
  *(Est. Effort):* Medium
  - **Sub-Task ID:** T-901.1
    **Goal:** Analyze current application bundle sizes.
    **Task:** Use a bundle analysis tool (e.g., Webpack Bundle Analyzer, Source Map Explorer) to identify the largest dependencies and code modules contributing to the main JavaScript bundles.
    **Rationale:** Understanding the current state of bundle sizes is the first step to identifying optimization opportunities.
    **Expected Outcome:** A report or visual representation detailing the composition of the application's bundles, highlighting oversized components.
    **Objectives:**
      * Successfully run the bundle analysis tool.
      * Identify the top 5 largest dependencies or code modules.
      * Document the findings for further analysis.
    **Implementation Prompt:** "Configure and run Webpack Bundle Analyzer for the React application. Generate a report and identify the top 5 largest contributors to the main bundle. Provide a summary of these findings."
    **Example Code:**
    ```bash
    npm run analyze
    # or
    yarn analyze
    ```

  - **Sub-Task ID:** T-901.2
    **Goal:** Optimize identified large dependencies.
    **Task:** Investigate alternatives or lighter versions for the largest dependencies identified in T-901.1. If no direct replacement is feasible, explore tree-shaking opportunities or lazy loading specific components within these large modules.
    **Rationale:** Reducing the size of core dependencies directly impacts initial load times and overall performance.
    **Expected Outcome:** A plan or implemented changes to reduce the size contribution of identified large dependencies.
    **Objectives:**
      * Research alternative libraries for at least two identified large dependencies.
      * Implement changes to reduce bundle size for at least one dependency.
      * Document the impact of the changes.
    **Implementation Prompt:** "For the 'moment.js' dependency identified as large, replace it with 'date-fns' and update all relevant date formatting logic in the React application. Ensure no regressions in functionality."
    **Example Code:**
    ```javascript
    // Before
    import moment from 'moment';
    const formattedDate = moment(myDate).format('YYYY-MM-DD');

    // After
    import { format } from 'date-fns';
    const formattedDate = format(myDate, 'yyyy-MM-dd');
    ```

  - **Sub-Task ID:** T-901.3
    **Goal:** Implement code splitting per route.
    **Task:** Refactor the application's routing configuration to use dynamic `import()` for route-level code splitting, ensuring that only the JavaScript necessary for the current route is loaded initially.
    **Rationale:** Code splitting significantly reduces the initial JavaScript payload, improving perceived and actual load times, especially on slower networks.
    **Expected Outcome:** Application routes are configured for lazy loading, with separate bundles generated for each route.
    **Objectives:**
      * Identify all primary application routes.
      * Convert static imports for route components to dynamic imports.
      * Ensure fallback loading states are handled gracefully.
    **Implementation Prompt:** "In the React application's `react-router-dom` configuration, refactor the `Home` and `About` routes to use `React.lazy` and `Suspense` for code splitting. The `App.js` file should be updated to reflect this change."
    **Example Code:**
    ```jsx
    // App.js
    import React, { Suspense, lazy } from 'react';
    import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

    const HomePage = lazy(() => import('./pages/HomePage'));
    const AboutPage = lazy(() => import('./pages/AboutPage'));

    function App() {
      return (
        <Router>
          <Suspense fallback={<div>Loading...</div>}>
            <Switch>
              <Route exact path="/" component={HomePage} />
              <Route path="/about" component={AboutPage} />
            </Switch>
          </Suspense>
        </Router>
      );
    }
    ```

  - **Sub-Task ID:** T-901.4
    **Goal:** Analyze and optimize runtime performance.
    **Task:** Use browser developer tools (Performance tab) and React DevTools Profiler to identify performance bottlenecks during component rendering, updates, and user interactions. Implement optimizations such as memoization (`React.memo`, `useMemo`, `useCallback`) where appropriate.
    **Rationale:** Runtime performance issues can lead to a sluggish user experience, even with optimized bundle sizes.
    **Expected Outcome:** Identified and resolved runtime performance bottlenecks, leading to smoother interactions and faster updates.
    **Objectives:**
      * Profile the application's performance during key user flows.
      * Identify at least one component causing unnecessary re-renders.
      * Implement `React.memo` or `useMemo`/`useCallback` to optimize the identified component.
      * Re-profile to confirm performance improvement.
    **Implementation Prompt:** "Profile the user list component in the React application using React DevTools Profiler. Identify why it re-renders excessively. Apply `React.memo` to the component to prevent unnecessary re-renders when its props haven't changed."
    **Example Code:**
    ```jsx
    import React from 'react';

    const UserListItem = React.memo(({ user }) => {
      console.log('Rendering UserListItem for:', user.name);
      return <li>{user.name}</li>;
    });

    export default UserListItem;
    ```

  - **Sub-Task ID:** T-901.5
    **Goal:** Optimize image and asset loading.
    **Task:** Implement lazy loading for images and other non-critical assets below the fold. Ensure images are properly sized and compressed, and consider using modern image formats (e.g., WebP).
    **Rationale:** Large image files and inefficient loading strategies are common culprits for slow page load times.
    **Expected Outcome:** Images and assets below the fold are loaded only when they enter the viewport, and all images are optimized.
    **Objectives:**
      * Implement lazy loading for at least 5 images below the fold.
      * Compress and resize at least 3 key images.
      * Ensure images are served in an appropriate format (e.g., WebP where supported).
    **Implementation Prompt:** "Implement lazy loading for all `<img>` tags within the `ProductGallery` component using the `IntersectionObserver` API. Ensure a placeholder is shown until the image loads."
    **Example Code:**
    ```jsx
    import React, { useRef, useEffect, useState } from 'react';

    function LazyImage({ src, alt }) {
      const imgRef = useRef(null);
      const [isVisible, setIsVisible] = useState(false);

      useEffect(() => {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer.unobserve(imgRef.current);
            }
          },
          { rootMargin: '0px 0px 100px 0px' } // Load images when they are 100px from viewport
        );

        if (imgRef.current) {
          observer.observe(imgRef.current);
        }

        return () => {
          if (imgRef.current) {
            observer.unobserve(imgRef.current);
          }
        };
      }, []);

      return (
        <img
          ref={imgRef}
          src={isVisible ? src : 'placeholder.jpg'}
          alt={alt}
          style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 0.5s' }}
        />
      );
    }
    ```

  - **Sub-Task ID:** T-901.6
    **Goal:** Verify performance improvements with metrics.
    **Task:** Re-run performance analysis tools (e.g., Lighthouse, WebPageTest) and compare the results against the initial baseline established in T-901.1 and T-901.4. Document the quantitative improvements in bundle size, load times, and runtime performance.
    **Rationale:** Quantifiable metrics are essential to confirm that the optimization efforts have been successful and to provide evidence of the improvements.
    **Expected Outcome:** A report detailing the performance metrics before and after optimization, demonstrating measurable improvements.
    **Objectives:**
      * Run Lighthouse audit on key pages.
      * Measure First Contentful Paint (FCP) and Time to Interactive (TTI).
      * Compare bundle sizes post-optimization with initial findings.
      * Document all metric changes.
    **Implementation Prompt:** "Perform a Lighthouse audit on the application's homepage and the `/about` page. Record the Performance score, FCP, TTI, and bundle sizes. Compare these metrics to the baseline established before optimization and summarize the improvements."
    **Example Code:**
    ```
    // Example of documentation format
    // Page: Homepage
    // Metric | Before | After | Improvement
    // ------ | ------ | ----- | -----------
    // Performance Score | 65 | 85 | +20
    // FCP (s) | 2.1 | 1.2 | -0.9s
    // TTI (s) | 4.5 | 3.0 | -1.5s
    // Bundle Size (KB) | 1500 | 1100 | -400KB
    ```
- **ID:** T-902
  **Title:** Perform SEO Audit and Optimization
  *(Description):* Review and optimize meta tags, structured data, and ensure proper SSR/SSG for search engine visibility.
  *(User Story):* N/A
  *(Priority):* Medium
  *(Dependencies):* T-201, T-301, T-401, T-501, T-601
  *(Est. Effort):* Small
  - **Sub-Task ID:** T-902.1
    **Goal:** Analyze current meta tag implementation.
    **Task:** Audit all existing pages to identify missing or suboptimal title tags and meta descriptions.
    **Rationale:** Meta tags are crucial for search engine ranking and click-through rates. This step identifies areas for improvement.
    **Expected Outcome:** A report or list detailing pages with missing, duplicate, or poorly optimized title tags and meta descriptions.
    **Objectives:**
      * * Identify all pages within the scope of the audit.
      * * Extract current title tags and meta descriptions for each page.
      * * Flag pages with missing title tags.
      * * Flag pages with missing meta descriptions.
      * * Flag pages with duplicate title tags.
      * * Flag pages with duplicate meta descriptions.
    **Implementation Prompt:** "Using a web scraping tool or browser extension, audit the provided list of URLs to extract and analyze their `<title>` and `<meta name='description'>` tags. Identify and report any missing tags, duplicate content across pages, or tags that are excessively short or long based on SEO best practices."
    **Example Code:**
    ```javascript
    // Example using Puppeteer to scrape meta tags
    const puppeteer = require('puppeteer');

    async function getMetaTags(url) {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      const title = await page.title();
      const description = await page.$eval('meta[name="description"]', el => el.getAttribute('content'));

      await browser.close();
      return { title, description };
    }
    ```

  - **Sub-Task ID:** T-902.2
    **Goal:** Optimize meta tags for improved SEO.
    **Task:** Implement new, optimized title tags and meta descriptions for identified pages based on SEO best practices and target keywords.
    **Rationale:** Well-crafted meta tags improve search engine rankings and user engagement.
    **Expected Outcome:** Updated title tags and meta descriptions implemented across the website.
    **Objectives:**
      * * Develop a strategy for keyword integration into meta tags.
      * * Write unique and compelling title tags (typically 50-60 characters).
      * * Write unique and compelling meta descriptions (typically 150-160 characters).
      * * Ensure meta tags accurately reflect page content.
      * * Implement the optimized meta tags in the codebase or CMS.
    **Implementation Prompt:** "For each page identified in T-902.1, implement a new `<title>` tag and `<meta name='description'>` tag. The new tags should be unique, keyword-relevant, and adhere to character limits (title: 50-60 chars, description: 150-160 chars). Provide the updated meta tags for each page."
    **Example Code:**
    ```html
    <head>
      <title>Optimized Page Title - Brand Name</title>
      <meta name="description" content="A concise and compelling description of the page content, including relevant keywords.">
    </head>
    ```

  - **Sub-Task ID:** T-902.3
    **Goal:** Audit current structured data implementation.
    **Task:** Review all pages for the presence and correctness of structured data (e.g., Schema.org markup).
    **Rationale:** Structured data helps search engines understand content context, leading to rich snippets and better visibility.
    **Expected Outcome:** A report detailing pages with missing, incorrect, or incomplete structured data.
    **Objectives:**
      * * Identify all pages that should have structured data.
      * * Validate existing structured data using tools like Google's Rich Results Test.
      * * Identify missing structured data types (e.g., Article, Product, FAQPage).
      * * Flag errors or warnings in the current structured data.
    **Implementation Prompt:** "Using Google's Rich Results Test or Schema Markup Validator, audit the structured data implementation on the website. For each page, identify the types of schema markup used, check for errors or warnings, and note any pages that are missing relevant schema markup."
    **Example Code:**
    ```json
    // Example of Article schema markup
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Article Title",
      "image": [
        "https://example.com/photos/1x1/photo.jpg",
        "https://example.com/photos/4x3/photo.jpg",
        "https://example.com/photos/16x9/photo.jpg"
       ],
      "datePublished": "2023-01-01",
      "dateModified": "2023-01-01",
      "author": [{
        "@type": "Person",
        "name": "Author Name"
       }]
    }
    ```

  - **Sub-Task ID:** T-902.4
    **Goal:** Implement or correct structured data.
    **Task:** Add or fix structured data markup (JSON-LD preferred) on relevant pages to improve search engine understanding and potential for rich snippets.
    **Rationale:** Correctly implemented structured data enhances search result appearance and relevance.
    **Expected Outcome:** Validated and optimized structured data implemented across the website where appropriate.
    **Objectives:**
      * * Determine the most relevant schema types for different page types (e.g., Article, Product, FAQ).
      * * Generate correct JSON-LD markup for each relevant page.
      * * Ensure all required properties for chosen schema types are included.
      * * Implement the JSON-LD script within the `<head>` or `<body>` of the respective pages.
      * * Re-validate the implemented structured data.
    **Implementation Prompt:** "Implement JSON-LD structured data for the website. For blog posts, use the 'Article' schema. For product pages, use the 'Product' schema. For FAQ pages, use the 'FAQPage' schema. Ensure all required properties are populated accurately based on page content. Place the JSON-LD script within the `<script type='application/ld+json'>` tags in the `<head>` section."
    **Example Code:**
    ```html
    <head>
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Your Article Headline",
        "author": "Author Name",
        "datePublished": "YYYY-MM-DD",
        "description": "A brief summary of the article."
      }
      </script>
    </head>
    ```

  - **Sub-Task ID:** T-902.5
    **Goal:** Verify Server-Side Rendering (SSR) or Static Site Generation (SSG) implementation.
    **Task:** Inspect the website's rendering strategy to ensure content is properly delivered to search engine crawlers.
    **Rationale:** Search engines may struggle to index JavaScript-rendered content. SSR/SSG ensures content is available in the initial HTML payload.
    **Expected Outcome:** Confirmation that the site uses SSR or SSG effectively for SEO, or identification of pages needing adjustment.
    **Objectives:**
      * * Determine if the site uses SSR, SSG, or client-side rendering (CSR).
      * * Use browser developer tools (e.g., View Source, Network tab) to inspect initial HTML payload.
      * * Use tools like Google's Mobile-Friendly Test or URL Inspection tool to see how Googlebot renders the page.
      * * Identify any critical content loaded only via client-side JavaScript.
    **Implementation Prompt:** "Analyze the website's rendering strategy. Inspect the source code of key pages and use Google Search Console's URL Inspection tool to verify that content is rendered server-side (SSR) or statically generated (SSG) and fully accessible to crawlers without relying solely on client-side JavaScript execution."
    **Example Code:**
    ```html
    <!-- Example of SSR/SSG output - content is present in initial HTML -->
    <!DOCTYPE html>
    <html>
    <head>
        <title>Page Title</title>
        <!-- Meta tags and structured data -->
    </head>
    <body>
        <h1>Main Content Heading</h1>
        <p>This is the primary content of the page, directly rendered.</p>
        <!-- Other pre-rendered elements -->
    </body>
    </html>
    ```

  - **Sub-Task ID:** T-902.6
    **Goal:** Address SSR/SSG issues for SEO.
    **Task:** Implement necessary changes to ensure content is properly rendered via SSR or SSG if issues were identified in the previous step.
    **Rationale:** Ensures search engines can crawl and index all important content, improving rankings.
    **Expected Outcome:** Website content is reliably rendered via SSR/SSG, making it fully accessible to search engine crawlers.
    **Objectives:**
      * * Based on T-902.5 findings, determine the required technical adjustments.
      * * If using a framework (e.g., Next.js, Nuxt.js), configure SSR/SSG settings correctly.
      * * If necessary, refactor client-side heavy components to be compatible with SSR/SSG.
      * * Test the changes to confirm content is present in the initial HTML response.
      * * Re-verify with Google Search Console's tools.
    **Implementation Prompt:** "If the analysis in T-902.5 revealed issues with client-side rendering impacting SEO, implement the necessary code changes. This may involve configuring SSR/SSG options in your framework (e.g., Next.js `getServerSideProps` or `getStaticProps`), ensuring dynamic data fetching occurs server-side, or adjusting component rendering logic. Provide the updated code snippets demonstrating the fix."
    **Example Code:**
    ```javascript
    // Example for Next.js using getServerSideProps for SSR
    function MyPage({ data }) {
      return <div>{data.message}</div>;
    }

    export async function getServerSideProps() {
      // Fetch data server-side
      const res = await fetch('https://api.example.com/data');
      const data = await res.json();
      return { props: { data } };
    }

    export default MyPage;
    ```

  - **Sub-Task ID:** T-902.7
    **Goal:** Final SEO audit verification.
    **Task:** Perform a final check of meta tags, structured data, and rendering across key pages after optimizations.
    **Rationale:** To ensure all implemented changes are correct and effective before concluding the task.
    **Expected Outcome:** A confirmation report that all SEO elements reviewed are correctly implemented.
    **Objectives:**
      * * Re-run meta tag checks on critical pages.
      * * Re-validate structured data using Google's Rich Results Test.
      * * Re-inspect key pages using Google Search Console's URL Inspection tool.
      * * Ensure no new issues were introduced.
    **Implementation Prompt:** "Conduct a final verification of the SEO optimizations performed. Use automated tools and manual checks (like Google's Rich Results Test and URL Inspection) to confirm that title tags, meta descriptions, and structured data are correctly implemented and that content rendering is suitable for search engine crawlers on the most important pages of the website."
    **Example Code:**
    ```bash
    # Example command for running a site audit tool
    npx @lhci/cli collect --url=https://yourwebsite.com --numberOfRuns=3
    npx @lhci/cli assert --preset=seo.desktop
    ```
- **ID:** T-903
  **Title:** Final Code Review and Refactoring
  *(Description):* Conduct a comprehensive code review, refactor any identified areas, and ensure adherence to coding standards.
  *(User Story):* N/A
  *(Priority):* High
  *(Dependencies):* T-801, T-901
  *(Est. Effort):* Medium
  - **Sub-Task ID:** T-903.1
    **Goal:** Establish a systematic approach for code review.
    **Task:** Define the specific criteria and checklist to be used during the code review process for this project.
    **Rationale:** Ensures consistency and thoroughness in the review, covering aspects like readability, maintainability, performance, and security.
    **Expected Outcome:** A documented code review checklist or set of guidelines.
    **Objectives:**
      * Objective 1: Identify key areas to check (e.g., logic, error handling, naming conventions, security vulnerabilities).
      * Objective 2: Define severity levels for identified issues.
      * Objective 3: Document the checklist in a shareable format (e.g., Markdown file).
    **Implementation Prompt:** Create a Markdown document outlining a comprehensive code review checklist. Include sections for code style, logic correctness, error handling, security, performance, and documentation. Define severity levels (e.g., Critical, Major, Minor, Suggestion).
    **Example Code:**
    ```markdown
    # Code Review Checklist

    ## 1. Code Style & Readability
    - [ ] Consistent indentation and formatting
    - [ ] Meaningful variable and function names
    - [ ] Adequate comments for complex logic
    - [ ] Adherence to project's style guide (e.g., PEP 8 for Python)

    ## 2. Logic & Correctness
    - [ ] Algorithm correctness
    - [ ] Edge cases handled
    - [ ] Input validation
    - [ ] Expected output matches requirements

    ## 3. Error Handling
    - [ ] Appropriate error types used
    - [ ] Errors are logged effectively
    - [ ] Graceful failure modes

    ## 4. Security
    - [ ] Input sanitization (prevent XSS, SQLi)
    - [ ] Authentication/Authorization checks
    - [ ] Sensitive data handling

    ## 5. Performance
    - [ ] Inefficient loops or queries identified
    - [ ] Unnecessary computations avoided

    ## 6. Documentation
    - [ ] Function/Class docstrings present and accurate
    - [ ] README updated if necessary

    ---
    **Severity Levels:**
    - **Critical:** Must fix immediately, blocks deployment.
    - **Major:** Significant issue, needs fixing before deployment.
    - **Minor:** Improvement suggestion, fix if time permits.
    - **Suggestion:** Best practice recommendation.
    ```

  - **Sub-Task ID:** T-903.2
    **Goal:** Perform a detailed code review of the completed features.
    **Task:** Systematically review all code committed for the tasks preceding this one (T-801, T-901), using the established checklist.
    **Rationale:** To identify bugs, potential issues, and areas for improvement before finalization and deployment.
    **Expected Outcome:** A list of identified issues, categorized by severity, with specific code locations and descriptions.
    **Objectives:**
      * Objective 1: Assign reviewers or conduct self-review if applicable.
      * Objective 2: Go through each file and section of the code.
      * Objective 3: Document all findings using the checklist from T-903.1.
      * Objective 4: Create pull requests or tickets for each identified issue.
    **Implementation Prompt:** Review the codebase related to tasks T-801 and T-901. Use the code review checklist (T-903.1) to identify and document any issues found. For each issue, note the file, line number, a description of the problem, and its severity. Create a consolidated report or individual tickets for each significant finding.
    **Example Code:**
    ```
    // Example of a documented finding (e.g., in a ticket or comment)
    {
      "taskId": "T-903.2",
      "issueId": "ISSUE-123",
      "severity": "Major",
      "file": "src/utils/data_processor.py",
      "line": 45,
      "description": "The 'process_data' function does not handle potential division by zero errors when 'divisor' is 0. This could lead to runtime exceptions.",
      "suggestion": "Add a check for divisor being zero before performing the division, returning an appropriate error or default value."
    }
    ```

  - **Sub-Task ID:** T-903.3
    **Goal:** Address identified code quality issues.
    **Task:** Implement the necessary fixes and improvements based on the findings from the code review (T-903.2).
    **Rationale:** To resolve bugs, enhance performance, improve security, and ensure the code meets quality standards.
    **Expected Outcome:** Codebase updated with fixes for all critical and major issues identified during the review.
    **Objectives:**
      * Objective 1: Prioritize and address critical issues first.
      * Objective 2: Implement fixes for major issues.
      * Objective 3: Consider implementing minor suggestions if time permits.
      * Objective 4: Ensure fixes do not introduce new issues.
    **Implementation Prompt:** Based on the issues documented in T-903.2, implement the suggested fixes in the relevant code files. Ensure that all critical and major issues are resolved. Write unit tests to verify the fixes.
    **Example Code:**
    ```python
    # Example fix for division by zero
    def process_data(numerator, divisor):
        if divisor == 0:
            # Handle error: return None, raise exception, or return default
            return None # Or raise ValueError("Divisor cannot be zero")
        return numerator / divisor
    ```

  - **Sub-Task ID:** T-903.4
    **Goal:** Ensure adherence to project coding standards and best practices.
    **Task:** Refactor code identified as non-compliant with project standards, overly complex, or lacking clarity.
    **Rationale:** To improve code maintainability, readability, and long-term sustainability.
    **Expected Outcome:** Code is refactored to be cleaner, more modular, and consistently styled according to project guidelines.
    **Objectives:**
      * Objective 1: Identify areas needing refactoring (e.g., long functions, duplicated code, unclear logic).
      * Objective 2: Apply refactoring techniques (e.g., extract method, rename variable, simplify conditional).
      * Objective 3: Ensure refactoring does not alter the code's external behavior.
      * Objective 4: Update relevant tests if behavior changes subtly due to refactoring.
    **Implementation Prompt:** Review the codebase for sections that are difficult to read, maintain, or test. Apply standard refactoring techniques such as extracting methods, simplifying complex conditionals, improving variable names, and removing duplication. Ensure all existing tests pass after refactoring.
    **Example Code:**
    ```javascript
    // Before refactoring: complex conditional
    function checkStatus(user) {
        if (user.isActive && !user.isBlocked && user.role === 'admin') {
            // ... do something
        }
    }

    // After refactoring: extracted method
    function isAdminAndActive(user) {
        return user.isActive && !user.isBlocked && user.role === 'admin';
    }

    function checkStatus(user) {
        if (isAdminAndActive(user)) {
            // ... do something
        }
    }
    ```

  - **Sub-Task ID:** T-903.5
    **Goal:** Verify the effectiveness of implemented fixes and refactoring.
    **Task:** Re-run all relevant unit, integration, and end-to-end tests to confirm that all changes have been integrated correctly and no regressions have been introduced.
    **Rationale:** To provide confidence that the codebase is stable and meets all functional and non-functional requirements after review and refactoring.
    **Expected Outcome:** All automated tests pass, confirming the integrity of the codebase.
    **Objectives:**
      * Objective 1: Execute the full test suite.
      * Objective 2: Analyze test results for any failures.
      * Objective 3: Investigate and fix any newly introduced test failures.
      * Objective 4: Ensure all tests related to the reviewed/refactored code pass.
    **Implementation Prompt:** Execute the project's automated test suite (unit, integration, E2E). Document any test failures, investigate their root cause, and implement necessary fixes. Ensure the entire test suite passes successfully before marking this task as complete.
    **Example Code:**
    ```bash
    # Example command to run tests (framework dependent)
    npm test
    # or
    pytest
    # or
    mvn test
    ```

  - **Sub-Task ID:** T-903.6
    **Goal:** Finalize documentation and code comments.
    **Task:** Update or add necessary documentation (e.g., README, API docs) and code comments to reflect the final state of the code after review and refactoring.
    **Rationale:** Ensures that the codebase is well-documented, making it easier for future developers to understand, use, and maintain.
    **Expected Outcome:** All relevant documentation and code comments are up-to-date and accurate.
    **Objectives:**
      * Objective 1: Review existing documentation for accuracy.
      * Objective 2: Add comments to complex or non-obvious code sections.
      * Objective 3: Update README or other high-level documentation if significant changes were made.
      * Objective 4: Ensure docstrings for functions/classes are present and correct.
    **Implementation Prompt:** Review the codebase and associated documentation (README, API docs, etc.). Update any outdated information resulting from the code review and refactoring process. Add clear, concise comments to any code sections that might be unclear or complex. Ensure all public APIs have accurate docstrings.
    **Example Code:**
    ```python
    def calculate_discount(price, percentage):
        """
        Calculates the final price after applying a discount percentage.

        Args:
            price (float): The original price of the item.
            percentage (float): The discount percentage (e.g., 0.10 for 10%).

        Returns:
            float: The price after the discount is applied.
                   Returns original price if percentage is invalid (e.g., < 0 or > 1).
        """
        if not (0 <= percentage <= 1):
            # Log a warning or handle invalid input as per requirements
            return price
        discount_amount = price * percentage
        return price - discount_amount
    ```
- **ID:** T-904
  **Title:** Production Deployment
  *(Description):* Build the production version of the application and deploy it to the target hosting environment.
  *(User Story):* N/A
  *(Priority):* High
  *(Dependencies):* T-107, T-903
  *(Est. Effort):* Small
  - **Sub-Task ID:** T-904.1
    **Goal:** Prepare the application for production build.
    **Task:** Configure the application's build system to generate a production-ready artifact.
    **Rationale:** Production builds typically require optimizations, minification, and removal of development-specific code or configurations.
    **Expected Outcome:** A build configuration that produces an optimized, deployable artifact.
    **Objectives:**
      * Ensure environment variables for production are correctly referenced.
      * Configure minification and tree-shaking for JavaScript/CSS.
      * Set up code splitting if applicable.
      * Define the output directory for the production build.
    **Implementation Prompt:** "Configure the build tool (e.g., Webpack, Vite, Parcel) for production. This involves setting `mode: 'production'`, enabling optimizations like minification and dead code elimination, and configuring the output path and filename patterns for the production build. Ensure environment variables specific to production are handled correctly, likely through a `.env.production` file or build-time injection."
    **Example Code:**
    ```javascript
    // webpack.config.js
    const path = require('path');

    module.exports = {
      mode: 'production', // Set to production mode
      entry: './src/index.js',
      output: {
        filename: '[name].[contenthash].js', // Cache busting
        path: path.resolve(__dirname, 'dist'),
        clean: true, // Clean the output directory before build
      },
      // ... other production-specific configurations (optimization, etc.)
    };
    ```

  - **Sub-Task ID:** T-904.2
    **Goal:** Generate the production build artifact.
    **Task:** Execute the build command to create the production-ready application files.
    **Rationale:** This step creates the actual deployable code based on the production configuration.
    **Expected Outcome:** A folder containing all necessary static assets (HTML, CSS, JS, images) for the production application.
    **Objectives:**
      * Run the build script defined in `package.json`.
      * Verify that the build process completes without errors.
      * Inspect the output directory to confirm the presence of expected files.
    **Implementation Prompt:** "Execute the production build command for the application. Assuming a standard setup, this would typically be `npm run build` or `yarn build`. Capture the output and confirm that the build process completes successfully and generates files in the configured output directory (e.g., `dist/`)."
    **Example Code:**
    ```bash
    npm run build
    # or
    yarn build
    ```

  - **Sub-Task ID:** T-904.3
    **Goal:** Set up the production hosting environment.
    **Task:** Configure the target server or hosting service (e.g., AWS S3, Netlify, Vercel, traditional server) to serve the production build.
    **Rationale:** The application needs a place to live and be accessible to users. This involves setting up the infrastructure.
    **Expected Outcome:** A configured hosting environment ready to receive and serve the application files.
    **Objectives:**
      * Create or select the hosting resource (e.g., S3 bucket, Netlify site, server instance).
      * Configure domain name (if applicable).
      * Set up necessary permissions or access controls.
      * Configure web server (e.g., Nginx, Apache) or CDN if using a traditional server.
    **Implementation Prompt:** "Configure the production hosting environment. This might involve:
    1. For static hosting (S3, Netlify, Vercel): Create a new site/bucket, configure it for static site hosting, and set up the custom domain.
    2. For a traditional server: Provision a server, install a web server (Nginx/Apache), configure a virtual host to serve files from a specific directory, and set up SSL.
    Ensure the environment is ready to accept the build artifacts."
    **Example Code:**
    ```nginx
    # Example Nginx configuration for serving static files
    server {
        listen 80;
        server_name yourdomain.com;
        root /var/www/your-app-production; # Directory where build artifacts will be placed
        index index.html;

        location / {
            try_files $uri $uri/ /index.html; # For SPAs
        }

        # ... other configurations (SSL, caching, etc.)
    }
    ```

  - **Sub-Task ID:** T-904.4
    **Goal:** Deploy the production build artifact to the hosting environment.
    **Task:** Transfer the generated production build files to the configured hosting environment.
    **Rationale:** This is the core deployment step, making the application live.
    **Expected Outcome:** The production build files are successfully uploaded and accessible at the target URL.
    **Objectives:**
      * Use an appropriate deployment method (e.g., `aws s3 sync`, Netlify CLI deploy, SCP/rsync).
      * Ensure all files from the build output directory are transferred.
      * Verify file integrity after transfer.
    **Implementation Prompt:** "Deploy the production build artifacts (generated in T-904.2) to the configured hosting environment (set up in T-904.3). Use a suitable deployment tool or script. For example, if using AWS S3, use `aws s3 sync ./dist s3://your-bucket-name --delete`. If using Netlify, use `netlify deploy --prod`. Ensure the deployment is complete and all files are correctly uploaded."
    **Example Code:**
    ```bash
    # Example using AWS CLI for S3 sync
    aws s3 sync ./dist s3://your-production-bucket-name --delete --acl public-read
    ```

  - **Sub-Task ID:** T-904.5
    **Goal:** Verify the production deployment.
    **Task:** Perform checks to ensure the deployed application is functioning correctly in the production environment.
    **Rationale:** Post-deployment verification is crucial to confirm that the application is live and accessible as expected.
    **Expected Outcome:** Confirmation that the application is running correctly in production.
    **Objectives:**
      * Access the application via its production URL.
      * Perform basic user flows (e.g., load homepage, navigate, interact with key features).
      * Check browser developer console for errors.
      * Monitor server logs for any immediate issues.
    **Implementation Prompt:** "Perform a smoke test on the deployed production application. Access the application's URL in a browser. Navigate through key pages and test core functionalities. Check the browser's developer console for any JavaScript errors or network issues. Review server logs for any critical errors reported during the initial access."
    **Example Code:**
    ```javascript
    // Example check in browser console (manual or automated script)
    console.log("Production deployment verification started.");
    // Simulate user actions or check specific elements
    if (document.title === "Your App Title") {
      console.log("Homepage loaded successfully.");
    } else {
      console.error("Homepage title mismatch.");
    }
    // ... further checks
    ```

  - **Sub-Task ID:** T-904.6
    **Goal:** Configure DNS and SSL for the production domain.
    **Task:** Update DNS records to point to the production hosting and ensure SSL is correctly configured.
    **Rationale:** This makes the application accessible via its intended domain name with secure HTTPS.
    **Expected Outcome:** The application is accessible via `https://yourdomain.com` and serves traffic securely.
    **Objectives:**
      * Update DNS A, CNAME, or other relevant records.
      * Obtain and install an SSL certificate (e.g., Let's Encrypt).
      * Configure the web server or hosting platform to use the SSL certificate.
      * Test HTTPS access.
    **Implementation Prompt:** "Configure the DNS settings for the production domain to point to the deployed application's hosting endpoint. If not automatically handled by the hosting provider (like Netlify/Vercel), obtain and install an SSL certificate (e.g., using Certbot for Let's Encrypt) and configure the web server (Nginx/Apache) to use it for HTTPS. Ensure that both HTTP and HTTPS requests are handled appropriately (e.g., redirecting HTTP to HTTPS)."
    **Example Code:**
    ```bash
    # Example using Certbot for Nginx
    sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
    ```
- **ID:** T-905
  **Title:** Set Up Monitoring and Error Tracking
  *(Description):* Configure tools for monitoring application performance, uptime, and tracking runtime errors.
  *(User Story):* N/A
  *(Priority):* Medium
  *(Dependencies):* T-904
  *(Est. Effort):* Small

## Phase: Documentation

### Epic: Project Documentation
  - **Sub-Task ID:** T-905.1
    **Goal:** Select and integrate a logging framework.
    **Task:** Choose a suitable logging library (e.g., Winston, Pino for Node.js; Logback for Java) and configure it for basic log output to the console and a file.
    **Rationale:** A robust logging system is fundamental for debugging and understanding application behavior.
    **Expected Outcome:** Application logs are generated to both console and a designated log file.
    **Objectives:**
      * Logging library is installed.
      * Basic log levels (info, error, warn) are configured.
      * Logs are directed to standard output.
      * Logs are directed to a file (e.g., `app.log`).
    **Implementation Prompt:** "Configure the Winston logging library in a Node.js application. Set up transports for console output and a file named `app.log`. Ensure logs include timestamps and log levels. Provide the configuration code."
    **Example Code:**
    ```javascript
    const winston = require('winston');

    const logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'app.log' }),
      ],
    });

    module.exports = logger;
    ```
  - **Sub-Task ID:** T-905.2
    **Goal:** Implement structured logging.
    **Task:** Modify the logging configuration to output logs in a structured format (e.g., JSON) to facilitate easier parsing by monitoring tools.
    **Rationale:** Structured logs are machine-readable and significantly improve the ability to query and analyze logs in centralized monitoring systems.
    **Expected Outcome:** All application logs are output in a consistent JSON format.
    **Objectives:**
      * Logging format is set to JSON.
      * Key fields (timestamp, level, message, context) are included in the JSON output.
      * Ensure compatibility with common log aggregation tools.
    **Implementation Prompt:** "Update the existing Winston logger configuration to use the `winston.format.json()` formatter. Ensure the output includes `timestamp`, `level`, `message`, and any additional context fields."
    **Example Code:**
    ```javascript
    const winston = require('winston');

    const logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json() // Use JSON formatter
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'app.log' }),
      ],
    });

    module.exports = logger;
    ```
  - **Sub-Task ID:** T-905.3
    **Goal:** Integrate an error tracking service.
    **Task:** Select and integrate a service like Sentry, Bugsnag, or Datadog APM for capturing and reporting runtime errors. Configure the SDK to capture unhandled exceptions.
    **Rationale:** Centralized error tracking provides immediate alerts and detailed context for debugging production issues.
    **Expected Outcome:** Uncaught exceptions and errors are automatically reported to the chosen error tracking service.
    **Objectives:**
      * Error tracking SDK is installed.
      * SDK is initialized with the correct API key/DSN.
      * Global error handlers are set up to capture unhandled exceptions.
      * Test error is thrown and successfully reported.
    **Implementation Prompt:** "Integrate the Sentry SDK into a Node.js Express application. Initialize Sentry with a placeholder DSN. Add middleware or event listeners to capture unhandled exceptions and report them to Sentry."
    **Example Code:**
    ```javascript
    const Sentry = require('@sentry/node');
    const express = require('express');

    const app = express();

    Sentry.init({ dsn: 'YOUR_SENTRY_DSN' });

    app.use(Sentry.Handlers.requestHandler());

    // ... your routes ...

    app.use(Sentry.Handlers.errorHandler());

    // Example of capturing a specific error
    try {
      throw new Error('This is a test error');
    } catch (e) {
      Sentry.captureException(e);
    }

    // ... start server ...
    ```
  - **Sub-Task ID:** T-905.4
    **Goal:** Configure application performance monitoring (APM).
    **Task:** Set up APM capabilities using the chosen error tracking service or a dedicated APM tool (e.g., Datadog APM, New Relic) to track request latency, throughput, and resource utilization.
    **Rationale:** APM provides insights into application performance bottlenecks and helps ensure a smooth user experience.
    **Expected Outcome:** Key performance metrics are collected and visible in the APM dashboard.
    **Objectives:**
      * APM agent/SDK is installed and configured.
      * Key transaction endpoints are instrumented (if not automatic).
      * Basic performance metrics (latency, throughput) are being reported.
    **Implementation Prompt:** "Configure the Datadog APM tracer for a Node.js application. Ensure it automatically instruments common libraries like Express and captures basic metrics like request latency and throughput. Provide the initialization code."
    **Example Code:**
    ```javascript
    // Assuming Datadog Node.js tracer is installed (npm install dd-trace)
    const tracer = require('dd-trace').init({
      // Optional configuration
      service: 'my-node-app',
      // ... other options
    });

    // Express integration is often automatic after init()
    const express = require('express');
    const app = express();

    // ... your routes ...

    app.listen(3000, () => console.log('App listening on port 3000'));
    ```
  - **Sub-Task ID:** T-905.5
    **Goal:** Set up basic health checks.
    **Task:** Implement a simple HTTP endpoint (e.g., `/health`) that the application exposes to indicate its operational status. This endpoint should check critical dependencies if applicable.
    **Rationale:** Health checks allow external systems (like load balancers or orchestration tools) to determine if the application is running and responsive.
    **Expected Outcome:** A `/health` endpoint returns a 200 OK status when the application is healthy, and potentially a non-200 status otherwise.
    **Objectives:**
      * A new route `/health` is created.
      * The endpoint returns a JSON response with a status indicator (e.g., `{"status": "UP"}`).
      * Basic checks (e.g., database connection if critical) are performed.
    **Implementation Prompt:** "Create a health check endpoint `/health` in an Express.js application. This endpoint should return a JSON object `{'status': 'UP'}` with a 200 status code. If a database connection is established (assume a `db.ping()` function exists), include its status."
    **Example Code:**
    ```javascript
    const express = require('express');
    const app = express();

    // Assume db is an initialized database connection object
    // const db = require('./db');

    app.get('/health', async (req, res) => {
      let dbStatus = 'DOWN';
      // try {
      //   await db.ping(); // Example check
      //   dbStatus = 'UP';
      // } catch (error) {
      //   console.error("Database health check failed:", error);
      // }

      // Simulate DB check for example
      dbStatus = 'UP'; // Replace with actual check

      if (dbStatus === 'UP') {
        res.status(200).json({ status: 'UP', database: dbStatus });
      } else {
        res.status(503).json({ status: 'DOWN', database: dbStatus });
      }
    });

    // ... other routes and server start ...
    ```
  - **Sub-Task ID:** T-905.6
    **Goal:** Configure uptime monitoring.
    **Task:** Set up an external service (e.g., UptimeRobot, Pingdom, or cloud provider's monitoring) to periodically ping the application's public URL and the `/health` endpoint. Configure alerts for downtime.
    **Rationale:** External uptime monitoring ensures that the application is accessible to end-users even when internal monitoring might not detect external network issues.
    **Expected Outcome:** Alerts are triggered if the application becomes unresponsive or the health check fails.
    **Objectives:**
      * An uptime monitoring service is selected and configured.
      * The primary application URL is added as a check.
      * The `/health` endpoint is added as a check.
      * Alerting rules are defined for downtime.
    **Implementation Prompt:** "Document the steps required to configure UptimeRobot to monitor a web application URL (e.g., `https://yourapp.com`) and its health check endpoint (`https://yourapp.com/health`). Specify the check type (HTTP(S)), monitoring intervals, and alert configurations (e.g., email alerts)."
    **Example Code:**
    ```text
    # Steps for UptimeRobot Configuration:
    # 1. Sign up/Log in to UptimeRobot.
    # 2. Click "Add New Monitor".
    # 3. Monitor Type: HTTP(S)
    # 4. Friendly Name: [e.g., MyApp - Public URL]
    # 5. URL: https://yourapp.com
    # 6. Monitoring Interval: 5 minutes
    # 7. Alert Contacts: Select your email alert contact.
    # 8. Click "Create Monitor".
    # 9. Repeat steps 2-8 for the health check endpoint:
    #    Friendly Name: [e.g., MyApp - Health Check]
    #    URL: https://yourapp.com/health
    #    (Ensure the /health endpoint returns 200 OK for healthy status)
    ```
- **ID:** T-1001
  **Title:** Document Codebase and Architecture
  *(Description):* Add comprehensive code comments and generate documentation for the project structure, components, and utilities.
  *(User Story):* N/A
  *(Priority):* Medium
  *(Dependencies):* T-101, T-201, T-301, T-401, T-501, T-601
  *(Est. Effort):* Medium
  - **Sub-Task ID:** T-1001.1
    **Goal:** Document the core application structure and entry points.
    **Task:** Add detailed JSDoc comments to the main application files (e.g., `index.js`, `App.js`, `main.ts`) explaining their purpose, responsibilities, and how they integrate with other parts of the application.
    **Rationale:** Provides a clear starting point for understanding the overall application flow and architecture.
    **Expected Outcome:** Main application files are well-commented, explaining their role in the project.
    **Objectives:**
      * JSDoc comments are present for all top-level application files.
      * Comments clearly describe the file's purpose.
      * Comments explain how the file initializes or orchestrates other modules.
    **Implementation Prompt:** "Add JSDoc comments to the provided JavaScript/TypeScript files (`index.js`, `App.js`, `main.ts`). Explain the role of each file in the application's lifecycle and its main responsibilities. Include `@param` and `@returns` tags where applicable for exported functions or classes."
    **Example Code:**
    ```javascript
    /**
     * @fileoverview Main application entry point.
     * Initializes the React application and renders the root component.
     */

    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import App from './App'; // Assuming App is the root component

    /**
     * Renders the main App component into the DOM.
     * @async
     * @function renderApp
     */
    const renderApp = async () => {
      const rootElement = document.getElementById('root');
      if (!rootElement) {
        console.error('Root element #root not found in the DOM.');
        return;
      }
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    };

    renderApp();
    ```

  - **Sub-Task ID:** T-1001.2
    **Goal:** Document all utility functions and helper modules.
    **Task:** Add comprehensive JSDoc comments to all files within the `utils` or `helpers` directory, explaining the purpose of each function, its parameters, return values, and any side effects.
    **Rationale:** Ensures that reusable logic is easily discoverable and understandable by other developers.
    **Expected Outcome:** All utility functions are clearly documented with JSDoc.
    **Objectives:**
      * Every function/method in utility modules has JSDoc comments.
      * Comments accurately describe the function's behavior.
      * `@param` and `@returns` tags are used correctly.
      * Edge cases or specific usage notes are included where relevant.
    **Implementation Prompt:** "For the provided JavaScript/TypeScript files in the `utils` directory, add JSDoc comments to each exported function and class. Describe their purpose, parameters (with types), return values (with types), and any potential exceptions or important usage notes."
    **Example Code:**
    ```javascript
    /**
     * Formats a date object into a human-readable string.
     * @param {Date} date - The date object to format.
     * @param {string} [format='YYYY-MM-DD'] - The desired output format. Supports 'YYYY-MM-DD', 'MM/DD/YYYY'.
     * @returns {string} The formatted date string.
     * @throws {TypeError} If the input is not a valid Date object.
     */
    export const formatDate = (date, format = 'YYYY-MM-DD') => {
      if (!(date instanceof Date) || isNaN(date)) {
        throw new TypeError('Invalid Date object provided.');
      }
      // ... formatting logic ...
      return formattedString;
    };
    ```

  - **Sub-Task ID:** T-1001.3
    **Goal:** Document all API service or data fetching modules.
    **Task:** Add JSDoc comments to all files responsible for interacting with external APIs or data sources (e.g., `services/api.js`, `data/fetchers.ts`). Explain the purpose of each service, the endpoints they interact with, request/response structures, and error handling.
    **Rationale:** Clarifies data flow and external dependencies, making it easier to debug or modify data interactions.
    **Expected Outcome:** API service modules are thoroughly documented.
    **Objectives:**
      * All API service functions/classes are documented.
      * Comments describe the API endpoint being called.
      * Request payload structure is explained.
      * Response data structure is explained.
      * Error handling mechanisms are described.
    **Implementation Prompt:** "Add JSDoc comments to the provided API service files (e.g., `services/api.js`, `data/fetchers.ts`). For each function, document the API endpoint it targets, the expected request parameters/body, the structure of the successful response, and potential error responses."
    **Example Code:**
    ```javascript
    /**
     * Fetches user data from the /users/:id endpoint.
     * @async
     * @function getUserById
     * @param {string|number} userId - The ID of the user to fetch.
     * @returns {Promise<object>} A promise that resolves with the user data object.
     * @throws {Error} If the API request fails or returns an error status.
     *
     * @example Response structure:
     * {
     *   id: 1,
     *   name: "John Doe",
     *   email: "john.doe@example.com"
     * }
     */
    export const getUserById = async (userId) => {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error(`API Error: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        console.error(`Failed to fetch user ${userId}:`, error);
        throw error;
      }
    };
    ```

  - **Sub-Task ID:** T-1001.4
    **Goal:** Document all UI components.
    **Task:** Add JSDoc comments to all presentational and container components (e.g., in a `components/` directory). Explain the component's purpose, its props (including types and descriptions), and any internal state or lifecycle methods.
    **Rationale:** Makes UI components reusable and understandable, facilitating easier maintenance and development of the user interface.
    **Expected Outcome:** All UI components are documented with JSDoc.
    **Objectives:**
      * Every component file has JSDoc comments.
      * Component purpose is clearly stated.
      * All props are documented with types and descriptions.
      * Internal state management is briefly explained if significant.
    **Implementation Prompt:** "Add JSDoc comments to the provided React/Vue/Angular component files. Document the component's overall purpose, and for each prop, specify its type, whether it's required, and a description of its usage. Document any significant internal state or lifecycle hooks."
    **Example Code:**
    ```jsx
    /**
     * @fileoverview A reusable button component for primary actions.
     * Renders a clickable button with customizable text and click handler.
     *
     * @param {object} props - The component props.
     * @param {string} props.label - The text to display on the button.
     * @param {function} props.onClick - The callback function to execute when the button is clicked.
     * @param {boolean} [props.disabled=false] - If true, the button will be disabled.
     * @param {string} [props.variant='primary'] - The visual style of the button ('primary', 'secondary').
     */
    const Button = ({ label, onClick, disabled = false, variant = 'primary' }) => {
      const buttonClass = `btn btn-${variant} ${disabled ? 'disabled' : ''}`;

      return (
        <button className={buttonClass} onClick={onClick} disabled={disabled}>
          {label}
        </button>
      );
    };

    export default Button;
    ```

  - **Sub-Task ID:** T-1001.5
    **Goal:** Generate project architecture documentation.
    **Task:** Create a `ARCHITECTURE.md` or similar document in the root of the repository. This document should outline the project's high-level architecture, including key modules, their responsibilities, data flow, and technology choices. Reference the commented code where appropriate.
    **Rationale:** Provides a centralized, human-readable overview of the system's design, complementing the inline code comments.
    **Expected Outcome:** A comprehensive `ARCHITECTURE.md` file is created.
    **Objectives:**
      * Document includes a diagram or description of the overall structure.
      * Key modules/layers are identified and their responsibilities explained.
      * Major data flows are described.
      * Rationale for key technology choices is included.
      * Links to relevant code sections or components are provided.
    **Implementation Prompt:** "Create an `ARCHITECTURE.md` file for the project. Describe the main architectural patterns used (e.g., MVC, MVVM, component-based), outline the core modules/services and their interactions, explain the primary data flow, and justify the selection of key technologies. Use Markdown formatting for readability, including potential diagrams (e.g., using Mermaid syntax if supported)."
    **Example Code:**
    ```markdown
    # Project Architecture

    ## Overview

    This project follows a [e.g., Component-Based Architecture] pattern, leveraging [e.g., React] for the frontend. The application is divided into several key layers:

    1.  **Presentation Layer:** Handles UI rendering and user interaction. (See `src/components/`)
    2.  **Service Layer:** Manages API calls and data fetching. (See `src/services/`)
    3.  **Utility Layer:** Contains reusable helper functions. (See `src/utils/`)

    ## Key Modules

    ### Authentication Module
    - **Responsibility:** Handles user login, logout, and session management.
    - **Components:** `AuthForm`, `AuthService`.
    - **Location:** `src/features/auth/`

    ## Data Flow

    User interactions in the Presentation Layer trigger actions that are handled by container components or state management. These components may call functions in the Service Layer to fetch or update data. Data is then passed back to the Presentation Layer for rendering.

    ## Technology Stack

    - **Frontend:** React, Redux (or Context API), CSS Modules
    - **Backend:** Node.js, Express (if applicable)
    - **Database:** PostgreSQL (if applicable)

    ## Diagrams

    ```mermaid
    graph TD
        A[User] --> B(Browser/UI);
        B --> C{Frontend App};
        C --> D[Service Layer];
        D --> E[API Server];
        E --> F[Database];
        D --> G[Utils];
    ```
    ```

  - **Sub-Task ID:** T-1001.6
    **Goal:** Integrate documentation generation tools (if applicable).
    **Task:** If the project uses tools like JSDoc CLI, TypeDoc, or Sphinx, configure and run them to generate a browsable documentation website or set of HTML files. Ensure the output is placed in a designated `docs/` directory or similar.
    **Rationale:** Automates the documentation generation process and provides a professional, navigable documentation output.
    **Expected Outcome:** Automated documentation is generated and accessible.
    **Objectives:**
      * Documentation generation tool is installed/configured.
      * Configuration file (e.g., `jsdoc.json`) is set up correctly.
      * The generation command is documented (e.g., in `README.md` or `package.json` scripts).
      * Documentation can be successfully generated.
      * Output is placed in the correct directory (e.g., `docs/`).
    **Implementation Prompt:** "Configure the JSDoc CLI tool for the provided JavaScript project. Create a `jsdoc.json` configuration file that specifies the source directories (`src/`), the output directory (`docs/`), and any necessary templates or plugins. Add a script to `package.json` (e.g., `npm run docs`) to run the JSDoc generation command."
    **Example Code:**
    ```json
    // jsdoc.json
    {
      "source": {
        "include": ["src/"],
        "exclude": ["node_modules/", "dist/"]
      },
      "opts": {
        "destination": "docs/",
        "template": "node_modules/docstrap/template", // Example template
        "tutorials": true,
        "readme": "README.md"
      },
      "plugins": ["node_modules/jsdoc-vue-component-plugin"] // Example plugin for Vue
    }
    ```

  - **Sub-Task ID:** T-1001.7
    **Goal:** Document project setup and contribution guidelines.
    **Task:** Update or create `README.md` and potentially `CONTRIBUTING.md` files to include clear instructions on how to set up the development environment, run the project, and how to contribute. This includes installation steps, running tests, and the documentation generation process.
    **Rationale:** Ensures new developers can easily onboard and contribute to the project effectively.
    **Expected Outcome:** `README.md` and `CONTRIBUTING.md` are updated with setup and contribution information.
    **Objectives:**
      * `README.md` includes clear setup instructions (dependencies, installation).
      * `README.md` includes instructions for running the application locally.
      * `README.md` includes instructions for running tests.
      * `README.md` includes instructions for generating documentation.
      * `CONTRIBUTING.md` (if created/updated) outlines the contribution workflow.
    **Implementation Prompt:** "Update the `README.md` file for the project. Add sections for 'Getting Started' (installation, setup), 'Running the Application', 'Running Tests', and 'Generating Documentation'. Ensure the commands are accurate and easy to follow. If a `CONTRIBUTING.md` file is needed, outline the expected pull request process and coding standards."
    **Example Code:**
    ```markdown
    # Project Title

    ## Getting Started

    ### Prerequisites
    - Node.js (v18+)
    - npm or yarn

    ### Installation
    1. Clone the repository:
       ```bash
       git clone <repository-url>
       cd <project-directory>
       ```
    2. Install dependencies:
       ```bash
       npm install
       # or
       yarn install
       ```

    ## Running the Application

    ```bash
    npm start
    # or
    yarn start
    ```

    ## Running Tests

    ```bash
    npm test
    # or
    yarn test
    ```

    ## Generating Documentation

    ```bash
    npm run docs
    # or
    yarn docs
    ```
    The generated documentation will be available in the `docs/` directory.
    ```

  - **Sub-Task ID:** T-1001.8
    **Goal:** Review and refine all documentation.
    **Task:** Conduct a thorough review of all added code comments and generated documentation files (`ARCHITECTURE.md`, `README.md`, etc.). Check for clarity, accuracy, consistency, and completeness.
    **Rationale:** Catches errors, omissions, and areas for improvement, ensuring the documentation is high quality and useful.
    **Expected Outcome:** All documentation is reviewed and necessary corrections are made.
    **Objectives:**
      * All code comments are reviewed for accuracy and clarity.
      * `ARCHITECTURE.md` is reviewed for completeness and coherence.
      * `README.md` and `CONTRIBUTING.md` are reviewed for clarity and correctness of instructions.
      * Consistency in terminology and formatting is verified across all documentation.
      * Typos and grammatical errors are corrected.
    **Implementation Prompt:** "Review the provided code comments and documentation files (`ARCHITECTURE.md`, `README.md`, `CONTRIBUTING.md`). Ensure that the language is clear, concise, and technically accurate. Verify that all instructions are correct and easy to follow. Check for consistent formatting and correct grammar/spelling."
    **Example Code:**
    ```text
    // Review Checklist:
    // - [ ] Code comments accurately reflect implementation?
    // - [ ] JSDoc tags (param, returns, etc.) correct?
    // - [ ] Architecture document logical and complete?
    // - [ ] README instructions verifiable?
    // - [ ] Consistent terminology used?
    // - [ ] No typos or grammatical errors?
    ```
- **ID:** T-1002
  **Title:** Create User Usage Instructions
  *(Description):* Document how to use each of the 5 tools, including any specific features like keyboard shortcuts or export options.
  *(User Story):* N/A
  *(Priority):* Medium
  *(Dependencies):* T-201, T-301, T-401, T-501, T-601
  *(Est. Effort):* Medium
  - **Sub-Task ID:** T-1002.1
    **Goal:** Document the usage instructions for Tool 1.
    **Task:** Write clear, concise instructions for using Tool 1, covering its primary functions, any advanced features, and specific operational details.
    **Rationale:** This sub-task is essential for fulfilling the parent task's requirement to document each of the 5 tools. It provides users with the necessary information to effectively operate Tool 1.
    **Expected Outcome:** A comprehensive set of usage instructions for Tool 1, ready for integration into the final documentation.
    **Objectives:**
      * Cover the basic functionality of Tool 1.
      * Detail any advanced features or settings available in Tool 1.
      * Explain how to access and use specific features like keyboard shortcuts or export options for Tool 1.
      * Ensure instructions are easy to understand for a non-technical user.
    **Implementation Prompt:** Generate markdown documentation for a software tool named "Tool 1". The documentation should cover its core purpose, step-by-step usage for common tasks, and detailed explanations of its unique features, including keyboard shortcuts and data export functionalities. Assume the target audience is end-users with varying technical proficiency.
    **Example Code:**
    ```markdown
    # Tool 1: [Brief Description of Tool 1's Purpose]

    ## Getting Started
    1. **Launch Tool 1:** [Instructions on how to open the tool]
    2. **Initial Setup:** [Any initial configuration steps]

    ## Core Features
    ### Feature A: [Description]
    - Step 1: ...
    - Step 2: ...

    ## Advanced Features
    ### Keyboard Shortcuts
    - `Ctrl+S`: Save current work
    - `Ctrl+E`: Export data

    ### Export Options
    - **Format:** CSV, JSON
    - **Steps:**
      1. Go to File > Export.
      2. Select desired format.
      3. Click 'Export'.
    ```

  - **Sub-Task ID:** T-1002.2
    **Goal:** Document the usage instructions for Tool 2.
    **Task:** Write clear, concise instructions for using Tool 2, covering its primary functions, any advanced features, and specific operational details.
    **Rationale:** This sub-task is essential for fulfilling the parent task's requirement to document each of the 5 tools. It provides users with the necessary information to effectively operate Tool 2.
    **Expected Outcome:** A comprehensive set of usage instructions for Tool 2, ready for integration into the final documentation.
    **Objectives:**
      * Cover the basic functionality of Tool 2.
      * Detail any advanced features or settings available in Tool 2.
      * Explain how to access and use specific features like keyboard shortcuts or export options for Tool 2.
      * Ensure instructions are easy to understand for a non-technical user.
    **Implementation Prompt:** Generate markdown documentation for a software tool named "Tool 2". The documentation should cover its core purpose, step-by-step usage for common tasks, and detailed explanations of its unique features, including keyboard shortcuts and data export functionalities. Assume the target audience is end-users with varying technical proficiency.
    **Example Code:**
    ```markdown
    # Tool 2: [Brief Description of Tool 2's Purpose]

    ## Getting Started
    1. **Launch Tool 2:** [Instructions on how to open the tool]
    2. **Initial Setup:** [Any initial configuration steps]

    ## Core Features
    ### Feature B: [Description]
    - Step 1: ...
    - Step 2: ...

    ## Advanced Features
    ### Keyboard Shortcuts
    - `Alt+P`: Print report
    - `Alt+X`: Export report

    ### Export Options
    - **Format:** PDF, DOCX
    - **Steps:**
      1. Go to Report > Export.
      2. Choose a file format.
      3. Click 'Generate'.
    ```

  - **Sub-Task ID:** T-1002.3
    **Goal:** Document the usage instructions for Tool 3.
    **Task:** Write clear, concise instructions for using Tool 3, covering its primary functions, any advanced features, and specific operational details.
    **Rationale:** This sub-task is essential for fulfilling the parent task's requirement to document each of the 5 tools. It provides users with the necessary information to effectively operate Tool 3.
    **Expected Outcome:** A comprehensive set of usage instructions for Tool 3, ready for integration into the final documentation.
    **Objectives:**
      * Cover the basic functionality of Tool 3.
      * Detail any advanced features or settings available in Tool 3.
      * Explain how to access and use specific features like keyboard shortcuts or export options for Tool 3.
      * Ensure instructions are easy to understand for a non-technical user.
    **Implementation Prompt:** Generate markdown documentation for a software tool named "Tool 3". The documentation should cover its core purpose, step-by-step usage for common tasks, and detailed explanations of its unique features, including keyboard shortcuts and data export functionalities. Assume the target audience is end-users with varying technical proficiency.
    **Example Code:**
    ```markdown
    # Tool 3: [Brief Description of Tool 3's Purpose]

    ## Getting Started
    1. **Launch Tool 3:** [Instructions on how to open the tool]
    2. **Initial Setup:** [Any initial configuration steps]

    ## Core Features
    ### Feature C: [Description]
    - Step 1: ...
    - Step 2: ...

    ## Advanced Features
    ### Keyboard Shortcuts
    - `Ctrl+Shift+C`: Copy selected item
    - `Ctrl+Shift+V`: Paste copied item

    ### Export Options
    - **Format:** XML, TXT
    - **Steps:**
      1. Select items to export.
      2. Navigate to Edit > Export Selection.
      3. Choose file format and save location.
    ```

  - **Sub-Task ID:** T-1002.4
    **Goal:** Document the usage instructions for Tool 4.
    **Task:** Write clear, concise instructions for using Tool 4, covering its primary functions, any advanced features, and specific operational details.
    **Rationale:** This sub-task is essential for fulfilling the parent task's requirement to document each of the 5 tools. It provides users with the necessary information to effectively operate Tool 4.
    **Expected Outcome:** A comprehensive set of usage instructions for Tool 4, ready for integration into the final documentation.
    **Objectives:**
      * Cover the basic functionality of Tool 4.
      * Detail any advanced features or settings available in Tool 4.
      * Explain how to access and use specific features like keyboard shortcuts or export options for Tool 4.
      * Ensure instructions are easy to understand for a non-technical user.
    **Implementation Prompt:** Generate markdown documentation for a software tool named "Tool 4". The documentation should cover its core purpose, step-by-step usage for common tasks, and detailed explanations of its unique features, including keyboard shortcuts and data export functionalities. Assume the target audience is end-users with varying technical proficiency.
    **Example Code:**
    ```markdown
    # Tool 4: [Brief Description of Tool 4's Purpose]

    ## Getting Started
    1. **Launch Tool 4:** [Instructions on how to open the tool]
    2. **Initial Setup:** [Any initial configuration steps]

    ## Core Features
    ### Feature D: [Description]
    - Step 1: ...
    - Step 2: ...

    ## Advanced Features
    ### Keyboard Shortcuts
    - `F5`: Refresh data
    - `F6`: Export current view

    ### Export Options
    - **Format:** PNG, JPG
    - **Steps:**
      1. Click the 'Export View' button or use `F6`.
      2. Select image format.
      3. Save the file.
    ```

  - **Sub-Task ID:** T-1002.5
    **Goal:** Document the usage instructions for Tool 5.
    **Task:** Write clear, concise instructions for using Tool 5, covering its primary functions, any advanced features, and specific operational details.
    **Rationale:** This sub-task is essential for fulfilling the parent task's requirement to document each of the 5 tools. It provides users with the necessary information to effectively operate Tool 5.
    **Expected Outcome:** A comprehensive set of usage instructions for Tool 5, ready for integration into the final documentation.
    **Objectives:**
      * Cover the basic functionality of Tool 5.
      * Detail any advanced features or settings available in Tool 5.
      * Explain how to access and use specific features like keyboard shortcuts or export options for Tool 5.
      * Ensure instructions are easy to understand for a non-technical user.
    **Implementation Prompt:** Generate markdown documentation for a software tool named "Tool 5". The documentation should cover its core purpose, step-by-step usage for common tasks, and detailed explanations of its unique features, including keyboard shortcuts and data export functionalities. Assume the target audience is end-users with varying technical proficiency.
    **Example Code:**
    ```markdown
    # Tool 5: [Brief Description of Tool 5's Purpose]

    ## Getting Started
    1. **Launch Tool 5:** [Instructions on how to open the tool]
    2. **Initial Setup:** [Any initial configuration steps]

    ## Core Features
    ### Feature E: [Description]
    - Step 1: ...
    - Step 2: ...

    ## Advanced Features
    ### Keyboard Shortcuts
    - `Ctrl+Z`: Undo last action
    - `Ctrl+Y`: Redo last action

    ### Export Options
    - **Format:** HTML, Markdown
    - **Steps:**
      1. Select content to export.
      2. Go to File > Export Selection.
      3. Choose output format and save.
    ```

  - **Sub-Task ID:** T-1002.6
    **Goal:** Consolidate and format all tool usage instructions.
    **Task:** Combine the documentation for all 5 tools into a single, coherent document, ensuring consistent formatting, structure, and tone.
    **Rationale:** This sub-task ensures that the individual tool documentation is presented in a unified and professional manner, meeting the overall goal of creating comprehensive user instructions.
    **Expected Outcome:** A single, well-formatted markdown document containing the usage instructions for all 5 tools.
    **Objectives:**
      * Merge the markdown content from T-1002.1 through T-1002.5.
      * Apply a consistent header structure (e.g., H1 for tool name, H2 for sections).
      * Ensure consistent use of formatting for code snippets, shortcuts, and lists.
      * Add a table of contents if the document becomes lengthy.
      * Proofread for grammatical errors and typos.
    **Implementation Prompt:** Combine the provided markdown documentation snippets for Tool 1 through Tool 5 into a single, cohesive document. Implement a clear hierarchical structure using markdown headings (e.g., `# Tool Name`, `## Section Title`). Ensure consistent formatting for code blocks, keyboard shortcuts (e.g., using backticks), and bulleted/numbered lists. Add a top-level table of contents linking to each tool's section.
    **Example Code:**
    ```markdown
    # User Usage Instructions

    ## Table of Contents
    - [Tool 1](#tool-1)
    - [Tool 2](#tool-2)
    - [Tool 3](#tool-3)
    - [Tool 4](#tool-4)
    - [Tool 5](#tool-5)

    # Tool 1: [Brief Description of Tool 1's Purpose]
    ... (content from T-1002.1) ...

    # Tool 2: [Brief Description of Tool 2's Purpose]
    ... (content from T-1002.2) ...

    # Tool 3: [Brief Description of Tool 3's Purpose]
    ... (content from T-1002.3) ...

    # Tool 4: [Brief Description of Tool 4's Purpose]
    ... (content from T-1002.4) ...

    # Tool 5: [Brief Description of Tool 5's Purpose]
    ... (content from T-1002.5) ...
    ```