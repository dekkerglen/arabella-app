import { renderToRoot } from "../renderToRoot";

interface HomePageProps {
  message: string;
}

function HomePage({ message }: HomePageProps) {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Arabella</h1>
      <p className="mt-2 text-gray-600">{message}</p>
    </main>
  );
}

export default renderToRoot(HomePage);
