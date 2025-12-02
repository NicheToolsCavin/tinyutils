# Research Report: Vercel Python Functions Configuration Requirements

## 1. Executive Summary
Vercel's Python runtime, currently in Beta, allows developers to deploy Python functions. Key requirements include organizing Python code in an `/api` directory, defining dependencies in `requirements.txt` or `pyproject.toml`, and adhering to a 250 MB bundle size limit. The `vercel.json` file is essential for configuring build settings, memory allocation, and file inclusions/exclusions, particularly for mixed-runtime projects.

## 2. Key Findings
*   Vercel supports Python functions via a Beta Python runtime.
*   Python code should reside in an `/api` directory.
*   Dependencies must be listed in `requirements.txt` or `pyproject.toml`.
*   The maximum unzipped bundle size for serverless functions is 250 MB.
*   `vercel.json` is used to configure build processes, memory, and file inclusions/exclusions.
*   Mixed-runtime projects (e.g., Python with Next.js) require specific `vercel.json` configurations and local development setup.
*   Python runtime requires Python 3.11 or higher.

## 3. Detailed Analysis

### Project Structure and Dependencies
To deploy Python functions on Vercel, projects should follow a specific structure, with Python code typically placed within an `/api` directory. Dependency management is handled through standard Python methods: either a `requirements.txt` file listing all necessary packages or a `pyproject.toml` file, which offers more advanced configuration options. For instance, a `pyproject.toml` can specify dependencies like FastAPI, along with project metadata such as name, version, and required Python version (>= 3.11).

### Basic Function Implementation
A fundamental Python function can be implemented using Python's built-in `http.server` module. A simple GET request handler can be created at `api/index.py` to return a "Hello, world!" message. Vercel's Python runtime also supports popular web frameworks like FastAPI, Django, and Flask, allowing for more complex API development.

### Vercel.json Configuration
The `vercel.json` file is central to customizing the build and deployment of Python functions. A basic configuration might include a schema definition and a `functions` block that targets all Python files within the `api` directory. This block can utilize `excludeFiles` patterns to prevent large or unnecessary files (like test suites, static assets, or fixtures) from being included in the deployment bundle, helping to manage the 250 MB size limit.

For more advanced scenarios, `vercel.json` can specify memory allocation (e.g., 1024 MB) for functions and use `includeFiles` to explicitly add specific directories or files, such as backend source code or dependency files, to the build. This is particularly useful when dependencies are not automatically detected or when specific project structures are used.

### Mixed Runtime Projects
Deploying projects that combine Python functions with other runtimes, such as Next.js, requires careful configuration in `vercel.json`. When developing locally, developers need to set up a Python virtual environment (`venv`) and activate it. Additionally, the `package.json` file's development scripts may need to be modified to run both the Python development server (e.g., using `uvicorn` for FastAPI) and the frontend development server (e.g., `next dev`) concurrently. This often involves using tools like `concurrently`. A redirect configuration in `next.config.js` might also be necessary for local routing, as Vercel handles this automatically during deployment.

### Bundle Size Considerations
A critical constraint for Vercel serverless functions is the 250 MB unzipped maximum size limit. Developers must actively manage their deployment packages to stay within this limit. This involves judicious use of `excludeFiles` in `vercel.json` to omit development artifacts, test files, and static assets. This is especially important in monorepos or projects that bundle multiple components, where the combined size could easily exceed the limit.

## 4. Practical Applications / Implications
The ability to deploy Python functions on Vercel enables developers to build backend APIs, data processing services, and other server-side logic directly within their Vercel projects. This simplifies deployment by keeping frontend and backend code together. Frameworks like FastAPI, Django, and Flask can be leveraged for robust API development. The `vercel.json` configuration allows for fine-tuning performance through memory allocation and optimizing build times and bundle sizes by excluding unnecessary files. For mixed-runtime projects, this integration streamlines the development and deployment workflow for full-stack applications.

## 5. Limitations and Caveats
*   The Python runtime is currently in Beta, which may imply potential for changes or undiscovered issues.
*   The provided research does not detail specific error messages or troubleshooting steps for common deployment issues related to Python functions.
*   While bundle size is mentioned, the research doesn't offer advanced strategies for significantly reducing large Python package footprints beyond basic file exclusion.
*   Information on specific Vercel-specific Python adapters or best practices beyond standard framework usage is limited.
*   The research focuses on basic setup and configuration; more complex scenarios like background tasks, cron jobs, or specific database integrations with Python functions are not elaborated upon.

## 6. Conclusion & Recommendations
Vercel provides a robust environment for deploying Python serverless functions, emphasizing dependency management via `requirements.txt` or `pyproject.toml` and build configuration through `vercel.json`. Adherence to the 250 MB bundle size limit and proper handling of mixed-runtime projects are crucial for successful deployments. Further investigation into optimizing large dependency packages and exploring advanced Vercel features for Python functions would be beneficial.

_Generated: 12/2/2025, 2:34:15 AM_