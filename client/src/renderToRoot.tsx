import "@vitejs/plugin-react/preamble";
import type { FC } from "react";
import { createRoot, type Root } from "react-dom/client";
import "./index.css";

// Kept across hot reloads: a page module re-runs on every edit, and React
// rejects a second createRoot on the same container.
const root: Root = import.meta.hot?.data.root ?? createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.data.root = root;

/**
 * Mounts a page component with the props the server rendered into window.pageProps.
 * Returns the component so a page can `export default` it: React Refresh only
 * hot-swaps modules that export components, and fully reloads the rest.
 */
export function renderToRoot<Props extends object>(Page: FC<Props>) {
  const props = (window as unknown as { pageProps: Props }).pageProps;
  root.render(<Page {...props} />);
  return Page;
}
