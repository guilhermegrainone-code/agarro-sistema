# AGARRÔ — Sistema da loja

Sistema de controle da loja: vendas (site + loja física + WhatsApp/Instagram),
estoque com entrada/saída e histórico, produtos e relatórios de faturamento e lucro.

É um projeto **separado do site** (`loja-fitness`), mas os dois usam o **mesmo banco
de dados**. Por isso, quando o site entrar no ar, os pedidos dele aparecem aqui
sozinhos — e o estoque cadastrado aqui é o que o site vai mostrar.

## Rodar no computador

```bash
npm install
cp .env.example .env   # preencha as variáveis (veja o arquivo)
npm run db:push        # cria as tabelas no banco (só na primeira vez)
npm run dev
```

Abra `http://localhost:3001` e entre com o e-mail/senha do `.env`.

## Colocar no ar (para usar no celular, de qualquer lugar)

1. **Banco de dados**: crie um Postgres gratuito em [Neon](https://neon.tech) e copie a
   connection string. Ela vai em `DATABASE_URL` — **aqui e depois no site**.
2. Suba esta pasta para um repositório no GitHub.
3. Em https://vercel.com/new importe o repositório e adicione as variáveis do `.env`
   em *Settings > Environment Variables*.
4. Depois do primeiro deploy, rode `npm run db:push` uma vez apontando para o banco de
   produção (basta colocar a `DATABASE_URL` do Neon no `.env` local e rodar).
5. Opcional: em *Settings > Domains* aponte um subdomínio, ex. `sistema.seudominio.com.br`.

Dica: no celular, abra o endereço e use "Adicionar à tela de início" — vira um app.

## Quando o site for para o ar

- Use a **mesma** `DATABASE_URL` no projeto do site.
- O arquivo `prisma/schema.prisma` precisa ser **idêntico** nos dois projetos. Se
  mudar em um, copie para o outro.
- Pedidos pagos no site baixam o estoque automaticamente; cancelamentos devolvem.

## O que tem em cada tela

- **Visão geral** — vendido hoje e no mês, lucro, gráfico dos últimos 30 dias, últimas vendas, alertas de estoque baixo
- **Vendas** — todas as vendas (site e manuais), filtros por canal/status/mês/cliente; *Registrar venda* para balcão, WhatsApp e Instagram
- **Estoque** — entrada (chegou peça), saída (perda, brinde) e ajuste (acertar contagem), saldo por tamanho/cor e histórico de movimentações
- **Produtos** — cadastro com preço, **custo** (para calcular o lucro), fotos, tamanhos/cores
- **Relatórios** — por mês: receita, lucro, ticket médio, comparação com o mês anterior, por canal, por forma de pagamento, peças e tamanhos mais vendidos

## Regras de cálculo

- **Receita** = total das vendas pagas − frete (o frete é repassado à transportadora)
- **Lucro** = receita − custo das peças vendidas (o custo é guardado no momento da venda,
  então editar o custo do produto depois não muda vendas antigas)
- Vendas "aguardando pagamento" e canceladas não entram na receita
