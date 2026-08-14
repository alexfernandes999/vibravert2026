/**
 * Zera o funil e os pedidos de teste.
 *
 * O painel só é útil se o número que mostra for verdade. Depois de uma rodada
 * de testes, visita, carrinho e pedido ficam misturados com o que aconteceu de
 * verdade — e a partir daí ninguém confia mais na tela.
 *
 * Não toca em produto, preço, estoque, banner nem usuário.
 *
 *   npx tsx --env-file=.env.local prisma/reiniciar.ts --aplicar
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

(async () => {
  const aplicar = process.argv.includes("--aplicar");
  const [pedidos, clientes, eventos, itens] = await Promise.all([
    prisma.pedido.count(), prisma.cliente.count(),
    prisma.evento.count(), prisma.pedidoItem.count(),
  ]);
  console.log(`  a apagar: ${pedidos} pedidos · ${itens} itens · ${clientes} clientes · ${eventos} eventos`);
  console.log(`  intactos: produtos, preços, estoque, banners, vídeos e usuários`);

  if (!aplicar) return console.log("\n  simulação · rode com --aplicar\n");

  // A ordem importa: item e endereço apontam para pedido e cliente.
  await prisma.pedidoItem.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.endereco.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.evento.deleteMany();

  console.log(`\n  zerado.`);
  console.log(`  pedidos ${await prisma.pedido.count()} · clientes ${await prisma.cliente.count()} · eventos ${await prisma.evento.count()}`);
  console.log(`  produtos ativos ${await prisma.produto.count({ where: { ativo: true } })} · usuários ${await prisma.usuario.count()}`);
})().catch(console.error).finally(() => prisma.$disconnect());
