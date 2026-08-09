/**
 * Layout intermediário do painel: só repassa.
 *
 * A verificação vive em (painel)/layout.tsx, e a raiz do painel em
 * (admin)/layout.tsx. Este arquivo existe apenas para o segmento /admin — se
 * a verificação estivesse aqui, a tela de login cairia sob ela e se
 * redirecionaria para si mesma.
 */
export default function AdminSegmento({ children }: { children: React.ReactNode }) {
  return children;
}
